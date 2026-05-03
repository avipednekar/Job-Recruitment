import { Router } from "express";
import {
  getProfile,
  upsertJobSeekerProfile,
  upsertCompanyProfile,
  uploadProfilePhoto,
  updateProfile,
} from "../controllers/profile.controller.js";
import multer from "multer";
import { protect, authorize } from "../middleware/auth.middleware.js";
import { profilePhotoUpload } from "../middleware/upload.middleware.js";

const router = Router();

// All profile routes require authentication
router.use(protect);

router.get("/me", getProfile);

router.post(
  "/photo",
  (req, res, next) => {
    profilePhotoUpload.fields([
      { name: "photo", maxCount: 1 },
      { name: "avatar", maxCount: 1 },
      { name: "logo", maxCount: 1 },
    ])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ error: err.message });
      }
      req.file = req.files?.photo?.[0] || req.files?.avatar?.[0] || req.files?.logo?.[0] || null;
      next();
    });
  },
  uploadProfilePhoto,
);

// Job seeker: POST or PUT both go to the same upsert handler
router.post("/job-seeker", authorize("job_seeker"), upsertJobSeekerProfile);
router.put("/job-seeker", authorize("job_seeker"), upsertJobSeekerProfile);

// Company: POST or PUT both go to the same upsert handler
router.post("/company", authorize("recruiter"), upsertCompanyProfile);
router.put("/company", authorize("recruiter"), upsertCompanyProfile);

// Unified update (routes by role internally)
router.put("/me", updateProfile);

export default router;
