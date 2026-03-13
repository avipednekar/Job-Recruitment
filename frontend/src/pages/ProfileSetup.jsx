import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    HiCloudUpload,
    HiDocumentText,
    HiUser,
    HiCheckCircle,
    HiArrowRight,
    HiArrowLeft,
    HiX,
    HiPlus,
    HiOfficeBuilding,
    HiGlobe,
    HiLocationMarker,
    HiCalendar,
    HiUserGroup,
    HiTag,
} from "react-icons/hi";
import toast from "react-hot-toast";
import Card from "../components/ui/Card";
import InputField from "../components/ui/InputField";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { useAuth } from "../context/useAuth";
import {
    uploadResume,
    createJobSeekerProfile,
    createCompanyProfile,
} from "../services/api";

// ─────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────
const StepIndicator = ({ steps, currentStep }) => (
    <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
                <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 ${i < currentStep
                            ? "bg-success/15 text-success border border-success/30"
                            : i === currentStep
                                ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                                : "bg-surface-2 text-text-secondary border border-border"
                        }`}
                >
                    {i < currentStep ? (
                        <HiCheckCircle className="size-4" />
                    ) : (
                        <span className="grid place-items-center size-4 rounded-full bg-current/10 text-[10px]">
                            {i + 1}
                        </span>
                    )}
                    <span className="hidden sm:inline">{label}</span>
                </div>
                {i < steps.length - 1 && (
                    <div
                        className={`w-6 h-0.5 rounded-full transition-colors duration-300 ${i < currentStep ? "bg-success/40" : "bg-border"
                            }`}
                    />
                )}
            </div>
        ))}
    </div>
);

// ─────────────────────────────────────────────
// Skill tag input
// ─────────────────────────────────────────────
const SkillInput = ({ skills, setSkills }) => {
    const [input, setInput] = useState("");

    const addSkill = () => {
        const trimmed = input.trim();
        if (trimmed && !skills.includes(trimmed)) {
            setSkills([...skills, trimmed]);
            setInput("");
        }
    };

    const removeSkill = (skill) => setSkills(skills.filter((s) => s !== skill));

    return (
        <div className="space-y-2">
            <span className="text-sm font-semibold text-text-primary">Skills</span>
            <div className="flex gap-2">
                <input
                    className="input-field flex-1"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addSkill();
                        }
                    }}
                    placeholder="Type a skill and press Enter"
                />
                <Button variant="secondary" size="md" onClick={addSkill} type="button">
                    <HiPlus className="size-4" />
                </Button>
            </div>
            {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {skills.map((skill, index) => (
                        <span
                            key={`${skill}-${index}`}
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
    );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const ProfileSetup = () => {
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const isJobSeeker = user?.role === "job_seeker";

    // Wizard step
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);

    // ── Resume upload state ──
    const fileInputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [resumeFile, setResumeFile] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [parsed, setParsed] = useState(false);

    // ── Job Seeker profile form ──
    const [personalInfo, setPersonalInfo] = useState({
        name: user?.name || "",
        email: user?.email || "",
        phone: "",
        location: "",
        github: "",
        linkedin: "",
        summary: "",
    });
    const [skills, setSkills] = useState([]);
    const [education, setEducation] = useState([]);
    const [experience, setExperience] = useState([]);
    const [projects, setProjects] = useState([]);

    // ── Company profile form ──
    const [companyForm, setCompanyForm] = useState({
        name: "",
        description: "",
        website: "",
        location: "",
        industry: "",
        size: "",
        founded: "",
    });

    // ────────────────────────────
    // Resume handling
    // ────────────────────────────
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
            const formData = new FormData();
            formData.append("file", resumeFile);
            const res = await uploadResume(formData);
            const data = res.data.parsed_data;

            // Auto-fill fields
            if (data.personal_info) {
                setPersonalInfo({
                    name: data.personal_info.name || user?.name || "",
                    email: data.personal_info.email || user?.email || "",
                    phone: data.personal_info.phone || "",
                    location: data.personal_info.location || "",
                    github: data.personal_info.github || "",
                    linkedin: data.personal_info.linkedin || "",
                    summary: data.personal_info.summary || "",
                });
            }
            if (data.skills?.skills) setSkills(data.skills.skills);
            if (data.education) setEducation(data.education);
            if (data.experience) setExperience(data.experience);
            if (data.projects) setProjects(data.projects);

            setParsed(true);
            toast.success("Resume parsed! Fields auto-filled. Review and edit below.");
            setStep(1);
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to parse resume");
        } finally {
            setParsing(false);
        }
    };

    // ────────────────────────────
    // Submit profile
    // ────────────────────────────
    const handleSubmitJobSeeker = async () => {
        setLoading(true);
        try {
            await createJobSeekerProfile({
                personal_info: personalInfo,
                skills: { skills, confidence_score: 0 },
                education,
                experience,
                projects,
            });
            setUser((prev) => ({ ...prev, profileComplete: true }));
            toast.success("Profile created successfully!");
            navigate("/profile");
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
            await createCompanyProfile(companyForm);
            setUser((prev) => ({ ...prev, profileComplete: true }));
            toast.success("Company profile created!");
            navigate("/profile");
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to create profile");
        } finally {
            setLoading(false);
        }
    };

    // ────────────────────────────
    // Recruiter Steps
    // ────────────────────────────
    if (!isJobSeeker) {
        const recruiterSteps = ["Company Info", "Confirm"];

        return (
            <main className="page-shell">
                <section className="section-container py-8 sm:py-12">
                    <div className="content-max-width">
                        <div className="text-center mb-6 animate-fade-in">
                            <h1 className="font-display text-3xl sm:text-4xl text-text-primary">
                                Set Up Your Company Profile
                            </h1>
                            <p className="mt-2 text-text-secondary">
                                Tell us about your organization so candidates can learn more.
                            </p>
                        </div>

                        <StepIndicator steps={recruiterSteps} currentStep={step} />

                        {step === 0 && (
                            <Card className="p-6 sm:p-10 max-w-2xl mx-auto animate-fade-in-up">
                                <h2 className="font-display text-xl text-text-primary mb-6 flex items-center gap-2">
                                    <HiOfficeBuilding className="size-5 text-primary" />
                                    Company Details
                                </h2>
                                <div className="space-y-5">
                                    <InputField
                                        id="company-name"
                                        label="Company Name *"
                                        value={companyForm.name}
                                        onChange={(e) =>
                                            setCompanyForm((p) => ({ ...p, name: e.target.value }))
                                        }
                                        placeholder="Acme Corp"
                                        icon={<HiOfficeBuilding className="size-5" />}
                                    />
                                    <InputField
                                        id="company-industry"
                                        label="Industry"
                                        value={companyForm.industry}
                                        onChange={(e) =>
                                            setCompanyForm((p) => ({
                                                ...p,
                                                industry: e.target.value,
                                            }))
                                        }
                                        placeholder="Technology, Healthcare, Finance..."
                                        icon={<HiTag className="size-5" />}
                                    />
                                    <div className="grid sm:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <span className="text-sm font-semibold text-text-primary">
                                                Company Size
                                            </span>
                                            <select
                                                className="input-field"
                                                value={companyForm.size}
                                                onChange={(e) =>
                                                    setCompanyForm((p) => ({
                                                        ...p,
                                                        size: e.target.value,
                                                    }))
                                                }
                                            >
                                                <option value="">Select size</option>
                                                <option value="small">Small (1-50)</option>
                                                <option value="medium">Medium (51-200)</option>
                                                <option value="large">Large (201-1000)</option>
                                                <option value="enterprise">Enterprise (1000+)</option>
                                            </select>
                                        </div>
                                        <InputField
                                            id="company-founded"
                                            label="Founded Year"
                                            value={companyForm.founded}
                                            onChange={(e) =>
                                                setCompanyForm((p) => ({
                                                    ...p,
                                                    founded: e.target.value,
                                                }))
                                            }
                                            placeholder="2015"
                                            icon={<HiCalendar className="size-5" />}
                                        />
                                    </div>
                                    <InputField
                                        id="company-website"
                                        label="Website"
                                        value={companyForm.website}
                                        onChange={(e) =>
                                            setCompanyForm((p) => ({
                                                ...p,
                                                website: e.target.value,
                                            }))
                                        }
                                        placeholder="https://example.com"
                                        icon={<HiGlobe className="size-5" />}
                                    />
                                    <InputField
                                        id="company-location"
                                        label="Location"
                                        value={companyForm.location}
                                        onChange={(e) =>
                                            setCompanyForm((p) => ({
                                                ...p,
                                                location: e.target.value,
                                            }))
                                        }
                                        placeholder="Mumbai, India"
                                        icon={<HiLocationMarker className="size-5" />}
                                    />
                                    <div className="space-y-2">
                                        <span className="text-sm font-semibold text-text-primary">
                                            Description
                                        </span>
                                        <textarea
                                            className="input-field min-h-[120px] resize-y"
                                            value={companyForm.description}
                                            onChange={(e) =>
                                                setCompanyForm((p) => ({
                                                    ...p,
                                                    description: e.target.value,
                                                }))
                                            }
                                            placeholder="Tell candidates about your mission, culture, and what makes your company a great place to work..."
                                            rows={4}
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end mt-8">
                                    <Button size="lg" onClick={() => setStep(1)}>
                                        Review
                                        <HiArrowRight className="size-5" />
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {step === 1 && (
                            <Card className="p-6 sm:p-10 max-w-2xl mx-auto animate-fade-in-up">
                                <h2 className="font-display text-xl text-text-primary mb-6 flex items-center gap-2">
                                    <HiCheckCircle className="size-5 text-success" />
                                    Review & Complete
                                </h2>
                                <div className="space-y-4 rounded-xl bg-surface-3/50 p-5 border border-border">
                                    <div>
                                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                            Company
                                        </span>
                                        <p className="text-lg font-display text-text-primary">
                                            {companyForm.name || "—"}
                                        </p>
                                    </div>
                                    {companyForm.industry && (
                                        <div>
                                            <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                                Industry
                                            </span>
                                            <p className="text-text-primary">{companyForm.industry}</p>
                                        </div>
                                    )}
                                    <div className="grid sm:grid-cols-3 gap-4">
                                        {companyForm.size && (
                                            <div>
                                                <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                                    Size
                                                </span>
                                                <p className="text-text-primary capitalize">{companyForm.size}</p>
                                            </div>
                                        )}
                                        {companyForm.founded && (
                                            <div>
                                                <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                                    Founded
                                                </span>
                                                <p className="text-text-primary">{companyForm.founded}</p>
                                            </div>
                                        )}
                                        {companyForm.location && (
                                            <div>
                                                <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                                    Location
                                                </span>
                                                <p className="text-text-primary">{companyForm.location}</p>
                                            </div>
                                        )}
                                    </div>
                                    {companyForm.description && (
                                        <div>
                                            <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                                About
                                            </span>
                                            <p className="text-text-primary whitespace-pre-line">
                                                {companyForm.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-between mt-8">
                                    <Button
                                        variant="secondary"
                                        size="lg"
                                        onClick={() => setStep(0)}
                                    >
                                        <HiArrowLeft className="size-5" />
                                        Edit
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleSubmitCompany}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                Complete Profile
                                                <HiCheckCircle className="size-5" />
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

    // ────────────────────────────
    // Job Seeker Steps
    // ────────────────────────────
    const seekerSteps = ["Upload Resume", "Review & Edit", "Confirm"];

    return (
        <main className="page-shell">
            <section className="section-container py-8 sm:py-12">
                <div className="content-max-width">
                    <div className="text-center mb-6 animate-fade-in">
                        <h1 className="font-display text-3xl sm:text-4xl text-text-primary">
                            Complete Your Profile
                        </h1>
                        <p className="mt-2 text-text-secondary">
                            Upload your resume and we&apos;ll auto-fill your profile. You can edit everything afterwards.
                        </p>
                    </div>

                    <StepIndicator steps={seekerSteps} currentStep={step} />

                    {/* STEP 0 — Resume Upload */}
                    {step === 0 && (
                        <Card className="p-6 sm:p-10 max-w-2xl mx-auto animate-fade-in-up">
                            <h2 className="font-display text-xl text-text-primary mb-6 flex items-center gap-2">
                                <HiCloudUpload className="size-5 text-primary" />
                                Upload Your Resume
                            </h2>
                            <p className="text-text-secondary mb-6 text-sm">
                                We&apos;ll extract your details and auto-fill the profile form. Supports <strong>PDF</strong> and <strong>DOCX</strong>.
                            </p>

                            {/* Drop zone */}
                            <div
                                className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all duration-300 cursor-pointer ${dragOver
                                        ? "border-primary bg-primary/5 scale-[1.01]"
                                        : resumeFile
                                            ? "border-success/50 bg-success/5"
                                            : "border-border hover:border-primary/40 hover:bg-primary/3"
                                    }`}
                                onDragOver={(e) => {
                                    e.preventDefault();
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
                                        <HiDocumentText className="size-12 mx-auto text-success" />
                                        <p className="font-semibold text-text-primary">
                                            {resumeFile.name}
                                        </p>
                                        <p className="text-xs text-text-secondary">
                                            {(resumeFile.size / 1024).toFixed(1)} KB — Click or drop
                                            to change
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <HiCloudUpload className="size-12 mx-auto text-text-secondary" />
                                        <p className="font-semibold text-text-primary">
                                            Drag & drop your resume here
                                        </p>
                                        <p className="text-sm text-text-secondary">
                                            or click to browse files
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
                                <Button
                                    variant="ghost"
                                    size="lg"
                                    onClick={() => setStep(1)}
                                >
                                    Skip — fill manually
                                    <HiArrowRight className="size-5" />
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleParseResume}
                                    disabled={!resumeFile || parsing}
                                >
                                    {parsing ? (
                                        <>
                                            <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                            Parsing...
                                        </>
                                    ) : (
                                        <>
                                            Parse & Auto-Fill
                                            <HiArrowRight className="size-5" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* STEP 1 — Review & Edit */}
                    {step === 1 && (
                        <Card className="p-6 sm:p-10 max-w-3xl mx-auto animate-fade-in-up">
                            <h2 className="font-display text-xl text-text-primary mb-2 flex items-center gap-2">
                                <HiUser className="size-5 text-primary" />
                                Review Your Details
                            </h2>
                            {parsed && (
                                <p className="text-sm text-success mb-6">
                                    ✓ Auto-filled from your resume. Edit any field below.
                                </p>
                            )}
                            {!parsed && (
                                <p className="text-sm text-text-secondary mb-6">
                                    Fill in your details manually below.
                                </p>
                            )}

                            <div className="space-y-8">
                                {/* Personal Info */}
                                <div>
                                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">
                                        Personal Information
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <InputField
                                            id="pi-name"
                                            label="Full Name"
                                            value={personalInfo.name}
                                            onChange={(e) =>
                                                setPersonalInfo((p) => ({
                                                    ...p,
                                                    name: e.target.value,
                                                }))
                                            }
                                            placeholder="John Doe"
                                        />
                                        <InputField
                                            id="pi-email"
                                            label="Email"
                                            type="email"
                                            value={personalInfo.email}
                                            onChange={(e) =>
                                                setPersonalInfo((p) => ({
                                                    ...p,
                                                    email: e.target.value,
                                                }))
                                            }
                                            placeholder="john@example.com"
                                        />
                                        <InputField
                                            id="pi-phone"
                                            label="Phone"
                                            value={personalInfo.phone}
                                            onChange={(e) =>
                                                setPersonalInfo((p) => ({
                                                    ...p,
                                                    phone: e.target.value,
                                                }))
                                            }
                                            placeholder="+91 98765 43210"
                                        />
                                        <InputField
                                            id="pi-location"
                                            label="Location"
                                            value={personalInfo.location}
                                            onChange={(e) =>
                                                setPersonalInfo((p) => ({
                                                    ...p,
                                                    location: e.target.value,
                                                }))
                                            }
                                            placeholder="Bengaluru, India"
                                        />
                                        <InputField
                                            id="pi-linkedin"
                                            label="LinkedIn"
                                            value={personalInfo.linkedin}
                                            onChange={(e) =>
                                                setPersonalInfo((p) => ({
                                                    ...p,
                                                    linkedin: e.target.value,
                                                }))
                                            }
                                            placeholder="linkedin.com/in/johndoe"
                                        />
                                        <InputField
                                            id="pi-github"
                                            label="GitHub"
                                            value={personalInfo.github}
                                            onChange={(e) =>
                                                setPersonalInfo((p) => ({
                                                    ...p,
                                                    github: e.target.value,
                                                }))
                                            }
                                            placeholder="github.com/johndoe"
                                        />
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <span className="text-sm font-semibold text-text-primary">
                                            Professional Summary
                                        </span>
                                        <textarea
                                            className="input-field min-h-[100px] resize-y"
                                            value={personalInfo.summary}
                                            onChange={(e) =>
                                                setPersonalInfo((p) => ({
                                                    ...p,
                                                    summary: e.target.value,
                                                }))
                                            }
                                            placeholder="A brief summary about yourself, your experience, and what you're looking for..."
                                            rows={3}
                                        />
                                    </div>
                                </div>

                                {/* Skills */}
                                <div>
                                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">
                                        Skills
                                    </h3>
                                    <SkillInput skills={skills} setSkills={setSkills} />
                                </div>

                                {/* Education */}
                                <div>
                                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">
                                        Education
                                    </h3>
                                    {education.length > 0 ? (
                                        <div className="space-y-3">
                                            {education.map((edu, i) => (
                                                <div
                                                    key={i}
                                                    className="rounded-xl border border-border bg-surface-2 p-4"
                                                >
                                                    <p className="font-semibold text-text-primary">
                                                        {typeof edu === "string"
                                                            ? edu
                                                            : edu.degree || edu.institution || JSON.stringify(edu)}
                                                    </p>
                                                    {edu.institution && edu.degree && (
                                                        <p className="text-sm text-text-secondary">
                                                            {edu.institution}
                                                        </p>
                                                    )}
                                                    {edu.year && (
                                                        <p className="text-xs text-text-secondary mt-1">
                                                            {edu.year}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-text-secondary italic">
                                            No education data found. This will be saved as-is.
                                        </p>
                                    )}
                                </div>

                                {/* Experience */}
                                <div>
                                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">
                                        Experience
                                    </h3>
                                    {experience.length > 0 ? (
                                        <div className="space-y-3">
                                            {experience.map((exp, i) => (
                                                <div
                                                    key={i}
                                                    className="rounded-xl border border-border bg-surface-2 p-4"
                                                >
                                                    <p className="font-semibold text-text-primary">
                                                        {typeof exp === "string"
                                                            ? exp
                                                            : exp.title || exp.company || exp.role || JSON.stringify(exp)}
                                                    </p>
                                                    {exp.company && exp.title && (
                                                        <p className="text-sm text-text-secondary">
                                                            {exp.company}
                                                        </p>
                                                    )}
                                                    {exp.duration && (
                                                        <p className="text-xs text-text-secondary mt-1">
                                                            {exp.duration}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-text-secondary italic">
                                            No experience data found. This will be saved as-is.
                                        </p>
                                    )}
                                </div>

                                {/* Projects */}
                                <div>
                                    <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">
                                        Projects
                                    </h3>
                                    {projects.length > 0 ? (
                                        <div className="space-y-3">
                                            {projects.map((proj, i) => (
                                                <div
                                                    key={i}
                                                    className="rounded-xl border border-border bg-surface-2 p-4"
                                                >
                                                    <p className="font-semibold text-text-primary">
                                                        {typeof proj === "string"
                                                            ? proj
                                                            : proj.name || proj.title || JSON.stringify(proj)}
                                                    </p>
                                                    {proj.description && (
                                                        <p className="text-sm text-text-secondary mt-1">
                                                            {proj.description}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-text-secondary italic">
                                            No projects data found. This will be saved as-is.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between mt-8">
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => setStep(0)}
                                >
                                    <HiArrowLeft className="size-5" />
                                    Back
                                </Button>
                                <Button size="lg" onClick={() => setStep(2)}>
                                    Review Summary
                                    <HiArrowRight className="size-5" />
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* STEP 2 — Confirmation */}
                    {step === 2 && (
                        <Card className="p-6 sm:p-10 max-w-3xl mx-auto animate-fade-in-up">
                            <h2 className="font-display text-xl text-text-primary mb-6 flex items-center gap-2">
                                <HiCheckCircle className="size-5 text-success" />
                                Profile Summary
                            </h2>
                            <div className="space-y-5 rounded-xl bg-surface-3/50 p-5 border border-border">
                                <div className="flex items-center gap-4">
                                    <div className="grid size-14 place-items-center rounded-2xl bg-primary text-white text-xl font-bold">
                                        {personalInfo.name?.charAt(0)?.toUpperCase() || "U"}
                                    </div>
                                    <div>
                                        <p className="text-lg font-display text-text-primary">
                                            {personalInfo.name}
                                        </p>
                                        <p className="text-sm text-text-secondary">
                                            {personalInfo.email}
                                        </p>
                                    </div>
                                </div>

                                {personalInfo.summary && (
                                    <div>
                                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                            Summary
                                        </span>
                                        <p className="text-text-primary text-sm mt-1 whitespace-pre-line">
                                            {personalInfo.summary}
                                        </p>
                                    </div>
                                )}

                                {skills.length > 0 && (
                                    <div>
                                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                            Skills
                                        </span>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {skills.map((s, index) => (
                                                <Badge key={`${s}-${index}`} tone="brand">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                                    <div>
                                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                            Education
                                        </span>
                                        <p className="text-text-primary">
                                            {education.length} item{education.length !== 1 && "s"}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                            Experience
                                        </span>
                                        <p className="text-text-primary">
                                            {experience.length} item{experience.length !== 1 && "s"}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                            Projects
                                        </span>
                                        <p className="text-text-primary">
                                            {projects.length} item{projects.length !== 1 && "s"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between mt-8">
                                <Button
                                    variant="secondary"
                                    size="lg"
                                    onClick={() => setStep(1)}
                                >
                                    <HiArrowLeft className="size-5" />
                                    Edit Details
                                </Button>
                                <Button
                                    size="lg"
                                    onClick={handleSubmitJobSeeker}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                            Creating Profile...
                                        </>
                                    ) : (
                                        <>
                                            Complete Profile
                                            <HiCheckCircle className="size-5" />
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
};

export default ProfileSetup;
