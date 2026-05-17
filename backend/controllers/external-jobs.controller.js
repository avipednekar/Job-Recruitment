import axios from "axios";
import Candidate from "../models/Candidate.js";
import {
  buildExternalJobQueries,
  buildExternalJobQuery,
  getCandidateSkills,
  estimateCandidateYears,
  inferRecommendationRole,
  scoreExternalJobLocally,
  isFreshExternalJob,
} from "../utils/scoring.utils.js";

// Node.js cache to avoid hitting RapidAPI rate limits unnecessarily
// 200 requests/month free tier = ~6.5 requests/day. 
// We should cache aggressively.
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const AI_SCRAPE_TIMEOUT_MS = Number(process.env.AI_SCRAPE_TIMEOUT_MS || 15000);
const EXTERNAL_JOB_MAX_AGE_HOURS = Number(process.env.EXTERNAL_JOB_MAX_AGE_HOURS || 168);
import { INDIA_LABEL, INDIA_STATE_TERMS, LOCATION_PREFIX_PATTERN, INDIA_LOCATION_PARTS } from "../utils/constants.js";
const CACHE_VERSION = "india-v3";
const LOCATION_GROUP_SPLIT_REGEX = /\s*(?:;|\||\r?\n)+\s*/;

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
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

const splitLocationGroups = (value = "") =>
  uniqueValues(
    String(value)
      .split(LOCATION_GROUP_SPLIT_REGEX)
      .map((part) => String(part).trim())
      .filter(Boolean),
  );

const splitLocationTokens = (value = "") =>
  uniqueValues(
    String(value)
      .split(/[,/()-]+/)
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
  const groups = splitLocationGroups(location);
  const localityTerms = [];
  const broaderTerms = [];

  groups.forEach((group) => {
    const classified = classifyLocationTokens(group);
    localityTerms.push(...classified.localityTerms);
    broaderTerms.push(...classified.broaderTerms);
  });

  const uniqueLocalityTerms = uniqueValues(localityTerms);
  const uniqueBroaderTerms = uniqueValues(broaderTerms);

  if (uniqueLocalityTerms.length >= 3) {
    return [...uniqueLocalityTerms.slice(0, 3), ...uniqueBroaderTerms.slice(0, 1)];
  }
  if (uniqueLocalityTerms.length >= 1) {
    return [...uniqueLocalityTerms, ...uniqueBroaderTerms.slice(0, 1)];
  }
  return uniqueBroaderTerms.slice(0, 2);
};

const buildIndiaScopedQuery = (q, location) =>
  [q || "software engineer", ...resolveSearchLocationTerms(location), "India"]
    .filter(Boolean)
    .join(" ")
    .trim();

const skillTokensFromCandidate = (candidate, limit = 2) =>
  uniqueValues(
    getCandidateSkills(candidate)
      .map((skill) => String(skill || "").trim())
      .filter(Boolean),
  ).slice(0, limit);

const buildManualSearchVariants = (query, candidate) => {
  const rawQuery = String(query || "").trim();
  if (!rawQuery) {
    return candidate ? buildExternalJobQueries(candidate) : ["software engineer"];
  }

  const normalizedQuery = normalizeText(rawQuery);
  const topSkills = skillTokensFromCandidate(candidate, 2);
  let roleVariants = [];

  if (
    normalizedQuery.includes("full stack") ||
    normalizedQuery.includes("fullstack") ||
    normalizedQuery.includes("mern") ||
    normalizedQuery.includes("mean")
  ) {
    roleVariants = [
      "Full Stack Developer",
      "MERN Stack Developer",
      "Software Engineer",
      "Backend Developer",
    ];
  } else if (
    normalizedQuery.includes("frontend") ||
    normalizedQuery.includes("front end") ||
    normalizedQuery.includes("react")
  ) {
    roleVariants = [
      "Frontend Developer",
      "React Developer",
      "Software Engineer",
    ];
  } else if (
    normalizedQuery.includes("backend") ||
    normalizedQuery.includes("back end") ||
    normalizedQuery.includes("node") ||
    normalizedQuery.includes("java") ||
    normalizedQuery.includes("python")
  ) {
    roleVariants = [
      "Backend Developer",
      "Software Engineer",
      "API Developer",
    ];
  } else if (
    normalizedQuery.includes("data analyst") ||
    normalizedQuery.includes("analytics") ||
    normalizedQuery.includes("power bi") ||
    normalizedQuery.includes("tableau")
  ) {
    roleVariants = [
      "Data Analyst",
      "Business Intelligence Analyst",
      "Analytics Engineer",
    ];
  }

  return uniqueValues([
    rawQuery,
    ...roleVariants.map((variant, index) =>
      uniqueValues([variant, ...topSkills.slice(0, index === 0 ? 2 : 1)]).join(" "),
    ),
  ]).slice(0, 5);
};

const isIndiaLocation = (value = "") =>
  splitLocationParts(value).some((part) => INDIA_LOCATION_PARTS.has(part));

const isIndiaJob = (job) =>
  isIndiaLocation(job?.job_country || "") ||
  isIndiaLocation(job?.job_location || "") ||
  isIndiaLocation(job?.job_state || "");

const matchesAnyLocationTerm = (jobLocation, terms = []) =>
  terms.some((term) => jobLocation.includes(term) || term.includes(jobLocation));

const matchesRequestedLocation = (job, requestedLocation) => {
  if (!requestedLocation) {
    return true;
  }

  if (job?.job_is_remote) {
    return true;
  }

  const jobLocation = getJobLocationText(job);
  const requestedGroups = splitLocationGroups(requestedLocation);

  if (!jobLocation) {
    return false;
  }

  return requestedGroups.some((group) => {
    const target = normalizeText(group);
    const { localityTerms, broaderTerms } = classifyLocationTokens(group);

    if (jobLocation.includes(target) || target.includes(jobLocation)) {
      return true;
    }

    if (matchesAnyLocationTerm(jobLocation, localityTerms)) {
      return true;
    }

    return !localityTerms.length && matchesAnyLocationTerm(jobLocation, broaderTerms);
  });
};

export const fetchExternalJobs = async (req, res) => {
  try {
    const { q, location: requestedLocation, page = 1 } = req.query;

    let resolvedLocation = String(requestedLocation || "").trim();
    let candidate = null;

    if (!resolvedLocation && req.user?.role === "job_seeker") {
      candidate = await Candidate.findOne({ user: req.user.id })
        .lean();
      resolvedLocation =
        candidate?.location?.trim() ||
        candidate?.personal_info?.location?.trim() ||
        "";
    } else if (req.user?.role === "job_seeker") {
      candidate = await Candidate.findOne({ user: req.user.id }).lean();
    }

    const queryStr = String(q || "").trim() || buildExternalJobQuery(candidate) || "software engineer";
    const queries = buildManualSearchVariants(queryStr, candidate);
    const cacheKey = `${CACHE_VERSION}-jsearch-${queries.join("|")}-${resolvedLocation}-${page}`;

    // Check cache
    if (cache.has(cacheKey)) {
      const cachedData = cache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < CACHE_TTL) {
        return res.json({
          success: true,
          jobs: cachedData.jobs,
          meta: cachedData.meta,
          cached: true,
        });
      }
      cache.delete(cacheKey);
    }

    if (!process.env.RAPIDAPI_KEY) {
      console.warn("Missing RAPIDAPI_KEY. External jobs disabled.");
      return res.json({ success: true, jobs: [] });
    }

    const externalResponse = await axios.get("https://jsearch.p.rapidapi.com/search", {
      params: { query: `${queryStr} in ${resolvedLocation || "India"}`, num_pages: 1, page: page },
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com"
      }
    });

    if (externalResponse.data && externalResponse.data.data) {
      const scrapedJobs = externalResponse.data.data.map(job => ({
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
        experience_level: job.job_required_experience?.required_experience_in_months
          ? `${Math.round(job.job_required_experience.required_experience_in_months / 12)}+ years`
          : "",
      }));

      // Deduplicate jobs by title, company, and location
      const seenKeys = new Set();
      const freshScrapedJobs = scrapedJobs.filter((job) =>
        isFreshExternalJob(job, EXTERNAL_JOB_MAX_AGE_HOURS),
      );

      const uniqueScrapedJobs = freshScrapedJobs.filter(job => {
        const key = `${job.title || ""}-${job.company || ""}-${job.location || ""}`.toLowerCase().replace(/\s+/g, "");
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      // Prepare scoring params if candidate exists
      const candidateSkills = candidate ? getCandidateSkills(candidate) : [];
      let candidateLocation = candidate?.location?.trim() || candidate?.personal_info?.location?.trim() || "";
      const candidateYears = candidate ? estimateCandidateYears(candidate) : 0;
      const inferredRole = candidate ? inferRecommendationRole(candidate, candidateSkills) : "";

      const formattedJobs = uniqueScrapedJobs.map((job, index) => {
        const uniqueId = job.id || `${Date.now()}-${index}`;
        
        let localRanking = null;
        if (candidate) {
          localRanking = scoreExternalJobLocally(job, candidateSkills, candidateLocation, candidateYears, inferredRole);
        }

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
          experience_range: job.experience_range || "",
          skills: localRanking ? localRanking.inferredSkills : [],
          match_metrics: localRanking ? { overall_match_score: localRanking.score } : null,
          local_match_score: localRanking ? localRanking.score : null,
          match_quality: localRanking 
            ? (localRanking.score >= 60 ? "high" : localRanking.score >= 35 ? "medium" : localRanking.score >= 12 ? "low" : "stretch") 
            : null
        };
      });

      // Sort by score so the best matches are always on top
      if (candidate) {
        formattedJobs.sort((a,b) => (b.local_match_score || 0) - (a.local_match_score || 0));
      }

      const meta = {
        total: formattedJobs.length,
        query: queryStr,
        queries,
        source_breakdown: { "jsearch": formattedJobs.length },
      };

      // Save to cache
      cache.set(cacheKey, {
        timestamp: Date.now(),
        jobs: formattedJobs,
        meta,
      });

      return res.json({
        success: true,
        jobs: formattedJobs,
        meta,
        cached: false,
      });
    }

    res.json({ success: true, jobs: [] });
  } catch (error) {
    console.error("External Jobs Fetch Error:", error.message);
    res.status(500).json({ error: "Failed to fetch external jobs" });
  }
};
