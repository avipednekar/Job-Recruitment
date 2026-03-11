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

