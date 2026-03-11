import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Brain,
  FileSearch,
  SlidersHorizontal,
  BarChart3,
  Target,
  Zap,
  Upload,
  Sparkles,
  Briefcase,
  ArrowRight,
  Star,
  Send,
  Video,
  MessageSquare,
  ClipboardCheck,
  Smartphone,
  Quote,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import Footer from "../components/Footer";

/* ──────────────────────────────────────────────
   FEATURE CARDS DATA
   ────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: <Brain className="w-7 h-7" />,
    title: "AI-Powered Matching",
    desc: "Our semantic matching engine uses deep learning embeddings to connect candidates with their ideal roles — going far beyond keyword matching.",
    color: "#2176FF",
  },
  {
    icon: <FileSearch className="w-7 h-7" />,
    title: "Smart Resume Parser",
    desc: "Upload any PDF or DOCX resume and our NLP pipeline automatically extracts skills, education, experience, and projects in seconds.",
    color: "#33A1FD",
  },
  {
    icon: <SlidersHorizontal className="w-7 h-7" />,
    title: "Advanced Filters",
    desc: "Find exactly what you need with filters for job type, salary range, location, remote work, experience level, and industry.",
    color: "#F79824",
  },
  {
    icon: <Target className="w-7 h-7" />,
    title: "Skill Gap Analysis",
    desc: "Identify missing skills for your dream job and get personalized learning paths with curated courses and certifications.",
    color: "#FDCA40",
  },
  {
    icon: <BarChart3 className="w-7 h-7" />,
    title: "Analytics Dashboard",
    desc: "Track your recruitment pipeline, time-to-hire, application status, and candidate performance with beautiful visual reports.",
    color: "#2176FF",
  },
  {
    icon: <Zap className="w-7 h-7" />,
    title: "Instant Notifications",
    desc: "Get real-time updates on job matches, application status changes, interview invitations, and recruiter messages.",
    color: "#F79824",
  },
];

/* ──────────────────────────────────────────────
   HOW IT WORKS STEPS
   ────────────────────────────────────────────── */
const STEPS = [
  {
    num: "01",
    icon: <Upload className="w-8 h-8" />,
    title: "Upload Your Resume",
    desc: "Drop your resume and our AI parses it instantly — extracting skills, experience, education, and building your profile automatically.",
  },
  {
    num: "02",
    icon: <Sparkles className="w-8 h-8" />,
    title: "AI Matches You",
    desc: "Our matching engine compares your profile against thousands of jobs using semantic similarity, skill overlap, and preference alignment.",
  },
  {
    num: "03",
    icon: <Briefcase className="w-8 h-8" />,
    title: "Get Hired",
    desc: "Apply to your top matches with one click, track your application in real-time, and receive feedback from recruiters directly.",
  },
];

/* ──────────────────────────────────────────────
   TESTIMONIALS
   ────────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    role: "Software Engineer at Google",
    photo: "/images/person1.png",
    quote: "RecruitAI completely transformed my job search. The AI matching was incredibly accurate — I found my dream role at Google within two weeks of signing up. The resume parser saved me hours of manual data entry.",
    stars: 5,
  },
  {
    name: "Michael Chen",
    role: "VP of Talent at Stripe",
    photo: "/images/person2.png",
    quote: "As a recruiter, RecruitAI has cut our time-to-hire by 60%. The candidate matching is leagues ahead of traditional ATS systems. We've hired 40+ engineers through the platform this quarter alone.",
    stars: 5,
  },
  {
    name: "Amara Johnson",
    role: "Product Designer at Figma",
    photo: "/images/person3.png",
    quote: "The skill gap analysis feature is a game-changer. It showed me exactly what I needed to learn to level up, recommended specific courses, and I landed a senior role within three months.",
    stars: 5,
  },
];

/* ──────────────────────────────────────────────
   FUTURE SCOPE ROADMAP
   ────────────────────────────────────────────── */
const ROADMAP = [
  {
    icon: <Video className="w-6 h-6" />,
    title: "AI Video Interviews",
    desc: "Automated video interviews with real-time AI analysis of communication skills, confidence, and technical knowledge.",
    status: "Coming Q3 2026",
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "AI Screening Chatbot",
    desc: "An intelligent chatbot that conducts initial candidate screening, asks contextual questions, and generates comprehensive reports.",
    status: "Coming Q4 2026",
  },
  {
    icon: <ClipboardCheck className="w-6 h-6" />,
    title: "Technical Assessments",
    desc: "Built-in coding challenges, design exercises, and soft-skill assessments tailored to each job's requirements.",
    status: "Coming Q1 2027",
  },
  {
    icon: <Smartphone className="w-6 h-6" />,
    title: "Mobile App",
    desc: "Full-featured iOS and Android apps so you can search, apply, and track applications on the go.",
    status: "Coming Q2 2027",
  },
];

/* ──────────────────────────────────────────────
   STATS COUNTER
   ────────────────────────────────────────────── */
const STATS = [
  { value: "600+", label: "Active Jobs" },
  { value: "120+", label: "Top Companies" },
  { value: "98%", label: "AI Match Rate" },
  { value: "10k+", label: "Happy Users" },
];

/* ──────────────────────────────────────────────
   ANIMATED COUNTER
   ────────────────────────────────────────────── */
const AnimatedStat = ({ value, label }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`landing-stat ${visible ? "landing-stat--visible" : ""}`}>
      <span className="landing-stat-value">{value}</span>
      <span className="landing-stat-label">{label}</span>
    </div>
  );
};

/* ══════════════════════════════════════════════
   HOME / LANDING PAGE
   ══════════════════════════════════════════════ */
const Home = () => {
  const [feedbackForm, setFeedbackForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackForm.name || !feedbackForm.email || !feedbackForm.message) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("Thank you for your feedback! We'll get back to you soon.");
    setFeedbackForm({ name: "", email: "", message: "" });
    setSending(false);
  };

  return (
    <div className="page-shell page-transition">
      <main>
        {/* ═══════════════════════════════════════
            SECTION 1 — HERO
           ═══════════════════════════════════════ */}
        <section className="landing-hero">
          <div className="landing-hero-bg-orb landing-hero-bg-orb--1" />
          <div className="landing-hero-bg-orb landing-hero-bg-orb--2" />
          <div className="landing-hero-bg-orb landing-hero-bg-orb--3" />

          <div className="section-container landing-hero-inner">
            <div className="landing-hero-content">
              <span className="landing-hero-badge">
                <Sparkles className="w-4 h-4" /> AI-Powered Recruitment Platform
              </span>
              <h1 className="landing-hero-title">
                Hire Smarter. <br />
                <span className="landing-hero-accent">Get Hired Faster.</span>
              </h1>
              <p className="landing-hero-sub">
                RecruitAI uses advanced machine learning to match candidates with their perfect roles. 
                Upload your resume, let our AI analyze your profile, and discover opportunities 
                tailored to your skills and aspirations.
              </p>
              <div className="landing-hero-ctas">
                <Link to="/jobs" className="landing-btn landing-btn--primary">
                  <Briefcase className="w-5 h-5" /> Browse Jobs
                </Link>
                <Link to="/register" className="landing-btn landing-btn--outline">
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="landing-hero-trust">
                <div className="landing-hero-avatars">
                  <img src="/images/person1.png" alt="User" className="landing-hero-avatar" />
                  <img src="/images/person2.png" alt="User" className="landing-hero-avatar" />
                  <img src="/images/person3.png" alt="User" className="landing-hero-avatar" />
                </div>
                <span className="landing-hero-trust-text">
                  <strong>10,000+</strong> professionals already onboard
                </span>
              </div>
            </div>
            <div className="landing-hero-visual">
              <img src="/images/hero.png" alt="RecruitAI Platform" className="landing-hero-img" />
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 2 — STATS
           ═══════════════════════════════════════ */}
        <section className="landing-stats-section">
          <div className="section-container landing-stats-grid">
            {STATS.map((s) => (
              <AnimatedStat key={s.label} value={s.value} label={s.label} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 3 — FEATURES
           ═══════════════════════════════════════ */}
        <section className="landing-section" id="features">
          <div className="section-container">
            <div className="landing-section-header">
              <span className="landing-section-tag"><Zap className="w-4 h-4" /> Features</span>
              <h2 className="landing-section-title">Everything you need to recruit — or get recruited</h2>
              <p className="landing-section-sub">From AI resume parsing to candidate matching, our platform covers the entire hiring lifecycle.</p>
            </div>
            <div className="landing-features-grid">
              {FEATURES.map((f) => (
                <div key={f.title} className="landing-feature-card">
                  <div className="landing-feature-icon" style={{ background: `${f.color}15`, color: f.color }}>
                    {f.icon}
                  </div>
                  <h3 className="landing-feature-title">{f.title}</h3>
                  <p className="landing-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 4 — HOW IT WORKS
           ═══════════════════════════════════════ */}
        <section className="landing-section landing-section--alt" id="how-it-works">
          <div className="section-container">
            <div className="landing-section-header">
              <span className="landing-section-tag"><CheckCircle2 className="w-4 h-4" /> How It Works</span>
              <h2 className="landing-section-title">From resume to offer in 3 simple steps</h2>
              <p className="landing-section-sub">Our streamlined process gets you matched and hired faster than ever.</p>
            </div>
            <div className="landing-steps-grid">
              {STEPS.map((s) => (
                <div key={s.num} className="landing-step-card">
                  <span className="landing-step-num">{s.num}</span>
                  <div className="landing-step-icon">{s.icon}</div>
                  <h3 className="landing-step-title">{s.title}</h3>
                  <p className="landing-step-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 5 — TESTIMONIALS
           ═══════════════════════════════════════ */}
        <section className="landing-section" id="testimonials">
          <div className="section-container">
            <div className="landing-section-header">
              <span className="landing-section-tag"><Star className="w-4 h-4" /> Testimonials</span>
              <h2 className="landing-section-title">Loved by recruiters & candidates alike</h2>
              <p className="landing-section-sub">See what our users have to say about their experience with RecruitAI.</p>
            </div>
            <div className="landing-testimonials-grid">
              {TESTIMONIALS.map((t) => (
                <div key={t.name} className="landing-testimonial-card">
                  <Quote className="landing-testimonial-quote-icon" />
                  <p className="landing-testimonial-text">{t.quote}</p>
                  <div className="landing-testimonial-stars">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <div className="landing-testimonial-author">
                    <img src={t.photo} alt={t.name} className="landing-testimonial-avatar" />
                    <div>
                      <span className="landing-testimonial-name">{t.name}</span>
                      <span className="landing-testimonial-role">{t.role}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 6 — FUTURE SCOPE / ROADMAP
           ═══════════════════════════════════════ */}
        <section className="landing-section landing-section--alt" id="roadmap">
          <div className="section-container">
            <div className="landing-section-header">
              <span className="landing-section-tag"><ChevronRight className="w-4 h-4" /> Roadmap</span>
              <h2 className="landing-section-title">What's coming next</h2>
              <p className="landing-section-sub">We're constantly building new features to make recruitment smarter.</p>
            </div>
            <div className="landing-roadmap-grid">
              {ROADMAP.map((r) => (
                <div key={r.title} className="landing-roadmap-card">
                  <div className="landing-roadmap-icon">{r.icon}</div>
                  <div className="landing-roadmap-content">
                    <h3 className="landing-roadmap-title">{r.title}</h3>
                    <p className="landing-roadmap-desc">{r.desc}</p>
                    <span className="landing-roadmap-status">{r.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            SECTION 7 — FEEDBACK FORM
           ═══════════════════════════════════════ */}
        <section className="landing-section" id="feedback">
          <div className="section-container">
            <div className="landing-section-header">
              <span className="landing-section-tag"><Send className="w-4 h-4" /> Feedback</span>
              <h2 className="landing-section-title">We'd love to hear from you</h2>
              <p className="landing-section-sub">Have a suggestion, found a bug, or just want to say hello? Drop us a message.</p>
            </div>
            <form className="landing-feedback-form" onSubmit={handleFeedback}>
              <div className="landing-feedback-row">
                <div className="landing-feedback-field">
                  <label htmlFor="fb-name">Your Name</label>
                  <input id="fb-name" type="text" placeholder="John Doe"
                    value={feedbackForm.name} onChange={(e) => setFeedbackForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="landing-feedback-field">
                  <label htmlFor="fb-email">Email Address</label>
                  <input id="fb-email" type="email" placeholder="john@example.com"
                    value={feedbackForm.email} onChange={(e) => setFeedbackForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="landing-feedback-field">
                <label htmlFor="fb-message">Your Message</label>
                <textarea id="fb-message" rows={5} placeholder="Tell us what's on your mind..."
                  value={feedbackForm.message} onChange={(e) => setFeedbackForm((p) => ({ ...p, message: e.target.value }))} />
              </div>
              <button type="submit" className="landing-btn landing-btn--primary" disabled={sending}>
                {sending ? (
                  <><span className="landing-spinner" /> Sending...</>
                ) : (
                  <><Send className="w-5 h-5" /> Send Feedback</>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* ═══════════════════════════════════════
            CTA FOOTER BANNER
           ═══════════════════════════════════════ */}
        <section className="landing-cta-section">
          <div className="section-container landing-cta-inner">
            <h2 className="landing-cta-title">Ready to find your next opportunity?</h2>
            <p className="landing-cta-sub">Join 10,000+ professionals using RecruitAI to land their dream roles.</p>
            <div className="landing-hero-ctas">
              <Link to="/jobs" className="landing-btn landing-btn--white">
                <Briefcase className="w-5 h-5" /> Browse Jobs
              </Link>
              <Link to="/register" className="landing-btn landing-btn--outline-white">
                Create Free Account <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
