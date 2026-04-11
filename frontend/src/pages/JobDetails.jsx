import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  MapPin,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import { applyToJob, getJobById } from "../services/api";
import { useAuth } from "../context/useAuth";

function timeAgo(dateStr) {
  if (!dateStr) return "Recently posted";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isInternalJobId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || "").trim());
}

export default function JobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      if (!isInternalJobId(id)) {
        toast.error("External jobs should be opened from their original listing.");
        setJob(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await getJobById(id);
        setJob(res.data.job || null);
      } catch (error) {
        toast.error(error.response?.data?.error || "Failed to load job details");
      } finally {
        setLoading(false);
      }
    };

    loadJob();
  }, [id]);

  const handleApply = async () => {
    if (!isInternalJobId(id)) {
      toast.error("External jobs must be applied to on their original listing.");
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    if (user.role !== "job_seeker") {
      toast.error("Only job seekers can apply to roles");
      return;
    }

    try {
      setApplying(true);
      const res = await applyToJob(id);
      toast.success(res.data?.message || "Application submitted");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <main className="page-shell">
        <section className="section-container py-12">
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="size-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        </section>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="page-shell">
        <section className="section-container py-12">
          <Card className="p-8 max-w-2xl mx-auto text-center space-y-4">
            <h1 className="font-display text-3xl text-text-primary">Job not found</h1>
            <p className="text-text-secondary">
              This role may have been removed or is no longer available.
            </p>
            <div className="flex justify-center">
              <Link to="/jobs">
                <Button>Back to jobs</Button>
              </Link>
            </div>
          </Card>
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
          <div className="p-8 bg-gradient-to-br from-primary/8 via-white to-accent/8 border-b border-border">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="grid size-16 place-items-center rounded-2xl text-white text-xl font-bold shadow-sm"
                    style={{ background: job.logoColor || "#2176FF" }}
                  >
                    {job.logo || job.company?.charAt(0) || "J"}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {job.urgent ? <Badge tone="success">Urgent hiring</Badge> : null}
                      {job.remote ? <Badge tone="neutral">Remote</Badge> : null}
                      {job.employment_type ? <Badge tone="neutral">{job.employment_type}</Badge> : null}
                    </div>
                    <h1 className="font-display text-3xl sm:text-4xl text-text-primary">
                      {job.title}
                    </h1>
                    <p className="mt-2 text-lg text-text-secondary">{job.company}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    {job.location || "Location not specified"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Briefcase className="size-4 text-primary" />
                    {job.experience_level || "Experience flexible"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="size-4 text-primary" />
                    {timeAgo(job.createdAt)}
                  </span>
                </div>
              </div>

              <Card className="p-5 min-w-[280px] bg-white/90">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-secondary font-semibold">
                      Compensation
                    </p>
                    <p className="mt-1 text-xl font-semibold text-text-primary">
                      {job.salary_range || "Salary not disclosed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-text-secondary font-semibold">
                      Hiring flow
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      Submit your profile once and we will attach your parsed resume data automatically.
                    </p>
                  </div>
                  <Button className="w-full justify-center" onClick={handleApply} isLoading={applying}>
                    Apply now
                  </Button>
                  <p className="text-xs text-text-tertiary">
                    Your existing profile, resume insights, and AI match context will be used.
                  </p>
                </div>
              </Card>
            </div>
          </div>

          <div className="p-8 grid lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-6">
            <div className="space-y-6">
              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-text-primary">Role overview</h2>
                <p className="text-text-secondary leading-7 whitespace-pre-line">
                  {job.description}
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold text-text-primary">Core skills</h2>
                {job.skills?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge key={`${skill}-${index}`} tone="brand">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-text-secondary">No explicit skills listed for this role.</p>
                )}
              </section>
            </div>

            <div className="space-y-4">
              <Card className="p-5 bg-surface-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Why this flow is cleaner</h3>
                    <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                      <li className="flex gap-2">
                        <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                        Recommendation cards now open real destinations.
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                        Applications connect to the saved candidate profile.
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                        Recruiters see better-qualified applicants sooner.
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  About the company
                </h3>
                <p className="mt-3 text-sm text-text-secondary">
                  {job.company} is hiring for this role on the RecruitAI platform.
                </p>
              </Card>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
