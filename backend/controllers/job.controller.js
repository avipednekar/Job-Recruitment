import axios from "axios";
import Job from "../models/Job.js";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";
const INDIA_LABEL = "india";
const INDIA_STATE_TERMS = new Set([
  "andhra pradesh",
  "arunachal pradesh",
  "assam",
  "bihar",
  "chhattisgarh",
  "goa",
  "gujarat",
  "haryana",
  "himachal pradesh",
  "jharkhand",
  "karnataka",
  "kerala",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "orissa",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "uttar pradesh",
  "uttarakhand",
  "west bengal",
  "andaman and nicobar islands",
  "chandigarh",
  "dadra and nagar haveli and daman and diu",
  "daman and diu",
  "delhi",
  "national capital territory of delhi",
  "jammu and kashmir",
  "ladakh",
  "lakshadweep",
  "puducherry",
]);
const LOCATION_PREFIX_PATTERN =
  /^(village|vill|post|po|tal|taluka|tehsil|dist|district|near|via)\s+/i;
const INDIA_LOCATION_PARTS = new Set(["india", "in", "ind", "bharat"]);
const GENERIC_SEARCH_SKILLS = new Set([
  "algorithms",
  "data structures",
  "oop",
  "git",
  "postman",
  "system design",
  "problem solving",
]);
const COMMON_TECH_SKILLS = [
  "Python",
  "Java",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Express",
  "HTML",
  "CSS",
  "Next.js",
  "Angular",
  "Vue",
  "SQL",
  "MySQL",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Git",
  "Linux",
  "REST API",
  "GraphQL",
  "Spring Boot",
  "Django",
  "Flask",
  "FastAPI",
  "C#",
  ".NET",
  "PHP",
  "Laravel",
  "Android",
  "iOS",
  "Swift",
  "Kotlin",
  "Machine Learning",
  "AI",
  "Data Analysis",
  "Tableau",
  "Power BI",
  "Excel",
];
const ENTRY_LEVEL_TITLE_TERMS = [
  "fresher",
  "entry level",
  "entry-level",
  "junior",
  "associate",
  "intern",
  "internship",
  "trainee",
  "apprentice",
  "graduate",
];
const SENIOR_TITLE_TERMS = [
  "senior",
  "sr",
  "lead",
  "manager",
  "architect",
  "staff",
  "principal",
  "head",
];

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];
const splitLocationParts = (value = "") =>
  uniqueValues(
    String(value)
      .split(/[,/;()|-]+/)
      .map((part) => normalizeText(part))
      .filter(Boolean),
  );

const splitLocationTokens = (value = "") =>
  uniqueValues(
    String(value)
      .split(/[,/|()-]+/)
      .map((part) => normalizeText(String(part).replace(LOCATION_PREFIX_PATTERN, "")))
      .filter((part) => part && part !== INDIA_LABEL),
  );

const classifyLocationTokens = (value = "") => {
  const tokens = splitLocationTokens(value);
  const localityTerms = tokens.filter((token) => !INDIA_STATE_TERMS.has(token));
  const broaderTerms = tokens.filter((token) => INDIA_STATE_TERMS.has(token));

  return {
    tokens,
    localityTerms,
    broaderTerms,
  };
};

const getExternalJobLocationText = (job) =>
  normalizeText(
    [
      job?.job_city,
      job?.job_state,
      job?.job_location,
      job?.location,
      job?.job_country,
    ]
      .filter(Boolean)
      .join(" "),
  );

const isIndiaLocation = (value = "") =>
  splitLocationParts(value).some((part) => INDIA_LOCATION_PARTS.has(part));
const getCandidatePreferredLocation = (candidate) =>
  candidate?.personal_info?.location?.trim() || "";

const buildExternalJobText = (job) =>
  normalizeText(
    [
      job?.job_title,
      job?.job_description,
      job?.job_required_experience?.experience_mentioned,
      job?.job_highlights?.Qualifications?.join(" "),
      job?.job_highlights?.Responsibilities?.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );

const resolveSearchLocationTerms = (location = "") => {
  const { localityTerms, broaderTerms } = classifyLocationTokens(location);

  if (localityTerms.length >= 2) {
    return [...localityTerms.slice(-2), ...broaderTerms.slice(-1)];
  }
  if (localityTerms.length === 1) {
    return [...localityTerms, ...broaderTerms.slice(-1)];
  }
  return broaderTerms.slice(-1);
};

const isIndiaExternalJob = (job) =>
  isIndiaLocation(job?.job_country || "") ||
  isIndiaLocation(job?.job_location || "") ||
  isIndiaLocation(job?.location || "");

const matchesAnyLocationTerm = (jobLocation, terms = []) =>
  terms.some((term) => jobLocation.includes(term) || term.includes(jobLocation));

const matchesCandidateLocation = (job, candidateLocation) => {
  if (!candidateLocation) {
    return true;
  }

  if (job?.job_is_remote || job?.remote) {
    return true;
  }

  const target = normalizeText(candidateLocation);
  const { localityTerms, broaderTerms } = classifyLocationTokens(candidateLocation);
  const jobLocation = getExternalJobLocationText(job);

  if (!jobLocation) {
    return false;
  }

  if (jobLocation.includes(target) || target.includes(jobLocation)) {
    return true;
  }

  if (matchesAnyLocationTerm(jobLocation, localityTerms)) {
    return true;
  }

  return !localityTerms.length && matchesAnyLocationTerm(jobLocation, broaderTerms);
};

const getCandidateSkills = (candidate) =>
  Array.isArray(candidate?.skills?.skills) ? candidate.skills.skills : [];

const estimateCandidateYears = (candidate) => {
  const experience = Array.isArray(candidate?.experience) ? candidate.experience : [];

  if (!experience.length) {
    return 0;
  }

  return experience.reduce((total, entry) => {
    const entryText = typeof entry === "string"
      ? entry.toLowerCase()
      : Object.values(entry || {}).join(" ").toLowerCase();

    if (/(intern|internship|trainee|apprentice|fresher)/.test(entryText)) {
      return total + 0.4;
    }

    return total + 0.75;
  }, 0);
};

const inferCandidateSeniority = (candidate) => {
  const years = estimateCandidateYears(candidate);

  if (years < 0.5) return "fresher";
  if (years < 1.5) return "entry level";
  if (years < 3) return "junior";
  if (years < 5) return "mid level";
  return "senior";
};

const hasAnyKeyword = (text, keywords = []) => {
  const normalizedText = normalizeText(text);
  const tokens = new Set(normalizedText.split(" ").filter(Boolean));

  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeText(keyword);
    if (!normalizedKeyword) {
      return false;
    }
    if (normalizedKeyword.includes(" ")) {
      return normalizedText.includes(normalizedKeyword);
    }
    return tokens.has(normalizedKeyword);
  });
};

const extractRequiredYearsFromExternalJob = (job) => {
  const months = job?.job_required_experience?.required_experience_in_months;
  if (typeof months === "number" && !Number.isNaN(months)) {
    return months / 12;
  }

  const rawExperienceText = [
    job?.job_title,
    job?.job_required_experience?.experience_mentioned,
    job?.job_description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const experienceText = normalizeText(rawExperienceText);
  const rangeMatch = rawExperienceText.match(/(\d+)\s*(?:\+|plus)?\s*(?:-|to)\s*(\d+)\s*years?/i);
  if (rangeMatch) {
    return Number(rangeMatch[1]);
  }

  const numericMatch = rawExperienceText.match(/(\d+)\s*(?:\+|plus)?\s*years?/i);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  if (hasAnyKeyword(experienceText, ["principal", "staff"])) return 8;
  if (hasAnyKeyword(experienceText, ["architect", "manager", "lead"])) return 6;
  if (hasAnyKeyword(experienceText, ["senior"])) return 5;
  if (hasAnyKeyword(experienceText, ["mid", "intermediate"])) return 3;
  if (hasAnyKeyword(experienceText, ["junior"])) return 1;
  if (hasAnyKeyword(experienceText, ["entry", "fresher", "intern", "trainee", "apprentice", "graduate"])) return 0;
  return 0;
};

const exceedsCandidateExperience = (job, candidateYears) => {
  const requiredYears = extractRequiredYearsFromExternalJob(job);
  const titleText = normalizeText(job?.job_title || "");
  const fullText = buildExternalJobText(job);

  if (candidateYears < 0.5) {
    if (requiredYears >= 1) {
      return true;
    }
    if (hasAnyKeyword(titleText, SENIOR_TITLE_TERMS) || hasAnyKeyword(fullText, ["2 years", "3 years", "4 years", "5 years"])) {
      return true;
    }
  }

  if (candidateYears < 1.5 && hasAnyKeyword(titleText, ["lead", "manager", "architect", "staff", "principal", "head"])) {
    return true;
  }

  if (candidateYears < 2 && hasAnyKeyword(titleText, ["senior", "sr"])) {
    return true;
  }

  if (!requiredYears) {
    return false;
  }

  return (requiredYears - candidateYears) >= 1.5;
};

const inferRecommendationRole = (candidate, skills = []) => {
  const normalizedSkills = skills.map((skill) => normalizeText(skill));

  if (normalizedSkills.some((skill) => ["pytorch", "llms", "machine learning", "ml", "ai"].includes(skill))) {
    return "Machine Learning Engineer";
  }

  if (normalizedSkills.some((skill) => ["tableau", "sql", "data analysis"].includes(skill))) {
    return "Data Analyst";
  }

  if (normalizedSkills.some((skill) => ["aws", "terraform", "kubernetes", "devops"].includes(skill))) {
    return "DevOps Engineer";
  }

  if (normalizedSkills.some((skill) => ["react", "typescript", "javascript", "html", "css"].includes(skill))) {
    return "Frontend Developer";
  }

  if (normalizedSkills.some((skill) => ["nodejs", "node js", "mongodb", "mysql", "postgresql", "java", "python"].includes(skill))) {
    return "Software Engineer";
  }

  const latestRole =
    candidate?.experience?.[0]?.title ||
    candidate?.experience?.[0]?.role ||
    candidate?.experience?.[0]?.position ||
    "";

  return latestRole || "Software Engineer";
};

const pickSearchSkills = (skills = [], limit = 3) =>
  uniqueValues(
    skills
      .map((skill) => String(skill).trim())
      .filter((skill) => skill && !GENERIC_SEARCH_SKILLS.has(normalizeText(skill))),
  ).slice(0, limit);

const extractProjectKeywords = (projects = [], limit = 2) => {
  if (!Array.isArray(projects)) {
    return [];
  }

  const keywords = [];
  for (const project of projects) {
    const name = typeof project === "string" ? project : project?.name || project?.title || "";
    const description = typeof project === "object" ? project?.description || "" : "";

    if (name) keywords.push(name.trim());
    if (description) {
      const significantWords = description
        .split(/\s+/)
        .map((word) => word.replace(/[^a-zA-Z0-9+#]/g, ""))
        .filter((word) => word.length >= 4);
      keywords.push(...significantWords.slice(0, 2));
    }
  }

  return uniqueValues(keywords).slice(0, limit);
};

const buildExternalJobQuery = (candidate) => {
  const skills = getCandidateSkills(candidate);
  const role = inferRecommendationRole(candidate, skills);
  const topSkills = pickSearchSkills(skills, 3);
  const projectKeywords = extractProjectKeywords(candidate?.projects || [], 1);
  const location = getCandidatePreferredLocation(candidate);
  const seniority = inferCandidateSeniority(candidate);

  return uniqueValues([
    seniority,
    role,
    ...topSkills,
    ...projectKeywords,
    ...resolveSearchLocationTerms(location),
    "India",
  ]).join(" ");
};

const extractExternalJobSkills = (job, candidateSkills = []) => {
  const haystack = buildExternalJobText(job);
  const matchedCandidateSkills = candidateSkills.filter((skill) => {
    const normalizedSkill = normalizeText(skill);
    return normalizedSkill.length >= 2 && haystack.includes(normalizedSkill);
  });
  const matchedCommonSkills = COMMON_TECH_SKILLS.filter((skill) =>
    haystack.includes(normalizeText(skill)),
  );

  return uniqueValues([...matchedCandidateSkills, ...matchedCommonSkills]).slice(0, 12);
};

const scoreExternalJobLocally = (
  job,
  candidateSkills,
  candidateLocation,
  candidateYears,
  inferredRole,
) => {
  const titleText = normalizeText(job?.job_title || "");
  const jobText = buildExternalJobText(job);
  const inferredSkills = extractExternalJobSkills(job, candidateSkills);
  const normalizedCandidateSkills = candidateSkills.map((skill) => normalizeText(skill));
  const matchedSkills = inferredSkills.filter((skill) =>
    normalizedCandidateSkills.includes(normalizeText(skill)),
  );
  const skillScore = inferredSkills.length
    ? (matchedSkills.length / inferredSkills.length) * 100
    : 35;

  const roleTerms = normalizeText(inferredRole)
    .split(" ")
    .filter((token) => token.length >= 3);
  const roleMatches = roleTerms.filter((token) => titleText.includes(token) || jobText.includes(token));
  const roleScore = roleMatches.length ? Math.min(100, roleMatches.length * 35) : 20;

  const locationScore = matchesCandidateLocation(job, candidateLocation)
    ? 100
    : job?.job_is_remote
      ? 75
      : 0;

  const requiredYears = extractRequiredYearsFromExternalJob(job);
  let experienceFitScore = 70;
  if (requiredYears > 0) {
    if (candidateYears >= requiredYears) {
      experienceFitScore = 100;
    } else {
      experienceFitScore = Math.max(0, 100 - ((requiredYears - candidateYears) * 40));
    }
  }

  let careerStageScore = 55;
  if (candidateYears < 1.5) {
    if (hasAnyKeyword(titleText, ENTRY_LEVEL_TITLE_TERMS)) {
      careerStageScore = 100;
    } else if (hasAnyKeyword(titleText, SENIOR_TITLE_TERMS)) {
      careerStageScore = 0;
    }
  }

  const localScore = (
    (skillScore * 0.34) +
    (roleScore * 0.18) +
    (locationScore * 0.16) +
    (experienceFitScore * 0.20) +
    (careerStageScore * 0.12)
  );

  return {
    score: Math.round(localScore * 100) / 100,
    inferredSkills,
  };
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
      const query = buildExternalJobQuery(candidate);
      const candidateSkills = getCandidateSkills(candidate);
      const candidateLocation = getCandidatePreferredLocation(candidate);
      const candidateYears = estimateCandidateYears(candidate);
      const inferredRole = inferRecommendationRole(candidate, candidateSkills);
      
      if (query.trim() && process.env.RAPIDAPI_KEY) {
        const externalResponse = await axios.get("https://jsearch.p.rapidapi.com/search", {
          params: { query: query, num_pages: 1 },
          headers: {
            "x-rapidapi-key": process.env.RAPIDAPI_KEY,
            "x-rapidapi-host": "jsearch.p.rapidapi.com"
          }
        });
        externalJobs = externalResponse.data.data
          .filter((job) => !exceedsCandidateExperience(job, candidateYears))
          .filter((job) => isIndiaExternalJob({
            job_country: job.job_country,
            job_location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", "),
            location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", "),
          }))
          .filter((job) => matchesCandidateLocation(job, candidateLocation))
          .map((job) => {
            const localRanking = scoreExternalJobLocally(
              job,
              candidateSkills,
              candidateLocation,
              candidateYears,
              inferredRole,
            );

            return {
              _id: job.job_id,
              id: job.job_id,
              title: job.job_title,
              company: job.employer_name,
              location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", ") || "Remote",
              description: job.job_description || "",
              employment_type: job.job_employment_type?.replace(/_/g, " "),
              remote: job.job_is_remote,
              logo: job.employer_logo,
              apply_link: job.job_apply_link,
              external_url: job.job_apply_link,
              postedAt: job.job_posted_at_datetime_utc,
              salary_range: job.job_min_salary && job.job_max_salary
                ? `${job.job_min_salary}-${job.job_max_salary}`
                : "",
              experience_level: job.job_required_experience?.required_experience_in_months
                ? `${Math.round(job.job_required_experience.required_experience_in_months / 12)}+ years`
                : "",
              skills: localRanking.inferredSkills,
              source: "external",
              local_match_score: localRanking.score,
            };
          })
          .sort((left, right) => (right.local_match_score || 0) - (left.local_match_score || 0)) || [];

        if (externalJobs.length > 0) {
          try {
            const externalRankingResponse = await axios.post(`${AI_SERVICE_URL}/recommend_jobs`, {
              candidate_data: candidate,
              jobs_list: externalJobs,
            });

            if (externalRankingResponse.data.success && externalRankingResponse.data.ranked_jobs) {
              externalJobs = externalRankingResponse.data.ranked_jobs.map((ranked) => {
                const fullJob = externalJobs.find((job) => String(job.id) === ranked.job_id);
                const blendedScore = fullJob
                  ? ((ranked.overall_match_score * 0.7) + ((fullJob.local_match_score || 0) * 0.3))
                  : ranked.overall_match_score;
                return fullJob
                  ? {
                      ...fullJob,
                      match_metrics: {
                        ...ranked,
                        overall_match_score: Math.round(blendedScore * 100) / 100,
                      },
                      description: fullJob.description
                        ? `${fullJob.description.substring(0, 150)}...`
                        : "",
                    }
                  : null;
              })
                .filter(Boolean)
                .sort(
                  (left, right) =>
                    (right.match_metrics?.overall_match_score || 0) -
                    (left.match_metrics?.overall_match_score || 0),
                );
            } else {
              externalJobs = externalJobs.map((job) => ({
                ...job,
                match_metrics: {
                  overall_match_score: job.local_match_score || 0,
                },
                description: job.description ? `${job.description.substring(0, 150)}...` : "",
              }));
            }
          } catch (rankErr) {
            console.error("External AI Ranking Error:", rankErr.message);
            externalJobs = externalJobs.map((job) => ({
              ...job,
              match_metrics: {
                overall_match_score: job.local_match_score || 0,
              },
              description: job.description ? `${job.description.substring(0, 150)}...` : "",
            }));
          }
        }
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

