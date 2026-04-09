# Architecture

## Overview

The platform follows a **three-service monorepo** architecture:

```
┌─────────────┐    HTTP     ┌─────────────┐    HTTP     ┌──────────────┐
│   Frontend  │ ──────────→ │   Backend   │ ──────────→ │  AI Service  │
│  React SPA  │  REST API   │  Express.js │  REST API   │    Flask     │
│  Port 5173  │ ←────────── │  Port 4000  │ ←────────── │  Port 5000   │
└─────────────┘             └──────┬──────┘             └──────────────┘
                                   │
                              Mongoose ODM
                                   │
                            ┌──────▼──────┐
                            │  MongoDB    │
                            │   Atlas     │
                            └─────────────┘
```

### Key Design Decisions
- **Backend as API gateway** — All DB operations go through the Node.js backend; the AI service is stateless and has no database access
- **Synchronous inter-service calls** — Backend calls AI service synchronously via Axios; no message queue
- **Dual auth tokens** — JWT sent in both httpOnly cookie and JSON response for flexibility
- **Graceful AI degradation** — Jobs and profiles save even when AI service is down (empty embeddings)

---

## Architectural Pattern

### Backend — Layered MVC
```
Routes → Middleware → Controllers → Models (Mongoose)
                         ↓
                   AI Service (HTTP)
```

- **Routes** (`backend/routes/`) — URL mapping to controller functions, middleware application
- **Middleware** (`backend/middleware/`) — Auth verification, file upload handling
- **Controllers** (`backend/controllers/`) — Business logic, AI service orchestration
- **Models** (`backend/models/`) — Mongoose schema definitions, data validation

### Frontend — Component-Based SPA
```
main.jsx → App.jsx → Pages → Components
              ↓
        Context Providers (Auth, Theme)
              ↓
         Services (API client)
```

- **Pages** (`frontend/src/pages/`) — Route-level components (Home, Jobs, Login, etc.)
- **Components** (`frontend/src/components/`) — Reusable UI components (Navbar, Footer, etc.)
- **Context** (`frontend/src/context/`) — React Context for global state (Auth, Theme)
- **Services** (`frontend/src/services/`) — API abstraction layer (single Axios instance)
- **Utils** (`frontend/src/utils/`) — Helper functions (classnames, job utilities, profile insights)

### AI Service — Modular Pipeline
```
app.py (Flask endpoints) → parser/ or matching/
                              ↓
                     Domain-specific modules
```

- **Parser pipeline** — `text_extractor` → `preprocessing` → `section_splitter` → extractors → `skill_matcher`
- **Matching engine** — `embeddings` → `matcher` (8-signal scoring) → `recommend`

---

## Data Flow

### Resume Upload Flow
```
1. Frontend uploads PDF/DOCX via multipart POST
2. Backend middleware (multer) saves to disk
3. Backend forwards file to AI POST /parse
4. AI service:
   a. Extract text (PyMuPDF for PDF, python-docx for DOCX)
   b. Clean & normalize text
   c. Split into sections (education, experience, skills, etc.)
   d. Extract structured data via regex-based extractors
   e. Match skills against skills database
   f. Return structured JSON
5. Backend calls AI POST /embed with combined candidate text
6. Backend saves/upserts Candidate document in MongoDB
7. Backend cleans up temp file
8. Frontend receives parsed data + candidate_id
```

### Job Recommendation Flow
```
1. Frontend calls GET /api/jobs/recommendations
2. Backend fetches candidate profile from MongoDB
3. Backend fetches active internal jobs from MongoDB
4. Backend calls AI POST /recommend_jobs with candidate + jobs
5. AI service scores each job using 8-signal algorithm:
   - Semantic similarity (embeddings)
   - TF-IDF lexical similarity
   - Skills overlap
   - Project relevance
   - Experience match
   - Location fit
   - Education relevance
   - Salary compatibility
6. Backend also fetches external jobs via RapidAPI JSearch
7. Backend scores external jobs locally (5-factor heuristic)
8. Backend merges + ranks all recommendations
9. Frontend displays ranked job list with match scores
```

### Authentication Flow
```
1. Frontend POST /api/auth/login with email + password
2. Backend validates credentials (bcrypt compare)
3. Backend generates JWT (7-day expiry)
4. Backend sets httpOnly cookie AND returns token in JSON
5. Frontend stores token in localStorage
6. Subsequent requests:
   a. Axios interceptor adds Authorization: Bearer <token>
   b. Backend middleware checks cookie first, then header
7. Session restore on page load via GET /api/auth/me
```

### Profile Creation Flow
```
1. User registers (role: job_seeker or recruiter)
2. Frontend redirects to /profile/setup
3. For job seekers:
   a. Upload resume → auto-fill profile fields
   b. Or manually enter: personal info, skills, education, experience, projects
   c. Backend generates embedding from combined text
   d. Backend creates/updates Candidate document
   e. Backend sets user.profileComplete = true
4. For recruiters:
   a. Enter company: name, description, website, industry, size
   b. Backend creates/updates Company document
   c. Backend sets user.profileComplete = true
```

---

## Entry Points

| Service | Entry File | Default Port |
|---------|-----------|-------------|
| Frontend | `frontend/src/main.jsx` (Vite serves `frontend/index.html`) | 5173 |
| Backend | `backend/server.js` | 4000 |
| AI Service | `ai-service/app.py` | 5000 |

---

## Role-Based Access Control

| Role | Capabilities |
|------|-------------|
| `job_seeker` | Browse/search jobs, upload resume, create profile, apply to jobs, view recommendations |
| `recruiter` | Create/update/delete jobs, view posted jobs, create company profile |
| `admin` | All recruiter capabilities (via authorize middleware) |

Access controlled via `authorize(...roles)` middleware in route definitions.

---

## Key Abstractions

### AI Matching Algorithm (8-Signal)
The core matching algorithm in `ai-service/matching/matcher.py` computes a composite score from 8 weighted signals:

| Signal | Weight | Method |
|--------|--------|--------|
| Semantic similarity | 22% | Cosine similarity of sentence-transformer embeddings |
| TF-IDF similarity | 8% | Cosine similarity of TF-IDF vectors |
| Skills match | 25% | % of required job skills candidate has (with alias resolution) |
| Project relevance | 15% | Skill overlap in projects + semantic similarity |
| Experience fit | 15% | Actual years vs. required years |
| Location match | 5% | City/state/remote matching with India-specific logic |
| Education relevance | 5% | Degree level + field relevance |
| Salary compatibility | 5% | Salary range overlap |

### Recommendation Engine
The recommendation engine in `ai-service/matching/recommend.py` uses the same scoring components but with different weights (heavier on skills: 36%, projects: 20%) and applies **relevance multipliers** that penalize:
- Low skill + project overlap → ×0.35
- Missing skills on external jobs → ×0.7
- Location mismatch → ×0.75
- Experience gap ≥2 years → ×0.35

### Resume Parser Pipeline
The parser in `ai-service/parser/` follows a multi-stage pipeline:
1. `text_extractor.py` — Column-aware PDF extraction (handles two-column resume layouts)
2. `preprocessing.py` — Unicode normalization, bullet replacement, whitespace cleanup
3. `section_splitter.py` — Regex-based section header detection
4. `extractors/` — Domain-specific extraction (contacts, education, experience, projects)
5. `skill_matcher.py` — Dictionary-based skill matching with deduplication

### Embedding Model
- **Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Dimensions:** 384
- **Loading:** Lazy singleton with thread-safe lock
- **Usage:** Generate embeddings for both jobs and candidates for semantic similarity matching
