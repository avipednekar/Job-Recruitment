import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  RefreshCcw,
  Settings,
  Sparkles,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import ThemeToggle from "../components/ThemeToggle";
import JobSeekerProfileEditor from "../components/profile/JobSeekerProfileEditor";
import {
  normalizeJobSeekerProfileData,
  serializeJobSeekerProfileData,
} from "../components/profile/jobSeekerProfileData";
import { useAuth } from "../context/useAuth";
import {
  fetchExternalJobs,
  getApplications,
  getJobRecommendations,
  getProfile,
  saveCompanyProfile,
  saveJobSeekerProfile,
} from "../services/api";
import { getJobDestination, getJobKey, isExternalJob } from "../utils/job-utils";

const DASHBOARD_SECTIONS = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "applications", label: "Applied Jobs", icon: Briefcase },
  { key: "recommendations", label: "Recommended Jobs", icon: Sparkles },
  { key: "settings", label: "Settings", icon: Settings },
];

const APPLICATION_FILTERS = ["all", "applied", "screening", "interview", "offer", "rejected"];

const STATUS_STYLES = {
  applied: "bg-primary/10 text-primary",
  screening: "bg-amber-100 text-amber-700",
  interview: "bg-sky-100 text-sky-700",
  offer: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const isValidSection = (value) => DASHBOARD_SECTIONS.some((section) => section.key === value);

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Date unavailable";
  }
};

const formatRole = (role) => {
  if (!role) return "User";
  return role === "job_seeker" ? "Job Seeker" : "Recruiter";
};

function ProfileMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
      <h3 className="font-semibold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm text-text-secondary">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

function DashboardNavButton({ active, icon, label, onClick }) {
  const IconComponent = icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
        active
          ? "bg-primary text-white shadow-sm"
          : "bg-surface-2 text-text-secondary hover:bg-surface-3 hover:text-text-primary"
      }`}
    >
      <IconComponent className="size-4" />
      <span>{label}</span>
    </button>
  );
}

function RecommendationCard({ job, index }) {
  const external = isExternalJob(job);
  const destination = getJobDestination(job);
  const matchScore = job.match_metrics?.overall_match_score;

  return (
    <Card className="border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap gap-2">
            {matchScore ? <Badge tone="success">{Math.round(matchScore)}% match</Badge> : null}
            <Badge tone={external ? "neutral" : "brand"}>{external ? "External" : "Internal"}</Badge>
          </div>
          <h3 className="text-lg font-semibold text-text-primary">{job.title}</h3>
          <p className="mt-1 text-sm text-text-secondary">{job.company}</p>
          <p className="mt-2 text-sm text-text-secondary">{job.location || "Flexible location"}</p>
        </div>
        <span className="text-xs font-medium text-text-tertiary">#{index + 1}</span>
      </div>
      <div className="mt-5">
        {external ? (
          <a
            href={destination}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong"
          >
            Open listing <ExternalLink className="size-4" />
          </a>
        ) : (
          <Link
            to={destination}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong"
          >
            View job <ExternalLink className="size-4" />
          </Link>
        )}
      </div>
    </Card>
  );
}

function RecruiterProfile({ profile, onSave }) {
  const [draft, setDraft] = useState({
    name: profile?.name || "",
    industry: profile?.industry || "",
    website: profile?.website || "",
    location: profile?.location || "",
    size: profile?.size || "",
    founded: profile?.founded || "",
    description: profile?.description || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      name: profile?.name || "",
      industry: profile?.industry || "",
      website: profile?.website || "",
      location: profile?.location || "",
      size: profile?.size || "",
      founded: profile?.founded || "",
      description: profile?.description || "",
    });
  }, [profile]);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      await onSave(draft);
      toast.success("Company profile updated");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update company profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-linear-to-br from-[#f5f9ff] via-white to-[#eef8f3] p-8">
        <h1 className="font-display text-4xl text-text-primary">{profile?.name || "Company profile"}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-text-secondary">
          Keep your employer profile polished so candidates trust the roles you publish.
        </p>
      </Card>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Company name", "name"],
            ["Industry", "industry"],
            ["Website", "website"],
            ["Location", "location"],
            ["Company size", "size"],
            ["Founded", "founded"],
          ].map(([label, field]) => (
            <label key={field} className="block space-y-2">
              <span className="text-sm font-semibold text-text-primary">{label}</span>
              <input
                value={draft[field]}
                onChange={(event) => setDraft((prev) => ({ ...prev, [field]: event.target.value }))}
                className="input-field"
              />
            </label>
          ))}
        </div>
        <label className="mt-4 block space-y-2">
          <span className="text-sm font-semibold text-text-primary">Description</span>
          <textarea
            value={draft.description}
            onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
            rows={6}
            className="input-field min-h-37.5"
          />
        </label>
        <div className="mt-5">
          <Button onClick={handleSubmit} isLoading={saving}>Save company profile</Button>
        </div>
      </Card>
    </div>
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

const dedupeRecommendations = (jobs = []) => {
  const seen = new Set();

  return jobs.filter((job) => {
    const key = getRecommendationKey(job);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const pickProfileFallbackRecommendations = (jobs = []) => {
  const highConfidence = jobs.filter(
    (job) => job.match_quality === "high" || job.match_quality === "medium",
  );

  if (highConfidence.length) {
    return dedupeRecommendations(highConfidence);
  }

  return dedupeRecommendations(
    jobs.filter((job) => (job.match_metrics?.overall_match_score || 0) > 0),
  );
};

function computeInsights(profile) {
  const skills = profile?.skills || [];
  const education = Array.isArray(profile?.education) ? profile.education : [];
  const experience = Array.isArray(profile?.experience) ? profile.experience : [];
  const projects = Array.isArray(profile?.projects) ? profile.projects : [];
  const summary = profile?.summary || "";

  const checks = [
    { label: "Contact details", complete: Boolean(profile?.email && profile?.phone) },
    { label: "Professional summary", complete: summary.trim().length >= 80 },
    { label: "Skill depth", complete: skills.length >= 6 },
    { label: "Work history", complete: experience.length >= 1 },
    { label: "Education", complete: education.length >= 1 },
    { label: "Project proof", complete: projects.length >= 1 },
    { label: "Professional links", complete: Boolean(profile?.linkedin || profile?.github) },
  ];

  const completedChecks = checks.filter((check) => check.complete).length;
  const completionScore = Math.round((completedChecks / checks.length) * 100);

  return {
    completionScore,
    checks,
    stats: [
      { label: "Skills", value: skills.length },
      { label: "Projects", value: projects.length },
      { label: "Experience", value: `${Math.max(1, experience.length)}+ yrs` },
      { label: "Sections", value: completedChecks },
    ],
  };
}

export default function ProfileView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [profile, setProfile] = useState(null);
  const [profileDraft, setProfileDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [applications, setApplications] = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationFilter, setApplicationFilter] = useState("all");

  const isJobSeeker = user?.role === "job_seeker";
  const activeSection = isValidSection(searchParams.get("section"))
    ? searchParams.get("section")
    : "profile";

  const normalizedProfile = useMemo(
    () => normalizeJobSeekerProfileData(profile, user),
    [profile, user],
  );
  const normalizedDraft = useMemo(
    () => (profileDraft ? normalizeJobSeekerProfileData(profileDraft, user) : normalizedProfile),
    [profileDraft, normalizedProfile, user],
  );

  const serializedProfile = useMemo(
    () => JSON.stringify(serializeJobSeekerProfileData(normalizedProfile, user)),
    [normalizedProfile, user],
  );
  const serializedDraft = useMemo(
    () => JSON.stringify(serializeJobSeekerProfileData(normalizedDraft, user)),
    [normalizedDraft, user],
  );
  const isProfileDirty = serializedProfile !== serializedDraft;

  const insights = useMemo(
    () => (isJobSeeker ? computeInsights(normalizedDraft) : null),
    [isJobSeeker, normalizedDraft],
  );

  useEffect(() => {
    if (!isProfileDirty) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProfileDirty]);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProfile();
      const nextProfile = res.data.profile || null;
      setProfile(nextProfile);
      setProfileDraft(normalizeJobSeekerProfileData(nextProfile, user));
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchRecommendations = useCallback(async () => {
    if (!isJobSeeker) return;

    try {
      setRecsLoading(true);
      const res = await getJobRecommendations();
      const internalJobs = Array.isArray(res.data?.internal) ? res.data.internal : [];
      const externalJobs = Array.isArray(res.data?.external) ? res.data.external : [];
      const combined = dedupeRecommendations([...internalJobs, ...externalJobs]);

      if (combined.length) {
        setRecommendations(combined);
        return;
      }

      const fallbackRes = await fetchExternalJobs();
      setRecommendations(pickProfileFallbackRecommendations(fallbackRes.data?.jobs || []).slice(0, 8));
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      try {
        const fallbackRes = await fetchExternalJobs();
        setRecommendations(pickProfileFallbackRecommendations(fallbackRes.data?.jobs || []).slice(0, 8));
      } catch (fallbackError) {
        console.error("Fallback recommendation fetch failed:", fallbackError);
        setRecommendations([]);
      }
    } finally {
      setRecsLoading(false);
    }
  }, [isJobSeeker]);

  const fetchUserApplications = useCallback(async () => {
    if (!isJobSeeker) return;

    try {
      setApplicationsLoading(true);
      const res = await getApplications();
      setApplications(Array.isArray(res.data?.applications) ? res.data.applications : []);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      toast.error(error.response?.data?.error || "Failed to load applications");
      setApplications([]);
    } finally {
      setApplicationsLoading(false);
    }
  }, [isJobSeeker]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchRecommendations();
    fetchUserApplications();
  }, [fetchRecommendations, fetchUserApplications]);

  const handleSectionChange = (nextSection) => {
    if (nextSection === activeSection) return;

    if (isProfileDirty) {
      const discard = window.confirm("You have unsaved profile changes. Discard them and switch sections?");
      if (!discard) {
        return;
      }

      setProfileDraft(normalizeJobSeekerProfileData(profile, user));
    }

    setSearchParams({ section: nextSection });
  };

  const handleResetProfile = () => {
    setProfileDraft(normalizeJobSeekerProfileData(profile, user));
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const payload = serializeJobSeekerProfileData(profileDraft, user);
      await saveJobSeekerProfile(payload);
      setProfile(payload);
      setProfileDraft(normalizeJobSeekerProfileData(payload, user));
      await fetchProfile();
      await fetchRecommendations();
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveCompanyPatch = async (patch) => {
    await saveCompanyProfile(patch);
    await fetchProfile();
  };

  const filteredApplications = useMemo(() => {
    if (applicationFilter === "all") return applications;
    return applications.filter((application) => application.status === applicationFilter);
  }, [applications, applicationFilter]);

  const applicationCounts = useMemo(
    () =>
      applications.reduce((acc, application) => {
        const key = application.status || "applied";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    [applications],
  );

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (loading) {
    return (
      <main className="page-shell">
        <section className="section-container py-12">
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="size-12 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          </div>
        </section>
      </main>
    );
  }

  if (!isJobSeeker) {
    return (
      <main className="page-shell">
        <section className="section-container space-y-6 py-8 sm:py-12">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" /> Back
          </button>
          <RecruiterProfile profile={profile} onSave={saveCompanyPatch} />
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="section-container py-8 sm:py-12">
        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <Card className="hidden p-5 xl:block xl:sticky xl:top-28">
              <div className="space-y-5">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                    <LayoutDashboard className="size-4" /> Dashboard
                  </div>
                  <h1 className="font-display text-3xl text-text-primary">
                    {normalizedDraft.name || user?.name || "Your dashboard"}
                  </h1>
                  <p className="mt-2 text-sm text-text-secondary">
                    Manage your profile, applications, recommendations, and settings from one place.
                  </p>
                </div>

                <div className="space-y-2">
                  {DASHBOARD_SECTIONS.map((section) => (
                    <DashboardNavButton
                      key={section.key}
                      active={activeSection === section.key}
                      icon={section.icon}
                      label={section.label}
                      onClick={() => handleSectionChange(section.key)}
                    />
                  ))}
                </div>

                <div className="rounded-2xl bg-surface-2 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">
                    Profile strength
                  </p>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="text-3xl font-semibold text-text-primary">{insights.completionScore}%</p>
                    <Badge tone="success">{applications.length} applications</Badge>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-700"
                      style={{ width: `${insights.completionScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex gap-2 overflow-x-auto pb-1 xl:hidden">
              {DASHBOARD_SECTIONS.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => handleSectionChange(section.key)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    activeSection === section.key
                      ? "bg-primary text-white"
                      : "bg-surface-2 text-text-secondary"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-6">
            {activeSection === "profile" ? (
              <>
                <Card className="overflow-hidden">
                  <div className="bg-linear-to-br from-[#f6f9ff] via-white to-[#eef8f4] p-8 sm:p-10">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="grid size-18 place-items-center rounded-3xl bg-primary text-2xl font-bold text-white shadow-sm">
                          {normalizedDraft.name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap gap-2">
                            <Badge tone="brand">Job seeker</Badge>
                            <Badge tone="success">Profile strength {insights.completionScore}%</Badge>
                          </div>
                          <h2 className="font-display text-4xl text-text-primary">
                            {normalizedDraft.name || user?.name || "Your profile"}
                          </h2>
                          {normalizedDraft.title ? (
                            <p className="mt-1 text-lg font-medium text-primary">{normalizedDraft.title}</p>
                          ) : null}
                          <p className="mt-3 max-w-2xl leading-7 text-text-secondary">
                            {normalizedDraft.summary || "Build out your profile to unlock stronger recommendations and better application context."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-4">
                      {insights.stats.map((item) => (
                        <ProfileMetric key={item.label} label={item.label} value={item.value} />
                      ))}
                    </div>
                  </div>
                </Card>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <Card className="p-6 sm:p-8">
                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-2xl text-text-primary">Edit profile</h3>
                        <p className="mt-1 text-sm text-text-secondary">
                          Update your personal details, work history, education, and projects here.
                        </p>
                      </div>
                      <Badge tone="brand">Section: Profile</Badge>
                    </div>

                    <JobSeekerProfileEditor
                      data={profileDraft}
                      onChange={setProfileDraft}
                      idPrefix="dashboard-profile"
                    />

                    {isProfileDirty ? (
                      <div className="sticky bottom-4 mt-8 rounded-2xl border border-primary/20 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-text-primary">Unsaved profile changes</p>
                          <p className="text-sm text-text-secondary">
                            Save to refresh your profile and recommendations with the latest details.
                          </p>
                        </div>
                        <div className="mt-4 flex gap-3 sm:mt-0">
                          <Button variant="secondary" onClick={handleResetProfile}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveProfile} isLoading={savingProfile}>
                            Save Profile
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </Card>

                  <div className="space-y-6">
                    <Card className="p-6">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <h3 className="font-display text-xl text-text-primary">Profile completion</h3>
                        <span className="text-2xl font-semibold text-text-primary">{insights.completionScore}%</span>
                      </div>
                      <div className="mb-6 h-3 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-700"
                          style={{ width: `${insights.completionScore}%` }}
                        />
                      </div>
                      <div className="space-y-3">
                        {insights.checks.map((check) => (
                          <div
                            key={check.label}
                            className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-3"
                          >
                            <span className="text-sm text-text-primary">{check.label}</span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                check.complete
                                  ? "bg-success/10 text-success"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {check.complete ? "Done" : "Missing"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-6">
                      <h3 className="mb-4 text-xl font-semibold text-text-primary">Contact snapshot</h3>
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="grid size-10 place-items-center rounded-xl bg-surface-2 text-primary">
                            <UserRound className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Name</p>
                            <p className="mt-1 text-sm text-text-primary">{normalizedDraft.name || user?.name || "Not added yet"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="grid size-10 place-items-center rounded-xl bg-surface-2 text-primary">
                            <Mail className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Email</p>
                            <p className="mt-1 text-sm text-text-primary">{normalizedDraft.email || user?.email || "Not added yet"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="grid size-10 place-items-center rounded-xl bg-surface-2 text-primary">
                            <MapPin className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Location</p>
                            <p className="mt-1 text-sm text-text-primary">{normalizedDraft.location || "Not added yet"}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </>
            ) : null}

            {activeSection === "applications" ? (
              <Card className="p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-3xl text-text-primary">Applied Jobs</h2>
                    <p className="mt-2 text-text-secondary">
                      Track where each application sits in your pipeline.
                    </p>
                  </div>
                  <Badge tone="brand">{applications.length} total</Badge>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {APPLICATION_FILTERS.map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setApplicationFilter(filter)}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                        applicationFilter === filter
                          ? "bg-primary text-white"
                          : "bg-surface-2 text-text-secondary hover:bg-surface-3"
                      }`}
                    >
                      {filter === "all" ? "All" : filter[0].toUpperCase() + filter.slice(1)}{" "}
                      {filter === "all" ? applications.length : applicationCounts[filter] || 0}
                    </button>
                  ))}
                </div>

                <div className="mt-6 space-y-4">
                  {applicationsLoading ? (
                    <div className="flex min-h-48 items-center justify-center">
                      <div className="size-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    </div>
                  ) : filteredApplications.length ? (
                    filteredApplications.map((application) => {
                      const job = application.job || {};
                      return (
                        <Card key={application._id} className="border-border p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                    STATUS_STYLES[application.status] || "bg-surface-2 text-text-secondary"
                                  }`}
                                >
                                  {application.status || "applied"}
                                </span>
                                <span className="text-xs text-text-secondary">
                                  Applied {formatDate(application.createdAt)}
                                </span>
                              </div>
                              <h3 className="text-lg font-semibold text-text-primary">
                                {job.title || "Job unavailable"}
                              </h3>
                              <p className="mt-1 text-sm text-text-secondary">{job.company || "Company unavailable"}</p>
                              <p className="mt-2 text-sm text-text-secondary">{job.location || "Flexible location"}</p>
                            </div>
                            {job?._id ? (
                              <Link
                                to={`/jobs/${job._id}`}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong"
                              >
                                View job <ExternalLink className="size-4" />
                              </Link>
                            ) : null}
                          </div>
                        </Card>
                      );
                    })
                  ) : (
                    <EmptyState
                      title="No applications in this view yet"
                      description="Apply to jobs to start tracking your pipeline and status updates here."
                      action={
                        <Link to="/jobs">
                          <Button>Browse jobs</Button>
                        </Link>
                      }
                    />
                  )}
                </div>
              </Card>
            ) : null}

            {activeSection === "recommendations" ? (
              <Card className="p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-sm font-medium text-primary">
                      <Sparkles className="size-4" /> Personalized matches
                    </div>
                    <h2 className="mt-3 font-display text-3xl text-text-primary">Recommended Jobs</h2>
                    <p className="mt-2 text-text-secondary">
                      Internal matches appear first, followed by external roles that fit your profile.
                    </p>
                  </div>
                  <Button variant="secondary" onClick={fetchRecommendations} isLoading={recsLoading}>
                    <RefreshCcw className="size-4" /> Refresh
                  </Button>
                </div>

                <div className="mt-6 space-y-4">
                  {recsLoading && !recommendations.length ? (
                    <div className="flex min-h-48 items-center justify-center">
                      <div className="size-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    </div>
                  ) : recommendations.length ? (
                    recommendations.map((job, index) => (
                      <RecommendationCard key={getJobKey(job, index, "dashboard-rec")} job={job} index={index} />
                    ))
                  ) : (
                    <EmptyState
                      title="No recommendations yet"
                      description="Refresh after strengthening your profile, skills, and work history."
                      action={
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                          onClick={() => handleSectionChange("profile")}
                        >
                          Improve profile <CheckCircle2 className="size-4" />
                        </button>
                      }
                    />
                  )}
                </div>
              </Card>
            ) : null}

            {activeSection === "settings" ? (
              <div className="space-y-6">
                <Card className="p-6 sm:p-8">
                  <h2 className="font-display text-3xl text-text-primary">Settings</h2>
                  <p className="mt-2 text-text-secondary">
                    Manage your account view and quick preferences available in the app today.
                  </p>

                  <div className="mt-8 grid gap-6 lg:grid-cols-2">
                    <Card className="border-border bg-surface-2 p-5">
                      <h3 className="text-lg font-semibold text-text-primary">Account summary</h3>
                      <div className="mt-4 space-y-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Name</p>
                          <p className="mt-1 text-text-primary">{user?.name || normalizedDraft.name || "Not available"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Email</p>
                          <p className="mt-1 text-text-primary">{user?.email || normalizedDraft.email || "Not available"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Role</p>
                          <p className="mt-1 text-text-primary">{formatRole(user?.role)}</p>
                        </div>
                      </div>
                    </Card>

                    <Card className="border-border bg-surface-2 p-5">
                      <h3 className="text-lg font-semibold text-text-primary">Appearance</h3>
                      <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white/70 px-4 py-3 dark:bg-surface/40">
                        <div>
                          <p className="font-medium text-text-primary">Theme</p>
                          <p className="text-sm text-text-secondary">
                            Switch between light and dark mode for the dashboard.
                          </p>
                        </div>
                        <ThemeToggle />
                      </div>
                    </Card>
                  </div>
                </Card>

                <Card className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-text-primary">Session</h3>
                      <p className="mt-1 text-sm text-text-secondary">
                        End your current session safely from the dashboard.
                      </p>
                    </div>
                    <Button variant="secondary" onClick={handleLogout}>
                      <LogOut className="size-4" /> Logout
                    </Button>
                  </div>
                </Card>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
