import express from "express";
import cors from "cors";
import placesRoute from "./routes/places.js";
import itineraryRoute from "./routes/itinerary.js";
import autocompleteRoute from "./routes/autocomplete.js";
import 'dotenv/config';

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/places", placesRoute);
app.use("/api/itinerary", itineraryRoute);
app.use("/api/autocomplete", autocompleteRoute);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../public")));

// Catch-all route to serve React app for non-API routes
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
