import { Router } from "express";
import { fetchExternalJobs } from "../controllers/external-jobs.controller.js";
import { scrapeDirectBoards } from "../controllers/external-jobs.controller.js";
import { optionalProtect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", optionalProtect, fetchExternalJobs);
router.post("/direct", optionalProtect, scrapeDirectBoards);

export default router;
