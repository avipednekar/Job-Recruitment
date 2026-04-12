import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiCloudUpload,
  HiDocumentText,
  HiCheckCircle,
  HiArrowRight,
  HiArrowLeft,
  HiX,
  HiPlus,
  HiOfficeBuilding,
  HiGlobe,
  HiLocationMarker,
  HiCalendar,
  HiTag,
} from "react-icons/hi";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import InputField from "../components/ui/InputField";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useAuth } from "../context/useAuth";
import { uploadResume, saveJobSeekerProfile, saveCompanyProfile } from "../services/api";

// ─────────────────────────────────────────────
// Shared: Profile form for job seekers
// Exported so ProfileView can reuse it in edit mode
// ─────────────────────────────────────────────
export function JobSeekerProfileForm({ data, onChange }) {
  const [skillInput, setSkillInput] = useState("");

  const set = (field) => (e) => onChange({ ...data, [field]: e.target.value });

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !data.skills.includes(trimmed)) {
      onChange({ ...data, skills: [...data.skills, trimmed] });
      setSkillInput("");
    }
  };

  const removeSkill = (skill) =>
    onChange({ ...data, skills: data.skills.filter((s) => s !== skill) });

  return (
    <div className="space-y-8">
      {/* Personal Info */}
      <div>
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">
          Personal Information
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <InputField id="pf-name" label="Full Name" value={data.name} onChange={set("name")} placeholder="John Doe" />
          <InputField id="pf-email" label="Email" type="email" value={data.email} onChange={set("email")} placeholder="john@example.com" />
          <InputField id="pf-phone" label="Phone" value={data.phone} onChange={set("phone")} placeholder="+91 98765 43210" />
          <InputField id="pf-location" label="Location" value={data.location} onChange={set("location")} placeholder="Bengaluru, India" />
          <InputField id="pf-title" label="Job Title" value={data.title} onChange={set("title")} placeholder="Frontend Developer" />
          <InputField id="pf-linkedin" label="LinkedIn" value={data.linkedin} onChange={set("linkedin")} placeholder="linkedin.com/in/johndoe" />
        </div>
        <div className="mt-4 space-y-2">
          <span className="text-sm font-semibold text-text-primary">Professional Summary</span>
          <textarea
            className="input-field min-h-[100px] resize-y"
            value={data.summary}
            onChange={set("summary")}
            placeholder="A brief summary about your experience and what you're looking for..."
            rows={3}
          />
        </div>
      </div>

      {/* Skills */}
      <div>
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">Skills</h3>
        <div className="flex gap-2">
          <input
            className="input-field flex-1"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
            placeholder="Type a skill and press Enter"
          />
          <Button variant="secondary" size="md" onClick={addSkill} type="button">
            <HiPlus className="size-4" />
          </Button>
        </div>
        {data.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {data.skills.map((skill, i) => (
              <span
                key={`${skill}-${i}`}
                className="inline-flex items-center gap-1 badge badge-brand cursor-pointer hover:opacity-80"
                onClick={() => removeSkill(skill)}
              >
                {skill}
                <HiX className="size-3" />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Experience (read-only from resume parse, editable as text) */}
      <ReadOnlySection title="Experience" items={data.experience} emptyText="No experience data. This can be added later." />
      <ReadOnlySection title="Education" items={data.education} emptyText="No education data. This can be added later." />
      <ReadOnlySection title="Projects" items={data.projects} emptyText="No project data. This can be added later." />
    </div>
  );
}

/** Read-only list section for experience/education/projects parsed from resume */
function ReadOnlySection({ title, items = [], emptyText }) {
  if (!items.length) {
    return (
      <div>
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-2">{title}</h3>
        <p className="text-sm text-text-secondary italic">{emptyText}</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface-2 p-4">
            <p className="font-semibold text-text-primary text-sm">
              {typeof item === "string"
                ? item
                : item.title || item.name || item.degree || item.role || item.institution || JSON.stringify(item)}
            </p>
            {item.company && <p className="text-xs text-text-secondary mt-1">{item.company}</p>}
            {item.institution && item.degree && <p className="text-xs text-text-secondary mt-1">{item.institution}</p>}
            {(item.duration || item.year) && (
              <p className="text-xs text-text-secondary mt-1">{item.duration || item.year}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────
function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${
              i < currentStep
                ? "bg-success/15 text-success border border-success/30"
                : i === currentStep
                  ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                  : "bg-surface-2 text-text-secondary border border-border"
            }`}
          >
            {i < currentStep ? (
              <HiCheckCircle className="size-4" />
            ) : (
              <span className="grid place-items-center size-4 rounded-full bg-current/10 text-[10px]">{i + 1}</span>
            )}
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-6 h-0.5 rounded-full transition-colors duration-300 ${i < currentStep ? "bg-success/40" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Empty profile data template
// ─────────────────────────────────────────────
export const emptyJobSeekerProfile = (user) => ({
  name: user?.name || "",
  email: user?.email || "",
  phone: "",
  location: "",
  title: "",
  linkedin: "",
  summary: "",
  skills: [],
  education: [],
  experience: [],
  projects: [],
});

// ─────────────────────────────────────────────
// MAIN: ProfileSetup (onboarding for new users)
// ─────────────────────────────────────────────
export default function ProfileSetup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const isJobSeeker = user?.role === "job_seeker";

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Resume upload state
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);

  // Job Seeker form data (flat)
  const [formData, setFormData] = useState(emptyJobSeekerProfile(user));

  // Company form data
  const [companyForm, setCompanyForm] = useState({
    name: "", description: "", website: "", location: "", industry: "", size: "", founded: "",
  });

  // ── Resume handling ──
  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0] || e.target?.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop().toLowerCase();
      if (!["pdf", "docx"].includes(ext)) {
        toast.error("Please upload a PDF or DOCX file");
        return;
      }
      setResumeFile(file);
    }
  }, []);

  const handleParseResume = async () => {
    if (!resumeFile) return;
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", resumeFile);
      const res = await uploadResume(fd);
      const d = res.data.parsed_data;

      // Auto-fill from parsed data (AI returns nested format)
      const pi = d.personal_info || {};
      const rawSkills = d.skills || {};
      setFormData({
        name: pi.name || user?.name || "",
        email: pi.email || user?.email || "",
        phone: pi.phone || "",
        location: pi.location || "",
        title: "",
        linkedin: pi.linkedin || "",
        summary: pi.summary || "",
        skills: Array.isArray(rawSkills) ? rawSkills : (rawSkills.skills || []),
        education: d.education || [],
        experience: d.experience || [],
        projects: d.projects || [],
      });

      setParsed(true);
      toast.success("Resume parsed! Review and edit your details below.");
      setStep(1);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to parse resume");
    } finally {
      setParsing(false);
    }
  };

  // ── Submit: Job Seeker ──
  const handleSubmitJobSeeker = async () => {
    setLoading(true);
    try {
      await saveJobSeekerProfile(formData);
      setUser((prev) => ({ ...prev, profileComplete: true }));
      toast.success("Profile created successfully!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  // ── Submit: Company ──
  const handleSubmitCompany = async () => {
    if (!companyForm.name.trim()) {
      toast.error("Company name is required");
      return;
    }
    setLoading(true);
    try {
      await saveCompanyProfile(companyForm);
      setUser((prev) => ({ ...prev, profileComplete: true }));
      toast.success("Company profile created!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // RECRUITER FLOW (simple 2-step)
  // ─────────────────────────────────────────
  if (!isJobSeeker) {
    const cSet = (field) => (e) => setCompanyForm((p) => ({ ...p, [field]: e.target.value }));

    return (
      <main className="page-shell">
        <section className="section-container py-8 sm:py-12">
          <div className="content-max-width">
            <div className="text-center mb-6 animate-fade-in">
              <h1 className="font-display text-3xl sm:text-4xl text-text-primary">Set Up Your Company Profile</h1>
              <p className="mt-2 text-text-secondary">Tell us about your organization so candidates can learn more.</p>
            </div>

            <StepIndicator steps={["Company Info", "Confirm"]} currentStep={step} />

            {step === 0 && (
              <Card className="p-6 sm:p-10 max-w-2xl mx-auto animate-fade-in-up">
                <h2 className="font-display text-xl text-text-primary mb-6 flex items-center gap-2">
                  <HiOfficeBuilding className="size-5 text-primary" /> Company Details
                </h2>
                <div className="space-y-5">
                  <InputField id="c-name" label="Company Name *" value={companyForm.name} onChange={cSet("name")} placeholder="Acme Corp" icon={<HiOfficeBuilding className="size-5" />} />
                  <InputField id="c-industry" label="Industry" value={companyForm.industry} onChange={cSet("industry")} placeholder="Technology, Healthcare..." icon={<HiTag className="size-5" />} />
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <span className="text-sm font-semibold text-text-primary">Company Size</span>
                      <select className="input-field" value={companyForm.size} onChange={cSet("size")}>
                        <option value="">Select size</option>
                        <option value="small">Small (1-50)</option>
                        <option value="medium">Medium (51-200)</option>
                        <option value="large">Large (201-1000)</option>
                        <option value="enterprise">Enterprise (1000+)</option>
                      </select>
                    </div>
                    <InputField id="c-founded" label="Founded Year" value={companyForm.founded} onChange={cSet("founded")} placeholder="2015" icon={<HiCalendar className="size-5" />} />
                  </div>
                  <InputField id="c-website" label="Website" value={companyForm.website} onChange={cSet("website")} placeholder="https://example.com" icon={<HiGlobe className="size-5" />} />
                  <InputField id="c-location" label="Location" value={companyForm.location} onChange={cSet("location")} placeholder="Mumbai, India" icon={<HiLocationMarker className="size-5" />} />
                  <div className="space-y-2">
                    <span className="text-sm font-semibold text-text-primary">Description</span>
                    <textarea className="input-field min-h-[120px] resize-y" value={companyForm.description} onChange={cSet("description")} placeholder="Tell candidates about your company..." rows={4} />
                  </div>
                </div>
                <div className="flex justify-end mt-8">
                  <Button size="lg" onClick={() => setStep(1)}>Review <HiArrowRight className="size-5" /></Button>
                </div>
              </Card>
            )}

            {step === 1 && (
              <Card className="p-6 sm:p-10 max-w-2xl mx-auto animate-fade-in-up">
                <h2 className="font-display text-xl text-text-primary mb-6 flex items-center gap-2">
                  <HiCheckCircle className="size-5 text-success" /> Review & Complete
                </h2>
                <div className="space-y-4 rounded-xl bg-surface-3/50 p-5 border border-border">
                  <div><span className="text-xs font-bold text-text-secondary uppercase tracking-wide">Company</span><p className="text-lg font-display text-text-primary">{companyForm.name || "—"}</p></div>
                  {companyForm.industry && <div><span className="text-xs font-bold text-text-secondary uppercase tracking-wide">Industry</span><p className="text-text-primary">{companyForm.industry}</p></div>}
                  {companyForm.location && <div><span className="text-xs font-bold text-text-secondary uppercase tracking-wide">Location</span><p className="text-text-primary">{companyForm.location}</p></div>}
                  {companyForm.description && <div><span className="text-xs font-bold text-text-secondary uppercase tracking-wide">About</span><p className="text-text-primary whitespace-pre-line">{companyForm.description}</p></div>}
                </div>
                <div className="flex justify-between mt-8">
                  <Button variant="secondary" size="lg" onClick={() => setStep(0)}><HiArrowLeft className="size-5" /> Edit</Button>
                  <Button size="lg" onClick={handleSubmitCompany} disabled={loading}>
                    {loading ? <><span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Creating...</> : <>Complete Profile <HiCheckCircle className="size-5" /></>}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </section>
      </main>
    );
  }

  // ─────────────────────────────────────────
  // JOB SEEKER FLOW (2-step: Upload → Review)
  // ─────────────────────────────────────────
  return (
    <main className="page-shell">
      <section className="section-container py-8 sm:py-12">
        <div className="content-max-width">
          <div className="text-center mb-6 animate-fade-in">
            <h1 className="font-display text-3xl sm:text-4xl text-text-primary">Complete Your Profile</h1>
            <p className="mt-2 text-text-secondary">Upload your resume and we&apos;ll auto-fill your profile. You can edit everything afterwards.</p>
          </div>

          <StepIndicator steps={["Upload Resume", "Review & Save"]} currentStep={step} />

          {/* STEP 0 — Resume Upload */}
          {step === 0 && (
            <Card className="p-6 sm:p-10 max-w-2xl mx-auto animate-fade-in-up">
              <h2 className="font-display text-xl text-text-primary mb-6 flex items-center gap-2">
                <HiCloudUpload className="size-5 text-primary" /> Upload Your Resume
              </h2>
              <p className="text-text-secondary mb-6 text-sm">
                We&apos;ll extract your details and auto-fill the profile form. Supports <strong>PDF</strong> and <strong>DOCX</strong>.
              </p>

              <div
                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer ${
                  dragOver
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : resumeFile
                      ? "border-success/50 bg-success/5"
                      : "border-border hover:border-primary/40 hover:bg-primary/3"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileDrop} />
                {resumeFile ? (
                  <div className="space-y-3">
                    <HiDocumentText className="size-12 mx-auto text-success" />
                    <p className="font-semibold text-text-primary">{resumeFile.name}</p>
                    <p className="text-xs text-text-secondary">{(resumeFile.size / 1024).toFixed(1)} KB — Click or drop to change</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <HiCloudUpload className="size-12 mx-auto text-text-secondary" />
                    <p className="font-semibold text-text-primary">Drag & drop your resume here</p>
                    <p className="text-sm text-text-secondary">or click to browse files</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
                <Button variant="ghost" size="lg" onClick={() => setStep(1)}>
                  Skip — fill manually <HiArrowRight className="size-5" />
                </Button>
                <Button size="lg" onClick={handleParseResume} disabled={!resumeFile || parsing}>
                  {parsing ? <><span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Parsing...</> : <>Parse & Auto-Fill <HiArrowRight className="size-5" /></>}
                </Button>
              </div>
            </Card>
          )}

          {/* STEP 1 — Review & Save */}
          {step === 1 && (
            <Card className="p-6 sm:p-10 max-w-3xl mx-auto animate-fade-in-up">
              <h2 className="font-display text-xl text-text-primary mb-2 flex items-center gap-2">
                <HiCheckCircle className="size-5 text-primary" /> Review Your Details
              </h2>
              {parsed && <p className="text-sm text-success mb-6">✓ Auto-filled from your resume. Edit any field below.</p>}
              {!parsed && <p className="text-sm text-text-secondary mb-6">Fill in your details manually below.</p>}

              <JobSeekerProfileForm data={formData} onChange={setFormData} />

              <div className="flex justify-between mt-8">
                <Button variant="secondary" size="lg" onClick={() => setStep(0)}>
                  <HiArrowLeft className="size-5" /> Back
                </Button>
                <Button size="lg" onClick={handleSubmitJobSeeker} disabled={loading}>
                  {loading ? <><span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Creating Profile...</> : <>Save Profile <HiCheckCircle className="size-5" /></>}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}
