import { Router } from "express";
import {
  getProfile,
  upsertJobSeekerProfile,
  upsertCompanyProfile,
  updateProfile,
} from "../controllers/profile.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// All profile routes require authentication
router.use(protect);

router.get("/me", getProfile);

// Job seeker: POST or PUT both go to the same upsert handler
router.post("/job-seeker", authorize("job_seeker"), upsertJobSeekerProfile);
router.put("/job-seeker", authorize("job_seeker"), upsertJobSeekerProfile);

// Company: POST or PUT both go to the same upsert handler
router.post("/company", authorize("recruiter"), upsertCompanyProfile);
router.put("/company", authorize("recruiter"), upsertCompanyProfile);

// Unified update (routes by role internally)
router.put("/me", updateProfile);

export default router;
