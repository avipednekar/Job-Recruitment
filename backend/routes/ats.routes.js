import express from "express";
import { checkATSScore } from "../controllers/ats.controller.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/check", upload.single("resume"), checkATSScore);

export default router;
