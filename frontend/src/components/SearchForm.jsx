import React, { useState, useEffect, useRef } from "react";

const CATEGORY_OPTIONS = [
  { label: "All", value: "ALL" },
  { label: "Food / Restaurants / Cafes", value: "restaurant" },
  { label: "Museums / Cultural", value: "museum" },
  { label: "Parks / Nature", value: "park" },
  { label: "Sightseeing", value: "sightseeing" }
];

export default function SearchForm({ onResult, setLoading }) {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categories, setCategories] = useState(["ALL"]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  // Autocomplete
  useEffect(() => {
    if (!destination) return setSuggestions([]);

    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(
          `/api/autocomplete?input=${encodeURIComponent(destination)}`
        );
        const data = await resp.json();
        setSuggestions(data.predictions || []);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Autocomplete error:", err);
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [destination]);

  const handleSelectSuggestion = (s) => {
    setDestination(s.description);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleCategoryChange = (value) => {
    if (value === "ALL") {
      // If "All" clicked, reset to only "ALL"
      setCategories(["ALL"]);
    } else {
      // Remove "ALL" if specifics are chosen
      let updated = categories.includes("ALL")
        ? []
        : [...categories];

      if (updated.includes(value)) {
        updated = updated.filter((c) => c !== value);
      } else {
        updated.push(value);
      }

      setCategories(updated.length ? updated : ["ALL"]);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!destination || !startDate || !endDate) {
      setError("Please provide destination and both dates.");
      return;
    }

    try {
      setIsSubmitting(true);
      setLoading?.(true);

      const resp = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, startDate, endDate, categories }),
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`Itinerary request failed: ${resp.status} ${txt}`);
      }

      const data = await resp.json();
      onResult?.(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong — check backend logs");
    } finally {
      setIsSubmitting(false);
      setLoading?.(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded shadow max-w-lg mx-auto mt-10 relative"
    >
      <h2 className="text-2xl font-bold text-center mb-4">Plan Your Trip</h2>

      <div className="space-y-4">
        {/* Destination input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setShowSuggestions(true);
            }}
            placeholder="Destination (city or place)"
            className="w-full p-3 border rounded shadow-sm"
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-50 w-full bg-white border rounded shadow max-h-60 overflow-y-auto mt-1">
              {suggestions.map((s) => (
                <li
                  key={s.place_id}
                  className="p-2 cursor-pointer hover:bg-blue-100"
                  onClick={() => handleSelectSuggestion(s)}
                >
                  {s.description}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-3 border rounded"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-3 border rounded"
          />
        </div>

        {/* Categories */}
        <div className="space-y-1">
          <label className="block font-medium mb-1">Select Categories:</label>
          {CATEGORY_OPTIONS.map((cat) => (
            <div key={cat.value} className="flex items-center">
              <input
                type="checkbox"
                value={cat.value}
                checked={categories.includes(cat.value)}
                onChange={() => handleCategoryChange(cat.value)}
                className="mr-2"
              />
              <span>{cat.label}</span>
            </div>
          ))}
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 rounded font-semibold text-white ${
            isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting ? "Generating…" : "Generate Itinerary"}
        </button>
      </div>
    </form>
  );
}