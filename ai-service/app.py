"""
AI Service — Flask Microservice
================================
Pure AI endpoints for the Smart Recruitment Platform.
No database access — all DB operations go through the Node.js backend.

Endpoints:
    GET  /        Health check
    POST /parse   Parse resume PDF/DOCX → structured JSON
    POST /embed   Generate 384-dim semantic embedding from text
    POST /match   Match candidate to job → 7-factor AI score
"""
import os
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

from parser import parse_resume
from matching import get_embedding, match_candidate_to_job

app = Flask(__name__)
CORS(app)

app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10 MB

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx"}


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
    data = request.json
    if not data or "job" not in data or "candidate_data" not in data:
        return jsonify({"error": "Missing required fields: job, candidate_data"}), 400

    try:
        match_result = match_candidate_to_job(data["candidate_data"], data["job"])
        return jsonify({"success": True, "match_result": match_result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
