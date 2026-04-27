import { useState } from "react";
import { Upload, FileText, CheckCircle2, BarChart, AlertCircle, FileUp } from "lucide-react";
import toast from "react-hot-toast";
import { checkATSScore } from "../services/api";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { getMatchColor, MatchBadge } from "../utils/job-utils";


export default function ATSChecker() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.type === "application/pdf" || selected.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setFile(selected);
      } else {
        toast.error("Please upload a PDF or DOCX file");
        e.target.value = null;
      }
    }
  };

  const handleCheck = async () => {
    if (!file) {
      toast.error("Please upload your resume");
      return;
    }
    if (!jobDescription.trim()) {
      toast.error("Please paste the job description");
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("resume", file);
      formData.append("job_description", jobDescription);

      const res = await checkATSScore(formData);
      setResult(res.data);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("ATS Check failed:", error);
      toast.error(error.response?.data?.error || "Failed to analyze resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section-container py-24 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-2">
            <BarChart className="size-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold text-text-primary tracking-tight">
            ATS Score Checker
          </h1>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Upload your resume and paste a job description to instantly see how well you match. 
            Identify missing keywords and optimize your resume to beat the ATS.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Left Column: Inputs */}
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-text-primary">
                <FileUp className="size-5 text-primary" />
                1. Upload Resume
              </h2>
              <div className="relative group cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors
                  ${file ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary/50 hover:bg-surface-light"}`}
                >
                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="size-10 text-primary" />
                      <p className="font-medium text-text-primary">{file.name}</p>
                      <p className="text-sm text-text-secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="size-10 text-text-tertiary group-hover:text-primary transition-colors" />
                      <div>
                        <p className="font-medium text-text-primary">Click to upload or drag and drop</p>
                        <p className="text-sm text-text-secondary mt-1">PDF or DOCX (Max 10MB)</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-text-primary">
                <FileText className="size-5 text-primary" />
                2. Job Description
              </h2>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description here..."
                className="w-full h-64 p-4 rounded-xl border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none text-text-primary placeholder:text-text-tertiary"
              />
            </Card>

            <Button 
              size="lg" 
              className="w-full text-lg h-14" 
              onClick={handleCheck} 
              isLoading={loading}
            >
              Analyze Match Score
            </Button>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            {!result && !loading && (
              <Card className="p-12 h-full flex flex-col items-center justify-center text-center border-dashed border-2 bg-surface-light opacity-60">
                <BarChart className="size-16 text-text-tertiary mb-4" />
                <h3 className="text-xl font-medium text-text-primary mb-2">Ready to analyze</h3>
                <p className="text-text-secondary max-w-sm">
                  Upload your resume and the job description, then click analyze to see your ATS compatibility score.
                </p>
              </Card>
            )}

            {loading && (
              <Card className="p-12 h-full flex flex-col items-center justify-center text-center">
                <div className="size-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-6" />
                <h3 className="text-xl font-medium text-text-primary mb-2">Analyzing Profile...</h3>
                <p className="text-text-secondary animate-pulse">
                  Our AI is comparing your skills, experience, and semantic relevance to the job.
                </p>
              </Card>
            )}

            {result && (
              <div className="space-y-6 animate-fade-in">
                {/* Score Header */}
                <Card className="p-8 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  
                  <h3 className="text-lg font-medium text-text-secondary mb-6 relative z-10">Overall ATS Match</h3>
                  
                  <div className="flex justify-center mb-8 relative z-10">
                    <MatchBadge 
                      score={result.match_result.overall_match_score} 
                      className="scale-150 origin-center" 
                    />
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 mt-4 relative z-10">
                    {result.match_result.match_reasons && result.match_result.match_reasons.map((reason, i) => (
                      <Badge key={i} tone={result.match_result.overall_match_score >= 50 ? "success" : "warning"} className="px-3 py-1 text-sm bg-white border border-border">
                        <CheckCircle2 className={`size-3.5 mr-1 inline ${result.match_result.overall_match_score >= 50 ? "text-success" : "text-warning"}`} /> {reason}
                      </Badge>
                    ))}
                  </div>
                </Card>

                {/* Extracted Details */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 text-text-primary">Job Insights</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-light p-3 rounded-lg border border-border">
                      <p className="text-xs text-text-tertiary uppercase tracking-wider font-semibold mb-1">Target Title</p>
                      <p className="font-medium text-text-primary truncate">{result.job.title || "Not found"}</p>
                    </div>
                    <div className="bg-surface-light p-3 rounded-lg border border-border">
                      <p className="text-xs text-text-tertiary uppercase tracking-wider font-semibold mb-1">Required Exp</p>
                      <p className="font-medium text-text-primary">{result.job.experience_level || "Not specified"}</p>
                    </div>
                  </div>
                </Card>

                {/* Score Breakdown */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-5 text-text-primary">Detailed Breakdown</h3>
                  
                  <div className="space-y-5">
                    {[
                      { label: "Skills Overlap", score: result.match_result.breakdown.skills_score, desc: "Keyword matches" },
                      { label: "Experience Fit", score: result.match_result.breakdown.experience_score, desc: "Years of experience" },
                      { label: "Semantic Relevance", score: result.match_result.breakdown.semantic_score, desc: "Contextual meaning" },
                      { label: "Project Alignment", score: result.match_result.breakdown.project_score, desc: "Applied skills" }
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between items-end mb-1">
                          <div>
                            <span className="font-medium text-text-primary">{item.label}</span>
                            <span className="text-xs text-text-tertiary ml-2 hidden sm:inline-block">— {item.desc}</span>
                          </div>
                          <span className="text-sm font-semibold text-text-secondary">{Math.round(item.score)}%</span>
                        </div>
                        <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.score >= 70 ? "bg-success" : item.score >= 40 ? "bg-warning" : "bg-danger"
                            }`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Missing Skills */}
                {result.missing_skills?.length > 0 && (
                  <Card className="p-6 border-warning/30 bg-warning/5">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-warning-dark">
                      <AlertCircle className="size-5" />
                      Missing Keywords
                    </h3>
                    <p className="text-sm text-text-secondary mb-4">
                      Consider adding these skills to your resume if you have experience with them:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((skill, i) => (
                        <Badge key={i} tone="danger" className="bg-white/50 border-danger/20 text-danger-dark">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
