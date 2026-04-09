import { Router } from "express";
import { fetchExternalJobs } from "../controllers/external-jobs.controller.js";
import { optionalProtect } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", optionalProtect, fetchExternalJobs);

export default router;
