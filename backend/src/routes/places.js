import express from "express";
import { getPlacesForDestination } from "../utils/googlePlaces.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { destination } = req.query;
    if (!destination) return res.status(400).json({ error: "Destination is required" });

    const places = await getPlacesForDestination(destination);
    res.json({ places });
  } catch (err) {
    console.error("Error fetching places:", err);
    res.status(500).json({ error: "Failed to fetch places" });
  }
});

export default router;
