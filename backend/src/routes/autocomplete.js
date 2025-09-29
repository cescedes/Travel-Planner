import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { input } = req.query;
    if (!input) return res.status(400).json({ error: "Input is required" });

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&types=(cities)&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.predictions || data.status !== "OK") {
      console.error("Autocomplete error:", data);
      return res.status(500).json({ error: "Failed to fetch autocomplete suggestions" });
    }

    // Send predictions in a field frontend expects
    const suggestions = data.predictions.map((p) => ({
      description: p.description,
      place_id: p.place_id,
    }));

    res.json({ predictions: suggestions });
  } catch (err) {
    console.error("Autocomplete error:", err);
    res.status(500).json({ error: "Failed to fetch autocomplete suggestions" });
  }
});

export default router;
