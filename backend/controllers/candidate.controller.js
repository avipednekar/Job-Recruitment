import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import Job from "../models/Job.js";
import Candidate from "../models/Candidate.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No resume file uploaded" });
    }

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
      console.warn("Could not delete temp file:", e.message);
    }

    const skillsObj = parsedData.skills || {};
    const skillsList = skillsObj.skills || [];
    const summary = parsedData.personal_info?.summary || "";
    const location = parsedData.personal_info?.location || "";
    const experienceText = Array.isArray(parsedData.experience)
      ? parsedData.experience
          .map((entry) =>
            typeof entry === "string" ? entry : Object.values(entry || {}).join(" "),
          )
          .join(" ")
      : "";
    const projectText = Array.isArray(parsedData.projects)
      ? parsedData.projects
          .map((entry) =>
            typeof entry === "string" ? entry : Object.values(entry || {}).join(" "),
          )
          .join(" ")
      : "";
    const combinedText = `${summary} ${skillsList.join(" ")} ${experienceText} ${projectText} ${location}`.trim();

    let candidate;
    const initialEmbedding = new Array(384).fill(0);
    if (req.user?.id) {
      candidate = await Candidate.findOneAndUpdate(
        { user: req.user.id },
        {
          $set: { ...parsedData, user: req.user.id },
          $setOnInsert: { embedding: initialEmbedding }
        },
        { new: true, upsert: true }
      );
    } else {
      candidate = new Candidate({
        ...parsedData,
        embedding: initialEmbedding,
      });
      await candidate.save();
    }

    axios.post(`${AI_SERVICE_URL}/embed`, { text: combinedText })
      .then(async (embedRes) => {
        await Candidate.findByIdAndUpdate(candidate._id, { embedding: embedRes.data.embedding });
      })
      .catch((err) => console.warn("Background embedding failed:", err.message));

    res.status(201).json({
      success: true,
      candidate_id: candidate._id,
      parsed_data: parsedData,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    console.error("Upload Error:", error.message);
    res.status(500).json({ error: "Failed to process resume" });
  }
};

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
          name: candidate.personal_info?.name || "Unknown",
          email: candidate.personal_info?.email || "",
          overall_match_score: mr.overall_match_score,
          breakdown: mr.breakdown,
        });
      }
    }

    rankedCandidates.sort(
      (a, b) => b.overall_match_score - a.overall_match_score,
    );

    res.json({
      success: true,
      job_id: job._id,
      job_title: job.title,
      count: rankedCandidates.length,
      ranked_candidates: rankedCandidates,
    });
  } catch (error) {
    console.error("Ranking Error:", error.message);
    res.status(500).json({ error: "Failed to rank candidates" });
  }
};

