import axios from "axios";
import Candidate from "../models/Candidate.js";

// Node.js cache to avoid hitting RapidAPI rate limits unnecessarily
// 200 requests/month free tier = ~6.5 requests/day. 
// We should cache aggressively.
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const INDIA_LABEL = "india";
const CACHE_VERSION = "india-v2";
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

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

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

const getJobLocationText = (job) =>
  normalizeText(
    [
      job?.job_city,
      job?.job_state,
      job?.job_location,
      job?.job_country,
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

const buildIndiaScopedQuery = (q, location) =>
  [q || "software engineer", ...resolveSearchLocationTerms(location), "India"]
    .filter(Boolean)
    .join(" ")
    .trim();

const isIndiaJob = (job) =>
  normalizeText(job?.job_country || "").includes(INDIA_LABEL) ||
  normalizeText(job?.job_location || "").includes(INDIA_LABEL) ||
  normalizeText(job?.job_state || "").includes(INDIA_LABEL);

const matchesAnyLocationTerm = (jobLocation, terms = []) =>
  terms.some((term) => jobLocation.includes(term) || term.includes(jobLocation));

const matchesRequestedLocation = (job, requestedLocation) => {
  if (!requestedLocation) {
    return true;
  }

  if (job?.job_is_remote) {
    return true;
  }

  const target = normalizeText(requestedLocation);
  const { localityTerms, broaderTerms } = classifyLocationTokens(requestedLocation);
  const jobLocation = getJobLocationText(job);

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

export const fetchExternalJobs = async (req, res) => {
  try {
    const { q, location: requestedLocation, page = 1 } = req.query;
    const apiKey = process.env.RAPIDAPI_KEY;

    if (!apiKey) {
      console.warn("RAPIDAPI_KEY not found. External jobs disabled.");
      return res.json({
        success: true,
        jobs: [],
        message: "External jobs disabled (missing API key)",
      });
    }

    let resolvedLocation = String(requestedLocation || "").trim();

    if (!resolvedLocation && req.user?.role === "job_seeker") {
      const candidate = await Candidate.findOne({ user: req.user.id })
        .select("personal_info.location")
        .lean();
      resolvedLocation = candidate?.personal_info?.location?.trim() || "";
    }

    const queryStr = buildIndiaScopedQuery(q, resolvedLocation);
    const cacheKey = `${CACHE_VERSION}-${queryStr}-${resolvedLocation}-${page}`;

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
      const formattedJobs = response.data.data
        .filter((job) => isIndiaJob(job))
        .filter((job) => matchesRequestedLocation(job, resolvedLocation))
        .map((job) => ({
          id: job.job_id,
          title: job.job_title,
          company: job.employer_name,
          location: [job.job_city, job.job_state, job.job_country].filter(Boolean).join(", "),
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
