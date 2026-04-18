const emptyExperienceItem = () => ({
  title: "",
  company: "",
  duration: "",
  description: "",
});

const emptyEducationItem = () => ({
  degree: "",
  institution: "",
  year: "",
});

const emptyProjectItem = () => ({
  name: "",
  description: "",
  link: "",
});

const toString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeExperienceItem = (item) => {
  if (typeof item === "string") {
    return { ...emptyExperienceItem(), title: item.trim() };
  }

  return {
    title: toString(item?.title || item?.role || item?.position),
    company: toString(item?.company || item?.organization || item?.employer),
    duration: toString(item?.duration || item?.period || item?.date_range || item?.year),
    description: toString(item?.description || item?.summary || item?.responsibilities),
  };
};

const normalizeEducationItem = (item) => {
  if (typeof item === "string") {
    return { ...emptyEducationItem(), degree: item.trim() };
  }

  return {
    degree: toString(item?.degree || item?.qualification || item?.title),
    institution: toString(item?.institution || item?.college || item?.school),
    year: toString(item?.year || item?.duration || item?.graduation_year),
  };
};

const normalizeProjectItem = (item) => {
  if (typeof item === "string") {
    return { ...emptyProjectItem(), name: item.trim() };
  }

  return {
    name: toString(item?.name || item?.title),
    description: toString(item?.description || item?.summary),
    link: toString(item?.link || item?.url || item?.github || item?.demo),
  };
};

const normalizeArray = (value, normalizer) =>
  (Array.isArray(value) ? value : []).map(normalizer);

const trimStructuredArray = (items = []) =>
  items
    .map((item) =>
      Object.fromEntries(
        Object.entries(item || {}).map(([key, value]) => [key, toString(value)]),
      ),
    )
    .filter((item) => Object.values(item).some(Boolean));

export const createEmptyJobSeekerProfile = (user) => ({
  name: user?.name || "",
  email: user?.email || "",
  phone: "",
  location: "",
  title: "",
  github: "",
  linkedin: "",
  summary: "",
  skills: [],
  education: [],
  experience: [],
  projects: [],
});

export const normalizeJobSeekerProfileData = (data = {}, user) => ({
  name: toString(data?.name || user?.name),
  email: toString(data?.email || user?.email),
  phone: toString(data?.phone),
  location: toString(data?.location),
  title: toString(data?.title),
  github: toString(data?.github),
  linkedin: toString(data?.linkedin),
  summary: toString(data?.summary),
  skills: Array.isArray(data?.skills)
    ? data.skills.map((skill) => toString(skill)).filter(Boolean)
    : [],
  education: normalizeArray(data?.education, normalizeEducationItem),
  experience: normalizeArray(data?.experience, normalizeExperienceItem),
  projects: normalizeArray(data?.projects, normalizeProjectItem),
});

export const serializeJobSeekerProfileData = (data = {}, user) => {
  const normalized = normalizeJobSeekerProfileData(data, user);

  return {
    ...normalized,
    skills: normalized.skills.map((skill) => skill.trim()).filter(Boolean),
    education: trimStructuredArray(normalized.education),
    experience: trimStructuredArray(normalized.experience),
    projects: trimStructuredArray(normalized.projects),
  };
};

export const getEmptyExperienceItem = emptyExperienceItem;
export const getEmptyEducationItem = emptyEducationItem;
export const getEmptyProjectItem = emptyProjectItem;
