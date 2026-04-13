import { useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  HiAcademicCap,
  HiBriefcase,
  HiCode,
  HiDocumentText,
  HiLink,
  HiMail,
  HiPhone,
  HiUpload,
  HiUser,
  HiX,
} from "react-icons/hi";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { uploadResume } from "../services/api";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import SectionHeading from "../components/ui/SectionHeading";
import { cn } from "../utils/cn";

const ResumeParser = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const info = parsedData?.personal_info || {};
  const skills = parsedData?.skills?.skills || [];
  const education = parsedData?.education || [];
  const experience = parsedData?.experience || [];
  const projects = parsedData?.projects || [];

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") setDragActive(true);
    if (event.type === "dragleave") setDragActive(false);
  };

  const validateAndSetFile = (selectedFile) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx"].includes(ext || "")) return toast.error("Only .pdf and .docx files are allowed");
    if (selectedFile.size > 10 * 1024 * 1024) return toast.error("File size must be under 10MB");
    setFile(selectedFile);
    setParsedData(null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  const clearFile = () => {
    setFile(null);
    setParsedData(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please select a resume file");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await uploadResume(formData);
      setParsedData(response.data.parsed_data);
      toast.success("Resume parsed successfully");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to parse resume");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="section-container py-8 sm:py-12 space-y-8">
        <SectionHeading
          align="center"
          title="AI Resume Parser"
          subtitle="Upload a PDF or DOCX resume and extract structured professional data in seconds."
        />

        <Card
          className={cn(
            "p-6 sm:p-10 border-2 border-dashed transition-all duration-200",
            dragActive ? "border-primary bg-primary/5" : "border-border",
            file && "border-success/40 bg-success/5"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input ref={inputRef} type="file" accept=".pdf,.docx" onChange={handleFileChange} className="hidden" />

          {file ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-14 place-items-center rounded-2xl bg-success/15 text-success">
                  <HiDocumentText className="size-8" />
                </span>
                <div>
                  <p className="font-semibold text-text-primary break-all">{file.name}</p>
                  <p className="text-sm text-text-secondary">
                    {(file.size / 1024).toFixed(1)} KB • {file.name.split(".").pop()?.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearFile}
                aria-label="Remove selected file"
                className="btn btn-ghost btn-sm"
              >
                <HiX className="size-5" />
              </button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary text-white">
                <HiUpload className="size-8" />
              </span>
              <p className="text-lg text-text-primary font-semibold">Drop a resume here or select a file</p>
              <p className="text-sm text-text-secondary">Accepted formats: PDF, DOCX. Max size: 10MB.</p>
              <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                Browse files
              </Button>
            </div>
          )}
        </Card>

        {file && !parsedData ? (
          <div className="text-center">
            <Button size="lg" onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <span className="size-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Analyzing document...
                </>
              ) : (
                <>
                  <HiUpload className="size-5" />
                  Parse resume
                </>
              )}
            </Button>
          </div>
        ) : null}

        {parsedData ? (
          <section className="space-y-6 animate-fade-in-up" aria-live="polite">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <SectionHeading
                title="Analysis complete"
                subtitle="Review extracted information and parse another file if needed."
              />
              <Button variant="secondary" onClick={clearFile}>
                Parse another file
              </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
              <div className="space-y-5">
                {(info.name || info.email) && (
                  <Card className="p-5 space-y-4">
                    <h3 className="font-display text-xl text-text-primary">Personal details</h3>
                    {info.name ? <InfoItem icon={<HiUser />} label="Full name" value={info.name} /> : null}
                    {info.email ? <InfoItem icon={<HiMail />} label="Email" value={info.email} /> : null}
                    {info.phone ? <InfoItem icon={<HiPhone />} label="Phone" value={info.phone} /> : null}
                    {info.github ? <InfoItem icon={<FaGithub />} label="GitHub" value={info.github} isLink /> : null}
                    {info.linkedin ? <InfoItem icon={<FaLinkedin />} label="LinkedIn" value={info.linkedin} isLink /> : null}
                  </Card>
                )}

                {skills.length > 0 ? (
                  <Card className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl text-text-primary">Skills</h3>
                      <Badge tone="brand">{skills.length} detected</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill, index) => (
                        <Badge key={`${skill}-${index}`} tone="neutral">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    {parsedData.skills?.confidence_score > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary">Confidence</span>
                          <span className="font-semibold text-primary">
                            {(parsedData.skills.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-lighter overflow-hidden">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-primary-strong to-accent transition-all duration-700"
                            style={{ width: `${parsedData.skills.confidence_score * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </Card>
                ) : null}
              </div>

              <div className="lg:col-span-2 space-y-5">
                {experience.length > 0 ? (
                  <Card className="p-5 space-y-4">
                    <h3 className="font-display text-xl text-text-primary flex items-center gap-2">
                      <HiBriefcase className="size-5 text-primary" />
                      Work experience
                    </h3>
                    <div className="space-y-3">
                      {experience.map((item, index) => (
                        <Card key={`${item.title || item.role || "exp"}-${index}`} className="p-4 bg-surface-light border-border">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div>
                              <h4 className="font-semibold text-text-primary">
                                {item.title || item.role || item.position || "Position"}
                              </h4>
                              <p className="text-sm text-primary">{item.company || item.organization || "Company"}</p>
                            </div>
                            {item.duration ? <Badge tone="neutral">{item.duration}</Badge> : null}
                          </div>
                          {item.description ? <p className="mt-2 text-sm text-text-secondary whitespace-pre-line">{item.description}</p> : null}
                        </Card>
                      ))}
                    </div>
                  </Card>
                ) : null}

                {education.length > 0 ? (
                  <Card className="p-5 space-y-4">
                    <h3 className="font-display text-xl text-text-primary flex items-center gap-2">
                      <HiAcademicCap className="size-5 text-primary" />
                      Education
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {education.map((item, index) => (
                        <Card key={`${item.degree || "edu"}-${index}`} className="p-4 bg-surface-light border-border">
                          <p className="font-semibold text-text-primary">{item.degree || item.qualification || "Degree"}</p>
                          <p className="text-sm text-text-secondary">{item.institution || item.college || "Institution"}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.year || item.duration ? <Badge tone="neutral">{item.year || item.duration}</Badge> : null}
                            {item.gpa ? <Badge tone="success">GPA: {item.gpa}</Badge> : null}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </Card>
                ) : null}

                {projects.length > 0 ? (
                  <Card className="p-5 space-y-4">
                    <h3 className="font-display text-xl text-text-primary flex items-center gap-2">
                      <HiCode className="size-5 text-primary" />
                      Projects
                    </h3>
                    <div className="space-y-3">
                      {projects.map((item, index) => (
                        <Card key={`${item.name || item.title || "project"}-${index}`} className="p-4 bg-surface-light border-border">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <p className="font-semibold text-text-primary">{item.name || item.title || `Project ${index + 1}`}</p>
                            {item.duration ? <Badge tone="neutral">{item.duration}</Badge> : null}
                          </div>
                          {item.description ? <p className="mt-2 text-sm text-text-secondary">{item.description}</p> : null}
                          {item.highlights?.length ? (
                            <ul className="mt-2 space-y-1">
                              {item.highlights.slice(0, 3).map((highlight, idx) => (
                                <li key={idx} className="text-sm text-text-secondary flex gap-2">
                                  <HiLink className="mt-0.5 size-4 text-primary shrink-0" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </Card>
                      ))}
                    </div>
                  </Card>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          file === null && (
            <Card className="p-6 text-center">
              <p className="text-text-secondary">Upload a resume to start parsing candidate information.</p>
            </Card>
          )
        )}
      </section>
    </main>
  );
};

const InfoItem = ({ icon, label, value, isLink = false }) => (
  <div className="flex items-center gap-3">
    <span className="grid size-9 place-items-center rounded-xl bg-surface-lighter text-text-secondary">{icon}</span>
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-text-secondary">{label}</p>
      {isLink ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary hover:underline break-all"
        >
          {value}
        </a>
      ) : (
        <p className="font-semibold text-text-primary break-all">{value}</p>
      )}
    </div>
  </div>
);

export default ResumeParser;
