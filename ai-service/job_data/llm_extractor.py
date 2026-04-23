"""
LLM-powered job detail extraction from raw HTML / job descriptions.

Uses Google's Gemini API (gemini-2.0-flash) to extract structured job data
from raw HTML or plain-text job descriptions. Falls back to regex-based
heuristic extraction if the LLM is unavailable or fails.

Required env vars:
    GEMINI_API_KEY   — Google AI Studio API key

Usage:
    from job_data.llm_extractor import extract_job_details_with_llm

    result = extract_job_details_with_llm(raw_html_or_text)
    # Returns: {
    #   "job_title": str,
    #   "salary_min": int | None,
    #   "salary_max": int | None,
    #   "yoe_required": int,
    #   "visa_sponsorship": bool,
    #   "technical_skills": [str],
    #   "remote_status": "Remote" | "Hybrid" | "On-site"
    # }
"""

import json
import os
import re
import traceback

from bs4 import BeautifulSoup

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODELS_ENV = os.getenv("GEMINI_MODELS", "gemini-2.5-flash,gemini-3-flash-preview,gemini-3.1-flash-lite-preview")
GEMINI_MODELS = [m.strip() for m in GEMINI_MODELS_ENV.split(",") if m.strip()]

# Maximum characters of text to send to the LLM (cost control)
MAX_INPUT_CHARS = 12_000

# The strict JSON schema the LLM must output
EXTRACTION_SCHEMA = {
    "job_title": "string — the exact job title",
    "salary_min": "number or null — minimum annual salary (in local currency, not monthly)",
    "salary_max": "number or null — maximum annual salary (in local currency, not monthly)",
    "yoe_required": "number — minimum years of experience required (0 if not specified)",
    "visa_sponsorship": "boolean — true if visa/work-permit sponsorship is mentioned",
    "technical_skills": "array of strings — specific technologies, tools, frameworks, languages",
    "remote_status": 'string — one of: "Remote", "Hybrid", "On-site"',
}

SYSTEM_PROMPT = """You are a job posting data extractor. Given raw HTML or text from a job posting, extract structured data into the exact JSON format below. Output ONLY valid JSON — no markdown, no explanation, no code fences.

Required output schema:
{
  "job_title": "<exact job title>",
  "salary_min": <number or null>,
  "salary_max": <number or null>,
  "yoe_required": <integer, 0 if not specified>,
  "visa_sponsorship": <true or false>,
  "technical_skills": ["skill1", "skill2", ...],
  "remote_status": "<Remote|Hybrid|On-site>"
}

Rules:
1. salary_min and salary_max should be ANNUAL figures. If monthly salary is given, multiply by 12. If salary is not mentioned, use null for both.
2. If salary is given as a range like "10-15 LPA", convert to numbers: salary_min=1000000, salary_max=1500000.
3. For "X+ years" or "X-Y years", use the minimum number for yoe_required.
4. technical_skills should only include specific technologies, tools, and frameworks — NOT soft skills like "communication" or "teamwork".
5. remote_status: use "Remote" if fully remote, "Hybrid" if mix of remote and office, "On-site" if fully in-office or not specified.
6. visa_sponsorship: true only if the posting explicitly mentions visa sponsorship, H1B, work permit, or relocation assistance.
7. Output ONLY the JSON object. No other text."""


# ─────────────────────────────────────────────
# HTML → clean text
# ─────────────────────────────────────────────

def _html_to_text(raw_html: str) -> str:
    """Strip HTML tags and collapse whitespace."""
    if not raw_html or not raw_html.strip():
        return ""

    # If it looks like HTML, parse it
    if "<" in raw_html and ">" in raw_html:
        soup = BeautifulSoup(raw_html, "html.parser")

        # Remove script/style tags
        for tag in soup(["script", "style", "nav", "header", "footer"]):
            tag.decompose()

        text = soup.get_text(separator="\n", strip=True)
    else:
        text = raw_html

    # Collapse excessive whitespace
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r" {2,}", " ", text)
    return text.strip()


# ─────────────────────────────────────────────
# LLM extraction via Gemini
# ─────────────────────────────────────────────

def _call_gemini(clean_text: str) -> dict | None:
    """Call Gemini API and return parsed JSON, or None on failure."""
    if not GEMINI_API_KEY:
        print("[LLM_EXTRACTOR] No GEMINI_API_KEY set — skipping LLM extraction")
        return None

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)

        # Truncate input to control costs
        truncated = clean_text[:MAX_INPUT_CHARS]
        if len(clean_text) > MAX_INPUT_CHARS:
            truncated += "\n\n[... truncated for brevity ...]"

        prompt = f"{SYSTEM_PROMPT}\n\n--- JOB POSTING ---\n{truncated}"

        print(f"[LLM_EXTRACTOR] Sending {len(truncated)} chars to Gemini...")

        last_error = None
        for model_name in GEMINI_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        max_output_tokens=1024,
                        response_mime_type="application/json"
                    ),
                )

                raw_output = response.text.strip()
                print(f"[LLM_EXTRACTOR] Raw LLM response from {model_name} ({len(raw_output)} chars): {raw_output[:200]}...")

                # Strip markdown code fences if the LLM added them despite instructions
                if raw_output.startswith("```"):
                    raw_output = re.sub(r"^```(?:json)?\s*", "", raw_output)
                    raw_output = re.sub(r"\s*```$", "", raw_output)

                parsed = json.loads(raw_output)
                return _validate_and_normalize(parsed)
            
            except json.JSONDecodeError as e:
                print(f"[LLM_EXTRACTOR] Failed to parse LLM output as JSON from {model_name}: {e}")
                last_error = e
            except Exception as e:
                print(f"[LLM_EXTRACTOR] Gemini API call failed with {model_name}: {e}")
                last_error = e

        print("[LLM_EXTRACTOR] All Gemini models failed. Returning None.")
        return None

    except ImportError:
        print("[LLM_EXTRACTOR] google-genai package not installed — run: pip install google-genai")
        return None
    except Exception as e:
        print(f"[LLM_EXTRACTOR] Critical error: {e}")
        traceback.print_exc()
        return None


def _validate_and_normalize(data: dict) -> dict:
    """Ensure the LLM output conforms to our expected schema."""
    result = {
        "job_title": str(data.get("job_title", "")).strip() or "Unknown",
        "salary_min": _safe_number(data.get("salary_min")),
        "salary_max": _safe_number(data.get("salary_max")),
        "yoe_required": max(0, int(data.get("yoe_required", 0) or 0)),
        "visa_sponsorship": bool(data.get("visa_sponsorship", False)),
        "technical_skills": _safe_string_list(data.get("technical_skills", [])),
        "remote_status": _safe_remote_status(data.get("remote_status", "On-site")),
    }

    # Sanity check: salary_min should be <= salary_max
    if result["salary_min"] is not None and result["salary_max"] is not None:
        if result["salary_min"] > result["salary_max"]:
            result["salary_min"], result["salary_max"] = result["salary_max"], result["salary_min"]

    return result


def _safe_number(value) -> int | None:
    """Convert to int or return None."""
    if value is None:
        return None
    try:
        num = int(float(value))
        return num if num > 0 else None
    except (TypeError, ValueError):
        return None


def _safe_string_list(value) -> list[str]:
    """Ensure we have a list of non-empty strings."""
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if item and str(item).strip()]


def _safe_remote_status(value) -> str:
    """Normalize remote status to one of three valid values."""
    valid = {"Remote", "Hybrid", "On-site"}
    text = str(value).strip().title()

    # Handle common variations
    if text in valid:
        return text
    if "remote" in text.lower():
        return "Remote"
    if "hybrid" in text.lower():
        return "Hybrid"
    return "On-site"


# ─────────────────────────────────────────────
# Regex fallback extractor
# ─────────────────────────────────────────────

def _regex_fallback(clean_text: str, original_title: str = "") -> dict:
    """
    Best-effort extraction using regex patterns.
    Used when LLM is unavailable or fails.
    """
    print("[LLM_EXTRACTOR] Using regex fallback extraction")
    text_lower = clean_text.lower()

    # Title
    title = original_title.strip() if original_title else "Unknown"

    # Salary — look for patterns like "10-15 LPA", "₹50,000 - ₹80,000", "$120k-$150k"
    salary_min, salary_max = None, None
    salary_patterns = [
        r"(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?|lac)",
        r"(?:₹|inr|rs\.?)\s*(\d[\d,]*)\s*(?:-|to)\s*(?:₹|inr|rs\.?)?\s*(\d[\d,]*)",
        r"\$\s*(\d[\d,]*(?:k)?)\s*(?:-|to)\s*\$?\s*(\d[\d,]*(?:k)?)",
    ]
    for pattern in salary_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                min_raw, max_raw = match.group(1), match.group(2)
                min_val = float(min_raw.replace(",", "").replace("k", "000"))
                max_val = float(max_raw.replace(",", "").replace("k", "000"))
                # If LPA, multiply by 100,000
                if "lpa" in match.group(0).lower() or "lakh" in match.group(0).lower():
                    min_val *= 100_000
                    max_val *= 100_000
                salary_min = int(min_val)
                salary_max = int(max_val)
            except (ValueError, TypeError):
                pass
            break

    # YOE — look for "X+ years", "X-Y years experience"
    yoe = 0
    yoe_match = re.search(r"(\d+)\s*(?:\+|plus)?\s*(?:-|to)?\s*\d*\s*years?\b", text_lower)
    if yoe_match:
        yoe = int(yoe_match.group(1))

    # Visa
    visa = bool(re.search(r"\b(?:visa\s*sponsor|h1b|work\s*permit|relocation\s*(?:assist|support))\b", text_lower))

    # Remote
    remote_status = "On-site"
    if re.search(r"\b(?:fully\s+)?remote\b", text_lower) and not re.search(r"\bnot\s+remote\b", text_lower):
        remote_status = "Remote"
    elif re.search(r"\bhybrid\b", text_lower):
        remote_status = "Hybrid"

    # Skills — match known tech keywords
    known_skills = [
        "Python", "Java", "JavaScript", "TypeScript", "React", "Angular", "Vue",
        "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring", "Spring Boot",
        "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
        "SQL", "PostgreSQL", "MongoDB", "Redis", "MySQL", "Elasticsearch",
        "GraphQL", "REST", "gRPC", "Kafka", "RabbitMQ",
        "Git", "CI/CD", "Jenkins", "GitHub Actions",
        "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning", "NLP",
        "Figma", "Tailwind", "CSS", "HTML", "SASS",
        "Go", "Rust", "Kotlin", "Swift", "C++", "C#", ".NET",
        "Spark", "Hadoop", "Airflow", "dbt", "Snowflake", "Databricks",
        "Linux", "Nginx", "Apache",
    ]
    found_skills = []
    for skill in known_skills:
        # Case-insensitive whole-word match
        if re.search(rf"\b{re.escape(skill)}\b", clean_text, re.IGNORECASE):
            found_skills.append(skill)

    return {
        "job_title": title,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "yoe_required": yoe,
        "visa_sponsorship": visa,
        "technical_skills": found_skills[:20],
        "remote_status": remote_status,
    }


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────

def extract_job_details_with_llm(raw_html: str, original_title: str = "") -> dict:
    """
    Extract structured job details from raw HTML or plain text.

    Tries LLM extraction first (Gemini). Falls back to regex if LLM
    is unavailable, returns bad JSON, or the API key is not set.

    Args:
        raw_html: Raw HTML string or plain-text job description.
        original_title: Optional pre-known job title (used in regex fallback).

    Returns:
        Dict with keys: job_title, salary_min, salary_max, yoe_required,
        visa_sponsorship, technical_skills, remote_status.
    """
    clean_text = _html_to_text(raw_html)

    if not clean_text:
        print("[LLM_EXTRACTOR] Empty input — returning defaults")
        return {
            "job_title": original_title or "Unknown",
            "salary_min": None,
            "salary_max": None,
            "yoe_required": 0,
            "visa_sponsorship": False,
            "technical_skills": [],
            "remote_status": "On-site",
        }

    # Try LLM first
    llm_result = _call_gemini(clean_text)
    if llm_result is not None:
        print(f"[LLM_EXTRACTOR] LLM extraction successful — title: {llm_result['job_title']}, "
              f"skills: {len(llm_result['technical_skills'])}, yoe: {llm_result['yoe_required']}")
        return llm_result

    # Fallback to regex
    fallback_result = _regex_fallback(clean_text, original_title)
    print(f"[LLM_EXTRACTOR] Regex fallback — title: {fallback_result['job_title']}, "
          f"skills: {len(fallback_result['technical_skills'])}, yoe: {fallback_result['yoe_required']}")
    return fallback_result
