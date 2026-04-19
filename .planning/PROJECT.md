# Smart AI Recruitment Platform

## What This Is

An AI-powered recruitment platform connecting job seekers and recruiters. Candidates upload resumes that get AI-parsed and matched against job postings using an 8-signal scoring algorithm. Three services: React frontend (Vite), Node.js/Express backend, and Python/Flask AI microservice — all communicating via REST APIs over MongoDB Atlas.

## Core Value

Automated, intelligent job-candidate matching that saves recruiters time and helps candidates find relevant opportunities through AI-driven recommendations.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Multi-role authentication (job_seeker, recruiter, admin) with JWT — existing
- ✓ Job CRUD with role-based authorization — existing
- ✓ Resume upload and AI parsing (PDF/DOCX) — existing
- ✓ Candidate profile creation from parsed resume — existing
- ✓ 8-signal AI matching algorithm (semantic, skills, experience, location, education, salary, TF-IDF, projects) — existing
- ✓ Job recommendations with internal + external (RapidAPI JSearch) sources — existing
- ✓ Job search with filters (location, experience, salary, skills) — existing
- ✓ Company/recruiter profile management — existing
- ✓ Profile setup wizard for job seekers — existing
- ✓ Theme toggle (dark/light mode) — existing
- ✓ Glassdoor scraping tooling (offline) — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] Test infrastructure for all three services (backend, frontend, AI service)
- [ ] Fix critical security bugs (unauthenticated endpoints, hardcoded secrets, debug data leaks)
- [ ] Fix architectural issues (duplicated logic, hardcoded URLs, missing pagination)
- [ ] Fix code-level bugs (certifications KeyError, unused models, temp file cleanup)

### Out of Scope

- New features (notifications, video interviews, assessments) — focus on stability first
- Deployment/DevOps (Docker, CI/CD, monitoring) — after test coverage exists
- Mobile app — web-first
- OAuth/social login — email/password sufficient for now

## Context

- Three-service monorepo: `frontend/` (React/Vite), `backend/` (Express), `ai-service/` (Flask)
- **Zero automated tests** — no test framework configured in any service
- **21 documented concerns** spanning security (5 critical), architecture (5 high), code quality (6 medium), and minor issues (5 low)
- Codebase map already exists at `.planning/codebase/`
- Debug dump in AI service writes PII to disk on every resume parse
- Several unauthenticated endpoints expose candidate data
- Location matching logic duplicated 3x across services

## Constraints

- **Tech stack**: Must use existing stack (React/Express/Flask/MongoDB) — no rewrites
- **Backward compatibility**: Existing API contracts must be preserved
- **No downtime**: Fix bugs without breaking working features

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Jest + Supertest for backend tests | Industry standard for Express apps, good mocking support | — Pending |
| Vitest + React Testing Library for frontend | Native Vite integration, same API as Jest | — Pending |
| pytest for AI service | Python standard, good fixture support | — Pending |
| Test infra before bug fixes | Tests catch regressions when fixing bugs | — Pending |
| Fix security bugs first among bug fixes | Highest risk items | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-19 after initialization*
