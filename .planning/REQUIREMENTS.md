# Requirements: Smart AI Recruitment Platform — Testing & Bug Fixes

**Defined:** 2026-04-19
**Core Value:** Automated, intelligent job-candidate matching that saves recruiters time and helps candidates find relevant opportunities

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Backend Test Infrastructure

- [ ] **BTEST-01**: Jest and Supertest configured with test script in backend/package.json
- [ ] **BTEST-02**: MongoDB memory server (or equivalent) configured for isolated test runs
- [ ] **BTEST-03**: AI service HTTP calls mockable via Axios mock or similar
- [ ] **BTEST-04**: Test utility for creating authenticated requests (JWT helper)
- [ ] **BTEST-05**: Auth flow tests — registration, login, logout, JWT verification, expired tokens, role-based access
- [ ] **BTEST-06**: Job CRUD tests — create, read, update, delete with authorization checks
- [ ] **BTEST-07**: Candidate upload tests — resume upload pipeline with mocked AI service
- [ ] **BTEST-08**: Middleware tests — protect, optionalProtect, authorize with various token states
- [ ] **BTEST-09**: Job search and recommendation tests — filters, pagination, external job integration
- [ ] **BTEST-10**: Profile management tests — job seeker and company profile creation/update

### AI Service Test Infrastructure

- [ ] **AITEST-01**: pytest configured with test directory structure and conftest.py
- [ ] **AITEST-02**: Sample resume fixtures (PDF/DOCX) with known content for parser testing
- [ ] **AITEST-03**: Resume parser tests — text extraction, section splitting, field extraction
- [ ] **AITEST-04**: Skill matcher tests — extraction, deduplication, alias resolution
- [ ] **AITEST-05**: Matching algorithm tests — 8-signal score calculation with known inputs/outputs
- [ ] **AITEST-06**: Embedding generation tests — mock sentence-transformer for unit tests
- [ ] **AITEST-07**: Location matching tests — India-specific location logic, city/state matching
- [ ] **AITEST-08**: Experience calculator tests — date parsing, year estimation edge cases
- [ ] **AITEST-09**: Flask endpoint tests — /parse, /embed, /match, /recommend_jobs with mocked models

### Security Bug Fixes

- [ ] **SEC-01**: Remove hardcoded JWT secret fallback — fail if JWT_SECRET env var is not set
- [ ] **SEC-02**: Remove debug dump in ai-service/parser/resume_parser.py that writes PII to disk
- [ ] **SEC-03**: Add protect middleware to candidate upload endpoint (POST /upload)
- [ ] **SEC-04**: Add protect + authorize(recruiter, admin) to candidate ranking endpoint (GET /match/:jobId)
- [ ] **SEC-05**: Add rate limiting to auth endpoints (login, register)

### Code Bug Fixes

- [ ] **BUG-01**: Fix certifications KeyError in resume_parser.py — check section exists before access
- [ ] **BUG-02**: Remove or repurpose unused JobSeeker model
- [ ] **BUG-03**: Fix temp file cleanup — handle multiple files from upload.any()
- [ ] **BUG-04**: Fix MongoDB text index — either use $text queries or remove unused index
- [ ] **BUG-05**: Add pagination to rankCandidates endpoint (currently fetches ALL candidates)

### Architectural Improvements

- [ ] **ARCH-01**: Extract duplicated location matching logic into shared utility (currently in 3 places)
- [ ] **ARCH-02**: Extract duplicated embedding text construction into shared utility
- [ ] **ARCH-03**: Split giant job.controller.js (971 lines) into focused modules

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Frontend

- **FTEST-01**: Vitest + React Testing Library configured
- **FTEST-02**: Auth context tests
- **FTEST-03**: Protected route tests
- **FTEST-04**: Job search/filter tests

### DevOps

- **DEVOPS-01**: Docker compose for local development
- **DEVOPS-02**: CI/CD pipeline with test integration
- **DEVOPS-03**: Structured logging (replace console.log)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Frontend testing | Deferred to v2 — backend/AI stability first |
| E2E browser tests | Premature — needs stable backend first |
| Performance testing | Focus on correctness first |
| Load testing | Not relevant until deployment |
| New features | Stability milestone — no new capabilities |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BTEST-01 | Phase 1 | Pending |
| BTEST-02 | Phase 1 | Pending |
| BTEST-03 | Phase 1 | Pending |
| BTEST-04 | Phase 1 | Pending |
| BTEST-05 | Phase 2 | Pending |
| BTEST-06 | Phase 2 | Pending |
| BTEST-07 | Phase 2 | Pending |
| BTEST-08 | Phase 2 | Pending |
| BTEST-09 | Phase 2 | Pending |
| BTEST-10 | Phase 2 | Pending |
| AITEST-01 | Phase 1 | Pending |
| AITEST-02 | Phase 1 | Pending |
| AITEST-03 | Phase 2 | Pending |
| AITEST-04 | Phase 2 | Pending |
| AITEST-05 | Phase 2 | Pending |
| AITEST-06 | Phase 2 | Pending |
| AITEST-07 | Phase 2 | Pending |
| AITEST-08 | Phase 2 | Pending |
| AITEST-09 | Phase 2 | Pending |
| SEC-01 | Phase 3 | Pending |
| SEC-02 | Phase 3 | Pending |
| SEC-03 | Phase 3 | Pending |
| SEC-04 | Phase 3 | Pending |
| SEC-05 | Phase 3 | Pending |
| BUG-01 | Phase 3 | Pending |
| BUG-02 | Phase 3 | Pending |
| BUG-03 | Phase 3 | Pending |
| BUG-04 | Phase 3 | Pending |
| BUG-05 | Phase 3 | Pending |
| ARCH-01 | Phase 4 | Pending |
| ARCH-02 | Phase 4 | Pending |
| ARCH-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-19*
*Last updated: 2026-04-19 after initial definition*
