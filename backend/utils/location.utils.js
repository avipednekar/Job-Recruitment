import {
  LOCATION_PREFIX_PATTERN,
  INDIA_LABEL,
  INDIA_STATE_TERMS,
  INDIA_LOCATION_PARTS,
} from "./constants.js";

export const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const uniqueValues = (values = []) => [...new Set(values.filter(Boolean))];

export const splitLocationParts = (value = "") =>
  uniqueValues(
    String(value)
      .split(/[,/;()|-]+/)
      .map((part) => normalizeText(part))
      .filter(Boolean),
  );

export const splitLocationTokens = (value = "") =>
  uniqueValues(
    String(value)
      .split(/[,/|()-]+/)
      .map((part) => normalizeText(String(part).replace(LOCATION_PREFIX_PATTERN, "")))
      .filter((part) => part && part !== INDIA_LABEL),
  );

export const classifyLocationTokens = (value = "") => {
  const parts = splitLocationTokens(value);
  const localityTerms = [];
  const broaderTerms = [];

  parts.forEach((part) => {
    if (INDIA_STATE_TERMS.has(part) || INDIA_LOCATION_PARTS.has(part)) {
      broaderTerms.push(part);
    } else {
      localityTerms.push(part);
    }
  });

  return { localityTerms, broaderTerms };
};

export const resolveSearchLocationTerms = (location = "") => {
  const { localityTerms, broaderTerms } = classifyLocationTokens(location);

  if (localityTerms.length >= 2) {
    return [...localityTerms.slice(-2), ...broaderTerms.slice(-1)];
  }
  if (localityTerms.length === 1) {
    return [...localityTerms, ...broaderTerms.slice(-1)];
  }
  return broaderTerms.slice(-1);
};

export const getExternalJobLocationText = (job) => normalizeText(job?.location || "");

export const isIndiaLocation = (value = "") =>
  splitLocationParts(value).some((part) => INDIA_LOCATION_PARTS.has(part));

export const isIndiaExternalJob = (job) => isIndiaLocation(job?.location || "");

export const matchesAnyLocationTerm = (jobLocation, terms = []) =>
  terms.some((term) => jobLocation.includes(term) || term.includes(jobLocation));

export const matchesCandidateLocation = (job, candidateLocation) => {
  if (!candidateLocation) {
    return true;
  }

  if (job?.remote) {
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

export const getCandidatePreferredLocation = (candidate) =>
  candidate?.personal_info?.location?.trim() || "";
