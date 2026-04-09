# External Integrations

## Overview

The platform has three tiers of external integration:
1. **Inter-service communication** — Backend ↔ AI Service (HTTP REST)
2. **Database** — Backend → MongoDB Atlas
3. **Third-party APIs** — Backend → RapidAPI JSearch (external job listings)

---

## 1. Inter-Service Communication (Backend ↔ AI Service)

The Node.js backend communicates with the Python AI service via synchronous HTTP calls using Axios.

### Endpoints Called by Backend

| Backend Controller | AI Service Endpoint | Purpose | Payload |
|---|---|---|---|
| `candidate.controller.js` → `uploadResume` | `POST /parse` | Parse uploaded resume (PDF/DOCX) | Multipart file upload |
| `candidate.controller.js` → `uploadResume` | `POST /embed` | Generate embedding for candidate | `{ text: "combined text" }` |
| `candidate.controller.js` → `rankCandidates` | `POST /match` | Score candidate against a job | `{ job, candidate_data }` |
| `job.controller.js` → `createJob` | `POST /embed` | Generate job embedding | `{ text: "title description" }` |
| `job.controller.js` → `updateJob` | `POST /embed` | Regenerate job embedding | `{ text: "title description" }` |
| `job.controller.js` → `getJobRecommendations` | `POST /recommend_jobs` | Rank jobs for candidate | `{ candidate_data, jobs_list }` |
| `profile.controller.js` → `createJobSeekerProfile` | `POST /embed` | Generate candidate embedding | `{ text: "combined text" }` |
| `profile.controller.js` → `updateProfile` | `POST /embed` | Refresh candidate embedding | `{ text: "combined text" }` |

### Configuration
- Base URL: `AI_SERVICE_URL` env var (default: `http://localhost:5000`)
- Defined in: `backend/controllers/candidate.controller.js`, `backend/controllers/job.controller.js`, `backend/controllers/profile.controller.js`

### Error Handling
- All AI service calls are wrapped in try/catch
- Jobs/profiles save successfully even if AI service is unavailable (embedding defaults to `[]` or zero vector)
- Resume upload fails if AI service is unreachable (parsing is mandatory)

---

## 2. Database — MongoDB Atlas

### Connection
- **Driver:** Mongoose 9.3 (ODM)
- **Config:** `backend/config/db.js`
- **Connection string:** `MONGO_URI` env var
- **Database name:** `MONGO_DB_NAME` env var (default: `ai_recruitment`)
- **Behavior:** Process exits on connection failure

### Collections (Mongoose Models)

| Model | File | Key Fields |
|---|---|---|
| `User` | `backend/models/User.js` | name, email, password (hashed), role, candidate ref |
| `Candidate` | `backend/models/Candidate.js` | personal_info, skills, education, experience, projects, embedding (384-dim), user ref |
| `Job` | `backend/models/Job.js` | title, description, skills, location, salary, embedding, status, postedBy ref |
| `Application` | `backend/models/Application.js` | job ref, candidate ref, user ref, status, ai_match_score |
| `Company` | `backend/models/Company.js` | user ref, name, description, website, industry, size |
| `JobSeeker` | `backend/models/JobSeeker.js` | user ref, candidate ref, title, bio, resumeUrl |

### Indexes
- `User.email` — unique index
- `Job` — text index on `{ title, company, description }` for search

### Relationships
- `User` → `Candidate` (1:1 via `candidate` ObjectId ref)
- `User` → `Company` (1:1 implicit via query `{ user: userId }`)
- `Job` → `User` (postedBy ref)
- `Application` → `Job`, `Candidate`, `User` (all ObjectId refs)

---

## 3. Third-Party APIs

### RapidAPI JSearch — External Job Listings

- **Controller:** `backend/controllers/external-jobs.controller.js`
- **Route:** `GET /api/external-jobs`
- **API URL:** `https://jsearch.p.rapidapi.com/search`
- **Authentication:** `RAPIDAPI_KEY` env var sent via `x-rapidapi-key` header

#### Caching Strategy
- **In-memory `Map`** cache with 30-minute TTL
- Cache key includes: query string, location, page number, cache version
- Motivation: Free tier limited to ~200 requests/month (~6.5/day)
- Stale entries evicted on next access

#### Filtering
- Results filtered to **India-only** jobs (country/location matching)
- Multi-level location matching:
  - Indian state/UT term detection (35 states/territories)
  - Locality prefix stripping (village, taluka, dist, etc.)
  - Candidate preferred location matching
- Remote jobs pass location filter automatically

#### Response Mapping
External job format (`JSearch`) → Internal job format:
```
job_id → id
job_title → title
employer_name → company
job_city + job_state + job_country → location
employer_logo → logo
job_employment_type → employment_type
job_is_remote → remote
job_description → description
job_apply_link → apply_link
```

---

## 4. Frontend → Backend Communication

### API Client
- **File:** `frontend/src/services/api.js`
- **Base URL:** `http://localhost:4000/api` (hardcoded)
- **Auth:** JWT token from `localStorage` attached via Axios request interceptor
- **Cookies:** `withCredentials: true` (httpOnly cookie support)

### Endpoints Used by Frontend

| Frontend Function | HTTP Method | Backend Route |
|---|---|---|
| `loginUser` | POST | `/api/auth/login` |
| `registerUser` | POST | `/api/auth/register` |
| `logoutUser` | POST | `/api/auth/logout` |
| `getMe` | GET | `/api/auth/me` |
| `uploadResume` | POST | `/api/candidates/upload` |
| `createJob` | POST | `/api/jobs` |
| `getJobById` | GET | `/api/jobs/:id` |
| `updateJob` | PUT | `/api/jobs/:id` |
| `deleteJob` | DELETE | `/api/jobs/:id` |
| `getMyJobs` | GET | `/api/jobs/my` |
| `getJobRecommendations` | GET | `/api/jobs/recommendations` |
| `applyToJob` | POST | `/api/applications/:jobId` |
| `fetchExternalJobs` | GET | `/api/external-jobs` |
| `getProfile` | GET | `/api/profile/me` |
| `createJobSeekerProfile` | POST | `/api/profile/job-seeker` |
| `createCompanyProfile` | POST | `/api/profile/company` |
| `updateProfile` | PUT | `/api/profile/me` |

---

## 5. Authentication Flow

### Token Strategy (Dual)
1. **httpOnly cookie** — Primary (XSS-safe, set by backend)
2. **localStorage token** — Fallback (for Postman / mobile apps)

### JWT Configuration
- **Secret:** `JWT_SECRET` env var (fallback: `"default_jwt_secret_change_me"`)
- **Expiry:** 7 days
- **Payload:** `{ id, email, role }`
- **Cookie options:** httpOnly, secure in production, sameSite: lax, 7-day maxAge

### Middleware
- `protect` — Validates JWT, attaches `req.user` (required)
- `optionalProtect` — Same but continues if no token (optional auth)
- `authorize(...roles)` — Role-based access control (`job_seeker`, `recruiter`, `admin`)

---

## 6. Offline Tooling (Not Wired to Backend)

### Glassdoor Scraper
- `ai-service/job_data/jd_data_extractor.py` — Selenium + BeautifulSoup
- `ai-service/job_data/jd_data_cleaner.py` — Data normalization
- CLI-only; not exposed via API routes
- Used for building offline job description datasets
