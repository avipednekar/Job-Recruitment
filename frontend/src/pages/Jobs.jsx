import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  ExternalLink,
  Filter,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  Search,
  Sparkles,
} from "lucide-react";
import Footer from "../components/Footer";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";
import {
  fetchExternalJobs,
  getProfile,
  getJobRecommendations,
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
const INDIA_LOCATION_PARTS = new Set(["india", "in", "ind", "bharat"]);

const isIndiaDisplayLocation = (value = "") =>
  String(value)
    .split(/[,/;()|-]+/)
    .map((part) => part.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim())
    .filter(Boolean)
    .some((part) => INDIA_LOCATION_PARTS.has(part));

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

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-2xl text-text-primary">{title}</h2>
        {description ? <p className="mt-1 text-text-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function JobCard({ job, recommendation = false }) {
  const external = isExternalJob(job);
  const destination = getJobDestination(job);
  const applyUrl = getExternalApplyUrl(job);
  const timestamp = timeAgo(getJobTimestamp(job));
  const aiScore = job?.match_metrics?.overall_match_score;
  const skills = Array.isArray(job?.skills) ? job.skills : [];

  const content = (
    <Card className="p-5 h-full flex flex-col border-border hover:border-primary/30 hover:shadow-lg transition-all">
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
            </div>
            <h3 className="font-semibold text-lg text-text-primary line-clamp-2">{job.title}</h3>
            <p className="text-text-secondary mt-1">{job.company}</p>
          </div>
        </div>

        {typeof aiScore === "number" ? (
          <div className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success whitespace-nowrap">
            {Math.round(aiScore)}% match
          </div>
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
        {job.description || "No description available."}
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
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");

  const [recommendations, setRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recError, setRecError] = useState("");
  const [lastRefresh, setLastRefresh] = useState(null);
  const [preferredLocationLoaded, setPreferredLocationLoaded] = useState(false);

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

  const loadJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      setJobsError("");

      const externalRes = await fetchExternalJobs({
        q: searchParams.q || "software engineer",
        location: searchParams.location || "",
      });

      setExternalJobs(externalRes.data.jobs || []);
    } catch (error) {
      console.error("Failed to load jobs:", error);
      setExternalJobs([]);
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
      const res = await getJobRecommendations();
      setRecommendations(
        (res.data?.external || []).filter(
          (job) => job?.remote || isIndiaDisplayLocation(job?.location || ""),
        ),
      );
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to load recommendations:", error);
      setRecommendations([]);
      setRecError(
        error.response?.data?.error || "Recommendations are unavailable until your profile and AI service are ready."
      );
    } finally {
      setLoadingRecs(false);
    }
  }, [user?.role]);

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

          <Card className="overflow-hidden">
            <div className="p-8 sm:p-10 bg-gradient-to-br from-[#f5f9ff] via-white to-[#eef8f3]">
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
                      Browse backend-served job results and refresh personalized matches whenever your profile changes.
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

          {user?.role === "job_seeker" ? (
            <Card className="p-6 sm:p-8">
              <SectionHeader
                title="Recommended for you"
                description="Fresh matches based on your saved profile, parsed resume content, and backend-served job sources."
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

              {!loadingRecs && !recError && !recommendations.length ? (
                <div className="mt-6">
                  <EmptyState
                    title="No recommendations yet"
                    description="Complete your profile and parse your resume to unlock AI-ranked recommendations."
                    action={<Link to="/profile"><Button>Open profile</Button></Link>}
                  />
                </div>
              ) : null}

              {recommendations.length ? (
                <div className="mt-8 space-y-4">
                  <SectionHeader
                    title="Recommended matches"
                    description="Job openings matched from backend-served sources using your top profile signals."
                  />
                  <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-5">
                    {recommendations.slice(0, 3).map((job, index) => (
                      <JobCard key={getJobKey(job, index, "rec")} job={job} recommendation />
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          ) : null}

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

                <Button className="w-full justify-center" onClick={loadJobs}>
                  Apply filters
                </Button>
              </div>
            </Card>

            <div className="space-y-8">
              <section className="space-y-4">
                <SectionHeader
                  title="Jobs"
                  description="Backend-served openings refreshed from your current search."
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

                {!loadingJobs && !externalJobs.length ? (
                  <EmptyState
                    title="No jobs found"
                    description="Try a broader title or a different location to widen the external search."
                    action={<Button onClick={clearFilters}>Reset filters</Button>}
                  />
                ) : null}

                {externalJobs.length ? (
                  <div className="grid xl:grid-cols-3 md:grid-cols-2 gap-5">
                    {externalJobs.map((job, index) => (
                      <JobCard key={getJobKey(job, index, "ext")} job={job} />
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
