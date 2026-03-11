import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaMapMarkerAlt,
  FaBriefcase,
  FaSearch,
  FaBookmark,
  FaRegBookmark,
} from "react-icons/fa";
import {
  HiSparkles,
  HiArrowRight,
  HiChevronDown,
  HiChevronUp,
  HiArrowLeft,
} from "react-icons/hi";
import Footer from "../components/Footer";
import { searchJobs, fetchExternalJobs } from "../services/api";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const EXP_LEVELS = ["Entry Level", "1-3 yrs", "3+ yrs", "5+ yrs", "Lead / Manager"];

/* ── Custom Checkbox ── */
const CheckBox = ({ label, checked, onChange }) => (
  <label className="home-checkbox">
    <span className={`home-checkbox-box ${checked ? "home-checkbox-box--checked" : ""}`}>
      {checked && (
        <svg viewBox="0 0 12 10" fill="none" className="home-checkbox-tick">
          <path d="M1 5.5L4 8.5L11 1.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
    <span className="home-checkbox-label">{label}</span>
  </label>
);

/* ── Salary Range Slider ── */
const SalarySlider = ({ value, onChange }) => {
  const pct = ((value - 0) / 300) * 100;
  return (
    <div className="home-slider-wrap">
      <div className="home-slider-header">
        <span>Salary Range</span>
        <span className="home-slider-value">${value}k+</span>
      </div>
      <div className="home-slider-track-wrap">
        <div className="home-slider-track">
          <div className="home-slider-fill" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range" min={0} max={300} step={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="home-slider-input"
        />
      </div>
      <div className="home-slider-labels"><span>$0k</span><span>$300k</span></div>
    </div>
  );
};

/* ── Filter Section ── */
const FilterSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="home-filter-section">
      <button onClick={() => setOpen((p) => !p)} className="home-filter-toggle" type="button">
        <span>{title}</span>
        {open ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="home-filter-body">{children}</div>}
    </div>
  );
};

/* ── Skeleton ── */
const SkeletonCard = () => (
  <div className="home-job-card" style={{ opacity: 0.5 }}>
    <div className="home-job-card-top">
      <span className="home-company-logo" style={{ background: "#dfe3ea" }}>&nbsp;</span>
    </div>
    <div style={{ height: "1rem", width: "70%", background: "#e8ebf0", borderRadius: 8, marginBottom: 6 }} />
    <div style={{ height: "0.75rem", width: "40%", background: "#e8ebf0", borderRadius: 6, marginBottom: 12 }} />
    <div style={{ height: "0.75rem", width: "50%", background: "#e8ebf0", borderRadius: 6, marginBottom: 8 }} />
    <div style={{ height: "0.85rem", width: "35%", background: "#e8ebf0", borderRadius: 6, marginBottom: 14 }} />
    <div className="home-job-tags">
      {[1, 2, 3].map((i) => (
        <span key={i} style={{ display: "inline-block", height: "1.2rem", width: "3.5rem", background: "#e8ebf0", borderRadius: 99 }} />
      ))}
    </div>
  </div>
);

function timeAgo(dateStr) {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ── Job Card ── */
const JobCard = ({ job, isExternal = false }) => {
  const [saved, setSaved] = useState(false);
  
  // Decide where "Apply Now" goes
  const applyLink = isExternal ? job.apply_link : "/login"; // internal jobs require login to apply for now
  
  return (
    <div className="home-job-card animate-fade-in-up">
      {job.urgent && (
        <span className="home-badge-urgent">
          <HiSparkles className="w-3 h-3" /> Urgent Hiring
        </span>
      )}
      {isExternal && (
        <span className="home-badge-urgent bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full mb-3 ml-auto w-fit flex h-fit font-medium">
          External
        </span>
      )}
      <div className="home-job-card-top">
        {job.logo && isExternal ? (
           <img src={job.logo} alt={job.company} className="size-10 rounded-xl object-contain bg-white border border-border p-1" />
        ) : (
           <span className="home-company-logo" style={{ background: job.logoColor || "#2176FF" }}>
             {job.logo || job.company?.charAt(0) || "?"}
           </span>
        )}
        <button className="home-bookmark-btn" onClick={() => setSaved((p) => !p)}
          aria-label={saved ? "Unsave job" : "Save job"}>
          {saved ? <FaBookmark className="w-4 h-4 text-primary" /> : <FaRegBookmark className="w-4 h-4 text-text-tertiary hover:text-text-primary" />}
        </button>
      </div>
      <h3 className="home-job-title">{job.title}</h3>
      <p className="home-job-company">{job.company}</p>
      <div className="home-job-meta">
        <span><FaMapMarkerAlt className="w-3 h-3" /> {job.location || "Not specified"}</span>
        <span><FaBriefcase className="w-3 h-3" /> {job.employment_type || "Full-time"}</span>
      </div>
      {!isExternal && <p className="home-job-salary">{job.salary_range || "Salary not disclosed"}</p>}
      
      <div className="home-job-tags mt-2">
        {(job.skills || []).map((tag) => (<span key={tag} className="home-skill-tag">{tag}</span>))}
        {job.remote && <span className="home-remote-tag bg-green-50 text-green-700">Remote</span>}
      </div>
      
      <div className="home-job-card-footer mt-5 pt-4 border-t border-border/50">
        <span className="home-posted text-xs font-semibold text-text-tertiary">{job.createdAt || job.postedAt ? timeAgo(job.createdAt || job.postedAt) : "Recently"}</span>
        
        {isExternal ? (
          <a href={applyLink} target="_blank" rel="noreferrer" className="home-apply-btn text-primary hover:text-primary-strong transition-colors text-sm font-bold flex items-center gap-1">
            Apply Externally <HiArrowRight className="w-4 h-4" />
          </a>
        ) : (
          <Link to={applyLink} className="home-apply-btn text-primary hover:text-primary-strong transition-colors text-sm font-bold flex items-center gap-1">
            Apply Now <HiArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   JOBS PAGE
   ══════════════════════════════════════════════ */
const Jobs = () => {
  const navigate = useNavigate();
  // Search states
  const [searchTitle, setSearchTitle] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchExperience, setSearchExperience] = useState("");
  
  // Filter states
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedExp, setSelectedExp] = useState([]);
  const [salaryMin, setSalaryMin] = useState(0);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Data states
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // External jobs states
  const [extJobs, setExtJobs] = useState([]);
  const [extLoading, setExtLoading] = useState(false);

  const toggleFilter = (arr, setArr, val) =>
    setArr((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));

  // Combine local and external fetch
  const fetchAllJobs = useCallback(async () => {
    setLoading(true);
    setExtLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTitle.trim()) params.q = searchTitle.trim();
      if (searchLocation.trim()) params.location = searchLocation.trim();
      if (searchExperience.trim()) params.experience = searchExperience.trim();
      if (selectedTypes.length > 0) params.type = selectedTypes.join(",");
      if (remoteOnly) params.remote = "true";
      if (salaryMin > 0) params.salaryMin = salaryMin;
      
      // 1. Fetch Local Jobs
      const localRes = await searchJobs(params);
      setJobs(localRes.data.jobs || []);
      setTotalJobs(localRes.data.totalJobs || 0);

      // 2. Fetch External Jobs (if title/keyword provided, else default to "software")
      const extRes = await fetchExternalJobs({ q: searchTitle || "software", location: searchLocation });
      if (extRes.data && extRes.data.jobs) {
         setExtJobs(extRes.data.jobs);
      } else {
         setExtJobs([]);
      }
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setError("Could not load jobs. Is the backend running?");
      setJobs([]);
      setExtJobs([]);
      setTotalJobs(0);
    } finally {
      setLoading(false);
      setExtLoading(false);
    }
  }, [searchTitle, searchLocation, searchExperience, selectedTypes, remoteOnly, salaryMin]);

  useEffect(() => {
    const timer = setTimeout(fetchAllJobs, 400);
    return () => clearTimeout(timer);
  }, [fetchAllJobs]);

  const handleSearch = (e) => { e.preventDefault(); fetchAllJobs(); };

  return (
    <div className="page-shell page-transition">
      <main>
        {/* ═══════ Hero Search ═══════ */}
        <section className="home-hero">
          <div className="home-hero-bg-orb home-hero-bg-orb--1" />
          <div className="home-hero-bg-orb home-hero-bg-orb--2" />
          <div className="section-container home-hero-inner">
            {/* Back button */}
            <button onClick={() => navigate("/")} className="jobs-back-btn group font-semibold text-sm hover:!text-primary" type="button">
              <HiArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Home
            </button>

            <h1 className="home-hero-title">
              Find your next <span className="home-hero-accent">dream job</span>
            </h1>
            <p className="home-hero-sub">Discover opportunities from top companies, matched by AI.</p>

            <form className="home-search-bar shadow-xl shadow-primary/5" onSubmit={handleSearch}>
              <div className="home-search-field">
                <FaSearch className="home-search-icon text-text-tertiary" />
                <input type="text" placeholder="Job title or keyword" value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)} className="home-search-input font-medium" />
              </div>
              <span className="home-search-divider" />
              <div className="home-search-field">
                <FaMapMarkerAlt className="home-search-icon text-text-tertiary" />
                <input type="text" placeholder="Location" value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)} className="home-search-input font-medium" />
              </div>
              <span className="home-search-divider hidden md:block" />
              <div className="home-search-field hidden md:flex">
                <FaBriefcase className="home-search-icon text-text-tertiary" />
                <input type="text" placeholder="Experience" value={searchExperience}
                  onChange={(e) => setSearchExperience(e.target.value)} className="home-search-input font-medium" />
              </div>
              <button type="submit" className="home-search-btn rounded-xl">
                <FaSearch className="w-4 h-4" /><span className="home-search-btn-text">Search</span>
              </button>
            </form>

            <div className="home-hero-stats">
              <div className="home-hero-stat"><span className="home-hero-stat-num">{totalJobs}</span><span className="home-hero-stat-lbl">Platform Jobs</span></div>
              <span className="home-hero-stat-sep" />
              <div className="home-hero-stat"><span className="home-hero-stat-num">+{extJobs.length}</span><span className="home-hero-stat-lbl">External Matches</span></div>
            </div>
          </div>
        </section>

        {/* ═══════ Content ═══════ */}
        <section className="home-content section-container">
          <button className="home-mobile-filter-btn" onClick={() => setShowMobileFilters((p) => !p)}>
            Filters {showMobileFilters ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
          </button>

          <div className="home-content-grid">
            {/* Sidebar */}
            <aside className={`home-sidebar ${showMobileFilters ? "home-sidebar--open" : ""}`}>
              <div className="home-sidebar-header">
                <h2 className="home-sidebar-title font-display text-xl">Refine Search</h2>
                <button className="home-sidebar-clear text-sm" onClick={() => { setSelectedTypes([]); setSelectedExp([]); setSalaryMin(0); setRemoteOnly(false); }}>Clear all</button>
              </div>
              <FilterSection title="Job Type">
                {JOB_TYPES.map((t) => (<CheckBox key={t} label={t} checked={selectedTypes.includes(t)} onChange={() => toggleFilter(selectedTypes, setSelectedTypes, t)} />))}
              </FilterSection>
              <FilterSection title="Experience Level">
                {EXP_LEVELS.map((e) => (<CheckBox key={e} label={e} checked={selectedExp.includes(e)} onChange={() => toggleFilter(selectedExp, setSelectedExp, e)} />))}
              </FilterSection>
              <FilterSection title="Minimum Salary">
                <SalarySlider value={salaryMin} onChange={setSalaryMin} />
              </FilterSection>
              <FilterSection title="Work Mode">
                <CheckBox label="Remote only" checked={remoteOnly} onChange={() => setRemoteOnly((p) => !p)} />
              </FilterSection>
            </aside>

            {/* Feeds */}
            <div className="home-feed flex flex-col gap-12">
              
              {/* Local Jobs */}
              <div>
                 <div className="home-feed-header mb-6 pb-2 border-b border-border/50">
                   <h2 className="home-feed-title font-display text-2xl flex items-center gap-2">
                     RecruitAI Exclusives 
                     <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{totalJobs}</span>
                   </h2>
                 </div>
                 {error && (<div className="home-empty-state"><p className="home-empty-icon">⚠️</p><p className="home-empty-text">{error}</p><button className="home-empty-retry" onClick={fetchAllJobs}>Retry</button></div>)}
                 {loading && !error && (<div className="home-feed-grid">{[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}</div>)}
                 {!loading && !error && jobs.length === 0 && (<div className="home-empty-state"><p className="home-empty-icon">🔍</p><p className="home-empty-text font-semibold">No platform jobs match your criteria</p><p className="home-empty-sub">Try expanding your search parameters.</p></div>)}
                 {!loading && !error && jobs.length > 0 && (<div className="home-feed-grid">{jobs.map((job) => (<JobCard key={job._id} job={job} />))}</div>)}
              </div>

              {/* External Jobs */}
              {!error && (
                <div className="pt-6">
                   <div className="home-feed-header mb-6 pb-2 border-b border-border/50 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
                     <h2 className="home-feed-title font-display text-2xl flex items-center gap-2">
                       From Across the Web
                       {extJobs.length > 0 && <span className="bg-surface-2 text-text-secondary border border-border text-xs font-bold px-2 py-0.5 rounded-full">{extJobs.length}</span>}
                     </h2>
                     <p className="text-sm font-medium text-text-tertiary">Sourced via Glassdoor & LinkedIn</p>
                   </div>
                   
                   {extLoading && (<div className="home-feed-grid">{[1, 2].map((i) => <SkeletonCard key={`ext-${i}`} />)}</div>)}
                   {!extLoading && extJobs.length === 0 && (
                      <div className="bg-surface-2 border border-dashed border-border p-8 rounded-2xl text-center">
                        <p className="text-text-secondary font-medium text-[15px]">No external matches found for this query.</p>
                      </div>
                   )}
                   {!extLoading && extJobs.length > 0 && (
                      <div className="home-feed-grid">
                        {extJobs.map((job) => (<JobCard key={job.id} job={job} isExternal />))}
                      </div>
                   )}
                </div>
              )}

            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Jobs;
