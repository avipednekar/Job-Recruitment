import { Router } from "express";
import {
  applyToJob,
  listApplications,
} from "../controllers/application.controller.js";
import { protect, authorize } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/:jobId", protect, authorize("job_seeker"), applyToJob);
router.get("/", protect, authorize("job_seeker"), listApplications);

export default router;
