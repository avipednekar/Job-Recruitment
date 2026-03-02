# Smart AI Recruitment Platform

An AI-assisted recruitment platform with three services:
- `frontend`: React UI for candidates and recruiters
- `backend`: Node.js/Express API for auth, jobs, and application workflows
- `ai-service`: Flask microservice for resume parsing, embeddings, and candidate-job matching

## Current Repository Status

- Backend and AI service are runnable from this repository.
- Frontend currently contains `src/` pages/components only. Project scaffold files (for example `package.json`, bundler config) are not present in Git and must be restored/created to run the UI.

## Tech Stack

- Frontend: React (source-only in current repo)
- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth
- AI Service: Python, Flask, sentence-transformers, scikit-learn

## Project Structure

```text
.
|- frontend/
|  `- src/
|- backend/
|  |- config/
|  |- controllers/
|  |- middleware/
|  |- models/
|  |- routes/
|  |- .env.example
|  `- server.js
|- ai-service/
|  |- parser/
|  |- matching/
|  |- requirements.txt
|  `- app.py
`- README.md
```

## Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- MongoDB Atlas (or MongoDB instance)

## Environment Configuration

1. Backend:
   - Copy `backend/.env.example` to `backend/.env`.
   - Set:
     - `PORT`
     - `MONGO_URI`
     - `JWT_SECRET`
     - `AI_SERVICE_URL` (default `http://localhost:5000`)
2. AI service:
   - Uses defaults; optionally create `ai-service/.env` for custom local settings.

## Local Setup

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Default URL: `http://localhost:4000`

### 2) AI Service

```bash
cd ai-service
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Default URL: `http://localhost:5000`

### 3) Frontend

If your frontend scaffold exists locally, run it on port `3000` so backend CORS matches current config:

```bash
cd frontend
npm install
npm start
```

If scaffold files are missing, create/restore a React project in `frontend/`, then keep the existing `src/` folder.

## API Overview

Backend base URL: `http://localhost:4000`

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` (protected)
- `GET /api/jobs`
- `POST /api/jobs` (recruiter/admin)
- `POST /api/candidates/upload` (resume upload)
- `GET /api/candidates/match/:jobId`
- `POST /api/applications/:jobId` (placeholder, not implemented)
- `GET /api/applications` (placeholder, not implemented)

AI service base URL: `http://localhost:5000`

- `GET /` health check
- `POST /parse` parse resume (`.pdf`/`.docx`)
- `POST /embed` generate text embeddings
- `POST /match` compute candidate-job match score

## Security Notes

- Never commit `.env` files or secret credentials.
- Rotate any leaked credentials immediately (database URIs, JWT secrets, API keys).
- Keep `backend/.env.example` as the only tracked env template.

## Suggested Next Improvements

- Add frontend scaffold files (`package.json`, bundler config, lock file) to make UI reproducible.
- Implement application routes in `backend/routes/application.routes.js`.
- Add automated tests for auth, job posting, and AI integration flows.
- Add Docker compose for one-command local startup.
