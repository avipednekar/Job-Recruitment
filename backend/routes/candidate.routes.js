import { Router } from "express";
import multer from "multer";
import {
  uploadResume,
  rankCandidates,
} from "../controllers/candidate.controller.js";
import upload from "../middleware/upload.middleware.js";

const router = Router();

router.post(
  "/upload",
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (req.files && req.files.length > 0) {
        req.file = req.files[0];
      }
      next();
    });
  },
  uploadResume,
);

router.get("/match/:jobId", rankCandidates);

export default router;
