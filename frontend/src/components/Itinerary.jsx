import React from "react";

export default function Itinerary({ itinerary }) {
  if (!itinerary || !itinerary.days || itinerary.days.length === 0) {
    return <p className="mt-10 text-center text-gray-500">No itinerary yet.</p>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-12 space-y-10">
      {itinerary.days.map((day) => (
        <div key={day.date} className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-700">
            {new Date(day.date).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>

          <ul className="space-y-4">
            {day.activities.map((act, idx) => (
              <li
                key={idx}
                className="p-4 border rounded bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center"
              >
                <div className="flex flex-col">
                  <div className="font-semibold text-gray-800">{act.name}</div>
                  {act.place_name && (
                    <div className="text-sm text-gray-500">{act.place_name}</div>
                  )}
                  {act.description && (
                    <div className="text-sm text-gray-600 mt-1">{act.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    Duration: {act.duration_minutes} mins
                  </div>
                  {act.travel_minutes_to_next !== undefined && (
                    <div className="text-xs text-gray-400 mt-1">
                      Travel to next: {act.travel_minutes_to_next} mins
                    </div>
                  )}
                </div>
                {act.map_url && (
                  <a
                    href={act.map_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 md:mt-0 text-blue-600 hover:underline flex items-center gap-1 text-sm"
                  >
                    📍 Map
                  </a>
                )}
                {act.photo && (
                  <img
                    src={act.photo}
                    alt={act.name}
                    className="mt-3 md:mt-0 w-32 h-20 object-cover rounded"
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {itinerary.tips && itinerary.tips.length > 0 && (
        <div className="bg-yellow-50 p-6 rounded shadow">
          <h3 className="font-semibold mb-3">Tips</h3>
          <ul className="list-disc pl-5 space-y-1 text-gray-700 text-sm">
            {itinerary.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
