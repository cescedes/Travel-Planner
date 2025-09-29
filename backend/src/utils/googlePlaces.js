import fetch from "node-fetch";

const PLACES_API = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
const TEXT_API = "https://maps.googleapis.com/maps/api/place/textsearch/json";

// 🔹 Text Search queries for must-sees
const MUST_SEE_QUERIES = {
  museum: "top museums in",
  sightseeing: "top attractions in",
  restaurant: "best restaurants in",
  park: "best parks in"
};

/**
 * Get places for a destination
 * @param {string} destination - city name
 * @param {Array} categories - frontend categories, e.g., ["restaurant","museum"]
 */
export async function getPlacesForDestination(destination, categories = ["ALL"]) {
  try {
    // 1️⃣ Geocode destination
    const geoResp = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        destination
      )}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    const geoData = await geoResp.json();
    if (!geoData.results?.length) return [];
    const { lat, lng } = geoData.results[0].geometry.location;

    // 2️⃣ Map frontend categories → Google Place types
    const CATEGORY_MAP = {
      restaurant: ["restaurant", "cafe", "bar", "bakery"],
      museum: ["museum", "art_gallery"],
      sightseeing: ["tourist_attraction"],
      park: ["park"],
      shopping: ["shopping_mall", "store", "clothing_store", "jewelry_store", "shoe_store", "book_store"],
    };

    const typesToQuery = categories.includes("ALL")
      ? Object.values(CATEGORY_MAP).flat()
      : categories.flatMap(c => CATEGORY_MAP[c] || []);

    let places = [];

    // 3️⃣ Nearby Search (broad coverage)
    for (const type of typesToQuery) {
      let nextPageToken = null;
      let page = 0;

      do {
        const url = `${PLACES_API}?location=${lat},${lng}&radius=5000&type=${type}&key=${
          process.env.GOOGLE_MAPS_API_KEY
        }${nextPageToken ? `&pagetoken=${nextPageToken}` : ""}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.results?.length) {
          const validPlaces = data.results
            .filter(p => p.geometry?.location && p.place_id)
            .map(p => ({
              place_id: p.place_id,
              name: p.name,
              location: p.geometry.location,
              rating: p.rating,
              user_ratings_total: p.user_ratings_total,
              types: p.types,
              photo: p.photos?.[0]?.photo_reference || null,
            }));
          places.push(...validPlaces);
        }

        nextPageToken = data.next_page_token || null;
        page++;
        if (nextPageToken) await new Promise(r => setTimeout(r, 1500));
      } while (nextPageToken && page < 3);
    }

    // 4️⃣ Text Search for must-sees (ensures Louvre/Eiffel appear)
    for (const cat of categories.includes("ALL") ? Object.keys(MUST_SEE_QUERIES) : categories) {
      if (!MUST_SEE_QUERIES[cat]) continue;

      const query = `${MUST_SEE_QUERIES[cat]} ${destination}`;
      const url = `${TEXT_API}?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();

      if (data.results?.length) {
        const mustSeePlaces = data.results
          .filter(p => p.geometry?.location && p.place_id)
          .map(p => ({
            place_id: p.place_id,
            name: p.name,
            location: p.geometry.location,
            rating: p.rating,
            user_ratings_total: p.user_ratings_total,
            types: p.types,
            photo: p.photos?.[0]?.photo_reference || null,
            must_see: true, // 🔹 Mark explicitly
          }));
        places.push(...mustSeePlaces);
      }
    }

    // 5️⃣ Deduplicate
    const seen = new Set();
    places = places.filter(p => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      return true;
    });

    return places;
  } catch (err) {
    console.error("getPlacesForDestination error:", err);
    return [];
  }
}
