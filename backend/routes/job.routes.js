import { Router } from "express";
import {
  searchJobs,
  getJobById,
  createJob,
} from "../controllers/job.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", searchJobs);
router.get("/:id", getJobById);
router.post("/", protect, authorize("recruiter", "admin"), createJob);

export default router;
