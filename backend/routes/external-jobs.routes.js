import { Router } from "express";
import { fetchExternalJobs } from "../controllers/external-jobs.controller.js";

const router = Router();

router.get("/", fetchExternalJobs);

export default router;
