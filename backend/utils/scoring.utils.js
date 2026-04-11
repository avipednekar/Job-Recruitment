import {
  ENTRY_LEVEL_TITLE_TERMS,
  SENIOR_TITLE_TERMS,
  GENERIC_SEARCH_SKILLS,
  COMMON_TECH_SKILLS,
} from "./constants.js";

import {
  normalizeText,
  uniqueValues,
  resolveSearchLocationTerms,
  classifyLocationTokens,
  getExternalJobLocationText,
  isIndiaLocation,
  isIndiaExternalJob,
  matchesAnyLocationTerm,
  matchesCandidateLocation,
  getCandidatePreferredLocation,
} from "./location.utils.js";

// Helper used internally by scoring
const buildExternalJobText = (job) =>
  normalizeText(
    [
      job?.title,
      job?.description,
      job?.job_level,
    ]
      .filter(Boolean)
      .join(" "),
  );

export const getCandidateSkills = (candidate) =>
  Array.isArray(candidate?.skills?.skills) ? candidate.skills.skills : [];

export const estimateCandidateYears = (candidate) => {
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

export const inferCandidateSeniority = (candidate) => {
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

export const extractRequiredYearsFromExternalJob = (job) => {
  const rawExperienceText = [
    job?.title,
    job?.description,
    job?.job_level,
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

export const exceedsCandidateExperience = (job, candidateYears) => {
  const requiredYears = extractRequiredYearsFromExternalJob(job);
  const titleText = normalizeText(job?.title || "");
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

export const inferRecommendationRole = (candidate, skills = []) => {
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

export const buildExternalJobQuery = (candidate) => {
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

export const extractExternalJobSkills = (job, candidateSkills = []) => {
  const scraperSkills = Array.isArray(job?.skills) ? job.skills : [];
  const haystack = buildExternalJobText(job);
  const matchedCandidateSkills = candidateSkills.filter((skill) => {
    const normalizedSkill = normalizeText(skill);
    return normalizedSkill.length >= 2 && haystack.includes(normalizedSkill);
  });
  const matchedCommonSkills = COMMON_TECH_SKILLS.filter((skill) =>
    haystack.includes(normalizeText(skill)),
  );

  return uniqueValues([...scraperSkills, ...matchedCandidateSkills, ...matchedCommonSkills]).slice(0, 12);
};

export const scoreExternalJobLocally = (
  job,
  candidateSkills,
  candidateLocation,
  candidateYears,
  inferredRole,
) => {
  const titleText = normalizeText(job?.title || "");
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
    : job?.remote
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
