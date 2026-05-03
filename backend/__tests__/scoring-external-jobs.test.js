import { describe, expect, it } from "@jest/globals";
import {
  buildExternalJobQueries,
  extractRequiredYearsFromExternalJob,
  isFreshExternalJob,
  scoreExternalJobLocally,
} from "../utils/scoring.utils.js";

const daysAgo = (days) => new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();

describe("External job freshness and fresher/mid relevance", () => {
  it("builds fresher, junior, and mid-level search variants", () => {
    const fresherQueries = buildExternalJobQueries({
      skills: ["React", "JavaScript"],
      experience: [],
    });
    expect(fresherQueries.join(" ").toLowerCase()).toContain("fresher");
    expect(fresherQueries.join(" ").toLowerCase()).toContain("entry level");

    const juniorQueries = buildExternalJobQueries({
      skills: ["Node.js", "MongoDB"],
      experience: [{ title: "Junior Developer", duration: "1 year" }],
    });
    expect(juniorQueries.join(" ").toLowerCase()).toContain("junior");

    const midQueries = buildExternalJobQueries({
      skills: ["React", "Node.js"],
      experience: [
        { title: "Software Engineer", duration: "2023-2024" },
        { title: "Developer", duration: "2022-2023" },
        { title: "Developer", duration: "2021-2022" },
        { title: "Developer", duration: "2020-2021" },
      ],
    });
    expect(midQueries.join(" ").toLowerCase()).toContain("mid level");
  });

  it("extracts required years from Naukri-style experience ranges", () => {
    expect(extractRequiredYearsFromExternalJob({ experience_range: "0-2 years" })).toBe(0);
    expect(extractRequiredYearsFromExternalJob({ experience_range: "1-3 yrs" })).toBe(1);
    expect(extractRequiredYearsFromExternalJob({ description: "Required 2-5 years experience" })).toBe(2);
  });

  it("keeps fresh and undated jobs but removes parseably stale jobs", () => {
    expect(isFreshExternalJob({ postedAt: new Date().toISOString() }, 168)).toBe(true);
    expect(isFreshExternalJob({ postedAt: daysAgo(6) }, 168)).toBe(true);
    expect(isFreshExternalJob({ postedAt: daysAgo(8) }, 168)).toBe(false);
    expect(isFreshExternalJob({ postedAt: "" }, 168)).toBe(true);
  });

  it("excludes senior-heavy roles for freshers but allows entry roles", () => {
    const candidateSkills = ["React", "JavaScript"];
    const fresherSeniorScore = scoreExternalJobLocally(
      {
        title: "Senior Frontend Developer",
        description: "React JavaScript 5+ years experience",
        experience_range: "5-8 years",
      },
      candidateSkills,
      "India",
      0,
      "Frontend Developer",
    );

    const fresherEntryScore = scoreExternalJobLocally(
      {
        title: "Frontend Developer Fresher",
        description: "React JavaScript HTML CSS. Freshers can apply.",
        experience_range: "0-1 years",
        remote: true,
      },
      candidateSkills,
      "India",
      0,
      "Frontend Developer",
    );

    expect(fresherSeniorScore.excluded).toBe(true);
    expect(fresherEntryScore.excluded).toBe(false);
    expect(fresherEntryScore.score).toBeGreaterThan(fresherSeniorScore.score);
  });
});
