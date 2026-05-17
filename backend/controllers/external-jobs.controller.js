import axios from "axios";
import Candidate from "../models/Candidate.js";

/**
 * Fetch external jobs matched to the user's profile.
 * Uses candidate's job title and skills to build relevant search queries.
 * No caching, no rate limits. Scrape → deduplicate → return.
 */
export const fetchExternalJobs = async (req, res) => {
  try {
    const { q, location: requestedLocation, page = 1 } = req.query;

    let resolvedLocation = String(requestedLocation || "").trim();
    let candidate = null;

    // Fetch candidate profile for personalized queries
    if (req.user?.role === "job_seeker") {
      candidate = await Candidate.findOne({ user: req.user.id }).lean();
      if (!resolvedLocation) {
        resolvedLocation =
          candidate?.location?.trim() ||
          candidate?.personal_info?.location?.trim() ||
          "";
      }
    }

    // Build search query from user input OR candidate profile
    let queryStr = String(q || "").trim();
    if (!queryStr && candidate) {
      // Use candidate's job title and top skills
      const title = candidate.experience?.[0]?.jobTitle
        || candidate.personal_info?.title
        || "";
      const skills = (candidate.skills || []).slice(0, 3).join(" ");
      queryStr = [title, skills].filter(Boolean).join(" ").trim();
    }
    if (!queryStr) queryStr = "software engineer";

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";

    // Scrape jobs from AI service
    const response = await axios.post(`${AI_SERVICE_URL}/scrape_jobs`, {
      query: queryStr,
      queries: [queryStr],
      location: resolvedLocation || "India",
      page: Number(page),
    }, {
      timeout: 60000,
    });

    const scrapedJobs = response.data?.jobs || [];

    // Simple deduplication by title+company
    const seenKeys = new Set();
    const uniqueJobs = scrapedJobs.filter(job => {
      const key = `${job.title || ""}-${job.company || ""}`.toLowerCase().replace(/\s+/g, "");
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    // Format for frontend
    const formattedJobs = uniqueJobs.map((job, index) => ({
      _id: job.id || `${Date.now()}-${index}`,
      id: job.id || `${Date.now()}-${index}`,
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
      experience_range: job.experience_range || "",
      skills: Array.isArray(job.skills) ? job.skills : [],
      salary_range: job.salary_range || "",
    }));

    console.log(`[External Jobs] Query: "${queryStr}" | Scraped: ${scrapedJobs.length} → Unique: ${uniqueJobs.length}`);

    res.json({
      success: true,
      jobs: formattedJobs,
      meta: {
        total: formattedJobs.length,
        query: queryStr,
        source_breakdown: response.data?.meta?.source_breakdown || {},
      },
    });
  } catch (error) {
    console.error("External Jobs Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to fetch external jobs" });
  }
};
