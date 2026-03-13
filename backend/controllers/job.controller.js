import axios from "axios";
import Job from "../models/Job.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

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
    const job = await Job.findById(req.params.id)
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
    let embedding = [];
    try {
      const embedRes = await axios.post(`${AI_SERVICE_URL}/embed`, {
        text: `${title} ${description}`,
      });
      embedding = embedRes.data.embedding;
    } catch {
      console.warn("AI service unavailable — saving job without embedding");
    }

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

    // Recalculate embeddings only if title or description changed
    if (title || description) {
      try {
        const embedRes = await axios.post(`${AI_SERVICE_URL}/embed`, {
          text: `${job.title} ${job.description}`,
        });
        job.embedding = embedRes.data.embedding;
      } catch {
        console.warn("AI service unavailable — updating job without new embedding");
      }
    }

    await job.save();
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

    console.log(`[Job Recs] Found ${internalJobs.length} active internal jobs. Requesting AI ranking...`);

    // 3. Ask Python AI to rank internal jobs
    if (internalJobs.length > 0) {
      try {
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/recommend_jobs`, {
          candidate_data: candidate,
          jobs_list: internalJobs,
        });
        
        // Map the scored IDs back to the full job objects
        if (aiResponse.data.success && aiResponse.data.ranked_jobs) {
          rankedInternal = aiResponse.data.ranked_jobs.map(ranked => {
            const fullJob = internalJobs.find(j => j._id.toString() === ranked.job_id);
            return {
              ...fullJob,
              match_metrics: ranked
            };
          });
        }
      } catch (err) {
        console.error("AI Recommendation Error:", err.message);
        // Fallback: just return latest jobs if AI fails
        rankedInternal = internalJobs.sort((a, b) => b.createdAt - a.createdAt);
      }
    }

    // 4. Fetch External Jobs (JSearch API)
    let externalJobs = [];
    try {
      // Build dynamic query: "[Latest Job Title] [Top Skill] in [Location]"
      let queryParts = [];
      if (candidate.experience && candidate.experience.length > 0) {
        queryParts.push(candidate.experience[0].title);
      }
      if (candidate.skills && candidate.skills.skills && candidate.skills.skills.length > 0) {
        queryParts.push(candidate.skills.skills[0]); 
      }
      
      const location = candidate.personal_info?.location || "";
      const query = queryParts.join(" ") + (location ? ` in ${location}` : "");
      
      if (query.trim() && process.env.RAPIDAPI_KEY) {
        const externalResponse = await axios.get("https://jsearch.p.rapidapi.com/search", {
          params: { query: query, num_pages: 1 },
          headers: {
            "x-rapidapi-key": process.env.RAPIDAPI_KEY,
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
          }
        });
        externalJobs = externalResponse.data.data.map(job => ({
          _id: job.job_id,
          id: job.job_id,
          title: job.job_title,
          company: job.employer_name,
          location: job.job_city ? `${job.job_city}, ${job.job_country}` : "Remote",
          description: job.job_description?.substring(0, 150) + "...",
          employment_type: job.job_employment_type?.replace(/_/g, " "),
          remote: job.job_is_remote,
          logo: job.employer_logo,
          apply_link: job.job_apply_link,
          external_url: job.job_apply_link,
          postedAt: job.job_posted_at_datetime_utc,
          source: "external"
        })) || [];
      }
    } catch (err) {
      console.error("External JSearch Error:", err.message);
      // Proceed without external jobs if it fails
    }

    res.json({
      success: true,
      internal: rankedInternal.slice(0, 10), // Top 10 internal recommendations
      external: externalJobs.slice(0, 10)    // Top 10 external recommendations
    });

  } catch (error) {
    console.error("=============== CRITICAL ERROR IN JOB RECOMMENDATIONS ===============");
    console.error("Error Message:", error.message);
    console.error("Stack Trace:", error.stack);
    res.status(500).json({ error: "Failed to generate job recommendations", details: error.message });
  }
};

