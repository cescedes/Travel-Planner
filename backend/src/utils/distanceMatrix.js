import fetch from "node-fetch";

const DISTANCE_MATRIX_API = "https://maps.googleapis.com/maps/api/distancematrix/json";

/**
 * Returns travel times as an object keyed by `${origin_id}_${destination_id}`.
 */
export async function getTravelDurations(places, mode = "walking") {
  const durations = {};

  const requests = [];

  for (let i = 0; i < places.length - 1; i++) {
    const origin = places[i];
    const destination = places[i + 1];
    const url = `${DISTANCE_MATRIX_API}?origins=${origin.location.lat},${origin.location.lng}&destinations=${destination.location.lat},${destination.location.lng}&mode=${mode}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    requests.push(
      fetch(url)
        .then(resp => resp.json())
        .then(data => {
          if (data.status === "OK" && data.rows[0].elements[0].status === "OK") {
            durations[`${origin.place_id}_${destination.place_id}`] =
              Math.ceil(data.rows[0].elements[0].duration.value / 60);
          } else {
            durations[`${origin.place_id}_${destination.place_id}`] = 15; // fallback
          }
        })
        .catch(err => {
          console.error("Distance Matrix API error:", err);
          durations[`${origin.place_id}_${destination.place_id}`] = 15;
        })
    );
  }

  await Promise.all(requests);

  return durations;
}
