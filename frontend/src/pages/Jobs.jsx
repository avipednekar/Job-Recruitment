import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  Globe,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import Footer from "../components/Footer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";
import {
  fetchExternalJobs,
  scrapeDirectBoards,
  getProfile,
  getJobRecommendations,
  fetchRecommendationInsights,
} from "../services/api";
import {
  getExternalApplyUrl,
  getJobDestination,
  getJobKey,
  getJobTimestamp,
  isExternalJob,
} from "../utils/job-utils";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const EXP_LEVELS = ["Entry Level", "1-3 yrs", "3+ yrs", "5+ yrs", "Lead / Manager"];

const PRESET_BOARDS = [
  { label: "Discord", url: "https://boards.greenhouse.io/discord", ats: "Greenhouse" },
  { label: "Stripe", url: "https://jobs.lever.co/stripe", ats: "Lever" },
  { label: "Notion", url: "https://jobs.ashbyhq.com/notion", ats: "Ashby" },
  { label: "Figma", url: "https://boards.greenhouse.io/figma", ats: "Greenhouse" },
  { label: "Vercel", url: "https://boards.greenhouse.io/vercel", ats: "Greenhouse" },
];

const formatSourceBreakdown = (sourceBreakdown = {}) =>
  Object.entries(sourceBreakdown)
    .filter(([, count]) => Number(count) > 0)
    .map(([source, count]) => `${source}: ${count}`)
    .join(" • ");

function timeAgo(dateStr) {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getMatchColor(score) {
  if (score >= 60) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Strong match" };
  if (score >= 35) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Good fit" };
  if (score >= 15) return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Possible fit" };
  return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", label: "Stretch role" };
}

function MatchBadge({ score }) {
  if (typeof score !== "number" || score === 0) return null;
  const match = getMatchColor(score);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${match.bg} ${match.text} ${match.border}`}>
      <Target className="size-3" />
      {Math.round(score)}% — {match.label}
    </span>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-border bg-white text-text-secondary hover:border-primary/40 hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <Card className="p-8 text-center">
      <h3 className="font-display text-2xl text-text-primary">{title}</h3>
      <p className="mt-2 text-text-secondary max-w-xl mx-auto">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Card>
  );
}

function SectionHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="grid size-10 place-items-center rounded-xl bg-primary/10 mt-0.5">
            <Icon className="size-5 text-primary" />
          </div>
        ) : null}
        <div>
          <h2 className="font-display text-2xl text-text-primary">{title}</h2>
          {description ? <p className="mt-1 text-text-secondary">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function JobCard({ job, recommendation = false, dimmed = false }) {
  const external = isExternalJob(job);
  const destination = getJobDestination(job);
  const applyUrl = getExternalApplyUrl(job);
  const timestamp = timeAgo(getJobTimestamp(job));
  const aiScore = job?.match_metrics?.overall_match_score;
  const skills = Array.isArray(job?.skills) ? job.skills : [];

  const content = (
    <Card className={`p-5 h-full flex flex-col border-border hover:border-primary/30 hover:shadow-lg transition-all ${dimmed ? "opacity-40 hover:opacity-80" : ""}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {job.logo ? (
            external ? (
              <img
                src={job.logo}
                alt={job.company}
                className="size-12 rounded-2xl border border-border bg-white object-contain p-1.5"
              />
            ) : (
              <div
                className="grid size-12 place-items-center rounded-2xl text-white font-semibold shadow-sm"
                style={{ background: job.logoColor || "#2176FF" }}
              >
                {job.logo}
              </div>
            )
          ) : (
            <div className="grid size-12 place-items-center rounded-2xl bg-primary text-white font-semibold">
              {job.company?.charAt(0) || "J"}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              {recommendation ? <Badge tone="brand">Recommended</Badge> : null}
              {external ? <Badge tone="neutral">External</Badge> : null}
              {job.remote ? <Badge tone="success">Remote</Badge> : null}
              {job.match_quality === "stretch" ? <Badge tone="neutral">Stretch</Badge> : null}
            </div>
            <h3 className="font-semibold text-lg text-text-primary line-clamp-2">{job.title}</h3>
            <p className="text-text-secondary mt-1">{job.company}</p>
          </div>
        </div>

        {typeof aiScore === "number" && aiScore > 0 ? (
          <MatchBadge score={aiScore} />
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-text-secondary">
        <span className="inline-flex items-center gap-2">
          <MapPin className="size-4 text-primary" />
          {job.location || "Not specified"}
        </span>
        <span className="inline-flex items-center gap-2">
          <Briefcase className="size-4 text-primary" />
          {job.employment_type || "Full-time"}
        </span>
      </div>

      <p className="mt-4 text-sm text-text-secondary line-clamp-3">
        {(job.description || "No description available.")
           .replace(/(\*\*|__)(.*?)\1/g, '$2')
           .replace(/(\*|_)(.*?)\1/g, '$2')
           .replace(/#/g, '')}
      </p>

      {skills.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {skills.slice(0, 5).map((skill, index) => (
            <Badge key={`${skill}-${index}`} tone="neutral">
              {skill}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="mt-auto pt-5 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-text-tertiary">{timestamp}</span>
        {external ? (
          <a
            href={applyUrl || destination}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong"
          >
            Open listing
            <ExternalLink className="size-4" />
          </a>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            View details
            <ArrowRight className="size-4" />
          </span>
        )}
      </div>
    </Card>
  );

  if (external) return content;

  return (
    <Link to={destination} className="block h-full">
      {content}
    </Link>
  );
}

function InsightsPanel({ insights, loading }) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <Card className="p-5 mt-6 border-primary/20 bg-linear-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3 text-text-secondary">
          <LoaderCircle className="size-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Generating AI insights...</span>
        </div>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Card className="mt-6 border-primary/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-5 flex items-center justify-between gap-3 bg-linear-to-r from-primary/5 to-transparent hover:from-primary/8 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg bg-primary/15">
            <Lightbulb className="size-4.5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-text-primary">AI Career Insights</p>
            <p className="text-xs text-text-secondary">Powered by Gemini</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="size-4 text-text-secondary" /> : <ChevronDown className="size-4 text-text-secondary" />}
      </button>

      {expanded ? (
        <div className="px-5 pb-5 space-y-5">
          {/* Gap Analysis */}
          {insights.gap_analysis ? (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                <TrendingUp className="size-4" />
                Gap Analysis
              </p>
              <p className="mt-1.5 text-sm text-amber-700">{insights.gap_analysis}</p>
            </div>
          ) : null}

          {/* Profile Tips */}
          {insights.profile_tips?.length ? (
            <div>
              <p className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
                <Zap className="size-4 text-primary" />
                Profile Tips
              </p>
              <div className="grid gap-2">
                {insights.profile_tips.map((tip, i) => (
                  <div key={`tip-${i}`} className="flex items-start gap-3 rounded-lg bg-surface-2 p-3">
                    <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-text-secondary">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Match Reasons */}
          {insights.match_reasons && Object.keys(insights.match_reasons).length ? (
            <div>
              <p className="text-sm font-semibold text-text-primary mb-3">Why these jobs match you</p>
              <div className="grid gap-2">
                {Object.entries(insights.match_reasons).slice(0, 5).map(([title, reason]) => (
                  <div key={title} className="flex items-start gap-3 text-sm">
                    <Sparkles className="size-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-text-primary">{title}:</span>{" "}
                      <span className="text-text-secondary">{reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function ProfileIncompleteCTA({ completeness }) {
  if (!completeness || completeness.score >= 75) return null;

  const missing = [];
  if (!completeness.has_skills) missing.push("skills");
  if (!completeness.has_experience) missing.push("experience");
  if (!completeness.has_location) missing.push("location");
  if (!completeness.has_education) missing.push("education");

  return (
    <Card className="p-6 border-amber-200 bg-linear-to-r from-amber-50 to-white">
      <div className="flex items-start gap-4">
        <div className="grid size-12 place-items-center rounded-2xl bg-amber-100">
          <Target className="size-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text-primary">Complete your profile for better recommendations</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Your profile is {completeness.score}% complete. Add your {missing.join(", ")} to unlock more accurate AI-matched jobs.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${completeness.score}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-amber-700">{completeness.score}%</span>
          </div>
          <Link to="/setup-profile" className="mt-4 inline-block">
            <Button variant="secondary" className="text-sm">Complete profile</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

const getRecommendationKey = (job) =>
  [
    job?._id,
    job?.id,
    job?.apply_link,
    job?.external_url,
    job?.title,
    job?.company,
    job?.location,
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();


export default function Jobs() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedLevels, setSelectedLevels] = useState([]);
  const [salaryMin, setSalaryMin] = useState(0);
  const [remoteOnly, setRemoteOnly] = useState(false);

  const [externalJobs, setExternalJobs] = useState([]);
  const [externalMeta, setExternalMeta] = useState(null);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");

  const [recommendations, setRecommendations] = useState([]);
  const [externalRecommendations, setExternalRecommendations] = useState([]);
  const [profileCompleteness, setProfileCompleteness] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [preferredLocationLoaded, setPreferredLocationLoaded] = useState(false);

  // Insights state (loaded after delay)
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Direct board scraper state
  const [boardUrls, setBoardUrls] = useState([]);
  const [boardInput, setBoardInput] = useState("");
  const [boardJobs, setBoardJobs] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [boardError, setBoardError] = useState("");
  const [showBoardPanel, setShowBoardPanel] = useState(false);

  const searchParams = useMemo(() => {
    const params = {};
    if (searchTerm.trim()) params.q = searchTerm.trim();
    if (location.trim()) params.location = location.trim();
    if (selectedTypes.length) params.type = selectedTypes.join(",");
    if (selectedLevels.length) params.experience = selectedLevels.join(",");
    if (remoteOnly) params.remote = "true";
    if (salaryMin > 0) params.salaryMin = salaryMin;
    return params;
  }, [location, remoteOnly, salaryMin, searchTerm, selectedLevels, selectedTypes]);

  const toggleValue = (value, current, setter) => {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  // Soft filter logic — dims non-matching jobs instead of hiding
  const applyFilters = useCallback((jobs) => {
    return jobs.map((job) => {
      let matches = true;

      if (selectedTypes.length) {
        matches = matches && selectedTypes.some((t) => (job.employment_type || "Full-time").toLowerCase().includes(t.toLowerCase()));
      }

      if (remoteOnly) {
        matches = matches && Boolean(job.remote);
      }

      return { ...job, _softFiltered: !matches };
    });
  }, [selectedTypes, remoteOnly]);

  const loadJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      setJobsError("");

      const cacheKey = JSON.stringify({ q: searchParams.q || "", location: searchParams.location || "" });
      const cached = sessionStorage.getItem(`jobsCache-${cacheKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setExternalJobs(parsed.jobs || []);
        setExternalMeta(parsed.meta || null);
        setLoadingJobs(false);
        return;
      }

      const externalRes = await fetchExternalJobs({
        q: searchParams.q || "",
        location: searchParams.location || "",
      });

      setExternalJobs(externalRes.data.jobs || []);
      setExternalMeta(externalRes.data.meta || null);
      
      sessionStorage.setItem(`jobsCache-${cacheKey}`, JSON.stringify({
         jobs: externalRes.data.jobs || [],
         meta: externalRes.data.meta || null
      }));
    } catch (error) {
      console.error("Failed to load jobs:", error);
      setExternalJobs([]);
      setExternalMeta(null);
      setJobsError("We couldn't load jobs right now. Please try again.");
    } finally {
      setLoadingJobs(false);
    }
  }, [searchParams]);

  const loadRecommendations = useCallback(async () => {
    if (user?.role !== "job_seeker") {
      setRecommendations([]);
      return;
    }

    try {
      setLoadingRecs(true);
      setRecError("");
      setInsights(null);
      const res = await getJobRecommendations();
      const internalRecs = res.data?.internal || [];
      const externalRecs = res.data?.external || [];
      setRecommendations(internalRecs);
      setExternalRecommendations(externalRecs);
      setProfileCompleteness(res.data?.profile_completeness || null);
      setLastRefresh(new Date());

      // Note: Insights are now triggered locally over uiRecommendations inside a distinct useEffect
      // so it spans both internal and top-matched external jobs dynamically.
    } catch (error) {
      console.error("Failed to load recommendations:", error);
      setRecommendations([]);
      setExternalRecommendations([]);
      setRecError(
        error.response?.data?.error || "Recommendations are unavailable until your profile and AI service are ready."
      );
    } finally {
      setLoadingRecs(false);
    }
  }, [user?.role]);

  const loadInsights = async (recs) => {
    try {
      setLoadingInsights(true);
      const topJobs = recs.slice(0, 8).map((job) => ({
        title: job.title,
        company: job.company,
        match_score: job.match_metrics?.overall_match_score || 0,
        skills: Array.isArray(job.skills) ? job.skills.slice(0, 5) : [],
      }));

      const res = await fetchRecommendationInsights(topJobs);
      setInsights(res.data?.insights || null);
    } catch (error) {
      console.error("Failed to load insights:", error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (preferredLocationLoaded || user?.role !== "job_seeker") {
      return;
    }

    let cancelled = false;

    const loadPreferredLocation = async () => {
      try {
        const res = await getProfile();
        const preferredLocation = res.data?.profile?.personal_info?.location?.trim() || "";
        if (!cancelled && preferredLocation && !location.trim()) {
          setLocation(preferredLocation);
        }
      } catch (error) {
        console.error("Failed to prefill preferred location:", error);
      } finally {
        if (!cancelled) {
          setPreferredLocationLoaded(true);
        }
      }
    };

    loadPreferredLocation();

    return () => {
      cancelled = true;
    };
  }, [location, preferredLocationLoaded, user?.role]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadJobs();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadJobs]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const clearFilters = () => {
    setSearchTerm("");
    setLocation("");
    setSelectedTypes([]);
    setSelectedLevels([]);
    setSalaryMin(0);
    setRemoteOnly(false);
  };

  const addBoardUrl = (url) => {
    const trimmed = url.trim();
    if (!trimmed || boardUrls.includes(trimmed)) return;
    setBoardUrls((prev) => [...prev, trimmed]);
    setBoardInput("");
  };

  const removeBoardUrl = (url) => {
    setBoardUrls((prev) => prev.filter((u) => u !== url));
  };

  const scrapeBoards = async () => {
    if (!boardUrls.length) return;
    try {
      setLoadingBoards(true);
      setBoardError("");
      const res = await scrapeDirectBoards(boardUrls);
      setBoardJobs(res.data.jobs || []);
    } catch (error) {
      console.error("Board scrape failed:", error);
      setBoardError(error.response?.data?.error || "Failed to scrape company boards.");
      setBoardJobs([]);
    } finally {
      setLoadingBoards(false);
    }
  };

  // Apply soft filters to external jobs
  const filteredExternalJobs = useMemo(() => applyFilters(externalJobs), [applyFilters, externalJobs]);

  // Unified Recommendation Pipeline:
  // Internal recs + backend external recs + highest scored listed external jobs
  const uiRecommendations = useMemo(() => {
    const aiMatchedExternal = filteredExternalJobs.filter(
      (job) => !job._softFiltered && (job.match_quality === "high" || job.match_quality === "medium")
    ).slice(0, 10);
    const mergedRecommendations = [...recommendations, ...externalRecommendations, ...aiMatchedExternal];
    const seenKeys = new Set();

    return mergedRecommendations
      .filter((job) => {
        const key = getRecommendationKey(job);
        if (!key) {
          return true;
        }
        if (seenKeys.has(key)) {
          return false;
        }
        seenKeys.add(key);
        return true;
      })
      .sort(
        (left, right) =>
          (right.match_metrics?.overall_match_score || 0) -
          (left.match_metrics?.overall_match_score || 0),
      );
  }, [recommendations, externalRecommendations, filteredExternalJobs]);

  // Load insights whenever uiRecommendations change and aren't empty
  useEffect(() => {
    if (uiRecommendations.length > 0 && !insights && !loadingInsights) {
       const timer = setTimeout(() => {
         loadInsights(uiRecommendations);
       }, 1500);
       return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiRecommendations.length]);

  const visibleJobCount = filteredExternalJobs.filter((j) => !j._softFiltered).length;

  return (
    <div className="page-shell">
      <main>
        <section className="section-container py-8 sm:py-12 space-y-8">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </button>

          {/* ── Hero Section ── */}
          <Card className="overflow-hidden">
            <div className="p-8 sm:p-10 bg-linear-to-br from-[#f5f9ff] via-white to-[#eef8f3]">
              <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)] gap-8">
                <div className="space-y-6">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-4 py-2 text-sm font-medium text-primary">
                      <Sparkles className="size-4" />
                      AI-assisted opportunity discovery
                    </div>
                    <h1 className="mt-4 font-display text-4xl sm:text-5xl leading-tight text-text-primary">
                      Find roles that actually fit your profile
                    </h1>
                    <p className="mt-3 max-w-2xl text-text-secondary text-lg leading-7">
                      Browse job results, get AI-powered recommendations, and scrape company boards directly.
                    </p>
                  </div>

                  <Card className="p-4 sm:p-5 bg-white/90">
                    <div className="grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] gap-3">
                      <label className="rounded-2xl border border-border bg-white px-4 py-3 flex items-center gap-3">
                        <Search className="size-4 text-text-secondary" />
                        <input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Search by title, company, or keyword"
                          className="w-full bg-transparent outline-none text-text-primary"
                        />
                      </label>
                      <label className="rounded-2xl border border-border bg-white px-4 py-3 flex items-center gap-3">
                        <MapPin className="size-4 text-text-secondary self-start mt-1" />
                        <div className="w-full">
                          <input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="City or cities, e.g. Pune; Mumbai"
                            className="w-full bg-transparent outline-none text-text-primary"
                          />
                          <p className="mt-1 text-xs text-text-tertiary">
                            Use <span className="font-semibold">;</span> to search multiple cities.
                          </p>
                        </div>
                      </label>
                      <Button onClick={loadJobs} className="justify-center">
                        Search
                      </Button>
                    </div>
                  </Card>
                </div>

                <Card className="p-6 bg-white/90">
                  <div className="grid gap-4">
                    <div className="rounded-2xl bg-surface-2 p-4">
                      <p className="text-sm text-text-secondary">Jobs loaded</p>
                      <p className="mt-2 text-3xl font-semibold text-text-primary">{externalJobs.length}</p>
                      {externalMeta?.source_breakdown ? (
                        <p className="mt-2 text-xs text-text-secondary">
                          {formatSourceBreakdown(externalMeta.source_breakdown)}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-2xl border border-dashed border-border p-4">
                      <p className="text-sm text-text-secondary">
                        Recommendation refresh
                      </p>
                      <p className="mt-2 text-sm text-text-primary">
                        {lastRefresh
                          ? `Last synced ${lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "Recommendations load automatically for job seekers."}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>

          {/* ════════════════════════════════════════════
              SECTION 1: AI Recommendations (job_seeker)
              ════════════════════════════════════════════ */}
          {user?.role === "job_seeker" ? (
            <Card className="p-6 sm:p-8">
              <SectionHeader
                title="Your AI-Matched Jobs"
                description="Personalized recommendations based on your resume, skills, and preferences."
                icon={Sparkles}
                action={
                  <Button
                    variant="secondary"
                    onClick={loadRecommendations}
                    isLoading={loadingRecs}
                    className="justify-center"
                  >
                    <RefreshCcw className="size-4" />
                    Refresh matches
                  </Button>
                }
              />

              {/* Profile CTA */}
              {profileCompleteness ? (
                <div className="mt-6">
                  <ProfileIncompleteCTA completeness={profileCompleteness} />
                </div>
              ) : null}

              {recError ? (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  {recError}
                </div>
              ) : null}

              {loadingRecs ? (
                <div className="mt-6 flex items-center gap-3 text-text-secondary">
                  <LoaderCircle className="size-5 animate-spin" />
                  Updating your job recommendations...
                </div>
              ) : null}

              {!loadingRecs && !recError && !uiRecommendations.length ? (
                <div className="mt-6">
                  <EmptyState
                    title="No recommendations yet"
                    description="Complete your profile and parse your resume to unlock AI-ranked recommendations."
                    action={<Link to="/setup-profile"><Button>Complete profile</Button></Link>}
                  />
                </div>
              ) : null}

              {uiRecommendations.length ? (
                <div className="mt-6 space-y-4">
                  <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-5">
                    {uiRecommendations.slice(0, 9).map((job, index) => (
                      <JobCard key={getJobKey(job, index, "rec")} job={job} recommendation />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Delayed Insights Panel */}
              <InsightsPanel insights={insights} loading={loadingInsights} />
            </Card>
          ) : null}

          {/* ════════════════════════════════════════════
              SECTION 2: Company Boards Direct Scraper
              ════════════════════════════════════════════ */}
          <Card className="p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-primary/10">
                  <Building2 className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl text-text-primary">Company Boards</h2>
                  <p className="text-sm text-text-secondary">Scrape jobs directly from company career pages</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setShowBoardPanel((v) => !v)}
                className="text-sm"
              >
                {showBoardPanel ? <X className="size-4" /> : <Globe className="size-4" />}
                {showBoardPanel ? "Close" : "Open scraper"}
              </Button>
            </div>

            {showBoardPanel ? (
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary mb-3">
                    Quick add
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_BOARDS.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => addBoardUrl(preset.url)}
                        disabled={boardUrls.includes(preset.url)}
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                          boardUrls.includes(preset.url)
                            ? "border-primary/30 bg-primary/8 text-primary cursor-default"
                            : "border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        <Plus className="size-3.5" />
                        {preset.label}
                        <span className="text-xs text-text-tertiary">({preset.ats})</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <label className="flex-1 rounded-2xl border border-border bg-white px-4 py-3 flex items-center gap-3">
                    <Globe className="size-4 text-text-secondary" />
                    <input
                      value={boardInput}
                      onChange={(e) => setBoardInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addBoardUrl(boardInput);
                        }
                      }}
                      placeholder="Paste ATS URL, e.g. https://boards.greenhouse.io/company"
                      className="w-full bg-transparent outline-none text-text-primary"
                    />
                  </label>
                  <Button
                    variant="secondary"
                    onClick={() => addBoardUrl(boardInput)}
                    disabled={!boardInput.trim()}
                  >
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>

                {boardUrls.length > 0 ? (
                  <div className="space-y-2">
                    {boardUrls.map((url) => (
                      <div
                        key={url}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-2.5"
                      >
                        <span className="text-sm text-text-primary truncate">{url}</span>
                        <button
                          type="button"
                          onClick={() => removeBoardUrl(url)}
                          className="text-text-tertiary hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    ))}

                    <Button
                      onClick={scrapeBoards}
                      isLoading={loadingBoards}
                      className="w-full justify-center mt-3"
                    >
                      <Search className="size-4" />
                      Scrape {boardUrls.length} board{boardUrls.length > 1 ? "s" : ""}
                    </Button>
                  </div>
                ) : null}

                {boardError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {boardError}
                  </div>
                ) : null}

                {loadingBoards ? (
                  <div className="flex items-center gap-3 text-text-secondary">
                    <LoaderCircle className="size-5 animate-spin" />
                    Scraping company boards...
                  </div>
                ) : null}

                {!loadingBoards && boardJobs.length > 0 ? (
                  <div className="space-y-4">
                    <SectionHeader
                      title={`${boardJobs.length} jobs found`}
                      description="Scraped directly from company career pages"
                    />
                    <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-5">
                      {boardJobs.map((job, index) => (
                        <JobCard key={getJobKey(job, index, "board")} job={job} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>

          {/* ════════════════════════════════════════════
              SECTION 3: All Jobs Search (with soft filters)
              ════════════════════════════════════════════ */}
          <div className="grid lg:grid-cols-[290px_minmax(0,1fr)] gap-6">
            <Card className="p-5 h-fit lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl text-text-primary flex items-center gap-2">
                  <Filter className="size-5 text-primary" />
                  Filters
                </h2>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-text-secondary hover:text-primary"
                >
                  Clear all
                </button>
              </div>

              <div className="mt-6 space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary mb-3">
                    Work style
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip active={remoteOnly} onClick={() => setRemoteOnly((value) => !value)}>
                      Remote only
                    </FilterChip>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary mb-3">
                    Job type
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {JOB_TYPES.map((type) => (
                      <FilterChip
                        key={type}
                        active={selectedTypes.includes(type)}
                        onClick={() => toggleValue(type, selectedTypes, setSelectedTypes)}
                      >
                        {type}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary mb-3">
                    Experience level
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EXP_LEVELS.map((level) => (
                      <FilterChip
                        key={level}
                        active={selectedLevels.includes(level)}
                        onClick={() => toggleValue(level, selectedLevels, setSelectedLevels)}
                      >
                        {level}
                      </FilterChip>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                      Minimum salary
                    </p>
                    <span className="text-sm font-medium text-text-primary">${salaryMin}k+</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={300}
                    step={10}
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Filter summary */}
                {(selectedTypes.length > 0 || remoteOnly) ? (
                  <div className="rounded-xl bg-surface-2 p-3 text-xs text-text-secondary">
                    <p className="font-medium text-text-primary">Soft filtering active</p>
                    <p className="mt-1">
                      Showing {visibleJobCount} matching / {filteredExternalJobs.length} total.
                      Non-matching jobs are dimmed, not hidden.
                    </p>
                  </div>
                ) : null}

                <Button className="w-full justify-center" onClick={loadJobs}>
                  Apply filters
                </Button>
              </div>
            </Card>

            <div className="space-y-8">
              <section className="space-y-4">
                <SectionHeader
                  title="All Jobs"
                  description="Browse all openings from your search. Filters dim non-matching results."
                  icon={Search}
                />

                {jobsError ? (
                  <EmptyState
                    title="Jobs unavailable"
                    description={jobsError}
                    action={<Button onClick={loadJobs}>Try again</Button>}
                  />
                ) : null}

                {loadingJobs ? (
                  <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-5">
                    {[0, 1, 2, 3].map((index) => (
                      <Card key={`job-skeleton-${index}`} className="p-5 animate-pulse space-y-4">
                        <div className="flex gap-3">
                          <div className="size-12 rounded-2xl bg-surface-2" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 rounded bg-surface-2 w-3/4" />
                            <div className="h-4 rounded bg-surface-2 w-1/2" />
                          </div>
                        </div>
                        <div className="h-3 rounded bg-surface-2 w-4/5" />
                        <div className="h-3 rounded bg-surface-2 w-3/5" />
                        <div className="flex gap-2">
                          <div className="h-7 rounded-full bg-surface-2 w-20" />
                          <div className="h-7 rounded-full bg-surface-2 w-16" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : null}

                {!loadingJobs && !filteredExternalJobs.length ? (
                  <EmptyState
                    title="No jobs found"
                    description="Try a broader title or a different location to widen the search."
                    action={<Button onClick={clearFilters}>Reset filters</Button>}
                  />
                ) : null}

                {filteredExternalJobs.length ? (
                  <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-5">
                    {filteredExternalJobs.map((job, index) => (
                      <JobCard
                        key={getJobKey(job, index, "ext")}
                        job={job}
                        dimmed={job._softFiltered}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
