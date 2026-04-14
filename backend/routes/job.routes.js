import { Router } from "express";
import {
  searchJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
  getJobRecommendations,
  getRecommendationInsights,
} from "../controllers/job.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", searchJobs);
router.get("/recommendations", protect, authorize("job_seeker"), getJobRecommendations);
router.post("/recommendation-insights", protect, authorize("job_seeker"), getRecommendationInsights);
router.get("/my", protect, authorize("recruiter", "admin"), getMyJobs);
router.get("/:id", getJobById);
router.post("/", protect, authorize("recruiter", "admin"), createJob);
router.put("/:id", protect, authorize("recruiter", "admin"), updateJob);
router.delete("/:id", protect, authorize("recruiter", "admin"), deleteJob);

export default router;
