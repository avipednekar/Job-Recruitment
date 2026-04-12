import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import Job from "../models/Job.js";
import Candidate from "../models/Candidate.js";
import { buildEmbeddingText } from "../utils/embedding.utils.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

// ─────────────────────────────────────────────
// POST /api/candidates/upload
// ─────────────────────────────────────────────
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No resume file uploaded" });
    }

    console.log("[RESUME] Uploading file:", req.file.originalname, "| size:", req.file.size);

    const fileBuffer = fs.readFileSync(req.file.path);
    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const parseRes = await axios.post(`${AI_SERVICE_URL}/parse`, form, {
      headers: { ...form.getHeaders() },
    });

    const parsedData = parseRes.data.data;
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn("[RESUME] Could not delete temp file:", e.message);
    }

    // Flatten parsed data to match the new Candidate schema
    // The AI parser returns nested { personal_info, skills: { skills, confidence_score }, ... }
    const personalInfo = parsedData.personal_info || {};
    const rawSkills = parsedData.skills || {};
    const skillsList = Array.isArray(rawSkills) ? rawSkills : (rawSkills.skills || []);

    const flatCandidate = {
      name: personalInfo.name || "Unknown",
      email: personalInfo.email || "",
      phone: personalInfo.phone || "",
      location: personalInfo.location || "",
      github: personalInfo.github || "",
      linkedin: personalInfo.linkedin || "",
      summary: personalInfo.summary || "",
      skills: skillsList,
      education: parsedData.education || [],
      experience: parsedData.experience || [],
      projects: parsedData.projects || [],
    };

    console.log("[RESUME] Parsed data — skills:", skillsList.length,
      "| education:", flatCandidate.education.length,
      "| experience:", flatCandidate.experience.length,
      "| projects:", flatCandidate.projects.length);

    // Build embedding text from flat candidate
    const combinedText = buildEmbeddingText(flatCandidate);

    let candidate;
    const initialEmbedding = new Array(384).fill(0);

    if (req.user?.id) {
      candidate = await Candidate.findOneAndUpdate(
        { user: req.user.id },
        {
          $set: { ...flatCandidate, user: req.user.id },
          $setOnInsert: { embedding: initialEmbedding },
        },
        { new: true, upsert: true },
      );
      console.log("[RESUME] Upserted candidate for user:", req.user.id);
    } else {
      candidate = new Candidate({
        ...flatCandidate,
        embedding: initialEmbedding,
      });
      await candidate.save();
      console.log("[RESUME] Created anonymous candidate:", candidate._id);
    }

    // Fire-and-forget embedding update
    console.log("[RESUME] Sending embedding request to AI service (background)");
    axios
      .post(`${AI_SERVICE_URL}/embed`, { text: combinedText })
      .then(async (embedRes) => {
        await Candidate.findByIdAndUpdate(candidate._id, {
          embedding: embedRes.data.embedding,
        });
        console.log("[RESUME] Embedding updated for candidate:", candidate._id);
      })
      .catch((err) => console.warn("[RESUME] Background embedding failed:", err.message));

    // Return response — include both flat data and legacy nested format for frontend compatibility
    res.status(201).json({
      success: true,
      candidate_id: candidate._id,
      parsed_data: parsedData, // Keep original nested format so frontend auto-fill still works during transition
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    console.error("[RESUME] Upload Error:", error.message);
    res.status(500).json({ error: "Failed to process resume" });
  }
};

// ─────────────────────────────────────────────
// GET /api/candidates/match/:jobId
// ─────────────────────────────────────────────
export const rankCandidates = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await Job.findById(jobId).lean();

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const candidates = await Candidate.find().lean();

    if (!candidates.length) {
      return res.json({ success: true, count: 0, ranked_candidates: [] });
    }

    console.log("[MATCH] Ranking", candidates.length, "candidates for job:", job.title);

    const rankedCandidates = [];
    for (const candidate of candidates) {
      const matchRes = await axios.post(`${AI_SERVICE_URL}/match`, {
        job: job,
        candidate_data: candidate,
      });

      if (matchRes.data.success) {
        const mr = matchRes.data.match_result;
        rankedCandidates.push({
          candidate_id: candidate._id,
          name: candidate.name || "Unknown",
          email: candidate.email || "",
          overall_match_score: mr.overall_match_score,
          breakdown: mr.breakdown,
        });
      }
    }

    rankedCandidates.sort(
      (a, b) => b.overall_match_score - a.overall_match_score,
    );

    console.log("[MATCH] Ranked", rankedCandidates.length, "candidates. Top score:",
      rankedCandidates[0]?.overall_match_score || "N/A");

    res.json({
      success: true,
      job_id: job._id,
      job_title: job.title,
      count: rankedCandidates.length,
      ranked_candidates: rankedCandidates,
    });
  } catch (error) {
    console.error("[MATCH] Ranking Error:", error.message);
    res.status(500).json({ error: "Failed to rank candidates" });
  }
};
