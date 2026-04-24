# Smart AI Recruitment Platform

A full-stack AI-powered recruitment platform that connects job seekers with opportunities through intelligent resume parsing, semantic matching, and automated candidate-job alignment.

## Overview

This platform consists of three main services:

| Service | Purpose | Tech Stack |
|---------|---------|------------|
| **Frontend** | React UI for candidates and recruiters | React, Vite |
| **Backend** | REST API for auth, jobs, applications | Node.js, Express, MongoDB |
| **AI Service** | Resume parsing, embeddings, matching | Python, Flask, sentence-transformers |

## Features

### Job Seekers
- User registration and authentication
- Resume upload and parsing (PDF/DOCX)
- AI-powered job matching with relevance scores
- Browse and apply to jobs
- Profile management

### Recruiters/Admins
- Job posting management
- Candidate search and filtering
- ATS (Applicant Tracking System) scoring
- Application workflow management

### AI Capabilities
- **Resume Parsing**: Extract structured data from resumes (experience, education, skills, projects)
- **Semantic Embeddings**: Generate vector representations for candidate-job matching
- **ATS Scoring**: Evaluate resume-job compatibility using Gemini AI insights
- **Job Data Scraping**: Glassdoor dataset tooling for external job collection

## Project Structure

```
Job-Recruitment/
├── frontend/                 # React UI (source files)
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/            # Page components
│       ├── services/         # API service layer
│       └── context/          # React context providers
│
├── backend/                  # Node.js/Express API
│   ├── config/               # Database configuration
│   ├── controllers/          # Route handlers
│   ├── middleware/           # Auth, upload middleware
│   ├── models/               # Mongoose schemas
│   ├── routes/               # API route definitions
│   ├── utils/                # Utility functions
│   └── server.js             # Entry point
│
├── ai-service/               # Python AI microservice
│   ├── parser/               # Resume parsing modules
│   │   ├── extractors/       # Section-specific extractors
│   │   ├── resume_parser.py  # Main parser
│   │   └── skill_matcher.py  # Skill matching
│   ├── matching/             # Job matching modules
│   │   ├── embeddings.py     # Text embeddings
│   │   ├── matcher.py        # Core matching logic
│   │   └── ats_gemini.py     # ATS scoring with Gemini
│   ├── job_data/             # Job data utilities
│   │   ├── jd_data_extractor.py
│   │   └── jd_data_cleaner.py
│   └── app.py                # Flask application
│
└── README.md
```

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **MongoDB** Atlas (or local instance)
- **Google Gemini API Key** (for ATS scoring)

## Environment Configuration

### Backend

Create `backend/.env`:

```env
PORT=4000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
AI_SERVICE_URL=http://localhost:5000
```

### AI Service

Create `ai-service/.env` (optional):

```env
GEMINI_API_KEY=your_google_gemini_api_key
```

## Local Setup

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Server runs at: `http://localhost:4000`

### 2. AI Service

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

Service runs at: `http://localhost:5000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI runs at: `http://localhost:5173` (Vite default)

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user (protected) |

### Job Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create new job (recruiter/admin) |
| GET | `/api/jobs/:id` | Get job details |

### Candidate Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/candidates/upload` | Upload resume |
| GET | `/api/candidates/match/:jobId` | Get matching candidates |

### Application Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/applications/:jobId` | Submit application |
| GET | `/api/applications` | List applications |

### AI Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/parse` | Parse resume (PDF/DOCX) |
| POST | `/embed` | Generate embeddings |
| POST | `/match` | Compute match score |

## Glassdoor Dataset Tooling

The AI service includes utilities for collecting and normalizing external job descriptions:

### Data Extraction

```bash
cd ai-service
python -m job_data.jd_data_extractor "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=software%20engineer" raw_jobs.json --max-pages 2
```

### Data Cleaning

```bash
python -m job_data.jd_data_cleaner raw_jobs.json cleaned_jobs.json
```

**Notes:**
- Selenium 4 uses Selenium Manager (auto driver resolution)
- Glassdoor markup changes frequently; fallback selectors included
- Use `--skip-details` for listing-card only data

## Security

- Never commit `.env` files or secrets
- Rotate any leaked credentials immediately
- Keep `backend/.env.example` as the only tracked template

## Suggested Improvements

- [ ] Add frontend scaffold files for reproducibility
- [ ] Implement full application workflow
- [ ] Add automated tests (auth, job posting, AI integration)
- [ ] Add Docker Compose for one-command startup
- [ ] Implement real-time notifications
- [ ] Add job recommendation engine

## License

MIT
