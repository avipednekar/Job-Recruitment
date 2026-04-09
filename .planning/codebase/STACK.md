# Technology Stack

## Overview

The Smart AI Recruitment Platform is a **three-service monorepo** comprising a React frontend, Node.js/Express backend, and Python/Flask AI microservice. All services are developed and run locally; no containerization or cloud deployment is currently configured.

---

## Languages & Runtimes

| Service      | Language   | Runtime         | Module System |
|-------------|-----------|-----------------|---------------|
| Frontend     | JavaScript (JSX) | Node.js 18+ | ES Modules (`"type": "module"`) |
| Backend      | JavaScript (ES6+) | Node.js 18+ | ES Modules (`"type": "module"`) |
| AI Service   | Python 3.10+      | CPython     | Standard imports                |

---

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

---

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

---

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

---

## Database

- **MongoDB Atlas** — Cloud-hosted MongoDB
- Connected via Mongoose with `dbName: "ai_recruitment"`
- Connection string via `MONGO_URI` env var

---

## External APIs

| API              | Provider   | Usage                          | Auth                |
|-----------------|-----------|-------------------------------|---------------------|
| JSearch API      | RapidAPI   | External job listings search   | `RAPIDAPI_KEY` header |

---

## Package Managers

- **npm** — Used for both `frontend/` and `backend/`
- **pip** — Used for `ai-service/` (via `requirements.txt`)
- Lock files: `package-lock.json` in both JS projects

---

## Dev Startup

```bash
# All three services simultaneously (from backend/):
npm run dev:all

# Individual services:
cd backend  && npm run dev       # Port 4000
cd frontend && npm run dev       # Port 5173
cd ai-service && python app.py   # Port 5000
```
