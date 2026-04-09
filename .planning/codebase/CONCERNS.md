# Concerns

## Overview

This document catalogs technical debt, known issues, security concerns, and areas of fragility in the Smart AI Recruitment Platform. Items are grouped by severity.

---

## 🔴 Critical — Security Issues

### 1. Hardcoded JWT Secret Fallback
**Files:** `backend/middleware/auth.middleware.js`, `backend/controllers/auth.controller.js`
```javascript
const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_change_me";
```
If `JWT_SECRET` env var is not set, the fallback is predictable and public (it's in source code). An attacker could forge valid JWTs. Should fail hard if not set.

### 2. Debug Dump Writes Parsed Data to Disk
**File:** `ai-service/parser/resume_parser.py`
```python
with open("debug_parsed_data.json", "w") as f:
    json.dump(parsed_data, f, indent=2)
```
This writes every parsed resume's personally identifiable information (name, email, phone, etc.) to a world-readable file in the CWD. This is active in production code and should be removed or gated behind a debug flag.

### 3. No Rate Limiting on Auth Endpoints
**Files:** `backend/routes/auth.routes.js`
Login and registration endpoints have no rate limiting. Vulnerable to brute-force attacks and credential stuffing.

### 4. Candidate Upload Endpoint Has No Auth
**File:** `backend/routes/candidate.routes.js`
```javascript
router.post("/upload", upload.any(), uploadResume);
```
The resume upload endpoint has no `protect` middleware. Any unauthenticated user can upload resumes. The controller does check `req.user?.id` with optional chaining but will create an orphaned Candidate document without a user association.

### 5. Candidate Ranking Endpoint Has No Auth
**File:** `backend/routes/candidate.routes.js`
```javascript
router.get("/match/:jobId", rankCandidates);
```
Anyone can rank all candidates against any job. This exposes candidate PII (name, email, match scores). Should require recruiter/admin auth.

---

## 🟡 High — Architectural Issues

### 6. Duplicated Location Matching Logic
The India-specific location matching logic (state sets, prefix stripping, multi-level matching) is implemented **three times**:
- `backend/controllers/job.controller.js` (lines 6-240+)
- `backend/controllers/external-jobs.controller.js` (lines 11-183)
- `ai-service/matching/matcher.py` (lines 44-275)

Each copy has slight variations. This creates maintenance risk — a fix in one place won't propagate to others. Should be extracted to a shared module.

### 7. Hardcoded Frontend API Base URL
**File:** `frontend/src/services/api.js`
```javascript
const API = axios.create({
  baseURL: "http://localhost:4000/api",
});
```
The API URL is hardcoded, making deployment to any non-localhost environment impossible without code changes. Should use an environment variable.

### 8. CORS Locked to Localhost
**File:** `backend/server.js`
```javascript
cors({
  origin: "http://localhost:5173",
  credentials: true,
})
```
Only allows requests from local Vite dev server. Will break on any deployment.

### 9. Synchronous AI Service Calls
All backend → AI service calls are synchronous (blocking the Node.js request handler):
- Resume parsing + embedding is 2 serial HTTP calls
- Candidate ranking iterates all candidates sequentially with individual AI calls
- Job recommendations fetch all jobs + make bulk AI call

For `rankCandidates`, this means N sequential HTTP calls (one per candidate), which will be extremely slow at scale.

### 10. No Pagination for Candidate Ranking
**File:** `backend/controllers/candidate.controller.js`
```javascript
const candidates = await Candidate.find().lean();
```
Fetches ALL candidates from the database, then calls the AI service for each one. This will not scale beyond a few dozen candidates.

---

## 🟠 Medium — Code Quality Issues

### 11. Giant Controller File
**File:** `backend/controllers/job.controller.js` (31KB, 971 lines)
This file contains:
- Location matching utilities (200+ lines)
- Skill extraction helpers
- External job scoring logic
- Candidate profiling/seniority inference
- CRUD operations
- Search with filtering
- Recommendation engine

Should be split into focused modules.

### 12. Giant CSS File
**File:** `frontend/src/index.css` (47KB, ~1200+ lines)
All styles including CSS custom properties, utility classes, component styles, animations, and theme definitions are in a single file. Difficult to maintain as the project grows.

### 13. Giant Page Components
Several page files are very large single-file components:
- `ProfileSetup.jsx` — 53KB (multi-step wizard with all inline logic)
- `ProfileView.jsx` — 35KB
- `Jobs.jsx` — 24KB

These should be broken into smaller sub-components with extracted hooks.

### 14. Embedding Text Construction Duplicated
The pattern for building embedding text appears in multiple places:
- `backend/controllers/candidate.controller.js` (lines 33-51)
- `backend/controllers/profile.controller.js` (lines 17-30)
- `ai-service/matching/matcher.py` (`build_candidate_profile_text`)

If the embedding strategy changes, all must be updated.

### 15. No Input Validation Library
Backend controllers validate inputs manually with `if (!field)` checks. No schema validation library (Joi, Zod, express-validator) is used, leading to inconsistent validation.

### 16. In-Memory Cache for External Jobs
**File:** `backend/controllers/external-jobs.controller.js`
```javascript
const cache = new Map();
```
Cache is in-process memory. Lost on server restart. Won't work in multi-process/cluster deployments. Should use Redis or similar for production.

---

## 🔵 Low — Minor Issues

### 17. JobSeeker Model Appears Unused
**File:** `backend/models/JobSeeker.js`
The `JobSeeker` model is defined but not imported or used in any controller or route. The `Candidate` model serves the job seeker profile role instead.

### 18. Certifications Extraction Bug
**File:** `ai-service/parser/resume_parser.py` (line 65)
```python
if "projects" in sections:
    # ... projects extraction ...
    raw_certs = sections["certifications"]  # ← This line
```
The certifications extraction code is nested inside the projects block and references `sections["certifications"]` without checking if it exists. Will throw `KeyError` if projects section exists but certifications doesn't.

### 19. No Seed Data for Testing
- `backend/seed-jobs.js` exists for jobs but runs manually
- No seed data for users, candidates, or applications
- No automated test data setup/teardown

### 20. Text Index May Not Be Used
**File:** `backend/models/Job.js`
A MongoDB text index is defined but the search controller uses regex-based `$or` queries:
```javascript
const regex = new RegExp(q.trim(), "i");
filter.$or = [{ title: regex }, { company: regex }, ...];
```
This won't use the text index. Either switch to `$text` queries or remove the unused index.

### 21. Temp Files May Not Be Cleaned Up
**File:** `backend/controllers/candidate.controller.js`
If the `fs.readFileSync(req.file.path)` call succeeds but the subsequent AI service call fails before reaching the `finally` block, the temp file cleanup is handled. However, `upload.any()` in the route allows multiple files, but only `req.files[0]` is processed — additional uploaded files remain on disk.

---

## Performance Concerns

### Embedding Model Cold Start
The `sentence-transformers/all-MiniLM-L6-v2` model is loaded lazily on first request. The first API call to `/parse`, `/embed`, or `/match` will:
1. Download the model from HuggingFace (if not cached)
2. Load ~90MB model into memory
3. Take 5-30 seconds depending on hardware

**Mitigation:** None currently. Consider a startup warmup request.

### N+1 AI Service Calls in Ranking
`rankCandidates` makes a separate HTTP call to the AI service for each candidate. With 100 candidates, this means 100 serial HTTP requests.

### Large Embedding Arrays in MongoDB
Each Job and Candidate document stores a 384-dimensional float array. These are fetched by default unless `.select("-embedding")` is used. Several queries don't exclude embeddings.

---

## Deployment Readiness

| Aspect | Status | Notes |
|--------|--------|-------|
| Dockerization | ❌ Not started | No Dockerfile, no docker-compose |
| CI/CD | ❌ Not started | No pipeline configuration |
| Environment config | ⚠️ Partial | Backend uses .env; frontend has hardcoded URLs |
| HTTPS/TLS | ❌ Not configured | Cookie secure flag is env-gated but no TLS setup |
| Logging | ⚠️ Basic | Console.log/error only; no structured logging |
| Monitoring | ❌ Not started | No health check aggregation, no metrics |
| Error tracking | ❌ Not started | No Sentry or equivalent |
| Secrets management | ❌ Not started | Plain-text .env files |
