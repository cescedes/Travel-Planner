import express from "express";
import cors from "cors";
import placesRoute from "./routes/places.js";
import itineraryRoute from "./routes/itinerary.js";
import autocompleteRoute from "./routes/autocomplete.js";
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/places", placesRoute);
app.use("/api/itinerary", itineraryRoute);
app.use("/api/autocomplete", autocompleteRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
