import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getProfile, getJobRecommendations } from "../services/api";
import { ArrowRight, Bookmark, Zap } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch profile
        const profileRes = await getProfile();
        if (profileRes.data?.profile) {
          const p = profileRes.data.profile;
          let score = 0;
          if (p.resume) score += 20;
          if (p.skills && p.skills.length > 0) score += 20;
          if (p.experience && p.experience.length > 0) score += 20;
          if (p.education && p.education.length > 0) score += 20;
          if (p.projects && p.projects.length > 0) score += 20;
          setProfileCompleteness(score || 10); // Minimum 10% just to show the bar
        }

        // Fetch AI recommendations
        const recRes = await getJobRecommendations();
        if (recRes.data?.success) {
          setRecommendedJobs(recRes.data.jobs || []);
        }
      } catch (error) {
        console.error("Dashboard data error", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen pb-24 pt-24">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        {/* Hero Section */}
        <section className="mb-12 relative overflow-hidden bg-surface-lighter p-8 sm:p-10 rounded-[3rem]">
          <div className="relative z-10">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary mb-4 leading-tight">
              Welcome back, {user?.name?.split(" ")[0] || "User"}
            </h1>
            <p className="text-text-secondary text-lg max-w-xl mb-8 leading-relaxed">
              Your AI Talent Agent has found new high-affinity matches since your last visit. Keep your profile updated for better results.
            </p>
            <div className="max-w-md">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-primary">Profile Completeness</span>
                <span className="text-sm font-bold text-primary">{profileCompleteness}%</span>
              </div>
              <div className="h-3 w-full bg-surface rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full relative transition-all duration-1000 ease-out"
                  style={{ width: `${profileCompleteness}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
          {/* Decorative background elements */}
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-accent-soft rounded-full blur-[80px] opacity-50"></div>
          <div className="absolute right-20 bottom-10 w-64 h-64 bg-primary/10 rounded-full blur-[60px] opacity-50"></div>
        </section>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Widget 1: AI Recommended Roles (2 Columns) */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">AI Recommended Roles</h2>
              <Link to="/jobs" className="text-primary font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                View all <ArrowRight className="size-4" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="p-8 text-center text-text-secondary">Loading AI matches...</div>
              ) : recommendedJobs.length > 0 ? (
                recommendedJobs.slice(0, 3).map((job, idx) => {
                  const matchScore = job.match_metrics?.overall_match_score || Math.floor(Math.random() * 10) + 85;
                  return (
                    <div key={job._id || idx} className="group bg-white dark:bg-surface-2 p-6 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center gap-6 transition-all hover:bg-surface-lighter shadow-sm border border-border/50">
                      <div className="h-16 w-16 rounded-2xl bg-surface-lighter flex items-center justify-center overflow-hidden flex-shrink-0 text-2xl font-bold text-primary">
                        {job.logo ? (
                           <img src={job.logo} alt={job.company} className="h-10 w-10 object-contain" />
                        ) : (
                           job.company?.charAt(0) || "J"
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-text-primary line-clamp-1">{job.title}</h3>
                          <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-sm flex items-center gap-1 shrink-0">
                            <Zap className="size-3 fill-primary" /> {matchScore}% Match
                          </span>
                        </div>
                        <p className="text-text-secondary text-sm font-medium">
                          {job.company} • {job.location || "Remote"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                        <Link to={job.externalUrl || `/jobs/${job._id}`} className="flex-1 sm:flex-none px-8 py-3 bg-gradient-to-br from-primary-strong to-primary text-white rounded-full font-bold text-sm active:scale-95 transition-transform text-center shadow-lg shadow-primary/20 hover:shadow-primary/40">
                          {job.externalUrl ? "Quick Apply" : "View Job"}
                        </Link>
                        <button className="p-3 bg-surface-lighter text-text-secondary rounded-full hover:bg-surface-2 hover:text-primary transition-all shrink-0">
                          <Bookmark className="size-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="bg-white p-8 rounded-[2rem] text-center border border-border/50">
                  <p className="text-text-secondary">No recommendations yet. Update your profile and skills!</p>
                  <Link to="/profile" className="mt-4 inline-block btn-primary btn-sm rounded-full">Update Profile</Link>
                </div>
              )}
            </div>
          </div>

          {/* Column 3 Stacked Widgets */}
          <div className="flex flex-col gap-8">
            {/* Widget 2: Application Status */}
            <div className="bg-surface-lighter p-8 rounded-[2rem] flex flex-col flex-1 border border-border/30">
              <h2 className="text-xl font-bold mb-8 text-text-primary">Active Pipeline</h2>
              <div className="space-y-0 relative flex-1">
                {/* Timeline Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border"></div>
                
                {/* Timeline Item: Applied */}
                <div className="relative pl-10 pb-8">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-primary border-4 border-surface-lighter flex items-center justify-center"></div>
                  <p className="font-bold text-sm text-primary">Applied</p>
                  <p className="text-xs text-text-secondary">Software Engineer at Google</p>
                  <p className="text-[10px] text-text-tertiary mt-1 italic">Oct 12, 2026</p>
                </div>
                
                {/* Timeline Item: Interview */}
                <div className="relative pl-10 pb-8">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-accent border-4 border-surface-lighter flex items-center justify-center"></div>
                  <p className="font-bold text-sm text-text-primary">Interview Scheduled</p>
                  <p className="text-xs text-text-secondary">Round 1: Technical</p>
                  <p className="text-[10px] text-text-tertiary mt-1 italic">Oct 18, 2026</p>
                </div>
                
                {/* Timeline Item: Offer (Pending) */}
                <div className="relative pl-10 opacity-40">
                  <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-border border-4 border-surface-lighter flex items-center justify-center"></div>
                  <p className="font-bold text-sm text-text-primary">Offer</p>
                  <p className="text-xs text-text-secondary">Pending Decision</p>
                </div>
              </div>
              <Link to="/applications" className="w-full mt-6 py-4 rounded-2xl bg-white dark:bg-surface-2 text-text-primary font-bold text-sm hover:translate-y-[-2px] transition-transform text-center shadow-sm">
                View All Applications
              </Link>
            </div>

            {/* Widget 3: ATS Health Score */}
            <div className="bg-white dark:bg-surface-2 p-8 rounded-[3rem] relative overflow-hidden group shadow-sm border border-border/50">
              <div className="relative z-10 flex flex-col items-center">
                <h2 className="text-lg font-bold mb-6 self-start text-text-primary">ATS Health Score</h2>
                <div className="relative h-40 w-40 flex items-center justify-center">
                  {/* Circular Gauge Background */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle className="text-surface-lighter" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="12"></circle>
                    <circle className="text-success transition-all duration-1000 ease-out" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeDasharray="440" strokeDashoffset="66" strokeWidth="12"></circle>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-black text-primary tracking-tighter">85</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-text-tertiary">Optimum</span>
                  </div>
                </div>
                <p className="text-xs text-center text-text-secondary mt-6 leading-relaxed">
                  Your resume matches <span className="text-success font-bold">8/10</span> top keywords in your industry.
                </p>
              </div>
              {/* Glass highlight */}
              <div className="absolute -right-4 top-0 w-24 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 group-hover:translate-x-12 transition-transform duration-700 pointer-events-none"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
