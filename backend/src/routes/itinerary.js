import express from "express";
import { getPlacesForDestination } from "../utils/googlePlaces.js";
import { getTravelDurations } from "../utils/distanceMatrix.js";

const router = express.Router();

const CATEGORY_MAP = {
  restaurant: ["restaurant", "cafe"],
  museum: ["museum", "art_gallery"],
  sightseeing: ["tourist_attraction"],
  park: ["park"]
};

const EXCLUDED_TYPES = ["lodging", "hotel", "resort", "campground"];

// Helpers
function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

function assignDuration(place) {
  const types = place.types || [];
  if (types.includes("museum") || types.includes("art_gallery")) return 120;
  if (types.includes("park") || types.includes("natural_feature")) return 90;
  if (types.includes("restaurant") || types.includes("cafe")) return 75;
  return 90;
}

// Scoring = rating × reviews
function scorePlace(p) {
  return (p.rating || 0) * (p.user_ratings_total || 0);
}

// Strict category filtering + rating sort
function filterPlacesByCategories(places, selectedCategories) {
  const allowedTypes = selectedCategories.includes("ALL")
    ? Object.values(CATEGORY_MAP).flat()
    : selectedCategories.flatMap(c => CATEGORY_MAP[c] || []);

  return places
    .filter(p => p.types?.some(t => allowedTypes.includes(t)))
    .filter(p => !p.types?.some(t => EXCLUDED_TYPES.includes(t)))
    .sort((a, b) => scorePlace(b) - scorePlace(a));
}

// Limit per category to avoid huge payload
function limitPlacesByCategory(places, maxPerCategory = 10) {
  const result = [];
  const seen = {};
  for (const place of places) {
    const cat = place.types?.find(t => Object.values(CATEGORY_MAP).flat().includes(t));
    if (!cat) continue;
    seen[cat] = seen[cat] || 0;
    if (seen[cat] < maxPerCategory) {
      result.push(place);
      seen[cat]++;
    }
  }
  return result;
}

// Pick must-sees: top museum, sightseeing, restaurant
function pickMustSeeDay(allPlaces) {
  const mustSee = [];

  const byCat = {
    museum: allPlaces.filter(p => p.types.includes("museum") || p.types.includes("art_gallery")),
    sightseeing: allPlaces.filter(p => p.types.includes("tourist_attraction")),
    restaurant: allPlaces.filter(p => p.types.includes("restaurant") || p.types.includes("cafe")),
  };

  for (const key of Object.keys(byCat)) {
    byCat[key].sort((a, b) => scorePlace(b) - scorePlace(a));
    if (byCat[key][0]) {
      mustSee.push({ ...byCat[key][0], must_see: true });
      // remove from pool
      const idx = allPlaces.findIndex(p => p.place_id === byCat[key][0].place_id);
      if (idx > -1) allPlaces.splice(idx, 1);
    }
  }

  return mustSee;
}

// Pick 5 mixed activities per day
function pickMixedActivities(allPlaces, count = 5) {
  const categoryGroups = {};

  for (const place of allPlaces) {
    const mainType = place.types?.find(t =>
      Object.values(CATEGORY_MAP).flat().includes(t)
    );
    if (!mainType) continue;
    categoryGroups[mainType] = categoryGroups[mainType] || [];
    categoryGroups[mainType].push(place);
  }

  // Sort each category by score
  for (const k of Object.keys(categoryGroups)) {
    categoryGroups[k].sort((a, b) => scorePlace(b) - scorePlace(a));
  }

  const result = [];
  let added = 0;
  const keys = Object.keys(categoryGroups);

  while (added < count && keys.some(k => categoryGroups[k].length)) {
    for (const k of keys) {
      if (categoryGroups[k].length && added < count) {
        const place = categoryGroups[k].shift();
        result.push(place);
        added++;
      }
    }
  }

  // Remove selected
  result.forEach(p => {
    const idx = allPlaces.findIndex(x => x.place_id === p.place_id);
    if (idx > -1) allPlaces.splice(idx, 1);
  });

  return result;
}

// Build one day with travel durations
async function makeDay(dayPlaces, date) {
  let travelDurations = {};
  if (dayPlaces.length > 1) {
    try {
      travelDurations = await getTravelDurations(dayPlaces);
    } catch (err) {
      console.error("DistanceMatrix error:", err);
    }
  }

  const activities = dayPlaces.map((place, idx) => {
    const nextPlace = dayPlaces[idx + 1];
    const travelKey = nextPlace ? `${place.place_id}_${nextPlace.place_id}` : null;
    const travelMinutes = travelKey && travelDurations[travelKey] ? travelDurations[travelKey] : 0;

    const photoUrl = place.photo
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photo}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      : null;

    return {
      time: ["morning", "late morning", "afternoon", "late afternoon", "evening"][idx],
      name: place.name,
      place_name: place.name,
      place_id: place.place_id,
      description: `Visit ${place.name}`,
      duration_minutes: assignDuration(place),
      travel_minutes_to_next: travelMinutes,
      map_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}&query_place_id=${place.place_id}`,
      photo: photoUrl,
      must_see: !!place.must_see,
    };
  });

  return { date, activities };
}

async function buildItineraryWithTravel(dates, places) {
  const allPlaces = [...places];
  const itinerary = [];

  // Day 1 = must-sees + fillers
  if (allPlaces.length) {
    const mustSeeDay = pickMustSeeDay(allPlaces);
    const fillers = pickMixedActivities(allPlaces, 5 - mustSeeDay.length);
    itinerary.push(await makeDay([...mustSeeDay, ...fillers], dates[0]));
  }

  // Remaining days = normal mix
  for (let i = 1; i < dates.length; i++) {
    if (!allPlaces.length) break;
    const dayPlaces = pickMixedActivities(allPlaces, 5);
    itinerary.push(await makeDay(dayPlaces, dates[i]));
  }

  return itinerary;
}

// Route
router.post("/", async (req, res) => {
  try {
    const { destination, startDate, endDate, categories } = req.body;
    if (!destination || !startDate || !endDate) {
      return res.status(400).json({ error: "destination, startDate and endDate required" });
    }

    let places = await getPlacesForDestination(destination, categories);

    places = filterPlacesByCategories(places, categories);
    places = limitPlacesByCategory(places, 10);
    places = places.slice(0, 50); // global max

    if (!places.length) {
      return res.status(400).json({ error: "No places found for selected categories" });
    }

    const tripDaysCount = daysBetween(startDate, endDate);
    const tripDates = Array.from({ length: tripDaysCount }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    const itinerary = await buildItineraryWithTravel(tripDates, places);

    res.json({
      days: itinerary,
      tips: [
        "Book tickets early for popular attractions",
        "Check opening hours for each location",
        "Plan some buffer time for travel between locations",
      ],
    });
  } catch (err) {
    console.error("Itinerary error:", err);
    res.status(500).json({ error: "Failed to create itinerary" });
  }
});

export default router;
