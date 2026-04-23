"""
Gemini-Powered Recommendation Insights
========================================
Uses Google Gemini to generate human-readable insights for job recommendations:
- Per-job match reasons
- Gap analysis for low-match jobs
- Profile improvement tips

Requires: GEMINI_API_KEY in .env
"""
import os
import json
import traceback

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODELS_ENV = os.getenv("GEMINI_MODELS", "gemini-2.5-flash,gemini-3-flash-preview,gemini-3.1-flash-lite-preview")
GEMINI_MODELS = [m.strip() for m in GEMINI_MODELS_ENV.split(",") if m.strip()]

INSIGHTS_SYSTEM_PROMPT = """You are a career advisor AI. Given a candidate's profile summary and a list of job matches with scores, generate actionable insights.

Return ONLY valid JSON with this exact structure:
{
  "match_reasons": {
    "<job_title_1>": "1-2 sentence explanation of why this job matches the candidate",
    "<job_title_2>": "..."
  },
  "gap_analysis": "2-3 sentences explaining what skills/experience gaps are causing lower match scores",
  "profile_tips": [
    "Actionable tip 1 to improve match rate",
    "Actionable tip 2",
    "Actionable tip 3"
  ]
}

Rules:
- Be specific about skills, not generic ("Add Docker" not "improve your skills")
- Reference actual job titles and candidate skills
- Keep each match_reason under 30 words
- Limit to 3-4 profile_tips
- gap_analysis should mention specific missing skills or experience gaps
"""


def generate_recommendation_insights(candidate_summary: str, top_jobs: list, score_range: dict) -> dict:
    """
    Generate Gemini-powered insights for job recommendations.
    
    Args:
        candidate_summary: Text summary of candidate's profile (skills, experience, etc.)
        top_jobs: List of dicts with {title, company, match_score, skills}
        score_range: Dict with {highest, lowest, average} scores
    
    Returns:
        Dict with match_reasons, gap_analysis, profile_tips
    """
    if not GEMINI_API_KEY:
        print("[GEMINI_INSIGHTS] No GEMINI_API_KEY — returning fallback insights")
        return _fallback_insights(top_jobs, score_range)

    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=GEMINI_API_KEY)

        # Build the prompt
        jobs_text = "\n".join([
            f"- {j.get('title', 'Unknown')} at {j.get('company', 'Unknown')} "
            f"(match: {j.get('match_score', 0)}%, skills: {', '.join(j.get('skills', [])[:5])})"
            for j in top_jobs[:8]
        ])

        prompt = f"""Candidate Profile:
{candidate_summary}

Top Job Matches (sorted by match score):
{jobs_text}

Score Range: Highest={score_range.get('highest', 0)}%, Lowest={score_range.get('lowest', 0)}%, Average={score_range.get('average', 0)}%

Generate insights for this candidate."""

        last_error = None
        for model_name in GEMINI_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[INSIGHTS_SYSTEM_PROMPT, prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.4,
                        max_output_tokens=2048,
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
                    "match_reasons": result.get("match_reasons", {}),
                    "gap_analysis": result.get("gap_analysis", ""),
                    "profile_tips": result.get("profile_tips", [])[:4],
                }
            except json.JSONDecodeError as e:
                print(f"[GEMINI_INSIGHTS] JSON parse error with {model_name}: {e}")
                last_error = e
            except Exception as e:
                print(f"[GEMINI_INSIGHTS] Gemini call failed with {model_name}: {e}")
                last_error = e

        print("[GEMINI_INSIGHTS] All Gemini models failed. Falling back.")
        return _fallback_insights(top_jobs, score_range)

    except Exception as e:
        print(f"[GEMINI_INSIGHTS] Critical error: {e}")
        traceback.print_exc()
        return _fallback_insights(top_jobs, score_range)


def _fallback_insights(top_jobs: list, score_range: dict) -> dict:
    """Generate basic insights without Gemini when the API is unavailable."""
    match_reasons = {}
    for job in top_jobs[:5]:
        skills = job.get("skills", [])[:3]
        score = job.get("match_score", 0)
        if score >= 60:
            reason = f"Strong skill alignment with {', '.join(skills)}" if skills else "Good overall profile fit"
        elif score >= 35:
            reason = f"Partial skill match with {', '.join(skills)}" if skills else "Some relevant experience"
        else:
            reason = "Explore to broaden your opportunities"
        match_reasons[job.get("title", "Unknown")] = reason

    avg = score_range.get("average", 0)
    if avg >= 60:
        gap = "Your profile is well-aligned with available roles. Focus on specific skill gaps to reach 80%+ matches."
    elif avg >= 35:
        gap = "Most roles partially match your profile. Adding in-demand skills could significantly improve your match rate."
    else:
        gap = "Your profile may need more relevant skills or experience for current openings. Consider updating your resume."

    tips = [
        "Keep your resume skills section up to date",
        "Add specific technologies and frameworks you've used",
        "Include project descriptions that mention tech stacks",
    ]

    return {
        "match_reasons": match_reasons,
        "gap_analysis": gap,
        "profile_tips": tips,
    }
