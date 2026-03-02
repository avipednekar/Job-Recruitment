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

    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path));

    const parseRes = await axios.post(`${AI_SERVICE_URL}/parse`, form, {
      headers: { ...form.getHeaders() },
    });

    const parsedData = parseRes.data.data;
    fs.unlinkSync(req.file.path);

    const skillsObj = parsedData.skills || {};
    const skillsList = skillsObj.skills || [];
    const summary = parsedData.personal_info?.summary || "";
    const combinedText = `${summary} ${skillsList.join(" ")}`;

    const embedRes = await axios.post(`${AI_SERVICE_URL}/embed`, {
      text: combinedText,
    });
    const embedding = embedRes.data.embedding;

    const candidate = new Candidate({
      ...parsedData,
      embedding,
      user: req.user?.id,
    });

    await candidate.save();

    res.status(201).json({
      success: true,
      candidate_id: candidate._id,
      parsed_data: parsedData,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
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
