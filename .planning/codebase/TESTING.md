# Testing

## Overview

The codebase currently has **no automated test suite**. There are no test frameworks configured, no test scripts in `package.json`, no CI/CD pipeline, and no unit/integration/E2E tests.

---

## Current State

### Automated Tests
- ❌ **No test framework** installed or configured in any service
- ❌ **No `test` script** in `backend/package.json` or `frontend/package.json`
- ❌ **No pytest** configuration in `ai-service/`
- ❌ **No CI/CD** pipeline (no `.github/workflows`, no Jenkinsfile, etc.)

### Manual / Ad-Hoc Testing
- `test_node_api.py` — Python script at project root for manual backend API testing (gitignored)
- `ai-service/debug_parsed_data.json` — Debug JSON dump from resume parser (written by `resume_parser.py` on every parse call)
- `backend/seed-jobs.js` — Database seeder with sample job data for manual testing

### Debug Code in Production
- `ai-service/parser/resume_parser.py` contains a debug dump:
```python
# ------------- DEBUG DUMP -------------
try:
    with open("debug_parsed_data.json", "w") as f:
        json.dump(parsed_data, f, indent=2)
except Exception as e:
    print(f"Debug dump failed: {e}")
# --------------------------------------
```
This writes to the current working directory on every resume parse.

---

## Recommended Test Strategy

### Backend (Node.js/Express)

**Recommended Framework:** Jest + Supertest

**Priority test areas:**
1. **Auth flow** — Registration, login, logout, JWT verification, role-based access
2. **Job CRUD** — Create, read, update, delete with authorization checks
3. **Candidate upload** — Resume upload pipeline (mock AI service)
4. **Application flow** — Apply to job, duplicate prevention, status tracking
5. **Profile management** — Job seeker and company profile creation/update
6. **External jobs** — Cache behavior, location filtering, API error handling
7. **Middleware** — `protect`, `optionalProtect`, `authorize` with various token states

**Mocking needs:**
- AI service HTTP calls (Axios mock)
- MongoDB (in-memory via `mongodb-memory-server` or Mongoose mocks)
- File system (multer uploads)

### Frontend (React)

**Recommended Framework:** Vitest + React Testing Library

**Priority test areas:**
1. **Auth context** — Login/logout state management, session restore
2. **Protected routes** — Redirect behavior for unauthenticated users
3. **API integration** — Mock API responses for job search, recommendations
4. **Profile setup wizard** — Multi-step form validation
5. **Job search** — Filter/search/pagination behavior

### AI Service (Python)

**Recommended Framework:** pytest

**Priority test areas:**
1. **Resume parser** — Test with sample PDF/DOCX files
2. **Section splitter** — Various header formats
3. **Skill matcher** — Skill extraction + deduplication
4. **Matching algorithm** — Score calculation with known inputs/outputs
5. **Embedding generation** — Mock sentence-transformer for unit tests
6. **Location matching** — India-specific location logic
7. **Experience calculator** — Date parsing, year estimation

---

## Test Data

### Existing Seed Data
- `backend/seed-jobs.js` contains sample job objects with realistic data:
  - Job titles, descriptions, companies
  - Skills arrays
  - Experience levels
  - Salary ranges
  - Location data

### Needed Test Fixtures
- Sample resume PDFs/DOCXs with known content (for parser testing)
- Candidate profiles with known skills/experience (for matching testing)
- Edge case resumes: multi-column layouts, missing sections, international formats

---

## Coverage Gaps (Critical)

| Area | Risk | Notes |
|------|------|-------|
| Authentication | High | No tests for JWT validation, expired tokens, role spoofing |
| File upload | High | No tests for malformed files, size limits, file type validation |
| AI matching | High | Complex 8-signal algorithm with no regression tests |
| Location matching | Medium | Complex India-specific logic duplicated across services |
| Error handling | Medium | Graceful degradation when AI service is down |
| Database operations | Medium | Upsert logic, concurrent access, data integrity |
| External API | Low | Rate limiting, cache invalidation, API format changes |
