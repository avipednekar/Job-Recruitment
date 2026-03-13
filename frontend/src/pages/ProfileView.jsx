import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileSearch,
  Github,
  GraduationCap,
  Lightbulb,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Sparkles,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";
import {
  createCompanyProfile,
  createJobSeekerProfile,
  getJobRecommendations,
  getProfile,
} from "../services/api";
import { getJobDestination, getJobKey, isExternalJob } from "../utils/job-utils";
import {
  buildProfileInsights,
  normalizeProfileList,
} from "../utils/profile-insights";

function ProfileMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface-2 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-text-secondary font-semibold">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value, href }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid size-10 place-items-center rounded-xl bg-surface-2 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.16em] text-text-secondary font-semibold">
          {label}
        </p>
        {href && value ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline break-all"
          >
            {value}
            <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <p className="mt-1 text-sm text-text-primary break-words">
            {value || "Not added yet"}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickEditPanel({
  title,
  value,
  placeholder,
  onSave,
  multiline = false,
  formatter = (nextValue) => nextValue,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value || "");
  }, [value]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await onSave(formatter(draft));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-text-primary">{title}</h3>
        {!editing ? (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>

      {!editing ? (
        <p className="mt-4 text-sm leading-7 text-text-secondary whitespace-pre-line">
          {value || placeholder}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              className="input-field min-h-[130px]"
              placeholder={placeholder}
            />
          ) : (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="input-field"
              placeholder={placeholder}
            />
          )}
          <div className="flex gap-3">
            <Button size="sm" onClick={handleSave} isLoading={saving}>
              Save
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraft(value || "");
                setEditing(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
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
              <Badge tone="success">
                {Math.round(job.match_metrics.overall_match_score)}% match
              </Badge>
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
          <a
            href={destination}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong"
          >
            Open listing
            <ExternalLink className="size-4" />
          </a>
        ) : (
          <Link
            to={destination}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-strong"
          >
            View job
            <ExternalLink className="size-4" />
          </Link>
        )}
      </div>
    </Card>
  );
}

function TimelineList({ icon, title, items, emptyText, getPrimary, getSecondary }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-text-primary">{title}</h3>
          <p className="text-sm text-text-secondary">
            {items.length ? `${items.length} item${items.length !== 1 ? "s" : ""}` : emptyText}
          </p>
        </div>
      </div>

      {items.length ? (
        <div className="mt-5 space-y-4">
          {items.slice(0, 4).map((item, index) => (
            <div key={`${title}-${index}`} className="rounded-2xl border border-border bg-surface-2 p-4">
              <p className="font-medium text-text-primary">{getPrimary(item, index)}</p>
              <p className="mt-1 text-sm text-text-secondary">{getSecondary(item)}</p>
            </div>
          ))}
        </div>
      ) : null}
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
      <Card className="p-8 bg-gradient-to-br from-[#f5f9ff] via-white to-[#eef8f3]">
        <h1 className="font-display text-4xl text-text-primary">
          {profile?.name || "Company profile"}
        </h1>
        <p className="mt-3 max-w-2xl text-text-secondary leading-7">
          Keep your employer profile polished so candidates understand your brand quickly and trust the roles you publish.
        </p>
      </Card>

      <Card className="p-6">
        <div className="grid md:grid-cols-2 gap-4">
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
                onChange={(e) => setDraft((prev) => ({ ...prev, [field]: e.target.value }))}
                className="input-field"
              />
            </label>
          ))}
        </div>

        <label className="block space-y-2 mt-4">
          <span className="text-sm font-semibold text-text-primary">Description</span>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            rows={6}
            className="input-field min-h-[150px]"
          />
        </label>

        <div className="mt-5">
          <Button onClick={handleSubmit} isLoading={saving}>
            Save company profile
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function ProfileView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState({ internal: [], external: [] });
  const [recsLoading, setRecsLoading] = useState(false);

  const isJobSeeker = user?.role === "job_seeker";
  const personalInfo = profile?.personal_info || {};
  const skills = profile?.skills?.skills || [];
  const experience = useMemo(() => normalizeProfileList(profile?.experience), [profile?.experience]);
  const education = useMemo(() => normalizeProfileList(profile?.education), [profile?.education]);
  const projects = useMemo(() => normalizeProfileList(profile?.projects), [profile?.projects]);
  const insights = useMemo(() => buildProfileInsights(profile), [profile]);

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
      setRecommendations({
        internal: res.data?.internal || [],
        external: res.data?.external || [],
      });
    } catch (error) {
      console.error("Failed to fetch profile recommendations:", error);
    } finally {
      setRecsLoading(false);
    }
  }, [isJobSeeker]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const saveJobSeekerPatch = async (patch) => {
    const nextProfile = {
      ...profile,
      ...patch,
      personal_info: {
        ...profile?.personal_info,
        ...patch.personal_info,
      },
      skills: patch.skills || profile?.skills || { skills: [] },
    };

    await createJobSeekerProfile(nextProfile);
    await fetchProfile();
    toast.success("Profile updated");
  };

  const saveCompanyPatch = async (patch) => {
    await createCompanyProfile(patch);
    await fetchProfile();
  };

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

  if (!isJobSeeker) {
    return (
      <main className="page-shell">
        <section className="section-container py-8 sm:py-12 space-y-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
          <RecruiterProfile profile={profile} onSave={saveCompanyPatch} />
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="section-container py-8 sm:py-12 space-y-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <Card className="overflow-hidden">
          <div className="p-8 sm:p-10 bg-gradient-to-br from-[#f6f9ff] via-white to-[#eef8f4]">
            <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] gap-8">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="grid size-20 place-items-center rounded-3xl bg-primary text-white text-3xl font-bold shadow-sm">
                    {personalInfo.name?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge tone="brand">Job seeker</Badge>
                      <Badge tone="success">Profile strength {insights.completionScore}%</Badge>
                    </div>
                    <h1 className="font-display text-4xl text-text-primary">
                      {personalInfo.name || user?.name || "Your profile"}
                    </h1>
                    <p className="mt-3 max-w-2xl text-text-secondary leading-7">
                      {personalInfo.summary ||
                        "Add a focused summary so recommendations, search ranking, and recruiter trust all improve together."}
                    </p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-4 gap-3">
                  {insights.stats.map((item) => (
                    <ProfileMetric key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </div>

              <Card className="p-6 bg-white/90">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-text-secondary font-semibold">
                      Quick actions
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-text-primary">
                      Keep your profile interview-ready
                    </h2>
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <InfoRow icon={<Mail className="size-4" />} label="Email" value={personalInfo.email || user?.email} />
                  <InfoRow icon={<Phone className="size-4" />} label="Phone" value={personalInfo.phone} />
                  <InfoRow
                    icon={<Linkedin className="size-4" />}
                    label="LinkedIn"
                    value={personalInfo.linkedin}
                    href={personalInfo.linkedin ? (personalInfo.linkedin.startsWith("http") ? personalInfo.linkedin : `https://${personalInfo.linkedin}`) : ""}
                  />
                  <InfoRow
                    icon={<Github className="size-4" />}
                    label="GitHub"
                    value={personalInfo.github}
                    href={personalInfo.github ? (personalInfo.github.startsWith("http") ? personalInfo.github : `https://${personalInfo.github}`) : ""}
                  />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/profile/setup">
                    <Button>Edit full profile</Button>
                  </Link>
                  <Link to="/resume-parser">
                    <Button variant="secondary">Open resume parser</Button>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </Card>

        <div className="grid xl:grid-cols-[minmax(0,1.2fr)_380px] gap-6">
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <QuickEditPanel
                title="Professional summary"
                value={personalInfo.summary}
                placeholder="Write a concise summary covering your focus, years of experience, strongest skills, and the kind of role you want next."
                multiline
                onSave={(nextValue) => saveJobSeekerPatch({ personal_info: { summary: nextValue } })}
              />
              <QuickEditPanel
                title="Core skills"
                value={skills.join(", ")}
                placeholder="React, Node.js, Python, SQL, AWS"
                formatter={(nextValue) => ({
                  skills: nextValue
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  confidence_score: profile?.skills?.confidence_score || 0,
                })}
                onSave={(nextValue) => saveJobSeekerPatch({ skills: nextValue })}
              />
            </div>

            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-sm font-medium text-primary">
                    <FileSearch className="size-4" />
                    Resume content analyser
                  </div>
                  <h2 className="mt-3 font-display text-2xl text-text-primary">
                    Profile quality and recommendation readiness
                  </h2>
                  <p className="mt-1 text-text-secondary">
                    This section turns your saved resume/profile content into practical guidance.
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-text-secondary font-semibold">
                    Completion score
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-text-primary">
                    {insights.completionScore}%
                  </p>
                </div>
              </div>

              <div className="mt-6 h-3 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                  style={{ width: `${insights.completionScore}%` }}
                />
              </div>

              <div className="mt-6 grid lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-text-primary flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-success" />
                    Coverage check
                  </h3>
                  <div className="mt-4 space-y-3">
                    {insights.checks.map((check) => (
                      <div
                        key={check.label}
                        className="flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-4 py-3"
                      >
                        <span className="text-sm text-text-primary">{check.label}</span>
                        <span
                          className={`text-xs font-semibold rounded-full px-2.5 py-1 ${
                            check.complete
                              ? "bg-success/10 text-success"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {check.complete ? "Strong" : "Needs work"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6">
                  <div>
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                      <Sparkles className="size-5 text-primary" />
                      Strengths detected
                    </h3>
                    <div className="mt-4 space-y-3">
                      {(insights.strengths.length ? insights.strengths : ["Add more profile detail to unlock stronger AI insight highlights."]).map((item, index) => (
                        <div key={`strength-${index}`} className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-secondary">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-text-primary flex items-center gap-2">
                      <Lightbulb className="size-5 text-primary" />
                      Recommended additions
                    </h3>
                    <div className="mt-4 space-y-3">
                      {(insights.recommendations.length
                        ? insights.recommendations
                        : ["Your profile is already in strong shape. Refresh recommendations after major updates."]).map((item, index) => (
                        <div key={`recommend-${index}`} className="rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-text-secondary">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
              <TimelineList
                icon={<Briefcase className="size-5" />}
                title="Experience"
                items={experience}
                emptyText="No work history yet"
                getPrimary={(item) =>
                  typeof item === "string"
                    ? item
                    : item.title || item.role || item.position || "Role"
                }
                getSecondary={(item) =>
                  typeof item === "string"
                    ? "Add richer role details in profile setup."
                    : [item.company, item.duration].filter(Boolean).join(" | ") || "Add company and duration details."
                }
              />

              <TimelineList
                icon={<GraduationCap className="size-5" />}
                title="Education"
                items={education}
                emptyText="No education entries yet"
                getPrimary={(item) =>
                  typeof item === "string"
                    ? item
                    : item.degree || item.qualification || "Education"
                }
                getSecondary={(item) =>
                  typeof item === "string"
                    ? "Add institution and year in profile setup."
                    : [item.institution || item.college, item.year || item.duration]
                        .filter(Boolean)
                        .join(" | ") || "Add institution and year details."
                }
              />
            </div>

            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl text-text-primary">Projects and proof of work</h2>
                  <p className="mt-1 text-text-secondary">
                    Recruiters trust concrete project evidence more than generic claims.
                  </p>
                </div>
                <Link to="/profile/setup">
                  <Button variant="secondary">Edit projects</Button>
                </Link>
              </div>

              {projects.length ? (
                <div className="mt-6 grid md:grid-cols-2 gap-4">
                  {projects.slice(0, 4).map((project, index) => (
                    <Card key={`project-${index}`} className="p-5 bg-surface-2 border-border">
                      <h3 className="font-semibold text-text-primary">
                        {typeof project === "string"
                          ? project
                          : project.name || project.title || `Project ${index + 1}`}
                      </h3>
                      <p className="mt-2 text-sm text-text-secondary leading-7">
                        {typeof project === "string"
                          ? "Add a short description in profile setup to improve matching quality."
                          : project.description || "Add a concise description and outcomes for this project."}
                      </p>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-text-secondary">
                  Projects are one of the easiest ways to improve AI matching quality for technical roles.
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-sm font-medium text-primary">
                    <Sparkles className="size-4" />
                    Auto recommendations
                  </div>
                  <h2 className="mt-3 text-2xl font-display text-text-primary">
                    Jobs matched to your profile
                  </h2>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={fetchRecommendations}
                  isLoading={recsLoading}
                >
                  <RefreshCcw className="size-4" />
                  Refresh
                </Button>
              </div>

              <p className="mt-3 text-sm text-text-secondary">
                These roles are pulled automatically from your saved profile, so updating your summary, skills, or projects can change the ranking.
              </p>

              <div className="mt-5 space-y-4">
                {[...recommendations.internal.slice(0, 2), ...recommendations.external.slice(0, 1)].length ? (
                  [...recommendations.internal.slice(0, 2), ...recommendations.external.slice(0, 1)].map((job, index) => (
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

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-text-primary">Profile essentials</h2>
              <div className="mt-5 space-y-4">
                <InfoRow icon={<UserRound className="size-4" />} label="Name" value={personalInfo.name || user?.name} />
                <InfoRow icon={<Mail className="size-4" />} label="Email" value={personalInfo.email || user?.email} />
                <InfoRow icon={<Phone className="size-4" />} label="Phone" value={personalInfo.phone} />
                <InfoRow icon={<MapPin className="size-4" />} label="Preferred location" value={personalInfo.location} />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold text-text-primary">Skills snapshot</h2>
              {skills.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={`${skill}-${index}`} tone="brand">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-text-secondary">
                  Add skills to improve recommendation quality and recruiter search visibility.
                </p>
              )}
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
