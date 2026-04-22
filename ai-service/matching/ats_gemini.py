import os
import json
import traceback

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

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

def calculate_ats_score(resume_text: str, job_description: str) -> dict:
    """
    Generate an ATS score and insights using Google Gemini.
    """
    if not GEMINI_API_KEY:
        raise Exception("GEMINI_API_KEY is not configured in the environment.")

    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)

        prompt = f"""Evaluate this candidate against the job description.
        
        RESUME:
        {resume_text}
        
        JOB DESCRIPTION:
        {job_description}
        """

        response = model.generate_content(
            [ATS_SYSTEM_PROMPT, prompt],
            generation_config={"temperature": 0.2, "max_output_tokens": 1024},
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
        print(f"[ATS_GEMINI] JSON parse error: {e}")
        print(f"[ATS_GEMINI] Raw Response: {raw_text}")
        raise Exception("Failed to parse Gemini response as JSON")
    except Exception as e:
        print(f"[ATS_GEMINI] Gemini call failed: {e}")
        traceback.print_exc()
        raise Exception(f"Gemini API Error: {str(e)}")
