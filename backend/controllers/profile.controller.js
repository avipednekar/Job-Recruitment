import User from "../models/User.js";
import Candidate from "../models/Candidate.js";
import Company from "../models/Company.js";
import axios from "axios";
import { buildEmbeddingText } from "../utils/embedding.utils.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

// ─────────────────────────────────────────────
// Helper: fire-and-forget embedding update
// ─────────────────────────────────────────────
const refreshEmbedding = (candidateId, candidateData) => {
  const text = buildEmbeddingText(candidateData);
  if (!text) {
    console.log("[PROFILE] Skipping embedding — no text to embed");
    return;
  }

  console.log("[PROFILE] Sending embedding request to AI service (background)");
  axios
    .post(`${AI_SERVICE_URL}/embed`, { text })
    .then(async (res) => {
      await Candidate.findByIdAndUpdate(candidateId, {
        embedding: res.data.embedding,
      });
      console.log("[PROFILE] Embedding updated successfully for candidate:", candidateId);
    })
    .catch((err) => console.warn("[PROFILE] Background embedding failed:", err.message));
};

// ─────────────────────────────────────────────
// GET /api/profile/me
// ─────────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    let profile = null;

    if (user.role === "job_seeker") {
      profile = await Candidate.findOne({ user: user._id }).lean();
    } else if (user.role === "recruiter") {
      profile = await Company.findOne({ user: user._id }).lean();
    }

    console.log("[PROFILE] GET /me — role:", user.role, "| hasProfile:", !!profile);

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileComplete: user.profileComplete,
        createdAt: user.createdAt,
      },
      profile,
    });
  } catch (error) {
    console.error("[PROFILE] Get Profile Error:", error.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// ─────────────────────────────────────────────
// POST|PUT /api/profile/job-seeker
// Upsert: creates if missing, updates if exists
// ─────────────────────────────────────────────
export const upsertJobSeekerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const {
      name, email, phone, location, github, linkedin, summary, title,
      skills, education, experience, projects,
      // Support legacy nested payloads from frontend (during transition)
      personal_info,
    } = req.body;

    // Build flat fields — prefer top-level, fall back to personal_info, then existing
    const fields = {
      name:     name     ?? personal_info?.name     ?? user.name,
      email:    email    ?? personal_info?.email    ?? user.email,
      phone:    phone    ?? personal_info?.phone    ?? "",
      location: location ?? personal_info?.location ?? "",
      github:   github   ?? personal_info?.github   ?? "",
      linkedin: linkedin ?? personal_info?.linkedin ?? "",
      summary:  summary  ?? personal_info?.summary  ?? "",
      title:    title    ?? "",
    };

    // Handle skills — accept both flat array and legacy { skills: [], confidence_score } format
    let flatSkills = skills;
    if (skills && !Array.isArray(skills) && Array.isArray(skills.skills)) {
      flatSkills = skills.skills;
    }
    if (!Array.isArray(flatSkills)) flatSkills = [];

    console.log("[PROFILE] Upserting job-seeker profile for user:", user._id.toString());
    console.log("[PROFILE] Fields — skills:", flatSkills.length, "| education:", (education || []).length,
      "| experience:", (experience || []).length, "| projects:", (projects || []).length);

    const candidate = await Candidate.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          ...fields,
          skills: flatSkills,
          education: education ?? [],
          experience: experience ?? [],
          projects: projects ?? [],
          user: user._id,
        },
        $setOnInsert: { embedding: new Array(384).fill(0) },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Link candidate to user and mark profile complete
    user.profileComplete = true;
    user.candidate = candidate._id;
    await user.save();

    // Fire-and-forget embedding refresh
    refreshEmbedding(candidate._id, candidate);

    res.status(201).json({
      success: true,
      message: "Job seeker profile saved",
      profile: candidate,
    });
  } catch (error) {
    console.error("[PROFILE] Upsert Job Seeker Error:", error.message);
    res.status(500).json({ error: "Failed to save job seeker profile" });
  }
};

// ─────────────────────────────────────────────
// POST|PUT /api/profile/company
// ─────────────────────────────────────────────
export const upsertCompanyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { name, description, website, location, industry, size, founded, logo } = req.body;

    console.log("[PROFILE] Upserting company profile for user:", user._id.toString());

    const company = await Company.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          name: name || user.name,
          description: description ?? "",
          website: website ?? "",
          location: location ?? "",
          industry: industry ?? "",
          size: size ?? "",
          founded: founded ?? "",
          logo: logo ?? "",
          user: user._id,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    user.profileComplete = true;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Company profile saved",
      profile: company,
    });
  } catch (error) {
    console.error("[PROFILE] Upsert Company Error:", error.message);
    res.status(500).json({ error: "Failed to save company profile" });
  }
};

// ─────────────────────────────────────────────
// PUT /api/profile/me  (unified update endpoint)
// Routes to the correct upsert based on role
// ─────────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update user-level name if provided
    if (req.body.name !== undefined) {
      user.name = req.body.name;
      await user.save();
    }

    if (user.role === "job_seeker") {
      // Delegate to the job-seeker upsert
      return upsertJobSeekerProfile(req, res);
    } else if (user.role === "recruiter") {
      return upsertCompanyProfile(req, res);
    }

    res.json({ success: true, message: "Profile updated" });
  } catch (error) {
    console.error("[PROFILE] Update Profile Error:", error.message);
    res.status(500).json({ error: "Failed to update profile" });
  }
};
