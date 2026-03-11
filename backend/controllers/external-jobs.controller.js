import axios from "axios";

// Node.js cache to avoid hitting RapidAPI rate limits unnecessarily
// 200 requests/month free tier = ~6.5 requests/day. 
// We should cache aggressively.
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const fetchExternalJobs = async (req, res) => {
  try {
    const { q, location, page = 1 } = req.query;
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      console.warn("RAPIDAPI_KEY not found. External jobs disabled.");
      return res.json({
        success: true,
        jobs: [],
        message: "External jobs disabled (missing API key)",
      });
    }

    const queryStr = `${q || "software"} ${location || ""}`.trim();
    const cacheKey = `${queryStr}-${page}`;

    // Check cache
    if (cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < CACHE_TTL) {
        return res.json({
          success: true,
          jobs: cachedData.jobs,
          cached: true,
        });
      }
      cache.delete(cacheKey);
    }

    const options = {
      method: "GET",
      url: "https://jsearch.p.rapidapi.com/search",
      params: {
        query: queryStr,
        page: page.toString(),
        num_pages: "1",
      },
      headers: {
        "x-rapidapi-key": apiKey,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    };

    const response = await axios.request(options);

    if (response.data && response.data.data) {
      // Map JSearch format to our component format
      const formattedJobs = response.data.data.map((job) => ({
        id: job.job_id,
        title: job.job_title,
        company: job.employer_name,
        location: `${job.job_city || ""}, ${job.job_country || ""}`.replace(/^, | , $/g, ""),
        logo: job.employer_logo,
        employment_type: job.job_employment_type || "Full-time",
        remote: job.job_is_remote,
        description: job.job_description,
        apply_link: job.job_apply_link,
        source: "external",
        postedAt: job.job_posted_at_datetime_utc,
      }));

      // Save to cache
      cache.set(cacheKey, {
        timestamp: Date.now(),
        jobs: formattedJobs,
      });

      return res.json({
        success: true,
        jobs: formattedJobs,
        cached: false,
      });
    }

    res.json({ success: true, jobs: [] });
  } catch (error) {
    if (error.response?.status === 429) {
      console.warn("RapidAPI rate limit exceeded.");
      return res.json({ success: true, jobs: [], error: "Rate limit exceeded" });
    }
    console.error("External Jobs Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to fetch external jobs" });
  }
};
