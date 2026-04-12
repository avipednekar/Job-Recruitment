/**
 * Shared utility: build the text that gets sent to the AI service
 * for generating a candidate's embedding vector.
 *
 * Accepts a flat candidate object (matches the new Candidate schema).
 */

const flattenEntries = (entries) =>
  Array.isArray(entries)
    ? entries
        .map((entry) =>
          typeof entry === "string" ? entry : Object.values(entry || {}).join(" "),
        )
        .join(" ")
    : "";

/**
 * @param {{ summary?: string, skills?: string[], experience?: any[], projects?: any[], location?: string }} candidate
 * @returns {string}
 */
export const buildEmbeddingText = (candidate = {}) => {
  const summary = candidate.summary || "";
  const skills = Array.isArray(candidate.skills) ? candidate.skills : [];
  const experience = flattenEntries(candidate.experience);
  const projects = flattenEntries(candidate.projects);
  const location = candidate.location || "";

  const text = `${summary} ${skills.join(" ")} ${experience} ${projects} ${location}`.trim();

  console.log(
    `[EMBEDDING] Built embedding text (${text.length} chars):`,
    text.substring(0, 120) + (text.length > 120 ? "..." : ""),
  );

  return text;
};
