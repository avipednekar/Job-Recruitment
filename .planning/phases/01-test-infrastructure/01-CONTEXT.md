# Phase 1: Test Infrastructure - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up test frameworks, mocks, fixtures, and utilities for the backend (Express/Node.js) and AI service (Flask/Python) so that test suites can be written efficiently in Phase 2. No actual test cases are written in this phase — only infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Backend Test Setup
- **D-01:** Use Jest with `--experimental-vm-modules` flag for ESM support (backend uses `"type": "module"`)
- **D-02:** Use `mongodb-memory-server` for realistic MongoDB testing (real in-process Mongo, not Mongoose mocks) — slower but catches real query issues
- **D-03:** Refactor `server.js` into app factory pattern: extract `createApp()` function that returns the Express app without connecting to DB or starting the listener. Tests import `createApp()`, production `server.js` calls `createApp()` + `connectDB()` + `app.listen()`
- **D-04:** Mock AI service HTTP calls using Jest manual mocks on Axios (mock `axios.post` responses for `/parse`, `/embed`, `/match`)
- **D-05:** Create JWT test utility that generates valid tokens for test users (job_seeker, recruiter, admin roles)

### AI Service Test Setup
- **D-06:** Use pytest with a `conftest.py` in `ai-service/tests/` directory
- **D-07:** Mock sentence-transformer model at module level — patch `get_model()` in `embeddings.py` to return a fake model that produces deterministic 384-dim vectors. No real model loading in tests.
- **D-08:** Create synthetic test resume fixtures (PDF + DOCX) with known, deterministic content — not real resumes. Use `reportlab` for PDF generation and `python-docx` for DOCX in a fixture script.

### App Factory Refactor
- **D-09:** This is a minimal refactor — only extract app creation. Do NOT change any routes, middleware, or business logic. The refactor must be backward-compatible (existing `npm run dev` still works).

### Agent's Discretion
- Test directory structure (e.g., `backend/__tests__/` vs `backend/tests/`) — agent decides based on conventions
- pytest configuration approach (pyproject.toml vs pytest.ini vs conftest.py) — agent decides
- Specific assertion libraries or test utilities beyond the core ones listed above

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Backend
- `backend/package.json` — Current dependencies and scripts (ESM module system)
- `backend/server.js` — Entry point that needs app factory refactor
- `backend/config/db.js` — MongoDB connection setup (needs to be decoupled for tests)
- `backend/middleware/auth.middleware.js` — JWT verification logic (needed for test JWT utility)

### AI Service
- `ai-service/app.py` — Flask entry point and endpoint definitions
- `ai-service/matching/embeddings.py` — Embedding model loading (needs mock strategy)
- `ai-service/parser/resume_parser.py` — Resume parsing pipeline (test fixtures target this)
- `ai-service/requirements.txt` — Current Python dependencies

### Codebase Maps
- `.planning/codebase/TESTING.md` — Recommended test strategy and priority areas
- `.planning/codebase/ARCHITECTURE.md` — Service architecture and data flows
- `.planning/codebase/CONCERNS.md` — Known bugs that Phase 3 will fix (context for what tests should eventually catch)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — no test infrastructure exists yet

### Established Patterns
- ES Modules throughout backend (all `import`/`export`, no `require()`)
- Arrow functions for controller handlers
- Mongoose ODM with schema validation
- Flask with `@app.route` decorators in AI service
- Lazy singleton pattern for embedding model loading

### Integration Points
- `backend/server.js` — needs app factory extraction (D-03)
- `backend/config/db.js` — tests will use mongodb-memory-server instead
- `ai-service/matching/embeddings.py` — tests will mock `get_model()`
- `backend/middleware/auth.middleware.js` — test JWT utility will generate tokens compatible with this

</code_context>

<specifics>
## Specific Ideas

No specific requirements — sensible defaults selected for all gray areas. Key choices:
- mongodb-memory-server over Mongoose mocks (realism over speed)
- Synthetic fixtures over real resumes (deterministic, no PII)
- App factory refactor (essential for testability)
- Module-level mocks for sentence-transformer (fast tests)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-test-infrastructure*
*Context gathered: 2026-04-19*
