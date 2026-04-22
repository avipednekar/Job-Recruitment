import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

const getServiceErrorMessage = (error, fallbackMessage) => {
  if (error.response?.data?.error) return error.response.data.error;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.message) return error.message;
  return fallbackMessage;
};

// ─────────────────────────────────────────────
// POST /api/ats/check
// ─────────────────────────────────────────────
export const checkATSScore = async (req, res) => {
  try {
    const jobDescription = req.body.job_description;

    if (!req.file) {
      return res.status(400).json({ error: "No resume file uploaded. Use the field name `resume`." });
    }
    if (!jobDescription || jobDescription.trim().length === 0) {
      return res.status(400).json({ error: "Job description is required." });
    }

    console.log("[ATS Checker] Uploading file:", req.file.originalname, "| size:", req.file.size);

    // 1. Send Resume to /parse
    const fileBuffer = fs.readFileSync(req.file.path);
    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const parseRes = await axios.post(`${AI_SERVICE_URL}/parse`, form, {
      headers: { ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60000,
    });

    const parsedData = parseRes?.data?.data;
    if (!parseRes?.data?.success || !parsedData || typeof parsedData !== "object") {
      throw new Error(parseRes?.data?.error || "AI service returned an invalid resume parse response");
    }

    // Clean up temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      console.warn("[ATS Checker] Could not delete temp file:", e.message);
    }

    // Transform candidate data into flat structure for matching
    const personalInfo = parsedData.personal_info || {};
    const rawSkills = parsedData.skills || {};
    const skillsList = Array.isArray(rawSkills) ? rawSkills : (rawSkills.skills || []);

    const candidateData = {
      name: personalInfo.name || "Unknown",
      skills: skillsList,
      education: parsedData.education || [],
      experience: parsedData.experience || [],
      projects: parsedData.projects || [],
    };

    console.log("[ATS Checker] Candidate parsed. Sending to Gemini ATS...");

    // 2. Send to Gemini ATS Score Endpoint
    const matchRes = await axios.post(`${AI_SERVICE_URL}/ats_score`, {
      resume_text: JSON.stringify(candidateData),
      job_description: jobDescription,
    });

    if (!matchRes.data?.success || !matchRes.data?.match_result) {
      throw new Error("Failed to generate AI match score");
    }

    const matchResult = matchRes.data.match_result;

    res.json({
      success: true,
      job: {
        title: matchResult.job_title || "Target Role",
        experience_level: matchResult.required_experience || "Not specified",
      },
      match_result: {
        overall_match_score: matchResult.overall_match_score,
        breakdown: matchResult.breakdown,
        match_reasons: matchResult.match_reasons,
      },
      missing_skills: matchResult.missing_skills || [],
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    const message = getServiceErrorMessage(error, "Failed to analyze resume and job description.");
    console.error("[ATS Checker] Error:", message);
    res.status(500).json({ error: message });
  }
};
