<!-- GSD:project-start source:PROJECT.md -->
## Project

**Smart AI Recruitment Platform**

An AI-powered recruitment platform connecting job seekers and recruiters. Candidates upload resumes that get AI-parsed and matched against job postings using an 8-signal scoring algorithm. Three services: React frontend (Vite), Node.js/Express backend, and Python/Flask AI microservice — all communicating via REST APIs over MongoDB Atlas.

**Core Value:** Automated, intelligent job-candidate matching that saves recruiters time and helps candidates find relevant opportunities through AI-driven recommendations.

### Constraints

- **Tech stack**: Must use existing stack (React/Express/Flask/MongoDB) — no rewrites
- **Backward compatibility**: Existing API contracts must be preserved
- **No downtime**: Fix bugs without breaking working features
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Overview
## Languages & Runtimes
| Service      | Language   | Runtime         | Module System |
|-------------|-----------|-----------------|---------------|
| Frontend     | JavaScript (JSX) | Node.js 18+ | ES Modules (`"type": "module"`) |
| Backend      | JavaScript (ES6+) | Node.js 18+ | ES Modules (`"type": "module"`) |
| AI Service   | Python 3.10+      | CPython     | Standard imports                |
## Frontend — `frontend/`
### Core Framework
- **React 19.2** — Latest React with concurrent features
- **Vite 7.3** — Build tool and dev server (`@vitejs/plugin-react`)
- **React Router DOM 7.13** — Client-side routing
### UI & Styling
- **Tailwind CSS 4.2** — Utility-first CSS framework (via `@tailwindcss/vite` plugin)
- **Lucide React 0.577** — Icon library
- **React Icons 5.6** — Additional icon library
- **React Hot Toast 2.6** — Toast notifications
- **Radix UI** — Headless components (`@radix-ui/react-slot`, `@radix-ui/react-toast`)
- **class-variance-authority 0.7** — Component variant management
- **clsx 2.1 + tailwind-merge 3.5** — Conditional class name utilities
### HTTP Client
- **Axios 1.13** — API client with interceptors for JWT auth
### Dev Tools
- **ESLint 9** — Linting (`eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`)
- **TypeScript types** — `@types/react`, `@types/react-dom` (types only, not TS compilation)
### Configuration Files
- `frontend/vite.config.js` — Vite + React + Tailwind plugin setup
- `frontend/eslint.config.js` — ESLint configuration
- `frontend/index.html` — SPA entry point
## Backend — `backend/`
### Core Framework
- **Express 5.2** — Web framework (v5 release)
- **Mongoose 9.3** — MongoDB ODM
### Authentication & Security
- **jsonwebtoken 9.0** — JWT token generation and verification
- **bcryptjs 3.0** — Password hashing (12 salt rounds)
- **cookie-parser 1.4** — Parse JWT from httpOnly cookies
- **cors 2.8** — CORS middleware (configured for `http://localhost:5173`)
### File Handling
- **multer 2.0** — Multipart file upload handling (PDF/DOCX resumes)
- **form-data 4.0** — Construct multipart requests to AI service
### HTTP Client
- **Axios 1.13** — HTTP client for AI service communication
### Environment
- **dotenv 17.3** — Environment variable loading
### Dev Tools
- **nodemon 3.1** — File watcher for auto-restart during development
- **concurrently 9.2** — Run all 3 services simultaneously via `npm run dev:all`
### Configuration Files
- `backend/.env.example` — Environment template (PORT, MONGO_URI, MONGO_DB_NAME, JWT_SECRET, AI_SERVICE_URL)
- `backend/.env` — Actual environment (gitignored)
## AI Service — `ai-service/`
### Core Framework
- **Flask** — Lightweight web framework
- **Flask-CORS** — Cross-origin resource sharing
### Machine Learning & NLP
- **sentence-transformers** — Embedding model (`all-MiniLM-L6-v2`, 384-dim vectors)
- **scikit-learn** — TF-IDF vectorization + cosine similarity
- **numpy** — Numerical operations for embedding vectors
### Document Processing
- **PyMuPDF (fitz)** — PDF text extraction with column-aware layout detection
- **python-docx** — DOCX text extraction
- **Pydantic** — Data validation (imported but lightly used)
### Web Scraping (Offline Tooling)
- **Beautiful Soup 4** — HTML parsing for Glassdoor job data extraction
- **Selenium** — Browser automation for Glassdoor scraping
### Configuration
- No `.env` required by default; Flask runs on port 5000
- Embedding model configurable via `EMBEDDING_MODEL_NAME` env var
## Database
- **MongoDB Atlas** — Cloud-hosted MongoDB
- Connected via Mongoose with `dbName: "ai_recruitment"`
- Connection string via `MONGO_URI` env var
## External APIs
| API              | Provider   | Usage                          | Auth                |
|-----------------|-----------|-------------------------------|---------------------|
| JSearch API      | RapidAPI   | External job listings search   | `RAPIDAPI_KEY` header |
## Package Managers
- **npm** — Used for both `frontend/` and `backend/`
- **pip** — Used for `ai-service/` (via `requirements.txt`)
- Lock files: `package-lock.json` in both JS projects
## Dev Startup
# All three services simultaneously (from backend/):
# Individual services:
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Overview
## JavaScript Conventions (Backend + Frontend)
### Module System
- **ES Modules throughout** — Both `backend/` and `frontend/` use `"type": "module"` in `package.json`
- All imports use `import`/`export` syntax (no `require()`)
- File extensions included in backend imports: `import User from "../models/User.js"`
### Variable Naming
- **camelCase** for variables, functions, and object properties
- **PascalCase** for React components and Mongoose model names
- **UPPER_SNAKE_CASE** for constants (e.g., `JWT_SECRET`, `CACHE_TTL`, `INDIA_STATE_TERMS`)
### String Style
- **Double quotes** in backend JavaScript: `import express from "express"`
- **Double quotes** in frontend JSX: `className="min-h-screen"`
### Semicolons
- Semicolons used consistently in both frontend and backend
### Arrow Functions
- Preferred for controller handlers, middleware, and React components
- Example pattern:
## Backend Patterns
### Controller Pattern
### Route Pattern
- Each domain has a dedicated route file that creates an Express `Router`
- Route files import controller functions by name
- Middleware applied inline: `router.get("/me", protect, getMe)`
- Auth + role guard chaining: `router.post("/", protect, authorize("recruiter", "admin"), createJob)`
### Model Pattern
- Mongoose schemas with validation messages: `required: [true, "Name is required"]`
- Enum fields with explicit value lists
- Timestamps enabled: `{ timestamps: true }`
- Password excluded by default: `select: false`
- Pre-save hooks for password hashing
- Instance methods for password comparison
### Error Handling
- **No centralized error handler** — Each controller handles its own errors
- All errors caught in try/catch, logged with `console.error`
- Generic fallback messages returned to client (no stack traces)
- AI service failures handled gracefully (continue with empty embedding)
### Auth Cookie Pattern
- JWT set in httpOnly cookie with security options:
## Frontend Patterns
### Component Structure
- **Functional components only** — No class components
- **Default exports** for pages and components
- **Named exports** for provider components (e.g., `AuthProvider`)
### State Management
- **React Context** for global state (Auth, Theme)
- **Context split pattern:** Separate files for context object + provider component + hook
### Routing
- React Router DOM v7 with `BrowserRouter`
- Route protection via wrapper components:
### API Calls
- Centralized in `frontend/src/services/api.js`
- Single Axios instance with base URL and credentials
- Request interceptor attaches JWT from localStorage
- Each API function is a named export wrapping an Axios call
### CSS / Styling
- **Tailwind CSS 4** with Vite plugin integration
- Custom CSS variables for theming in `index.css` (47KB — extensive custom theme with light/dark mode)
- Dark mode via `html.dark` class toggle
- Utility functions: `cn()` = `clsx()` + `tailwind-merge()`
### Toast Notifications
- `react-hot-toast` for user feedback
- Configured globally in `App.jsx` with themed styling
- Usage: `toast.success("Message")`, `toast.error("Message")`
## Python Conventions (AI Service)
### Code Style
- PEP 8 compliant (snake_case functions/variables, PascalCase classes)
- Private functions prefixed with underscore: `_normalize_text()`, `_parse_date()`
- Docstrings on public functions (triple-quoted, descriptive)
- Module-level docstrings with endpoint documentation
### Import Style
- Standard library first, then third-party, then local
- Lazy imports in Flask routes for expensive modules (sentence-transformers loaded on first use)
### Error Handling
- Flask endpoints wrap logic in try/except, return JSON errors with status codes:
### Matching Algorithm Constants
- Extensive use of `Set` for O(1) lookup (e.g., `INDIA_STATE_TERMS`, `SKILL_ALIASES`)
- Compiled regex patterns stored as module-level constants
- Scoring weights as inline floats with comments
### Data Handling
- Defensive access throughout: `candidate_data.get('skills', {})` with type checking
- Handles both `dict` and `list` formats for parsed data (skills, projects, experience)
- Zero vectors (`[0.0] * 384`) as fallback for empty embeddings
## Shared Patterns
### Location Matching
- Indian state/UT term sets (35 entries)
- Locality prefix stripping (village, taluka, dist, etc.)
- Remote job detection
- Multi-level matching: exact → locality → broader terms
### Embedding Text Construction
### Response Format
- Success: `{ success: true, ...payload }`
- Error: `{ error: "message" }` (or `{ success: true, error: "context" }` for graceful failures)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Overview
```
```
### Key Design Decisions
- **Backend as API gateway** — All DB operations go through the Node.js backend; the AI service is stateless and has no database access
- **Synchronous inter-service calls** — Backend calls AI service synchronously via Axios; no message queue
- **Dual auth tokens** — JWT sent in both httpOnly cookie and JSON response for flexibility
- **Graceful AI degradation** — Jobs and profiles save even when AI service is down (empty embeddings)
## Architectural Pattern
### Backend — Layered MVC
```
```
- **Routes** (`backend/routes/`) — URL mapping to controller functions, middleware application
- **Middleware** (`backend/middleware/`) — Auth verification, file upload handling
- **Controllers** (`backend/controllers/`) — Business logic, AI service orchestration
- **Models** (`backend/models/`) — Mongoose schema definitions, data validation
### Frontend — Component-Based SPA
```
```
- **Pages** (`frontend/src/pages/`) — Route-level components (Home, Jobs, Login, etc.)
- **Components** (`frontend/src/components/`) — Reusable UI components (Navbar, Footer, etc.)
- **Context** (`frontend/src/context/`) — React Context for global state (Auth, Theme)
- **Services** (`frontend/src/services/`) — API abstraction layer (single Axios instance)
- **Utils** (`frontend/src/utils/`) — Helper functions (classnames, job utilities, profile insights)
### AI Service — Modular Pipeline
```
```
- **Parser pipeline** — `text_extractor` → `preprocessing` → `section_splitter` → extractors → `skill_matcher`
- **Matching engine** — `embeddings` → `matcher` (8-signal scoring) → `recommend`
## Data Flow
### Resume Upload Flow
```
```
### Job Recommendation Flow
```
```
### Authentication Flow
```
```
### Profile Creation Flow
```
```
## Entry Points
| Service | Entry File | Default Port |
|---------|-----------|-------------|
| Frontend | `frontend/src/main.jsx` (Vite serves `frontend/index.html`) | 5173 |
| Backend | `backend/server.js` | 4000 |
| AI Service | `ai-service/app.py` | 5000 |
## Role-Based Access Control
| Role | Capabilities |
|------|-------------|
| `job_seeker` | Browse/search jobs, upload resume, create profile, apply to jobs, view recommendations |
| `recruiter` | Create/update/delete jobs, view posted jobs, create company profile |
| `admin` | All recruiter capabilities (via authorize middleware) |
## Key Abstractions
### AI Matching Algorithm (8-Signal)
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
- Low skill + project overlap → ×0.35
- Missing skills on external jobs → ×0.7
- Location mismatch → ×0.75
- Experience gap ≥2 years → ×0.35
### Resume Parser Pipeline
### Embedding Model
- **Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Dimensions:** 384
- **Loading:** Lazy singleton with thread-safe lock
- **Usage:** Generate embeddings for both jobs and candidates for semantic similarity matching
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.agent/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
