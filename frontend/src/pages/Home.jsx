import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
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
} from "react-icons/hi";
import Footer from "../components/Footer";
import { useAuth } from "../context/useAuth";
import { searchJobs } from "../services/api";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const EXP_LEVELS = ["Entry Level", "1-3 yrs", "3+ yrs", "5+ yrs", "Lead / Manager"];

/* ──────────────────────────────────────────────
   Custom Checkbox
   ────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────
   Salary Range Slider
   ────────────────────────────────────────────── */
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
          type="range"
          min={0}
          max={300}
          step={10}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="home-slider-input"
        />
      </div>
      <div className="home-slider-labels">
        <span>$0k</span>
        <span>$300k</span>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────
   Filter Sidebar Section
   ────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────
   Loading skeleton card
   ────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────
   Job Card
   ────────────────────────────────────────────── */
const JobCard = ({ job }) => {
  const [saved, setSaved] = useState(false);
  return (
    <div className="home-job-card animate-fade-in-up">
      {job.urgent && (
        <span className="home-badge-urgent">
          <HiSparkles className="w-3 h-3" /> Urgent Hiring
        </span>
      )}

      <div className="home-job-card-top">
        <span className="home-company-logo" style={{ background: job.logoColor || "#2176FF" }}>
          {job.logo || job.company?.charAt(0) || "?"}
        </span>
        <button
          className="home-bookmark-btn"
          onClick={() => setSaved((p) => !p)}
          aria-label={saved ? "Unsave job" : "Save job"}
        >
          {saved ? <FaBookmark className="w-4 h-4" /> : <FaRegBookmark className="w-4 h-4" />}
        </button>
      </div>

      <h3 className="home-job-title">{job.title}</h3>
      <p className="home-job-company">{job.company}</p>

      <div className="home-job-meta">
        <span><FaMapMarkerAlt className="w-3 h-3" /> {job.location || "Not specified"}</span>
        <span><FaBriefcase className="w-3 h-3" /> {job.employment_type || "Full-time"}</span>
      </div>

      <p className="home-job-salary">{job.salary_range || "Salary not disclosed"}</p>

      <div className="home-job-tags">
        {(job.skills || []).map((tag) => (
          <span key={tag} className="home-skill-tag">{tag}</span>
        ))}
        {job.remote && <span className="home-remote-tag">Remote</span>}
      </div>

      <div className="home-job-card-footer">
        <span className="home-posted">
          {job.createdAt ? timeAgo(job.createdAt) : "Recently"}
        </span>
        <Link to={`/login`} className="home-apply-btn">
          Apply Now <HiArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

/** Simple relative time helper */
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/* ──────────────────────────────────────────────
   HOME PAGE
   ────────────────────────────────────────────── */
const Home = () => {
  const { isAuthenticated } = useAuth();

  /* Search state */
  const [searchTitle, setSearchTitle] = useState("");
  const [searchLocation, setSearchLocation] = useState("");
  const [searchExperience, setSearchExperience] = useState("");

  /* Filter state */
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedExp, setSelectedExp] = useState([]);
  const [salaryMin, setSalaryMin] = useState(0);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  /* Data state */
  const [jobs, setJobs] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const toggleFilter = (arr, setArr, val) =>
    setArr((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));

  /* Build query params and fetch */
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTitle.trim()) params.q = searchTitle.trim();
      if (searchLocation.trim()) params.location = searchLocation.trim();
      if (searchExperience.trim()) params.experience = searchExperience.trim();
      if (selectedTypes.length > 0) params.type = selectedTypes.join(",");
      if (remoteOnly) params.remote = "true";
      if (salaryMin > 0) params.salaryMin = salaryMin;

      const { data } = await searchJobs(params);
      setJobs(data.jobs || []);
      setTotalJobs(data.totalJobs || 0);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setError("Could not load jobs. Is the backend running?");
      setJobs([]);
      setTotalJobs(0);
    } finally {
      setLoading(false);
    }
  }, [searchTitle, searchLocation, searchExperience, selectedTypes, remoteOnly, salaryMin]);

  /* Debounced fetch — triggers 400ms after any filter/search change */
  useEffect(() => {
    const timer = setTimeout(fetchJobs, 400);
    return () => clearTimeout(timer);
  }, [fetchJobs]);

  /* Search handler (for button click) */
  const handleSearch = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  return (
    <div className="page-shell">
      <main>
        {/* ═══════ Hero Search ═══════ */}
        <section className="home-hero">
          <div className="home-hero-bg-orb home-hero-bg-orb--1" />
          <div className="home-hero-bg-orb home-hero-bg-orb--2" />

          <div className="section-container home-hero-inner">
            <h1 className="home-hero-title">
              Find your next <span className="home-hero-accent">dream job</span>
            </h1>
            <p className="home-hero-sub">
              Discover opportunities from top companies, matched by AI.
            </p>

            {/* Search bar */}
            <form className="home-search-bar" onSubmit={handleSearch}>
              <div className="home-search-field">
                <FaSearch className="home-search-icon" />
                <input
                  type="text"
                  placeholder="Job title or keyword"
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                  className="home-search-input"
                />
              </div>
              <span className="home-search-divider" />
              <div className="home-search-field">
                <FaMapMarkerAlt className="home-search-icon" />
                <input
                  type="text"
                  placeholder="Location"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="home-search-input"
                />
              </div>
              <span className="home-search-divider" />
              <div className="home-search-field">
                <FaBriefcase className="home-search-icon" />
                <input
                  type="text"
                  placeholder="Experience"
                  value={searchExperience}
                  onChange={(e) => setSearchExperience(e.target.value)}
                  className="home-search-input"
                />
              </div>
              <button type="submit" className="home-search-btn">
                <FaSearch className="w-4 h-4" />
                <span className="home-search-btn-text">Search</span>
              </button>
            </form>

            {/* Quick stats */}
            <div className="home-hero-stats">
              <div className="home-hero-stat">
                <span className="home-hero-stat-num">{totalJobs}</span>
                <span className="home-hero-stat-lbl">Jobs</span>
              </div>
              <span className="home-hero-stat-sep" />
              <div className="home-hero-stat">
                <span className="home-hero-stat-num">120+</span>
                <span className="home-hero-stat-lbl">Companies</span>
              </div>
              <span className="home-hero-stat-sep" />
              <div className="home-hero-stat">
                <span className="home-hero-stat-num">98%</span>
                <span className="home-hero-stat-lbl">AI Match Rate</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ Content: Sidebar + Feed ═══════ */}
        <section className="home-content section-container">
          <button
            className="home-mobile-filter-btn"
            onClick={() => setShowMobileFilters((p) => !p)}
          >
            Filters {showMobileFilters ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
          </button>

          <div className="home-content-grid">
            {/* ── Sidebar ── */}
            <aside className={`home-sidebar ${showMobileFilters ? "home-sidebar--open" : ""}`}>
              <div className="home-sidebar-header">
                <h2 className="home-sidebar-title">Filters</h2>
                <button
                  className="home-sidebar-clear"
                  onClick={() => {
                    setSelectedTypes([]);
                    setSelectedExp([]);
                    setSalaryMin(0);
                    setRemoteOnly(false);
                  }}
                >
                  Clear all
                </button>
              </div>

              <FilterSection title="Job Type">
                {JOB_TYPES.map((t) => (
                  <CheckBox
                    key={t}
                    label={t}
                    checked={selectedTypes.includes(t)}
                    onChange={() => toggleFilter(selectedTypes, setSelectedTypes, t)}
                  />
                ))}
              </FilterSection>

              <FilterSection title="Experience Level">
                {EXP_LEVELS.map((e) => (
                  <CheckBox
                    key={e}
                    label={e}
                    checked={selectedExp.includes(e)}
                    onChange={() => toggleFilter(selectedExp, setSelectedExp, e)}
                  />
                ))}
              </FilterSection>

              <FilterSection title="Salary">
                <SalarySlider value={salaryMin} onChange={setSalaryMin} />
              </FilterSection>

              <FilterSection title="Remote">
                <CheckBox label="Remote only" checked={remoteOnly} onChange={() => setRemoteOnly((p) => !p)} />
              </FilterSection>
            </aside>

            {/* ── Job Feed ── */}
            <div className="home-feed">
              <div className="home-feed-header">
                <h2 className="home-feed-title">
                  Recommended for you
                  <span className="home-feed-count">{totalJobs} jobs</span>
                </h2>
              </div>

              {/* Error state */}
              {error && (
                <div className="home-empty-state">
                  <p className="home-empty-icon">⚠️</p>
                  <p className="home-empty-text">{error}</p>
                  <button className="home-empty-retry" onClick={fetchJobs}>Retry</button>
                </div>
              )}

              {/* Loading state */}
              {loading && !error && (
                <div className="home-feed-grid">
                  {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && jobs.length === 0 && (
                <div className="home-empty-state">
                  <p className="home-empty-icon">🔍</p>
                  <p className="home-empty-text">No jobs match your criteria</p>
                  <p className="home-empty-sub">Try adjusting your search or filters</p>
                </div>
              )}

              {/* Job cards */}
              {!loading && !error && jobs.length > 0 && (
                <div className="home-feed-grid">
                  {jobs.map((job) => (
                    <JobCard key={job._id} job={job} />
                  ))}
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

export default Home;
