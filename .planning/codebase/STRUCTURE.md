# Project Structure

## Directory Layout

```
D:\Job Recruitment\
├── .git/
├── .gitignore
├── README.md
├── Smart AI Recruitment Platform.txt      # Original project spec (gitignored)
├── implementation_plan.md.resolved        # Past planning artifact (gitignored)
├── test_node_api.py                       # Backend API test script (gitignored)
├── Kaggle Resumes/                        # Resume dataset (gitignored)
│
├── frontend/                              # React SPA (Vite)
│   ├── index.html                         # SPA entry HTML
│   ├── package.json                       # Dependencies & scripts
│   ├── vite.config.js                     # Vite + React + Tailwind setup
│   ├── eslint.config.js                   # ESLint configuration
│   ├── public/                            # Static assets
│   ├── dist/                              # Production build output
│   └── src/
│       ├── main.jsx                       # React bootstrap (StrictMode + App)
│       ├── App.jsx                        # Router config + providers
│       ├── index.css                      # Global styles (47KB — extensive)
│       ├── components/
│       │   ├── Navbar.jsx                 # Top navigation bar
│       │   ├── Footer.jsx                 # Page footer
│       │   ├── ProtectedRoute.jsx         # Auth guard component
│       │   ├── ThemeToggle.jsx            # Dark/light mode toggle
│       │   └── ui/                        # Shadcn-style UI primitives
│       ├── pages/
│       │   ├── Home.jsx                   # Landing page (21KB)
│       │   ├── Jobs.jsx                   # Job search + listing (24KB)
│       │   ├── JobDetails.jsx             # Single job view (10KB)
│       │   ├── Login.jsx                  # Login form (5KB)
│       │   ├── Register.jsx               # Registration form (8KB)
│       │   ├── ProfileSetup.jsx           # Profile creation wizard (53KB — largest file)
│       │   ├── ProfileView.jsx            # Profile display/edit (35KB)
│       │   └── ResumeParser.jsx           # Resume upload + parsing UI (15KB)
│       ├── context/
│       │   ├── AuthContext.jsx            # Auth state provider
│       │   ├── ThemeContext.jsx            # Theme state provider
│       │   ├── auth-context.js            # Auth context object (createContext)
│       │   ├── theme-context.js           # Theme context object (createContext)
│       │   ├── useAuth.js                 # Auth hook
│       │   └── useTheme.js               # Theme hook
│       ├── services/
│       │   └── api.js                     # Axios API client + all endpoint functions
│       └── utils/
│           ├── cn.js                      # clsx + tailwind-merge utility
│           ├── job-utils.js               # Job-related helper functions
│           └── profile-insights.js        # Profile analytics/insights helpers
│
├── backend/                               # Express.js API Server
│   ├── server.js                          # App bootstrap + middleware + route mounting
│   ├── package.json                       # Dependencies & scripts
│   ├── .env                               # Environment variables (gitignored)
│   ├── .env.example                       # Environment template
│   ├── .gitignore                         # node_modules, .env
│   ├── seed-jobs.js                       # Database seeder for sample jobs (7KB)
│   ├── config/
│   │   └── db.js                          # MongoDB connection via Mongoose
│   ├── middleware/
│   │   ├── auth.middleware.js             # JWT verify + protect + authorize
│   │   └── upload.middleware.js           # Multer config for resume uploads
│   ├── models/
│   │   ├── User.js                        # User schema (name, email, password, role)
│   │   ├── Candidate.js                   # Candidate profile schema (skills, embedding)
│   │   ├── Job.js                         # Job listing schema (title, skills, embedding)
│   │   ├── Application.js                 # Job application schema (status tracking)
│   │   ├── Company.js                     # Company profile schema (recruiters)
│   │   └── JobSeeker.js                   # JobSeeker profile schema (minimal)
│   ├── controllers/
│   │   ├── auth.controller.js             # Register, login, logout, getMe
│   │   ├── candidate.controller.js        # Resume upload, candidate ranking
│   │   ├── job.controller.js              # CRUD + search + recommendations (31KB — largest)
│   │   ├── application.controller.js      # Apply to job, list applications
│   │   ├── profile.controller.js          # Profile CRUD for job seekers + companies
│   │   └── external-jobs.controller.js    # External job search via RapidAPI
│   ├── routes/
│   │   ├── auth.routes.js                 # /api/auth/*
│   │   ├── candidate.routes.js            # /api/candidates/*
│   │   ├── job.routes.js                  # /api/jobs/*
│   │   ├── application.routes.js          # /api/applications/*
│   │   ├── profile.routes.js              # /api/profile/*
│   │   └── external-jobs.routes.js        # /api/external-jobs/*
│   └── uploads/                           # Temp resume storage (gitignored)
│
└── ai-service/                            # Python Flask AI Microservice
    ├── app.py                             # Flask app + endpoints (parse, embed, match, recommend)
    ├── requirements.txt                   # Python dependencies
    ├── .gitignore                         # __pycache__, .venv, uploads
    ├── debug_parsed_data.json             # Debug output from parser
    ├── parser/                            # Resume parsing pipeline
    │   ├── __init__.py                    # Exports parse_resume
    │   ├── resume_parser.py               # Orchestrator: extract → clean → split → extract → skills
    │   ├── text_extractor.py              # PDF (column-aware) + DOCX text extraction
    │   ├── preprocessing.py               # Unicode normalization, bullet cleanup
    │   ├── section_splitter.py            # Regex-based section header detection
    │   ├── skill_matcher.py               # Dictionary-based skill extraction + dedup
    │   ├── config.py                      # Skills database, section header patterns
    │   └── extractors/
    │       ├── __init__.py                # Re-exports all extractor functions
    │       ├── entity_extractor.py        # Name, email, phone, location, LinkedIn, GitHub
    │       ├── education_extractor.py     # Education entries extraction
    │       ├── experience_extractor.py    # Work experience extraction
    │       └── project_extractor.py       # Project entries extraction
    ├── matching/                          # AI matching + embedding engine
    │   ├── __init__.py                    # Exports match_candidate_to_job, get_embedding
    │   ├── embeddings.py                  # Sentence-transformer model (lazy load, thread-safe)
    │   ├── matcher.py                     # 8-signal matching algorithm (30KB — largest)
    │   └── recommend.py                   # Job recommendation ranker
    ├── job_data/                          # Offline data tooling
    │   ├── __init__.py
    │   ├── jd_data_extractor.py           # Glassdoor scraper (Selenium + BS4)
    │   └── jd_data_cleaner.py             # Scraped data normalizer
    └── uploads/                           # Temp file storage (gitignored)
```

---

## Key File Locations

### Entry Points
| Purpose | Path |
|---------|------|
| Frontend boot | `frontend/src/main.jsx` |
| Frontend routing | `frontend/src/App.jsx` |
| Backend boot | `backend/server.js` |
| AI service boot | `ai-service/app.py` |

### Configuration
| Purpose | Path |
|---------|------|
| Backend env template | `backend/.env.example` |
| DB connection | `backend/config/db.js` |
| Vite config | `frontend/vite.config.js` |
| ESLint config | `frontend/eslint.config.js` |
| Skills database | `ai-service/parser/config.py` |

### Largest Files (by size — likely complexity hotspots)
| File | Size | Notes |
|------|------|-------|
| `frontend/src/pages/ProfileSetup.jsx` | 53KB | Multi-step wizard with inline form validation |
| `frontend/src/index.css` | 47KB | Extensive global styles with dark/light theme |
| `frontend/src/pages/ProfileView.jsx` | 35KB | Profile display with edit capabilities |
| `backend/controllers/job.controller.js` | 31KB | Job CRUD + search + recommendation engine |
| `ai-service/matching/matcher.py` | 30KB | 8-signal matching algorithm |
| `frontend/src/pages/Jobs.jsx` | 24KB | Job search with filters |
| `frontend/src/pages/Home.jsx` | 21KB | Landing page |
| `frontend/src/pages/ResumeParser.jsx` | 15KB | Resume upload + parse display |

---

## Naming Conventions

### Files
- **Backend JS:** `kebab-case.js` (e.g., `auth.controller.js`, `auth.middleware.js`, `auth.routes.js`)
- **Frontend JSX:** `PascalCase.jsx` for components/pages (e.g., `ProfileSetup.jsx`, `Navbar.jsx`)
- **Frontend JS:** `camelCase.js` for utilities (e.g., `api.js`, `cn.js`, `useAuth.js`)
- **Python:** `snake_case.py` (e.g., `resume_parser.py`, `skill_matcher.py`)

### Backend Pattern
- Controllers: `{domain}.controller.js` with named exports
- Routes: `{domain}.routes.js` with Express Router
- Models: `{PascalCase}.js` exporting mongoose model
- Middleware: `{domain}.middleware.js` with named exports

### Frontend Pattern
- Pages: `{PascalCase}.jsx` — one component per file, default export
- Components: `{PascalCase}.jsx` — reusable, default export
- Context: Split pattern — `{Domain}Context.jsx` (provider) + `{domain}-context.js` (createContext) + `use{Domain}.js` (hook)

### AI Service Pattern
- Modules organized in packages (`parser/`, `matching/`, `job_data/`)
- Each package has `__init__.py` that re-exports public functions
- Internal helpers prefixed with underscore (`_normalize_text`, `_parse_date`)
