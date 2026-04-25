import os
import json
import traceback

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODELS_ENV = os.getenv("GEMINI_MODELS", "gemini-3-flash-preview,gemini-3.1-flash-lite-preview")
GEMINI_MODELS = [m.strip() for m in GEMINI_MODELS_ENV.split(",") if m.strip()]

ATS_SYSTEM_PROMPT = """You are an expert Application Tracking System (ATS) with deep understanding of the tech industry, software engineering, and data science. 
Your task is to meticulously evaluate the provided resume against the given job description.
The job market is highly competitive, so be extremely accurate, strict, and constructive.

Return ONLY valid JSON with this exact structure:
{
  "job_title": "Title of the job",
  "required_experience": "Required years of experience",
  "overall_match_score": <number 0-100>,
  "breakdown": {
    "skills_score": <number 0-100>,
    "experience_score": <number 0-100>,
    "semantic_score": <number 0-100>,
    "project_score": <number 0-100>
  },
  "missing_skills": [
    "keyword 1", "keyword 2"
  ],
  "match_reasons": [
    "Short sentence explaining why experience matches or lacks.",
    "Short sentence explaining skill alignment.",
    "Short sentence giving a key resume improvement tip."
  ],
  "profile_summary": "A 2-sentence summary of the candidate's fit for this role."
}

Rules:
- DO NOT wrap the output in markdown code blocks like ```json ... ```. Just return the raw JSON string.
- The missing_skills array MUST contain actual important skills required by the job but missing in the resume.
- Match reasons should be actionable and concise.
"""

def fallback_heuristic_score(resume_text: str, job_description: str) -> dict:
    """Fallback method using local matcher if Gemini fails."""
    try:
        from matching.matcher import match_candidate_to_job, _parse_required_years
        candidate_data = json.loads(resume_text)
        
        # Compute local embedding for job
        job_embedding = [0.0] * 384
        try:
            from matching.embeddings import get_embedding
            job_embedding = get_embedding(job_description)
        except Exception:
            pass

        # Construct simple job data for matcher
        job_data = {
            "title": "Target Role",
            "description": job_description,
            "skills": [],  # Hard to extract accurately without LLM
            "experience_level": str(_parse_required_years(job_description)),
            "embedding": job_embedding
        }
        
        match_result = match_candidate_to_job(candidate_data, job_data)
        breakdown = match_result.get("breakdown", {})
        
        # Find missing skills using simple string match from candidate skills
        cand_skills = candidate_data.get("skills", [])
        if isinstance(cand_skills, dict):
            cand_skills = cand_skills.get("skills", [])
            
        return {
            "job_title": "Target Role (Fallback)",
            "required_experience": "Not specified",
            "overall_match_score": match_result.get("overall_match_score", 0.0),
            "breakdown": {
                "skills_score": breakdown.get("skills_score", 0.0),
                "experience_score": breakdown.get("experience_score", 0.0),
                "semantic_score": breakdown.get("semantic_score", 0.0),
                "project_score": breakdown.get("project_score", 0.0),
            },
            "missing_skills": [],
            "match_reasons": [
                "Scored using local fallback heuristic engine (Gemini quota exceeded).",
                f"Semantic similarity: {breakdown.get('semantic_score', 0.0)}%",
                f"Experience match: {breakdown.get('experience_score', 0.0)}%"
            ],
            "profile_summary": "Analyzed locally due to API rate limits. Summary generation unavailable."
        }
    except Exception as fallback_err:
        print(f"[ATS_GEMINI] Fallback failed: {fallback_err}")
        raise

def calculate_ats_score(resume_text: str, job_description: str) -> dict:
    """
    Generate an ATS score and insights using Google Gemini, with a local heuristic fallback.
    """
    if not GEMINI_API_KEY:
        print("[ATS_GEMINI] No GEMINI_API_KEY. Using local fallback.")
        return fallback_heuristic_score(resume_text, job_description)

    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=GEMINI_API_KEY)

        prompt = f"""Evaluate this candidate against the job description.
        
        RESUME:
        {resume_text}
        
        JOB DESCRIPTION:
        {job_description}
        """

        last_error = None
        for model_name in GEMINI_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[ATS_SYSTEM_PROMPT, prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.2, 
                        max_output_tokens=4096,
                        response_mime_type="application/json"
                    ),
                )

                raw_text = response.text.strip()
                # Strip markdown code fences if present
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("\n", 1)[-1]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3].strip()

                result = json.loads(raw_text)

                # Validate structure
                return {
                    "job_title": result.get("job_title", ""),
                    "required_experience": result.get("required_experience", ""),
                    "overall_match_score": float(result.get("overall_match_score", 0)),
                    "breakdown": {
                        "skills_score": float(result.get("breakdown", {}).get("skills_score", 0)),
                        "experience_score": float(result.get("breakdown", {}).get("experience_score", 0)),
                        "semantic_score": float(result.get("breakdown", {}).get("semantic_score", 0)),
                        "project_score": float(result.get("breakdown", {}).get("project_score", 0)),
                    },
                    "missing_skills": result.get("missing_skills", []),
                    "match_reasons": result.get("match_reasons", []),
                    "profile_summary": result.get("profile_summary", "")
                }
            except json.JSONDecodeError as e:
                print(f"[ATS_GEMINI] JSON parse error with {model_name}: {e}")
                last_error = e
            except Exception as e:
                print(f"[ATS_GEMINI] Gemini call failed with {model_name}: {e}")
                last_error = e

        print("[ATS_GEMINI] All Gemini models failed. Falling back to local heuristic.")
        return fallback_heuristic_score(resume_text, job_description)

    except Exception as e:
        print(f"[ATS_GEMINI] Critical error: {e}")
        print("[ATS_GEMINI] Falling back to local heuristic.")
        return fallback_heuristic_score(resume_text, job_description)
