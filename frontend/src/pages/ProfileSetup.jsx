import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  HiArrowLeft,
  HiArrowRight,
  HiCalendar,
  HiCheckCircle,
  HiCloudUpload,
  HiDocumentText,
  HiGlobe,
  HiLocationMarker,
  HiOfficeBuilding,
  HiTag,
} from "react-icons/hi";
import toast from "react-hot-toast";
import JobSeekerProfileEditor from "../components/profile/JobSeekerProfileEditor";
import {
  createEmptyJobSeekerProfile,
  normalizeJobSeekerProfileData,
  serializeJobSeekerProfileData,
} from "../components/profile/jobSeekerProfileData";
import Card from "../components/ui/Card";
import InputField from "../components/ui/InputField";
import Button from "../components/ui/Button";
import { useAuth } from "../context/useAuth";
import { saveCompanyProfile, saveJobSeekerProfile, uploadResume } from "../services/api";

function StepIndicator({ steps, currentStep }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {steps.map((label, index) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-300 ${
              index < currentStep
                ? "border border-success/30 bg-success/15 text-success"
                : index === currentStep
                  ? "border border-primary/30 bg-primary/15 text-primary shadow-sm"
                  : "border border-border bg-surface-2 text-text-secondary"
            }`}
          >
            {index < currentStep ? (
              <HiCheckCircle className="size-4" />
            ) : (
              <span className="grid size-4 place-items-center rounded-full bg-current/10 text-[10px]">
                {index + 1}
              </span>
            )}
            <span className="hidden sm:inline">{label}</span>
          </div>
          {index < steps.length - 1 ? (
            <div
              className={`h-0.5 w-6 rounded-full transition-colors duration-300 ${
                index < currentStep ? "bg-success/40" : "bg-border"
              }`}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function ProfileSetup() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const isJobSeeker = user?.role === "job_seeker";

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(false);

  const [formData, setFormData] = useState(() => createEmptyJobSeekerProfile(user));
  const [companyForm, setCompanyForm] = useState({
    name: "",
    description: "",
    website: "",
    location: "",
    industry: "",
    size: "",
    founded: "",
  });

  const handleFileDrop = useCallback((event) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer?.files?.[0] || event.target?.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "docx"].includes(ext)) {
      toast.error("Please upload a PDF or DOCX file");
      return;
    }

    setResumeFile(file);
  }, []);

  const handleParseResume = async () => {
    if (!resumeFile) return;

    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", resumeFile);
      const res = await uploadResume(fd);
      const parsedData = res.data.parsed_data || {};
      const personalInfo = parsedData.personal_info || {};
      const rawSkills = parsedData.skills || {};

      setFormData(
        normalizeJobSeekerProfileData(
          {
            name: personalInfo.name || user?.name || "",
            email: personalInfo.email || user?.email || "",
            phone: personalInfo.phone || "",
            location: personalInfo.location || "",
            title: "",
            github: personalInfo.github || "",
            linkedin: personalInfo.linkedin || "",
            summary: parsedData.summary || personalInfo.summary || "",
            skills: Array.isArray(rawSkills) ? rawSkills : rawSkills.skills || [],
            education: parsedData.education || [],
            experience: parsedData.experience || [],
            projects: parsedData.projects || [],
          },
          user,
        ),
      );

      setParsed(true);
      toast.success("Resume parsed! Review and edit your details below.");
      setStep(1);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to parse resume");
    } finally {
      setParsing(false);
    }
  };

  const handleSubmitJobSeeker = async () => {
    setLoading(true);
    try {
      await saveJobSeekerProfile(serializeJobSeekerProfileData(formData, user));
      setUser((prev) => ({ ...prev, profileComplete: true }));
      toast.success("Profile created successfully!");
      navigate("/");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

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

  if (!isJobSeeker) {
    const setCompanyField = (field) => (event) =>
      setCompanyForm((prev) => ({ ...prev, [field]: event.target.value }));

    return (
      <main className="page-shell">
        <section className="section-container py-8 sm:py-12">
          <div className="content-max-width">
            <div className="mb-6 animate-fade-in text-center">
              <h1 className="font-display text-3xl text-text-primary sm:text-4xl">Set Up Your Company Profile</h1>
              <p className="mt-2 text-text-secondary">
                Tell us about your organization so candidates can learn more.
              </p>
            </div>

            <StepIndicator steps={["Company Info", "Confirm"]} currentStep={step} />

            {step === 0 ? (
              <Card className="mx-auto max-w-2xl animate-fade-in-up p-6 sm:p-10">
                <h2 className="mb-6 flex items-center gap-2 font-display text-xl text-text-primary">
                  <HiOfficeBuilding className="size-5 text-primary" /> Company Details
                </h2>
                <div className="space-y-5">
                  <InputField id="c-name" label="Company Name *" value={companyForm.name} onChange={setCompanyField("name")} placeholder="Acme Corp" icon={<HiOfficeBuilding className="size-5" />} />
                  <InputField id="c-industry" label="Industry" value={companyForm.industry} onChange={setCompanyField("industry")} placeholder="Technology, Healthcare..." icon={<HiTag className="size-5" />} />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label htmlFor="c-size" className="block space-y-2">
                      <span className="text-sm font-semibold text-text-primary">Company Size</span>
                      <select id="c-size" className="input-field" value={companyForm.size} onChange={setCompanyField("size")}>
                        <option value="">Select size</option>
                        <option value="small">Small (1-50)</option>
                        <option value="medium">Medium (51-200)</option>
                        <option value="large">Large (201-1000)</option>
                        <option value="enterprise">Enterprise (1000+)</option>
                      </select>
                    </label>
                    <InputField id="c-founded" label="Founded Year" value={companyForm.founded} onChange={setCompanyField("founded")} placeholder="2015" icon={<HiCalendar className="size-5" />} />
                  </div>
                  <InputField id="c-website" label="Website" value={companyForm.website} onChange={setCompanyField("website")} placeholder="https://example.com" icon={<HiGlobe className="size-5" />} />
                  <InputField id="c-location" label="Location" value={companyForm.location} onChange={setCompanyField("location")} placeholder="Mumbai, India" icon={<HiLocationMarker className="size-5" />} />
                  <label htmlFor="c-description" className="block space-y-2">
                    <span className="text-sm font-semibold text-text-primary">Description</span>
                    <textarea
                      id="c-description"
                      className="input-field min-h-30 resize-y"
                      value={companyForm.description}
                      onChange={setCompanyField("description")}
                      placeholder="Tell candidates about your company..."
                      rows={4}
                    />
                  </label>
                </div>
                <div className="mt-8 flex justify-end">
                  <Button size="lg" onClick={() => setStep(1)}>
                    Review <HiArrowRight className="size-5" />
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="mx-auto max-w-2xl animate-fade-in-up p-6 sm:p-10">
                <h2 className="mb-6 flex items-center gap-2 font-display text-xl text-text-primary">
                  <HiCheckCircle className="size-5 text-success" /> Review & Complete
                </h2>
                <div className="space-y-4 rounded-xl border border-border bg-surface-3/50 p-5">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">Company</span>
                    <p className="font-display text-lg text-text-primary">{companyForm.name || "-"}</p>
                  </div>
                  {companyForm.industry ? (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">Industry</span>
                      <p className="text-text-primary">{companyForm.industry}</p>
                    </div>
                  ) : null}
                  {companyForm.location ? (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">Location</span>
                      <p className="text-text-primary">{companyForm.location}</p>
                    </div>
                  ) : null}
                  {companyForm.description ? (
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">About</span>
                      <p className="whitespace-pre-line text-text-primary">{companyForm.description}</p>
                    </div>
                  ) : null}
                </div>
                <div className="mt-8 flex justify-between">
                  <Button variant="secondary" size="lg" onClick={() => setStep(0)}>
                    <HiArrowLeft className="size-5" /> Edit
                  </Button>
                  <Button size="lg" onClick={handleSubmitCompany} disabled={loading}>
                    {loading ? (
                      <>
                        <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Complete Profile <HiCheckCircle className="size-5" />
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="section-container py-8 sm:py-12">
        <div className="content-max-width">
          <div className="mb-6 animate-fade-in text-center">
            <h1 className="font-display text-3xl text-text-primary sm:text-4xl">Complete Your Profile</h1>
            <p className="mt-2 text-text-secondary">
              Upload your resume and we&apos;ll auto-fill your profile. You can edit everything afterwards.
            </p>
          </div>

          <StepIndicator steps={["Upload Resume", "Review & Save"]} currentStep={step} />

          {step === 0 ? (
            <Card className="mx-auto max-w-2xl animate-fade-in-up p-6 sm:p-10">
              <h2 className="mb-6 flex items-center gap-2 font-display text-xl text-text-primary">
                <HiCloudUpload className="size-5 text-primary" /> Upload Your Resume
              </h2>
              <p className="mb-6 text-sm text-text-secondary">
                We&apos;ll extract your details and auto-fill the profile form. Supports <strong>PDF</strong> and <strong>DOCX</strong>.
              </p>

              <div
                className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-12 ${
                  dragOver
                    ? "scale-[1.01] border-primary bg-primary/5"
                    : resumeFile
                      ? "border-success/50 bg-success/5"
                      : "border-border hover:border-primary/40 hover:bg-primary/3"
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={handleFileDrop}
                />
                {resumeFile ? (
                  <div className="space-y-3">
                    <HiDocumentText className="mx-auto size-12 text-success" />
                    <p className="font-semibold text-text-primary">{resumeFile.name}</p>
                    <p className="text-xs text-text-secondary">
                      {(resumeFile.size / 1024).toFixed(1)} KB - Click or drop to change
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <HiCloudUpload className="mx-auto size-12 text-text-secondary" />
                    <p className="font-semibold text-text-primary">Drag & drop your resume here</p>
                    <p className="text-sm text-text-secondary">or click to browse files</p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col justify-between gap-3 sm:flex-row">
                <Button variant="ghost" size="lg" onClick={() => setStep(1)}>
                  Skip - fill manually <HiArrowRight className="size-5" />
                </Button>
                <Button size="lg" onClick={handleParseResume} disabled={!resumeFile || parsing}>
                  {parsing ? (
                    <>
                      <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      Parse & Auto-Fill <HiArrowRight className="size-5" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="mx-auto max-w-4xl animate-fade-in-up p-6 sm:p-10">
              <h2 className="mb-2 flex items-center gap-2 font-display text-xl text-text-primary">
                <HiCheckCircle className="size-5 text-primary" /> Review Your Details
              </h2>
              {parsed ? (
                <p className="mb-6 text-sm text-success">Auto-filled from your resume. Edit any field below.</p>
              ) : (
                <p className="mb-6 text-sm text-text-secondary">Fill in your details manually below.</p>
              )}

              <JobSeekerProfileEditor
                data={formData}
                onChange={setFormData}
                idPrefix="setup-profile"
              />

              <div className="mt-8 flex justify-between">
                <Button variant="secondary" size="lg" onClick={() => setStep(0)}>
                  <HiArrowLeft className="size-5" /> Back
                </Button>
                <Button size="lg" onClick={handleSubmitJobSeeker} disabled={loading}>
                  {loading ? (
                    <>
                      <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Creating Profile...
                    </>
                  ) : (
                    <>
                      Save Profile <HiCheckCircle className="size-5" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}
