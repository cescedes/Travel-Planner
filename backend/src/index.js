import express from "express";
import cors from "cors";
import placesRoute from "./routes/places.js";
import itineraryRoute from "./routes/itinerary.js";
import autocompleteRoute from "./routes/autocomplete.js";
import 'dotenv/config';

import path from "path";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/places", placesRoute);
app.use("/api/itinerary", itineraryRoute);
app.use("/api/autocomplete", autocompleteRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

// Serve frontend static files
app.use(express.static(path.join(process.cwd(), "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));