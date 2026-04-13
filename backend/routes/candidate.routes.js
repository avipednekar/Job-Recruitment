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
    upload.fields([
      { name: "file", maxCount: 1 },
      { name: "resume", maxCount: 1 },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      req.file = req.files?.file?.[0] || req.files?.resume?.[0] || null;
      next();
    });
  },
  uploadResume,
);

router.get("/match/:jobId", rankCandidates);

export default router;
