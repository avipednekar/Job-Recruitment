# Smart AI Recruitment Platform

A full-stack, AI-powered recruitment platform that connects job seekers with opportunities through intelligent resume parsing, semantic matching, multi-board job scraping, Gemini-powered ATS scoring, and personalized recommendations.

---

## Overview

The platform consists of three independently deployable services:

| Service | Purpose | Tech Stack | Port |
|---------|---------|------------|------|
| **Frontend** | React SPA for candidates and recruiters | React 19, Vite 7, Tailwind CSS 4, Lucide Icons | `5173` |
| **Backend** | REST API — auth, jobs, applications, profiles | Node.js, Express 5, MongoDB (Mongoose 9) | `4000` |
| **AI Service** | Resume parsing, embeddings, matching, scraping | Python 3.10+, Flask, sentence-transformers, Gemini | `5000` |

---

## Features

### Job Seekers
- **Email OTP Verification** — Secure registration with 6-digit OTP email flow
- **Smart Resume Parsing** — Upload PDF/DOCX; AI extracts skills, education, experience, projects
- **AI-Powered Job Recommendations** — Blended AI + local heuristic scoring with graceful fallbacks
- **External Job Aggregation** — Scrapes LinkedIn, Indeed, Glassdoor, Naukri, Google Jobs in real-time
- **ATS Score Checker** — Gemini-powered resume-to-job-description compatibility scoring
- **Skill Gap Analysis** — Identifies missing skills and generates curated learning paths
- **Saved/Bookmarked Jobs** — Heart toggle on every job card; dedicated "Saved Jobs" dashboard tab
- **Application Tracking** — Pipeline view with status filters (applied, screening, interview, offer, rejected)
- **Profile Dashboard** — Bento-grid layout with profile editor, completion checklist, contact card
- **Real-time Notifications** — In-app notification center with read/unread management
- **Dark Mode** — Full light/dark theme toggle with system preference detection

### Recruiters
- **Job Posting Management** — Create, edit, delete job listings with skills, salary, location
- **Candidate Search & Filtering** — Find candidates by skills, experience, location
- **Company Profile** — Manage employer branding (industry, website, size, description)
- **Application Management** — View and manage incoming applications

### AI Capabilities
- **Resume Parsing** — NLP pipeline extracts structured data from PDF/DOCX resumes
- **Semantic Embeddings** — 384-dimensional sentence-transformer vectors for candidate-job matching
- **7-Factor Match Scoring** — Skills, projects, experience, education, location, salary, TF-IDF, semantic
- **Gemini ATS Scoring** — LLM-powered resume analysis with multi-model fallback chain
- **Recommendation Insights** — Gemini generates career gap analysis and market context
- **Skill Learning Resources** — AI-curated courses with platform, difficulty, and time estimates
- **Multi-Board Job Scraping** — LinkedIn, Indeed, Glassdoor, Google, Naukri via JobSpy + direct scrapers
- **Direct ATS Board Scraping** — Greenhouse, Lever, Workday career page scraping with LLM extraction

---

## Project Structure

```
Job-Recruitment/
├── frontend/                     # React SPA (Vite)
│   └── src/
│       ├── components/           # Reusable UI (Navbar, Footer, ThemeToggle, etc.)
│       │   ├── profile/          # Profile editor components
│       │   └── ui/               # Design system (Button, Card, Badge, InputField)
│       ├── context/              # React context providers
│       │   ├── AuthContext.jsx    # Authentication state
│       │   ├── ThemeContext.jsx   # Dark/light mode
│       │   └── SavedJobsContext.jsx  # Bookmarked jobs state
│       ├── pages/                # Route pages
│       │   ├── Home.jsx          # Landing page
│       │   ├── Jobs.jsx          # Job search + recommendations
│       │   ├── JobDetails.jsx    # Single job view + apply
│       │   ├── ProfileSetup.jsx  # Onboarding wizard
│       │   ├── ProfileView.jsx   # Dashboard (profile, apps, saved, recs, settings)
│       │   ├── ATSChecker.jsx    # ATS score checker + learning paths
│       │   ├── VerifyOTP.jsx     # Email verification UI
│       │   ├── Login.jsx / Register.jsx
│       │   └── NotFound.jsx
│       ├── services/api.js       # Axios API layer
│       └── utils/job-utils.jsx   # Job card helpers, match badges
│
├── backend/                      # Node.js/Express API
│   ├── config/                   # Database connection
│   ├── controllers/              # Route handlers
│   │   ├── auth.controller.js        # Register, login, OTP verify/resend
│   │   ├── job.controller.js         # CRUD + recommendations pipeline
│   │   ├── profile.controller.js     # Job seeker & company profiles
│   │   ├── ats.controller.js         # ATS scoring + skill resources
│   │   ├── saved-jobs.controller.js  # Bookmark toggle/list
│   │   ├── external-jobs.controller.js  # External job search proxy
│   │   ├── application.controller.js
│   │   ├── candidate.controller.js
│   │   ├── notification.controller.js
│   │   ├── location.controller.js
│   │   └── feedback.controller.js
│   ├── middleware/               # Auth (JWT + cookie), file upload (Multer)
│   ├── models/                   # Mongoose schemas
│   │   ├── User.js               # Auth + savedJobs + OTP fields
│   │   ├── Job.js                # Job listings
│   │   ├── Candidate.js          # Parsed resume data
│   │   ├── Application.js        # Job applications
│   │   ├── Company.js            # Recruiter company profiles
│   │   ├── Notification.js       # In-app notifications
│   │   └── Feedback.js           # User feedback
│   ├── routes/                   # Express route definitions (11 route files)
│   ├── utils/                    # Scoring, location, email, embeddings utilities
│   │   ├── scoring.utils.js      # Local heuristic job scoring (5-signal composite)
│   │   ├── location.utils.js     # Location normalization & matching
│   │   ├── email.utils.js        # Nodemailer OTP email delivery
│   │   ├── embedding.utils.js    # Embedding proxy to AI service
│   │   └── constants.js          # Skill lists, title terms
│   ├── __tests__/                # Jest test suites
│   ├── app.js                    # Express app factory
│   └── server.js                 # Entry point
│
├── ai-service/                   # Python Flask microservice
│   ├── parser/                   # Resume parsing
│   │   ├── extractors/           # Section-specific extractors
│   │   ├── resume_parser.py      # Main parser orchestrator
│   │   └── skill_matcher.py      # Skill taxonomy matching
│   ├── matching/                 # AI scoring modules
│   │   ├── embeddings.py         # Sentence-transformer embeddings
│   │   ├── matcher.py            # 7-factor candidate-job matcher
│   │   ├── recommend.py          # Batch job ranking for recommendations
│   │   ├── ats_gemini.py         # Gemini ATS scoring with fallbacks
│   │   ├── gemini_insights.py    # Gemini career insights generation
│   │   └── skill_resources.py    # Learning path recommendations
│   ├── scraper/                  # Job scraping
│   │   ├── job_scraper.py        # Multi-board scraper (JobSpy)
│   │   └── direct_scraper.py     # Direct ATS board scraper
│   ├── job_data/                 # Data extraction utilities
│   │   ├── llm_extractor.py      # Gemini-powered JD parsing
│   │   ├── jd_data_extractor.py  # Glassdoor scraper
│   │   └── jd_data_cleaner.py    # Data normalization
│   ├── tests/                    # Pytest test suites
│   ├── app.py                    # Flask application (all endpoints)
│   └── requirements.txt
│
└── README.md
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **MongoDB** Atlas cluster (or local instance)
- **Google Gemini API Key** (for ATS scoring, insights, skill resources)
- **SMTP credentials** (for email OTP verification — Gmail App Password recommended)

---

## Environment Configuration

### Backend (`backend/.env`)

```env
PORT=4000
MONGO_URI=your_mongodb_atlas_connection_string
MONGO_DB_NAME=ai_recruitment
JWT_SECRET=your_jwt_secret_key
AI_SERVICE_URL=http://localhost:5000

# Email OTP (required for registration)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

### AI Service (`ai-service/.env`)

```env
GEMINI_API_KEY=your_google_gemini_api_key

# Job scraping configuration
SCRAPER_API_KEY=
JOB_SCRAPER_SITES=linkedin,indeed,glassdoor,google,naukri
JOB_SCRAPER_RESULTS_PER_QUERY=10
JOB_SCRAPER_MAX_QUERY_VARIANTS=5

# Optional: direct company ATS board URLs
# DIRECT_JOB_BOARD_URLS=https://boards.greenhouse.io/openai,https://jobs.lever.co/stripe
```

---

## Local Setup

### Quick Start (All Services)

```bash
cd backend
npm install
npm run dev:all
```

This launches all three services concurrently using `concurrently`.

### Manual Start

#### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Server runs at: `http://localhost:4000`

#### 2. AI Service

```bash
cd ai-service
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

Service runs at: `http://localhost:5000`

> **Note:** First startup takes 3-8 seconds to pre-load the sentence-transformer embedding model. The backend has built-in fallbacks for this cold-start period.

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs at: `http://localhost:5173`

### Running Tests

```bash
# Backend (Jest)
cd backend
npm test

# AI Service (Pytest)
cd ai-service
pytest
```

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register new user (triggers OTP email) |
| POST | `/api/auth/login` | — | Login (requires verified email) |
| POST | `/api/auth/logout` | — | Clear session |
| POST | `/api/auth/verify-otp` | — | Verify email with 6-digit OTP |
| POST | `/api/auth/resend-otp` | — | Resend OTP email |
| GET | `/api/auth/me` | ✅ | Get current user profile |

### Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/jobs` | — | Search/list all jobs |
| GET | `/api/jobs/:id` | — | Get job details |
| GET | `/api/jobs/recommendations` | ✅ Job Seeker | AI-ranked job recommendations |
| POST | `/api/jobs/recommendation-insights` | ✅ Job Seeker | Gemini career insights for top matches |
| GET | `/api/jobs/my` | ✅ Recruiter | List recruiter's own jobs |
| POST | `/api/jobs` | ✅ Recruiter | Create new job |
| PUT | `/api/jobs/:id` | ✅ Recruiter | Update job |
| DELETE | `/api/jobs/:id` | ✅ Recruiter | Delete job |

### Saved Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/saved-jobs` | ✅ | List all saved jobs (populated) |
| GET | `/api/saved-jobs/ids` | ✅ | List saved job IDs only (lightweight) |
| POST | `/api/saved-jobs/:jobId` | ✅ | Toggle save/unsave |

### Applications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/applications/:jobId` | ✅ | Submit application |
| GET | `/api/applications` | ✅ | List user's applications |

### Profile

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/profile/me` | ✅ | Get profile (job seeker or company) |
| PUT | `/api/profile/job-seeker` | ✅ Job Seeker | Upsert job seeker profile |
| PUT | `/api/profile/company` | ✅ Recruiter | Upsert company profile |
| PUT | `/api/profile/me` | ✅ | Unified profile update |

### Candidates

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/candidates/upload` | ✅ | Upload and parse resume |
| GET | `/api/candidates/match/:jobId` | ✅ | Get matching candidates for a job |

### ATS Checker

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ats/check` | — | Upload resume + JD → Gemini ATS score + learning resources |

### External Jobs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/external-jobs` | Optional | Search external job boards |

### Notifications

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications` | ✅ | List notifications |
| PUT | `/api/notifications/:id/read` | ✅ | Mark single notification read |
| PUT | `/api/notifications/read-all` | ✅ | Mark all notifications read |

### Other

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/feedback` | — | Submit platform feedback |
| GET | `/api/locations` | — | Location autocomplete |

---

### AI Service Endpoints (Port 5000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/parse` | Parse resume PDF/DOCX → structured JSON |
| POST | `/embed` | Generate 384-dim semantic embedding |
| POST | `/match` | 7-factor candidate-to-job match score |
| POST | `/recommend_jobs` | Batch rank all jobs for a candidate |
| POST | `/ats_score` | Gemini ATS resume-JD compatibility score |
| POST | `/scrape_jobs` | Multi-board job search (LinkedIn, Indeed, etc.) |
| POST | `/scrape_direct` | Direct company ATS board scraping + LLM extraction |
| POST | `/extract_job` | Standalone LLM job description extraction |
| POST | `/recommend_insights` | Gemini career insights from recommendations |
| POST | `/skill_resources` | AI-curated learning paths for missing skills |

---

## Architecture Highlights

### Recommendation Pipeline
1. **Profile Analysis** — Extracts candidate skills, infers role & seniority
2. **Dual Pipeline (Parallel)** — Internal AI ranking + external board scraping run simultaneously
3. **Blended Scoring** — AI score (65%) + local heuristic (35%) for internal jobs
4. **Graceful Fallbacks** — If AI service is down, automatically falls back to local scoring
5. **Caching** — Per-user recommendation caching with configurable TTL

### ATS Scoring Pipeline
1. **Resume Parsing** — Extracts text from uploaded PDF/DOCX
2. **Gemini Analysis** — Multi-model fallback chain (Gemini 2.0 Flash → 1.5 Flash → 1.5 Pro)
3. **8-Signal Local Fallback** — Skills, TF-IDF, experience, education, projects, location, salary, semantic
4. **Skill Gap Analysis** — Identifies missing skills from the JD
5. **Learning Resources** — Gemini generates curated courses with static dictionary fallback

### Authentication Flow
1. **Register** → OTP generated → email sent via SMTP
2. **Verify OTP** → account activated → JWT issued
3. **Login** → checks `isVerified` → JWT in cookie + response body
4. **Session Restore** → `GET /me` rehydrates user from JWT

### Saved Jobs
- **Optimistic UI** — Heart toggles instantly, syncs with server in background
- **Shared Context** — `SavedJobsContext` provides `isSaved()` and `toggle()` across all pages
- **Dashboard Tab** — Dedicated "Saved Jobs" section in the profile dashboard

---

## Security

- JWT authentication with HTTP-only cookie + Bearer token support
- Password hashing with bcrypt (12 salt rounds)
- Email verification required before login
- Role-based access control (job_seeker, recruiter, admin)
- CORS restricted to development origins
- File upload validation (PDF/DOCX only, 10MB max)
- Never commit `.env` files — use `.env.example` as template

---

## Tech Stack

### Frontend
- React 19, React Router 7, Vite 7
- Tailwind CSS 4 (custom design system with CSS variables)
- Lucide React icons, react-hot-toast
- Axios with JWT interceptors

### Backend
- Node.js, Express 5, Mongoose 9
- JWT (jsonwebtoken), bcryptjs, Nodemailer
- Multer for file uploads
- Jest + Supertest for testing

### AI Service
- Python 3.10+, Flask, Flask-CORS
- sentence-transformers (all-MiniLM-L6-v2)
- scikit-learn (TF-IDF, cosine similarity)
- Google GenAI SDK (Gemini models)
- python-jobspy, BeautifulSoup4, Selenium
- PyMuPDF, python-docx for resume parsing
- Pytest for testing

---

## License

MIT
