import { Target } from "lucide-react";

export const getJobId = (job) => job?._id || job?.id || "";

export const getJobKey = (job, index = 0, prefix = "job") => {
  const base = getJobId(job) || job?.title || job?.company || "item";
  return `${prefix}-${base}-${index}`;
};

export const getExternalApplyUrl = (job) =>
  job?.apply_link || job?.external_url || "";

export const isExternalJob = (job) =>
  job?.source_type === "external" ||
  (typeof job?.source === "string" && job.source !== "manual") ||
  Boolean(getExternalApplyUrl(job));

export const getJobDestination = (job) => {
  if (!job) return "/jobs";
  if (isExternalJob(job)) {
    return getExternalApplyUrl(job);
  }

  const jobId = getJobId(job);
  return jobId ? `/jobs/${jobId}` : "/jobs";
};

export const getJobTimestamp = (job) => job?.createdAt || job?.postedAt || null;

/**
 * Human-friendly relative time string.
 */
export function timeAgo(dateStr) {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Returns Tailwind class tokens + label for a match score tier.
 */
export function getMatchColor(score) {
  if (score >= 60) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Strong match" };
  if (score >= 35) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Good fit" };
  if (score >= 15) return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Possible fit" };
  return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", label: "Stretch role" };
}

/**
 * Renders a coloured score badge.  Shared by Jobs, ATSChecker, etc.
 */
export function MatchBadge({ score, className = "" }) {
  if (typeof score !== "number" || score === 0) return null;
  const match = getMatchColor(score);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${match.bg} ${match.text} ${match.border} ${className}`}>
      <Target className="size-3" />
      {Math.round(score)}% — {match.label}
    </span>
  );
}
