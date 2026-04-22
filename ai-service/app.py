"""
AI Service — Flask Microservice
================================
Pure AI endpoints for the Smart Recruitment Platform.
No database access — all DB operations go through the Node.js backend.

Endpoints:
    GET  /                Health check
    POST /parse           Parse resume PDF/DOCX → structured JSON
    POST /embed           Generate 384-dim semantic embedding from text
    POST /match           Match candidate to job → 7-factor AI score
    POST /recommend_jobs  Rank all jobs for a specific candidate
    POST /scrape_jobs     Scrape from multiple job boards (keyword search)
    POST /scrape_direct   Scrape from direct company ATS boards → LLM extract → clean JSON
"""
import os
import sys
import uuid

from dotenv import load_dotenv
load_dotenv()  # Load .env before any module reads os.getenv()

from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx"}

base_dir = os.path.dirname(__file__)
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from scraper.job_scraper import fetch_jobs
from scraper.direct_scraper import scrape_direct_company_boards
from job_data.llm_extractor import extract_job_details_with_llm
from matching.embeddings import _get_model

# Pre-load the embedding model at startup to avoid 3-8s cold-start penalty
print("[Init] Pre-loading sentence-transformer embedding model...")
_get_model()
print("[Init] Model loaded successfully.")


# ─────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────
@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "service": "ai-service"})


# ─────────────────────────────────────────────
# 1. Parse Resume
# ─────────────────────────────────────────────
@app.route("/parse", methods=["POST"])
def parse():
    """Upload a PDF/DOCX resume → get structured JSON back."""
    from parser import parse_resume

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"Unsupported file type: {ext}. Use PDF or DOCX."}), 400

    temp_name = f"{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(UPLOAD_FOLDER, temp_name)

    try:
        file.save(temp_path)
        result = parse_resume(temp_path)
        return jsonify({"success": True, "filename": file.filename, "data": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# ─────────────────────────────────────────────
# 2. Generate Embedding
# ─────────────────────────────────────────────
@app.route("/embed", methods=["POST"])
def embed():
    """Takes text, returns a 384-dimensional semantic embedding."""
    from matching import get_embedding

    data = request.json
    if not data or "text" not in data:
        return jsonify({"error": "Missing required field: text"}), 400

    try:
        embedding = get_embedding(data["text"])
        return jsonify({"success": True, "embedding": embedding})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 3. Match Candidate to Job
# ─────────────────────────────────────────────
@app.route("/match", methods=["POST"])
def match_candidate():
    """Takes job + candidate data, returns 7-factor AI match score."""
    from matching import match_candidate_to_job

    data = request.json
    if not data or "job" not in data or "candidate_data" not in data:
        return jsonify({"error": "Missing required fields: job, candidate_data"}), 400

    try:
        match_result = match_candidate_to_job(data["candidate_data"], data["job"])
        return jsonify({"success": True, "match_result": match_result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 4. Recommend Jobs for Candidate
# ─────────────────────────────────────────────
@app.route("/recommend_jobs", methods=["POST"])
def recommend_jobs():
    """Takes candidate data + list of jobs, returns ranked list of jobs."""
    from matching.recommend import recommend_jobs_for_candidate

    data = request.json
    if not data or "candidate_data" not in data or "jobs_list" not in data:
        return jsonify({"error": "Missing required fields: candidate_data, jobs_list"}), 400

    try:
        ranked_jobs = recommend_jobs_for_candidate(data["candidate_data"], data["jobs_list"])
        return jsonify({"success": True, "ranked_jobs": ranked_jobs})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 5. Scrape Jobs — multi-board keyword search
# ─────────────────────────────────────────────
@app.route("/scrape_jobs", methods=["POST"])
def scrape_external_jobs():
    """Takes query or queries, location, page and returns scraped jobs."""
    data = request.json or {}
    query = data.get("query", "")
    queries = data.get("queries", None)
    location = data.get("location", "").strip() or "India"
    page = data.get("page", 1)

    try:
        page = int(page)
    except (TypeError, ValueError):
        page = 1

    page = max(1, page)

    try:
        jobs = fetch_jobs(queries or query, location, page)
        source_breakdown = {}
        for job in jobs:
            source = str(job.get("source") or "external").strip().lower() or "external"
            source_breakdown[source] = source_breakdown.get(source, 0) + 1

        return jsonify({
            "success": True,
            "jobs": jobs,
            "meta": {
                "total": len(jobs),
                "queries": queries or [query],
                "source_breakdown": source_breakdown,
            },
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 6. Scrape Direct — Company ATS Boards
#    Pipeline: Scrape → LLM Extract → Clean JSON
# ─────────────────────────────────────────────
@app.route("/scrape_direct", methods=["POST"])
def scrape_direct():
    """
    Scrape job listings from company career pages / ATS boards,
    then run each through LLM extraction for structured data.

    Request body:
        {
            "urls": ["https://boards.greenhouse.io/discord", ...],
            "extract": true   // optional, default true — run LLM extraction
        }

    Response:
        {
            "success": true,
            "jobs": [
                {
                    "id": "gh-discord-123",
                    "title": "Software Engineer",
                    "company": "Discord",
                    "location": "San Francisco",
                    "apply_link": "https://...",
                    "source": "greenhouse",
                    "postedAt": "2026-04-10",
                    "llm_extracted": {
                        "job_title": "Software Engineer",
                        "salary_min": 150000,
                        "salary_max": 200000,
                        "yoe_required": 3,
                        "visa_sponsorship": false,
                        "technical_skills": ["Python", "React", ...],
                        "remote_status": "Hybrid"
                    }
                },
                ...
            ],
            "total": 50,
            "extracted_count": 50
        }
    """
    data = request.json or {}
    urls = data.get("urls", [])
    run_extraction = data.get("extract", True)

    if not urls:
        return jsonify({"error": "Missing required field: urls (array of ATS board URLs)"}), 400

    if not isinstance(urls, list):
        return jsonify({"error": "urls must be an array of strings"}), 400

    try:
        # Step 1: Scrape all boards
        raw_jobs = scrape_direct_company_boards(urls)

        if not run_extraction:
            return jsonify({
                "success": True,
                "jobs": raw_jobs,
                "total": len(raw_jobs),
                "extracted_count": 0,
            })

        # Step 2: Run LLM extraction on each job's description
        extracted_count = 0
        for job in raw_jobs:
            description_html = job.get("description_html", "")
            if description_html and len(description_html.strip()) > 50:
                llm_data = extract_job_details_with_llm(
                    description_html,
                    original_title=job.get("title", ""),
                )
                job["llm_extracted"] = llm_data
                extracted_count += 1
            else:
                # No description to extract from — provide minimal defaults
                job["llm_extracted"] = {
                    "job_title": job.get("title", "Unknown"),
                    "salary_min": None,
                    "salary_max": None,
                    "yoe_required": 0,
                    "visa_sponsorship": False,
                    "technical_skills": [],
                    "remote_status": "On-site",
                }

            # Remove the raw HTML from the response (it can be huge)
            job.pop("description_html", None)

        return jsonify({
            "success": True,
            "jobs": raw_jobs,
            "total": len(raw_jobs),
            "extracted_count": extracted_count,
        })

    except Exception as e:
        print(f"[/scrape_direct] Error: {e}")
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────────
# 7. LLM Extract — standalone (for testing)
# ─────────────────────────────────────────────
@app.route("/extract_job", methods=["POST"])
def extract_job():
    """
    Standalone LLM extraction endpoint. Send raw HTML or text,
    get structured job details back.

    Request body:
        { "html": "<div>Job description HTML...</div>" }
        or
        { "text": "Job description plain text..." }

    Response:
        {
            "success": true,
            "extracted": {
                "job_title": "...",
                "salary_min": ...,
                ...
            }
        }
    """
    data = request.json or {}
    raw_input = data.get("html") or data.get("text", "")
    title_hint = data.get("title", "")

    if not raw_input:
        return jsonify({"error": "Missing required field: html or text"}), 400

    try:
        result = extract_job_details_with_llm(raw_input, original_title=title_hint)
        return jsonify({"success": True, "extracted": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# -────────────────────────────────────────────
# 7. Gemini Recommendation Insights
# -────────────────────────────────────────────
@app.route("/recommend_insights", methods=["POST"])
def recommend_insights():
    from matching.gemini_insights import generate_recommendation_insights

    data = request.json or {}
    candidate_summary = data.get("candidate_summary", "")
    top_jobs = data.get("top_jobs", [])
    score_range = data.get("score_range", {})

    if not candidate_summary:
        return jsonify({"error": "Missing required field: candidate_summary"}), 400

    try:
        insights = generate_recommendation_insights(candidate_summary, top_jobs, score_range)
        return jsonify({"success": True, "insights": insights})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
