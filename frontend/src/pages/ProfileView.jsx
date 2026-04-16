import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Lightbulb,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCcw,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";
import {
  fetchExternalJobs,
  getJobRecommendations,
  getProfile,
  saveJobSeekerProfile,
  saveCompanyProfile,
} from "../services/api";
import { getJobDestination, getJobKey, isExternalJob } from "../utils/job-utils";
import { JobSeekerProfileForm } from "./ProfileSetup";

// ─────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────

function ProfileMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-text-secondary font-semibold">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value, href }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid size-10 place-items-center rounded-xl bg-surface-2 text-primary">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.16em] text-text-secondary font-semibold">{label}</p>
        {href && value ? (
          <a href={href} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline break-all">
            {value} <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <p className="mt-1 text-sm text-text-primary wrap-break-word">{value || "Not added yet"}</p>
        )}
      </div>
    </div>
  );
}

function MiniJobCard({ job, index }) {
  const external = isExternalJob(job);
  const destination = getJobDestination(job);

  return (
    <Card className="p-4 border-border hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2 mb-2">
            {job.match_metrics?.overall_match_score ? (
              <Badge tone="success">{Math.round(job.match_metrics.overall_match_score)}% match</Badge>
            ) : null}
            {external ? <Badge tone="neutral">External</Badge> : null}
          </div>
          <h4 className="font-semibold text-text-primary">{job.title}</h4>
          <p className="mt-1 text-sm text-text-secondary">{job.company}</p>
          <p className="mt-2 text-sm text-text-secondary">{job.location || "Flexible location"}</p>
        </div>
        <span className="text-xs text-text-tertiary">#{index + 1}</span>
      </div>
      <div className="mt-4">
        {external ? (
          <a href={destination} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong">
            Open listing <ExternalLink className="size-4" />
          </a>
        ) : (
          <Link to={destination} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong">
            View job <ExternalLink className="size-4" />
          </Link>
        )}
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

const dedupeRecommendations = (jobs = []) => {
  const seenKeys = new Set();

  return jobs.filter((job) => {
    const key = getRecommendationKey(job);
    if (!key) {
      return true;
    }
    if (seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
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

function TimelineList({ icon, title, items = [], emptyText, getPrimary, getSecondary }) {
  const normalized = Array.isArray(items) ? items : [];
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
        <div>
          <h3 className="font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary">
            {normalized.length ? `${normalized.length} item${normalized.length !== 1 ? "s" : ""}` : emptyText}
          </p>
        </div>
      </div>
      {normalized.length ? (
        <div className="mt-5 space-y-4">
          {normalized.slice(0, 4).map((item, index) => (
            <div key={`${title}-${index}`} className="rounded-2xl border border-border bg-surface-2 p-4">
              <p className="font-medium text-text-primary">{getPrimary(item)}</p>
              <p className="mt-1 text-sm text-text-secondary">{getSecondary(item)}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

// ─────────────────────────────────────────────
// Profile insights (inline, simple)
// ─────────────────────────────────────────────
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
    { label: "Professional links", complete: Boolean(profile?.linkedin) },
  ];

  const completedChecks = checks.filter((c) => c.complete).length;
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

// ─────────────────────────────────────────────
// Recruiter profile (edit form)
// ─────────────────────────────────────────────
function RecruiterProfile({ profile, onSave }) {
  const [draft, setDraft] = useState({
    name: profile?.name || "", industry: profile?.industry || "", website: profile?.website || "",
    location: profile?.location || "", size: profile?.size || "", founded: profile?.founded || "",
    description: profile?.description || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      name: profile?.name || "", industry: profile?.industry || "", website: profile?.website || "",
      location: profile?.location || "", size: profile?.size || "", founded: profile?.founded || "",
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
      <Card className="p-8 bg-linear-to-br from-[#f5f9ff] via-white to-[#eef8f3]">
        <h1 className="font-display text-4xl text-text-primary">{profile?.name || "Company profile"}</h1>
        <p className="mt-3 max-w-2xl text-text-secondary leading-7">
          Keep your employer profile polished so candidates trust the roles you publish.
        </p>
      </Card>

      <Card className="p-6">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            ["Company name", "name"], ["Industry", "industry"], ["Website", "website"],
            ["Location", "location"], ["Company size", "size"], ["Founded", "founded"],
          ].map(([label, field]) => (
            <label key={field} className="block space-y-2">
              <span className="text-sm font-semibold text-text-primary">{label}</span>
              <input value={draft[field]} onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))} className="input-field" />
            </label>
          ))}
        </div>
        <label className="block space-y-2 mt-4">
          <span className="text-sm font-semibold text-text-primary">Description</span>
          <textarea value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} rows={6} className="input-field min-h-37.5" />
        </label>
        <div className="mt-5">
          <Button onClick={handleSubmit} isLoading={saving}>Save company profile</Button>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN: ProfileView
// ─────────────────────────────────────────────
export default function ProfileView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);

  const isJobSeeker = user?.role === "job_seeker";
  const insights = useMemo(() => isJobSeeker ? computeInsights(profile) : null, [profile, isJobSeeker]);

  // ── Data fetching ──
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getProfile();
      setProfile(res.data.profile || null);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecommendations = useCallback(async () => {
    if (!isJobSeeker) return;
    try {
      setRecsLoading(true);
      const res = await getJobRecommendations();
      const primaryRecommendations = dedupeRecommendations(res.data?.external || []);

      if (primaryRecommendations.length) {
        setRecommendations(primaryRecommendations);
        return;
      }

      const fallbackRes = await fetchExternalJobs();
      setRecommendations(pickProfileFallbackRecommendations(fallbackRes.data?.jobs || []).slice(0, 6));
    } catch (error) {
      console.error("Failed to fetch recommendations:", error);
      try {
        const fallbackRes = await fetchExternalJobs();
        setRecommendations(pickProfileFallbackRecommendations(fallbackRes.data?.jobs || []).slice(0, 6));
      } catch (fallbackError) {
        console.error("Fallback recommendation fetch failed:", fallbackError);
        setRecommendations([]);
      }
    } finally {
      setRecsLoading(false);
    }
  }, [isJobSeeker]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);
  useEffect(() => { fetchRecommendations(); }, [fetchRecommendations]);

  // ── Edit mode ──
  const startEditing = () => {
    setEditData({
      name: profile?.name || user?.name || "",
      email: profile?.email || user?.email || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      title: profile?.title || "",
      linkedin: profile?.linkedin || "",
      summary: profile?.summary || "",
      skills: profile?.skills || [],
      education: profile?.education || [],
      experience: profile?.experience || [],
      projects: profile?.projects || [],
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await saveJobSeekerProfile(editData);
      setEditing(false);
      await fetchProfile();
      await fetchRecommendations();
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const saveCompanyPatch = async (patch) => {
    await saveCompanyProfile(patch);
    await fetchProfile();
  };

  // ── Loading state ──
  if (loading) {
    return (
      <main className="page-shell">
        <section className="section-container py-12">
          <div className="min-h-[60vh] flex items-center justify-center">
            <div className="size-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        </section>
      </main>
    );
  }

  // ── Recruiter view ──
  if (!isJobSeeker) {
    return (
      <main className="page-shell">
        <section className="section-container py-8 sm:py-12 space-y-6">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors">
            <ArrowLeft className="size-4" /> Back
          </button>
          <RecruiterProfile profile={profile} onSave={saveCompanyPatch} />
        </section>
      </main>
    );
  }

  // ── Job Seeker: Edit Mode ──
  if (editing) {
    return (
      <main className="page-shell">
        <section className="section-container py-8 sm:py-12">
          <div className="content-max-width">
            <Card className="p-6 sm:p-10 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-display text-2xl text-text-primary flex items-center gap-2">
                  <Pencil className="size-5 text-primary" /> Edit Profile
                </h1>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                  <X className="size-4" /> Cancel
                </Button>
              </div>

              <JobSeekerProfileForm data={editData} onChange={setEditData} />

              <div className="flex justify-end mt-8 gap-3">
                <Button variant="secondary" size="lg" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="lg" onClick={handleSaveEdit} disabled={saving}>
                  {saving ? <><span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Saving...</> : "Save Changes"}
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>
    );
  }

  // ── Job Seeker: View Mode ──
  const skills = profile?.skills || [];
  const experience = Array.isArray(profile?.experience) ? profile.experience : [];
  const education = Array.isArray(profile?.education) ? profile.education : [];
  const projects = Array.isArray(profile?.projects) ? profile.projects : [];

  return (
    <main className="page-shell">
      <section className="section-container py-8 sm:py-12 space-y-6">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors">
          <ArrowLeft className="size-4" /> Back
        </button>

        {/* Hero card */}
        <Card className="overflow-hidden">
          <div className="p-8 sm:p-10 bg-linear-to-br from-[#f6f9ff] via-white to-[#eef8f4]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="grid size-20 place-items-center rounded-3xl bg-primary text-white text-3xl font-bold shadow-sm">
                  {profile?.name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge tone="brand">Job seeker</Badge>
                    <Badge tone="success">Profile strength {insights.completionScore}%</Badge>
                  </div>
                  <h1 className="font-display text-4xl text-text-primary">{profile?.name || user?.name || "Your profile"}</h1>
                  {profile?.title && <p className="mt-1 text-lg text-primary font-medium">{profile.title}</p>}
                  <p className="mt-3 max-w-2xl text-text-secondary leading-7">
                    {profile?.summary || "Add a summary to improve your recommendations and search ranking."}
                  </p>
                </div>
              </div>
              <Button onClick={startEditing}><Pencil className="size-4" /> Edit Profile</Button>
            </div>

            <div className="grid sm:grid-cols-4 gap-3 mt-6">
              {insights.stats.map((item) => (
                <ProfileMetric key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </div>
        </Card>

        <div className="grid xl:grid-cols-[minmax(0,1.2fr)_380px] gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Completion checks */}
            <Card className="p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="font-display text-xl text-text-primary">Profile Completion</h2>
                <span className="text-2xl font-semibold text-text-primary">{insights.completionScore}%</span>
              </div>
              <div className="h-3 rounded-full bg-surface-2 overflow-hidden mb-6">
                <div className="h-full rounded-full bg-linear-to-r from-primary to-accent transition-all duration-700" style={{ width: `${insights.completionScore}%` }} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {insights.checks.map((check) => (
                  <div key={check.label} className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-3">
                    <span className="text-sm text-text-primary">{check.label}</span>
                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${check.complete ? "bg-success/10 text-success" : "bg-amber-100 text-amber-700"}`}>
                      {check.complete ? "Done" : "Missing"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Experience & Education */}
            <div className="grid lg:grid-cols-2 gap-6">
              <TimelineList
                icon={<Briefcase className="size-5" />}
                title="Experience"
                items={experience}
                emptyText="No work history yet"
                getPrimary={(item) => typeof item === "string" ? item : item.title || item.role || item.position || "Role"}
                getSecondary={(item) => typeof item === "string" ? "" : [item.company, item.duration].filter(Boolean).join(" | ") || ""}
              />
              <TimelineList
                icon={<GraduationCap className="size-5" />}
                title="Education"
                items={education}
                emptyText="No education entries yet"
                getPrimary={(item) => typeof item === "string" ? item : item.degree || item.qualification || "Education"}
                getSecondary={(item) => typeof item === "string" ? "" : [item.institution || item.college, item.year || item.duration].filter(Boolean).join(" | ") || ""}
              />
            </div>

            {/* Projects */}
            {projects.length > 0 && (
              <Card className="p-6">
                <h2 className="font-display text-xl text-text-primary mb-4">Projects</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {projects.slice(0, 4).map((project, index) => (
                    <Card key={`project-${index}`} className="p-5 bg-surface-2 border-border">
                      <h3 className="font-semibold text-text-primary">
                        {typeof project === "string" ? project : project.name || project.title || `Project ${index + 1}`}
                      </h3>
                      <p className="mt-2 text-sm text-text-secondary leading-7">
                        {typeof project === "string" ? "" : project.description || ""}
                      </p>
                    </Card>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Recommendations */}
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-sm font-medium text-primary">
                    <Sparkles className="size-4" /> Matched jobs
                  </div>
                  <h2 className="mt-3 text-xl font-display text-text-primary">For your profile</h2>
                </div>
                <Button variant="secondary" size="sm" onClick={fetchRecommendations} isLoading={recsLoading}>
                  <RefreshCcw className="size-4" /> Refresh
                </Button>
              </div>

              <div className="mt-5 space-y-4">
                {recommendations.length ? (
                  recommendations.slice(0, 6).map((job, index) => (
                    <MiniJobCard key={getJobKey(job, index, "profile-rec")} job={job} index={index} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-text-secondary">
                    No recommendations yet. Refresh after saving stronger profile content.
                  </div>
                )}
              </div>

              <div className="mt-5">
                <Link to="/jobs" className="block">
                  <Button className="w-full justify-center">Browse all jobs</Button>
                </Link>
              </div>
            </Card>

            {/* Contact info */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-4">Contact Info</h2>
              <div className="space-y-4">
                <InfoRow icon={<UserRound className="size-4" />} label="Name" value={profile?.name || user?.name} />
                <InfoRow icon={<Mail className="size-4" />} label="Email" value={profile?.email || user?.email} />
                <InfoRow icon={<Phone className="size-4" />} label="Phone" value={profile?.phone} />
                <InfoRow icon={<MapPin className="size-4" />} label="Location" value={profile?.location} />
              </div>
            </Card>

            {/* Skills */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-text-primary">Skills</h2>
              {skills.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={`${skill}-${index}`} tone="brand">{skill}</Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-text-secondary">Add skills to improve recommendation quality.</p>
              )}
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
