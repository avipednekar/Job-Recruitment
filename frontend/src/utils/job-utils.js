export const getJobId = (job) => job?._id || job?.id || "";

export const getJobKey = (job, index = 0, prefix = "job") => {
  const base = getJobId(job) || job?.title || job?.company || "item";
  return `${prefix}-${base}-${index}`;
};

export const getExternalApplyUrl = (job) =>
  job?.apply_link || job?.external_url || "";

export const isExternalJob = (job) => job?.source === "external";

export const getJobDestination = (job) => {
  if (!job) return "/jobs";
  if (isExternalJob(job)) {
    return getExternalApplyUrl(job);
  }

  const jobId = getJobId(job);
  return jobId ? `/jobs/${jobId}` : "/jobs";
};

export const getJobTimestamp = (job) => job?.createdAt || job?.postedAt || null;
