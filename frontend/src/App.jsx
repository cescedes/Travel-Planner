import React, { useState } from "react";
import SearchForm from "./components/SearchForm";
import Itinerary from "./components/Itinerary";
import { Separator } from "@/components/ui/separator";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
      {/* Top Nav / Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">
            Travel Planner ✈️
          </h1>
          <span className="text-sm text-gray-500">
            AI-powered trip itineraries
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-10">
        <SearchForm onResult={setItinerary} setLoading={setLoading} />

        {loading && (
          <p className="text-center mt-6 text-gray-600 animate-pulse">
            Generating itinerary...
          </p>
        )}

        {itinerary && (
          <>
            <Separator className="my-10" />
            <Itinerary itinerary={itinerary} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-gray-500 py-6">
        © {new Date().getFullYear()} Travel Planner. Built with ❤️
      </footer>
    </div>
  );
}
