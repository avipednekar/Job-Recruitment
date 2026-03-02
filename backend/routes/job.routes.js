import { Router } from "express";
import { createJob, listJobs } from "../controllers/job.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", listJobs);
router.post("/", protect, authorize("recruiter", "admin"), createJob);

export default router;
