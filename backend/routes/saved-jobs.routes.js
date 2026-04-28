import { Router } from "express";
import {
  toggleSavedJob,
  getSavedJobs,
  getSavedJobIds,
} from "../controllers/saved-jobs.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", protect, getSavedJobs);
router.get("/ids", protect, getSavedJobIds);
router.post("/:jobId", protect, toggleSavedJob);

export default router;
