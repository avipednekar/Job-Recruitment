# Roadmap: Smart AI Recruitment Platform — Testing & Bug Fixes

## Overview

This milestone focuses on establishing test infrastructure for the backend and AI services, then systematically fixing known bugs (security-critical first), and finally refactoring duplicated/oversized code. Test infra comes first so that bug fixes have regression coverage.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Test Infrastructure** - Set up Jest/Supertest for backend and pytest for AI service with fixtures and mocks
- [ ] **Phase 2: Core Test Suites** - Write comprehensive tests for auth, jobs, candidates, AI parsing, matching, and endpoints
- [ ] **Phase 3: Security & Bug Fixes** - Fix critical security vulnerabilities and code-level bugs with test coverage
- [ ] **Phase 4: Refactoring** - Extract duplicated logic and split oversized files into focused modules

## Phase Details

### Phase 1: Test Infrastructure
**Goal**: Both backend and AI service have working test frameworks with all necessary mocks, fixtures, and utilities so test suites can be written efficiently
**Depends on**: Nothing (first phase)
**Requirements**: BTEST-01, BTEST-02, BTEST-03, BTEST-04, AITEST-01, AITEST-02
**Success Criteria** (what must be TRUE):
  1. `npm test` in backend/ runs Jest and reports 0 tests (but doesn't crash)
  2. `pytest` in ai-service/ discovers and runs 0 tests (but doesn't crash)
  3. Backend tests can create/destroy a MongoDB memory instance per test suite
  4. Backend tests can mock AI service HTTP calls
  5. Backend tests can make authenticated requests with a test JWT utility
  6. AI service tests have sample resume fixtures (PDF + DOCX) with known content
**Plans**: 2 plans

Plans:
- [ ] 01-01: Backend test infrastructure (Jest, Supertest, MongoDB memory server, Axios mocks, JWT test util)
- [ ] 01-02: AI service test infrastructure (pytest, conftest.py, sample resume fixtures, model mocks)

### Phase 2: Core Test Suites
**Goal**: Comprehensive test coverage for all critical backend endpoints and AI service modules — catching existing bugs through tests
**Depends on**: Phase 1
**Requirements**: BTEST-05, BTEST-06, BTEST-07, BTEST-08, BTEST-09, BTEST-10, AITEST-03, AITEST-04, AITEST-05, AITEST-06, AITEST-07, AITEST-08, AITEST-09
**Success Criteria** (what must be TRUE):
  1. Auth flow tests pass for registration, login, logout, JWT expiry, and role-based access
  2. Job CRUD tests verify create/read/update/delete with proper authorization
  3. Candidate upload tests verify resume upload pipeline with mocked AI
  4. Resume parser tests verify text extraction, section splitting, and field extraction from fixtures
  5. Matching algorithm tests verify 8-signal scoring produces expected results for known inputs
  6. Flask endpoint tests verify /parse, /embed, /match, /recommend_jobs responses
**Plans**: 3 plans

Plans:
- [ ] 02-01: Backend auth and middleware tests (registration, login, logout, JWT, protect, authorize)
- [ ] 02-02: Backend job, candidate, and profile tests (CRUD, upload, search, recommendations)
- [ ] 02-03: AI service tests (parser, skill matcher, matching algorithm, embeddings, Flask endpoints)

### Phase 3: Security & Bug Fixes
**Goal**: Fix all critical security vulnerabilities and known code bugs, with each fix covered by a test proving the fix
**Depends on**: Phase 2
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, BUG-01, BUG-02, BUG-03, BUG-04, BUG-05
**Success Criteria** (what must be TRUE):
  1. Server fails to start if JWT_SECRET env var is missing (no hardcoded fallback)
  2. No debug dump file written during resume parsing
  3. Candidate upload endpoint requires authentication (returns 401 without token)
  4. Candidate ranking endpoint requires recruiter/admin role (returns 403 for job_seeker)
  5. Auth endpoints reject excessive requests (rate limited)
  6. Resume parser handles missing certifications section without crashing
  7. rankCandidates supports pagination (limit/offset parameters)
**Plans**: 2 plans

Plans:
- [ ] 03-01: Security fixes (JWT secret, debug dump, endpoint auth, rate limiting)
- [ ] 03-02: Code bug fixes (certifications KeyError, unused model, temp files, text index, pagination)

### Phase 4: Refactoring
**Goal**: Eliminate code duplication and improve maintainability by extracting shared utilities and splitting oversized files
**Depends on**: Phase 3
**Requirements**: ARCH-01, ARCH-02, ARCH-03
**Success Criteria** (what must be TRUE):
  1. Location matching logic exists in exactly one place (shared utility), used by all 3 locations
  2. Embedding text construction exists in exactly one place (shared utility)
  3. job.controller.js is under 300 lines with extracted modules for scoring, search, and recommendations
  4. All existing tests still pass after refactoring
**Plans**: 2 plans

Plans:
- [ ] 04-01: Extract shared utilities (location matching, embedding text construction)
- [ ] 04-02: Split job.controller.js into focused modules

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Test Infrastructure | 0/2 | Not started | - |
| 2. Core Test Suites | 0/3 | Not started | - |
| 3. Security & Bug Fixes | 0/2 | Not started | - |
| 4. Refactoring | 0/2 | Not started | - |
