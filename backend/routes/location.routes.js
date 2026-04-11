import { Router } from "express";
import { searchLocations } from "../controllers/location.controller.js";

const router = Router();

// Used for frontend autocomplete, no auth required
router.get("/search", searchLocations);

export default router;
