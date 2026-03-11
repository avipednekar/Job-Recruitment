import { Router } from "express";
import {
  getProfile,
  createJobSeekerProfile,
  createCompanyProfile,
  updateProfile,
} from "../controllers/profile.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

// All profile routes require authentication
router.use(protect);

router.get("/me", getProfile);
router.post("/job-seeker", authorize("job_seeker"), createJobSeekerProfile);
router.post("/company", authorize("recruiter"), createCompanyProfile);
router.put("/me", updateProfile);

export default router;
