const asArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.entries)) return value.entries;
  return [value];
};

const getTextLength = (value) => (typeof value === "string" ? value.trim().length : 0);

const getExperienceYearsEstimate = (experience) => {
  const items = asArray(experience);
  if (!items.length) return 0;
  return Math.max(1, items.length);
};

export const buildProfileInsights = (profile) => {
  const personalInfo = profile?.personal_info || {};
  const skills = profile?.skills?.skills || [];
  const education = asArray(profile?.education);
  const experience = asArray(profile?.experience);
  const projects = asArray(profile?.projects);

  const checks = [
    { label: "Contact details", complete: Boolean(personalInfo.email && personalInfo.phone) },
    { label: "Professional summary", complete: getTextLength(personalInfo.summary) >= 80 },
    { label: "Skill depth", complete: skills.length >= 6 },
    { label: "Work history", complete: experience.length >= 1 },
    { label: "Education", complete: education.length >= 1 },
    { label: "Project proof", complete: projects.length >= 1 },
    { label: "Professional links", complete: Boolean(personalInfo.linkedin || personalInfo.github) },
  ];

  const completedChecks = checks.filter((item) => item.complete).length;
  const completionScore = Math.round((completedChecks / checks.length) * 100);
  const yearsEstimate = getExperienceYearsEstimate(experience);

  const strengths = [];
  if (skills.length >= 8) strengths.push("Strong technical skill coverage for search and matching.");
  if (experience.length >= 2) strengths.push("Solid work history gives the AI matching engine more context.");
  if (projects.length >= 2) strengths.push("Projects add proof of execution beyond keywords.");
  if (getTextLength(personalInfo.summary) >= 120) strengths.push("Your summary is detailed enough to improve semantic matching.");
  if (personalInfo.linkedin || personalInfo.github) strengths.push("Professional links make the profile more credible and recruiter-friendly.");

  const recommendations = [];
  if (getTextLength(personalInfo.summary) < 80) {
    recommendations.push("Add a sharper 3 to 5 line summary focused on role, years of experience, and impact.");
  }
  if (skills.length < 6) {
    recommendations.push("Expand your skills list with tools, frameworks, and domain keywords recruiters actually search for.");
  }
  if (!projects.length) {
    recommendations.push("Add at least one project with outcome-focused bullets to strengthen relevance scoring.");
  }
  if (!personalInfo.linkedin) {
    recommendations.push("Add a LinkedIn profile to make your profile feel complete and easier to verify.");
  }
  if (!personalInfo.github && skills.some((skill) => /react|node|python|java|javascript|typescript|aws/i.test(skill))) {
    recommendations.push("Add a GitHub link so technical roles have visible proof of work.");
  }
  if (!experience.length) {
    recommendations.push("Include internships, freelance work, or academic experience so the profile is easier to rank.");
  }

  return {
    completionScore,
    checks,
    strengths: strengths.slice(0, 4),
    recommendations: recommendations.slice(0, 5),
    stats: [
      { label: "Skills", value: skills.length },
      { label: "Projects", value: projects.length },
      { label: "Experience", value: `${yearsEstimate}+ yrs` },
      { label: "Sections", value: completedChecks },
    ],
    counts: {
      skills: skills.length,
      education: education.length,
      experience: experience.length,
      projects: projects.length,
    },
  };
};

export const normalizeProfileList = asArray;
