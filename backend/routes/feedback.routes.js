import { Router } from "express";
import { submitFeedback } from "../controllers/feedback.controller.js";

const router = Router();

// Public — no auth required
router.post("/", submitFeedback);

export default router;
