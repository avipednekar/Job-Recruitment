import axios from "axios";
import { isValidObjectId } from "mongoose";
import Job from "../models/Job.js";


const insightsCache = new Map();
const INSIGHTS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";
import {
  buildExternalJobQuery,
  buildExternalJobQueries,
  getCandidateSkills,
  estimateCandidateYears,
  inferRecommendationRole,
  scoreExternalJobLocally,
} from "../utils/scoring.utils.js";

import {
  getCandidatePreferredLocation,
} from "../utils/location.utils.js";

const dedupeScrapedJobs = (jobs = []) => {
  const seenKeys = new Set();

  return jobs.filter((job) => {
    const key = [
      job?.id,
      job?.title,
      job?.company,
      job?.location,
      job?.apply_link,
    ]
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(/\s+/g, "");

    if (!key) {
      return true;
    }

    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
};

const getExternalMatchQuality = (score = 0) => {
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  if (score >= 12) return "low";
  return "stretch";
};

const buildExternalRecommendationJobs = ({
  jobs = [],
  candidateSkills = [],
  candidateLocation = "",
  candidateYears = 0,
  inferredRole = "",
}) =>
  dedupeScrapedJobs(jobs)
    .map((job, index) => {
      const localRanking = scoreExternalJobLocally(
        job,
        candidateSkills,
        candidateLocation,
        candidateYears,
        inferredRole,
      );

      if (localRanking?.excluded) {
        return null;
      }

      const uniqueId = job.id || `recommendation-external-${Date.now()}-${index}`;
      const overallScore = localRanking?.score || 0;

      return {
        _id: uniqueId,
        id: uniqueId,
        title: job.title,
        company: job.company,
        location: job.location,
        logo: job.logo,
        employment_type: job.employment_type || "Full-time",
        remote: job.remote,
        description: job.description,
        apply_link: job.apply_link,
        source: job.source || "external",
        source_type: "external",
        listing_source: job.source || "external",
        postedAt: job.postedAt,
        skills: localRanking?.inferredSkills || [],
        match_metrics: { overall_match_score: overallScore },
        local_match_score: overallScore,
        match_quality: getExternalMatchQuality(overallScore),
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right.local_match_score || 0) - (left.local_match_score || 0));

const fetchRecommendedExternalJobs = async ({
  candidate,
  candidateSkills,
  candidateLocation,
  candidateYears,
  inferredRole,
}) => {
  const query = buildExternalJobQuery(candidate) || inferredRole || "software engineer";
  const queries = buildExternalJobQueries(candidate);

  const response = await axios.post(`${AI_SERVICE_URL}/scrape_jobs`, {
    query,
    queries: queries.length ? queries : [query],
    location: candidateLocation || "India",
    page: 1,
  });

  return buildExternalRecommendationJobs({
    jobs: response.data?.jobs || [],
    candidateSkills,
    candidateLocation,
    candidateYears,
    inferredRole,
  });
};

/* ──────────────────────────────────────────────
   GET /api/jobs — Search, filter, paginate
   ────────────────────────────────────────────── */
export const searchJobs = async (req, res) => {
  try {
    const {
      q, // keyword search (title, company, description)
      location, // location filter (regex)
      experience, // experience_level filter
      type, // employment_type, comma-separated e.g. "Full-time,Contract"
      remote, // "true" to filter remote-only
      salaryMin, // minimum salary in thousands (e.g. 120 = $120k)
      page = 1,
      limit = 12,
    } = req.query;

    const filter = { status: "active" };

    // Keyword search — case-insensitive regex on title, company, description
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), "i");
      filter.$or = [
        { title: regex },
        { company: regex },
        { description: regex },
        { skills: regex },
      ];
    }

    // Location filter
    if (location && location.trim()) {
      filter.location = new RegExp(location.trim(), "i");
    }

    // Experience level
    if (experience && experience.trim()) {
      filter.experience_level = new RegExp(experience.trim(), "i");
    }

    // Employment type (supports comma-separated values)
    if (type && type.trim()) {
      const types = type.split(",").map((t) => t.trim());
      filter.employment_type = { $in: types };
    }

    // Remote only
    if (remote === "true") {
      filter.remote = true;
    }

    // Salary minimum filter
    if (salaryMin) {
      const minVal = parseInt(salaryMin, 10);
      if (!isNaN(minVal) && minVal > 0) {
        filter.salary_min = { $gte: minVal };
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const lim = parseInt(limit, 10);

    const [jobs, totalJobs] = await Promise.all([
      Job.find(filter)
        .select("-embedding")
        .sort({ urgent: -1, createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Job.countDocuments(filter),
    ]);

    res.json({
      success: true,
      jobs,
      totalJobs,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalJobs / lim),
    });
  } catch (error) {
    console.error("Job Search Error:", error.message);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
};

/* ──────────────────────────────────────────────
   GET /api/jobs/:id — Single job detail
   ────────────────────────────────────────────── */
export const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(404).json({
        error: "Job not found. External jobs should be opened from their original listing.",
      });
    }

    const job = await Job.findById(id)
      .select("-embedding")
      .populate("postedBy", "name email")
      .lean();

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error("Get Job Error:", error.message);
    res.status(500).json({ error: "Failed to fetch job" });
  }
};

/* ──────────────────────────────────────────────
   POST /api/jobs — Create job (recruiter only)
   ────────────────────────────────────────────── */
export const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      company,
      location,
      experience_level,
      salary_range,
      salary_min,
      salary_max,
      skills,
      employment_type,
      remote,
      urgent,
      logo,
      logoColor,
    } = req.body;

    if (!title || !description) {
      return res
        .status(400)
        .json({ error: "title and description are required" });
    }

    // Generate embedding via AI service (best-effort; continue without if unavailable)
    const embedding = new Array(384).fill(0);

    const job = new Job({
      title,
      description,
      company,
      location,
      experience_level,
      salary_range,
      salary_min: salary_min || 0,
      salary_max: salary_max || 0,
      skills: skills || [],
      employment_type: employment_type || "Full-time",
      remote: remote || false,
      urgent: urgent || false,
      logo: logo || "",
      logoColor: logoColor || "#2176FF",
      embedding,
      postedBy: req.user?.id,
    });

    await job.save();

    axios.post(`${AI_SERVICE_URL}/embed`, { text: `${title} ${description}` })
      .then(async (embedRes) => {
         await Job.findByIdAndUpdate(job._id, { embedding: embedRes.data.embedding });
      })
      .catch(() => console.warn("Background embedding failed"));

    res.status(201).json({ success: true, job });
  } catch (error) {
    console.error("Job Create Error:", error.message);
    res.status(500).json({ error: "Failed to create job" });
  }
};

/* ──────────────────────────────────────────────
   PUT /api/jobs/:id — Update job (recruiter only)
   ────────────────────────────────────────────── */
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Ensure the user updating the job is the one who posted it, or an admin
    if (job.postedBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to update this job" });
    }

    const {
      title,
      description,
      company,
      location,
      experience_level,
      salary_range,
      salary_min,
      salary_max,
      skills,
      employment_type,
      remote,
      urgent,
      logo,
      logoColor,
      status, // Can change status to closed or draft
    } = req.body;

    if (title) job.title = title;
    if (description) job.description = description;
    if (company !== undefined) job.company = company;
    if (location !== undefined) job.location = location;
    if (experience_level !== undefined) job.experience_level = experience_level;
    if (salary_range !== undefined) job.salary_range = salary_range;
    if (salary_min !== undefined) job.salary_min = salary_min;
    if (salary_max !== undefined) job.salary_max = salary_max;
    if (skills !== undefined) job.skills = skills;
    if (employment_type !== undefined) job.employment_type = employment_type;
    if (remote !== undefined) job.remote = remote;
    if (urgent !== undefined) job.urgent = urgent;
    if (logo !== undefined) job.logo = logo;
    if (logoColor !== undefined) job.logoColor = logoColor;
    if (status !== undefined) job.status = status;

    const shouldUpdateEmbedding = title || description;

    await job.save();

    if (shouldUpdateEmbedding) {
      axios.post(`${AI_SERVICE_URL}/embed`, { text: `${job.title} ${job.description}` })
        .then(async (embedRes) => {
           await Job.findByIdAndUpdate(job._id, { embedding: embedRes.data.embedding });
        })
        .catch(() => console.warn("Background embedding failed"));
    }

    res.json({ success: true, job });
  } catch (error) {
    console.error("Job Update Error:", error.message);
    res.status(500).json({ error: "Failed to update job" });
  }
};

/* ──────────────────────────────────────────────
   DELETE /api/jobs/:id — Delete job (recruiter only)
   ────────────────────────────────────────────── */
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.postedBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized to delete this job" });
    }

    await job.deleteOne();
    res.json({ success: true, message: "Job deleted successfully" });
  } catch (error) {
    console.error("Job Delete Error:", error.message);
    res.status(500).json({ error: "Failed to delete job" });
  }
};

/* ──────────────────────────────────────────────
   GET /api/jobs/my — Get jobs posted by the logged-in recruiter
   ────────────────────────────────────────────── */
export const getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ postedBy: req.user.id })
      .select("-embedding")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: jobs.length, jobs });
  } catch (error) {
    console.error("Get My Jobs Error:", error.message);
    res.status(500).json({ error: "Failed to fetch your jobs" });
  }
};

/* ──────────────────────────────────────────────
   GET /api/jobs/recommendations — Hybrid Recommend Engine
   ────────────────────────────────────────────── */
export const getJobRecommendations = async (req, res) => {
  try {
    console.log("[Job Recs] Fetching profile for user:", req.user?.id);
    
    // 1. Fetch user's candidate profile (if job_seeker)
    const Candidate = (await import("../models/Candidate.js")).default;
    const candidate = await Candidate.findOne({ user: req.user.id }).lean();

    if (!candidate) {
      return res.status(404).json({ error: "Candidate profile not found. Please upload a resume first." });
    }

    // 2. Fetch all active internal jobs
    const internalJobs = await Job.find({ status: "active" }).lean();
    let rankedInternal = [];
    const candidateSkills = getCandidateSkills(candidate);
    const candidateLocation =
      getCandidatePreferredLocation(candidate) ||
      candidate?.personal_info?.location?.trim() ||
      "";
    const candidateYears = estimateCandidateYears(candidate);
    const inferredRole = inferRecommendationRole(candidate, candidateSkills);

    console.log(`[Job Recs] Found ${internalJobs.length} active internal jobs. Requesting AI ranking...`);

    // 3. Ask Python AI to rank internal jobs
    if (internalJobs.length > 0) {
      try {
        const internalLocalRankings = new Map(
          internalJobs.map((job) => [
            job._id.toString(),
            scoreExternalJobLocally(
              job,
              candidateSkills,
              candidateLocation,
              candidateYears,
              inferredRole,
            ),
          ]),
        );

        const aiResponse = await axios.post(`${AI_SERVICE_URL}/recommend_jobs`, {
          candidate_data: candidate,
          jobs_list: internalJobs,
        });
        
        // Map the scored IDs back to the full job objects
        if (aiResponse.data.success && aiResponse.data.ranked_jobs) {
          rankedInternal = aiResponse.data.ranked_jobs.map(ranked => {
            const fullJob = internalJobs.find(j => j._id.toString() === ranked.job_id);
            const localRanking = fullJob ? internalLocalRankings.get(fullJob._id.toString()) : null;
            if (!fullJob || localRanking?.excluded) {
              return null;
            }
            const blendedScore = (ranked.overall_match_score * 0.65) + ((localRanking?.score || 0) * 0.35);
            return {
              ...fullJob,
              match_metrics: {
                ...ranked,
                overall_match_score: Math.round(blendedScore * 100) / 100,
              },
            };
          })
            .filter(Boolean)
            .sort(
              (left, right) =>
                (right.match_metrics?.overall_match_score || 0) -
                (left.match_metrics?.overall_match_score || 0),
            );
        }
      } catch (err) {
        console.error("AI Recommendation Error:", err.message);
        // Fallback: just return latest jobs if AI fails
        rankedInternal = internalJobs.sort((a, b) => b.createdAt - a.createdAt);
      }
    }

    let externalJobs = [];

    try {
      externalJobs = await fetchRecommendedExternalJobs({
        candidate,
        candidateSkills,
        candidateLocation,
        candidateYears,
        inferredRole,
      });
    } catch (err) {
      console.error("External Recommendation Error:", err.message);
      externalJobs = [];
    }

    // Build profile completeness info
    const profileCompleteness = {
      has_skills: getCandidateSkills(candidate).length > 0,
      has_experience: (Array.isArray(candidate?.experience) ? candidate.experience : []).length > 0,
      has_location: Boolean(candidateLocation),
      has_education: (Array.isArray(candidate?.education) ? candidate.education : []).length > 0,
      score: 0,
    };
    profileCompleteness.score = [
      profileCompleteness.has_skills,
      profileCompleteness.has_experience,
      profileCompleteness.has_location,
      profileCompleteness.has_education,
    ].filter(Boolean).length * 25;

    res.json({
      success: true,
      internal: rankedInternal.slice(0, 10),
      external: externalJobs.slice(0, 30),
      profile_completeness: profileCompleteness,
    });

  } catch (error) {
    console.error("=============== CRITICAL ERROR IN JOB RECOMMENDATIONS ===============");
    console.error("Error Message:", error.message);
    console.error("Stack Trace:", error.stack);
    res.status(500).json({ error: "Failed to generate job recommendations", details: error.message });
  }
};


/* ──────────────────────────────────────────────
   POST /api/jobs/recommendation-insights
   Gemini-powered insights (loaded separately, after recs)
   ────────────────────────────────────────────── */
export const getRecommendationInsights = async (req, res) => {
  try {
    const { top_jobs = [] } = req.body;

    const Candidate = (await import("../models/Candidate.js")).default;
    const candidate = await Candidate.findOne({ user: req.user.id }).lean();

    if (!candidate) {
      return res.json({ success: true, insights: null });
    }

    const jobIdsKey = top_jobs.map((j) => j.id || j._id).sort().join("|");
    const cacheKey = `${req.user.id}-${jobIdsKey}`;

    if (insightsCache.has(cacheKey)) {
      const cached = insightsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < INSIGHTS_CACHE_TTL) {
        return res.json({ success: true, insights: cached.insights, cached: true });
      }
      insightsCache.delete(cacheKey);
    }

    const skills = getCandidateSkills(candidate);
    const role = inferRecommendationRole(candidate, skills);
    const experience = Array.isArray(candidate?.experience) ? candidate.experience : [];
    const latestRole = experience[0]?.title || experience[0]?.role || "";

    const candidateSummary = [
      `Role: ${role}`,
      `Skills: ${skills.slice(0, 10).join(", ")}`,
      latestRole ? `Latest position: ${latestRole}` : "",
      `Experience entries: ${experience.length}`,
      candidate?.location ? `Location: ${candidate.location}` : "",
    ].filter(Boolean).join(". ");

    const scores = top_jobs.map((j) => j.match_score || 0).filter(Boolean);
    const scoreRange = {
      highest: Math.max(...scores, 0),
      lowest: Math.min(...scores, 0),
      average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
    };

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";
    const response = await axios.post(`${AI_SERVICE_URL}/recommend_insights`, {
      candidate_summary: candidateSummary,
      top_jobs,
      score_range: scoreRange,
    });

    if (response.data?.success && response.data?.insights) {
      insightsCache.set(cacheKey, {
        timestamp: Date.now(),
        insights: response.data.insights,
      });
      return res.json({ success: true, insights: response.data.insights });
    }

    res.json({ success: true, insights: null });
  } catch (error) {
    console.error("Recommendation Insights Error:", error.message);
    res.json({ success: true, insights: null });
  }
};
