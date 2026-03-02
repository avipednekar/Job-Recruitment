"""
Enhanced 7-Factor AI Matching Algorithm
========================================
Scores a candidate against a job using these weighted factors:

  1. Semantic Match (30%)  — Cosine similarity of full-profile embeddings
  2. Skills Match   (25%)  — % of required job skills that the candidate has
  3. Project Match  (15%)  — How relevant the candidate's projects are to the job
  4. Experience     (15%)  — Years of experience vs job requirement
  5. Location       (5%)   — City/remote match
  6. Education      (5%)   — Degree-level relevance
  7. Salary         (5%)   — Salary range overlap

Total = 100%
"""

import re
from datetime import datetime
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from matching.embeddings import get_embedding


# ─────────────────────────────────────────────
# 1. SEMANTIC MATCH (30%)
# ─────────────────────────────────────────────
def calculate_semantic_score(job_embedding, candidate_embedding):
    """Cosine similarity between job and candidate embeddings (0-100)."""
    if not job_embedding or not candidate_embedding:
        return 0.0
    job_vec = np.array(job_embedding).reshape(1, -1)
    cand_vec = np.array(candidate_embedding).reshape(1, -1)
    similarity = cosine_similarity(job_vec, cand_vec)[0][0]
    return max(0.0, float(similarity) * 100)


# ─────────────────────────────────────────────
# 2. SKILLS MATCH (25%)
# ─────────────────────────────────────────────
def calculate_skill_score(job_skills, candidate_skills):
    """Percentage of required job skills that the candidate possesses."""
    if not job_skills:
        return 100.0
    if not candidate_skills:
        return 0.0

    job_set = set(s.lower().strip() for s in job_skills)
    cand_set = set(s.lower().strip() for s in candidate_skills)

    matched = job_set.intersection(cand_set)
    return (len(matched) / len(job_set)) * 100.0


# ─────────────────────────────────────────────
# 3. PROJECT RELEVANCE (15%)
# ─────────────────────────────────────────────
def calculate_project_score(job_data, candidate_projects):
    """
    Score based on how relevant the candidate's projects are to the job.
    Uses two sub-scores:
      a) Project-skills overlap: do project descriptions mention required skills?
      b) Semantic similarity: embed all project text and compare to job embedding.
    """
    if not candidate_projects:
        return 0.0

    job_skills = set(s.lower().strip() for s in job_data.get('skills', []))
    job_desc_lower = job_data.get('description', '').lower()

    # Collect all project text and tech/skill mentions
    project_text_parts = []
    project_skill_mentions = 0
    total_possible = max(len(job_skills), 1)

    for proj in candidate_projects:
        name = proj.get('name', '') or ''
        desc = proj.get('description', '') or ''
        highlights = proj.get('highlights', []) or []
        highlight_text = ' '.join(highlights) if isinstance(highlights, list) else str(highlights)

        full_text = f"{name} {desc} {highlight_text}"
        project_text_parts.append(full_text)

        # Check how many job skills are mentioned in this project
        full_lower = full_text.lower()
        for skill in job_skills:
            if skill in full_lower:
                project_skill_mentions += 1

    # Sub-score A: skill overlap (what % of job skills appear in any project)
    skill_overlap_score = min(100.0, (project_skill_mentions / total_possible) * 100)

    # Sub-score B: semantic similarity of all project text vs job embedding
    semantic_score = 0.0
    job_embedding = job_data.get('embedding')
    if job_embedding and project_text_parts:
        combined_project_text = ' '.join(project_text_parts)
        proj_embedding = get_embedding(combined_project_text)
        semantic_score = calculate_semantic_score(job_embedding, proj_embedding)

    # Weighted blend: 60% skill overlap, 40% semantic
    return (skill_overlap_score * 0.6) + (semantic_score * 0.4)


# ─────────────────────────────────────────────
# 4. EXPERIENCE MATCH (15%)
# ─────────────────────────────────────────────
def _parse_date(date_str):
    """Parse a date string into a datetime object. Returns None on failure."""
    date_str = date_str.strip()
    
    # Handle "Present", "Current", "Ongoing"
    if re.match(r'(?i)present|current|ongoing', date_str):
        return datetime.now()

    formats = [
        '%B %Y',       # January 2024
        '%b %Y',       # Jan 2024
        '%b. %Y',      # Jan. 2024
        '%m/%Y',       # 06/2024
        '%m-%Y',       # 06-2024
        '%Y',          # 2024
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    return None


def _calculate_total_years(experience_data):
    """
    Calculate total years of experience from parsed experience entries.
    Uses actual date ranges when available, falls back to counting entries.
    """
    if not experience_data:
        return 0.0

    # Handle both dict format {entries, durations} and list format
    if isinstance(experience_data, dict):
        durations = experience_data.get('durations', [])
        entries = experience_data.get('entries', [])
    elif isinstance(experience_data, list):
        entries = experience_data
        durations = []
    else:
        return 0.0

    total_months = 0.0

    # Method 1: Parse actual date ranges from durations list
    date_range_pattern = re.compile(
        r'(.+?)\s*[-–]\s*(.+)',
        re.IGNORECASE
    )

    parsed_from_durations = False
    for dur_str in durations:
        match = date_range_pattern.match(dur_str)
        if match:
            start = _parse_date(match.group(1))
            end = _parse_date(match.group(2))
            if start and end:
                diff = (end.year - start.year) * 12 + (end.month - start.month)
                total_months += max(diff, 0)
                parsed_from_durations = True

    # Method 2: Parse from individual entry durations
    if not parsed_from_durations:
        for entry in entries:
            dur = entry.get('duration', '')
            if dur:
                match = date_range_pattern.match(dur)
                if match:
                    start = _parse_date(match.group(1))
                    end = _parse_date(match.group(2))
                    if start and end:
                        diff = (end.year - start.year) * 12 + (end.month - start.month)
                        total_months += max(diff, 0)
                        parsed_from_durations = True

    if parsed_from_durations:
        return total_months / 12.0

    # Fallback: count entries as ~1 year each
    return float(len(entries))


def _parse_required_years(text):
    """Extract required years from strings like '5+ years', '3-5 years', 'Senior'."""
    if not text:
        return 0.0
    if isinstance(text, (int, float)):
        return float(text)

    text_str = str(text).lower()

    # Seniority keywords
    seniority_map = {
        'fresher': 0, 'entry': 0, 'junior': 1,
        'mid': 3, 'senior': 5, 'lead': 7, 'staff': 8, 'principal': 10
    }
    for keyword, years in seniority_map.items():
        if keyword in text_str:
            return float(years)

    # Numeric extraction: "3+ years", "3-5 years", "5 years"
    match = re.search(r'(\d+)', text_str)
    if match:
        return float(match.group(1))

    return 0.0


def calculate_experience_score(required_exp, candidate_experience):
    """Score experience: full marks if meets/exceeds, partial credit otherwise."""
    required_years = _parse_required_years(required_exp)
    actual_years = _calculate_total_years(candidate_experience)

    if required_years == 0:
        return 100.0
    if actual_years >= required_years:
        return 100.0

    return min(100.0, (actual_years / required_years) * 100.0)


# ─────────────────────────────────────────────
# 5. LOCATION MATCH (5%)
# ─────────────────────────────────────────────
def calculate_location_score(job_location, candidate_location):
    """Boolean match: remote always matches, else substring city match."""
    if not job_location or not candidate_location:
        return 100.0
    job_loc = job_location.lower().strip()
    cand_loc = candidate_location.lower().strip()

    if 'remote' in job_loc or 'remote' in cand_loc:
        return 100.0
    if job_loc in cand_loc or cand_loc in job_loc:
        return 100.0
    return 0.0


# ─────────────────────────────────────────────
# 6. EDUCATION RELEVANCE (5%)
# ─────────────────────────────────────────────
DEGREE_HIERARCHY = {
    'phd': 5, 'doctorate': 5,
    'master': 4, 'mtech': 4, 'msc': 4, 'ms': 4, 'mba': 4, 'me': 4, 'ma': 4,
    'bachelor': 3, 'btech': 3, 'bsc': 3, 'bs': 3, 'be': 3, 'ba': 3, 'bca': 3, 'bba': 3,
    'diploma': 2,
    'certificate': 1, 'certification': 1,
    'high school': 0, '12th': 0, '10th': 0, 'hsc': 0, 'ssc': 0,
}

# Common tech-related fields
TECH_FIELDS = {
    'computer', 'software', 'information technology', 'it', 'data science',
    'artificial intelligence', 'machine learning', 'electronics',
    'electrical', 'mechanical', 'engineering', 'mathematics', 'statistics',
}


def calculate_education_score(job_data, candidate_education):
    """
    Score based on highest degree level and field relevance.
    """
    if not candidate_education:
        return 50.0  # Neutral if no education data

    # Find highest degree level from candidate education
    max_degree_level = 0
    field_relevant = False

    edu_entries = candidate_education
    if isinstance(candidate_education, dict):
        edu_entries = candidate_education.get('entries', [candidate_education])

    for entry in edu_entries:
        if isinstance(entry, str):
            entry_text = entry.lower()
        elif isinstance(entry, dict):
            entry_text = ' '.join(str(v) for v in entry.values()).lower()
        else:
            continue

        # Check degree level
        for degree_key, level in DEGREE_HIERARCHY.items():
            if degree_key in entry_text:
                max_degree_level = max(max_degree_level, level)

        # Check field relevance
        for field in TECH_FIELDS:
            if field in entry_text:
                field_relevant = True

    # Score: degree level (60%) + field relevance (40%)
    degree_score = min(100.0, (max_degree_level / 3.0) * 100)  # Bachelor = 100%
    field_score = 100.0 if field_relevant else 40.0

    return (degree_score * 0.6) + (field_score * 0.4)


# ─────────────────────────────────────────────
# 7. SALARY MATCH (5%)
# ─────────────────────────────────────────────
def _parse_salary(text):
    """Extract numeric salary values from text. Returns (min, max) or None."""
    if not text:
        return None
    text_str = str(text).lower().replace(',', '').replace('₹', '').replace('$', '')
    
    # Match ranges like "100000-150000", "100k-150k", "10 lpa - 15 lpa"
    range_match = re.search(r'(\d+\.?\d*)\s*[kK]?\s*(?:lpa|lakh|lac)?\s*[-–to]+\s*(\d+\.?\d*)\s*[kK]?\s*(?:lpa|lakh|lac)?', text_str)
    if range_match:
        low = float(range_match.group(1))
        high = float(range_match.group(2))
        # Normalize k/lakh
        if 'k' in text_str.lower():
            low *= 1000
            high *= 1000
        if any(x in text_str for x in ['lpa', 'lakh', 'lac']):
            low *= 100000
            high *= 100000
        return (low, high)

    # Single value
    single_match = re.search(r'(\d+\.?\d*)', text_str)
    if single_match:
        val = float(single_match.group(1))
        if 'k' in text_str:
            val *= 1000
        if any(x in text_str for x in ['lpa', 'lakh', 'lac']):
            val *= 100000
        return (val * 0.8, val * 1.2)  # ±20% range

    return None


def calculate_salary_score(job_salary, candidate_salary):
    """Score based on salary range overlap."""
    job_range = _parse_salary(job_salary)
    cand_range = _parse_salary(candidate_salary)

    if not job_range or not cand_range:
        return 100.0  # No data = assume match

    # Check overlap
    job_low, job_high = job_range
    cand_low, cand_high = cand_range

    # Perfect overlap
    if cand_low <= job_high and cand_high >= job_low:
        return 100.0

    # No overlap — score based on gap
    if cand_low > job_high:
        gap = cand_low - job_high
        return max(0.0, 100 - (gap / job_high * 100))
    else:
        gap = job_low - cand_high
        return max(0.0, 100 - (gap / job_low * 100))


# ─────────────────────────────────────────────
# MAIN: Composite Matching Function
# ─────────────────────────────────────────────
def match_candidate_to_job(candidate_data, job_data):
    """
    Computes the composite match score using the enhanced 7-factor algorithm.

    Weights:
      Semantic   30%  |  Skills    25%  |  Projects  15%
      Experience 15%  |  Location   5%  |  Education  5%  |  Salary  5%
    """

    # ── Gather candidate data ──
    # Skills
    cand_skills_data = candidate_data.get('skills', {})
    if isinstance(cand_skills_data, dict):
        cand_skills = cand_skills_data.get('skills', [])
    else:
        cand_skills = cand_skills_data if isinstance(cand_skills_data, list) else []

    # Projects
    cand_projects = candidate_data.get('projects', [])
    if isinstance(cand_projects, dict):
        cand_projects = cand_projects.get('entries', [])

    # Experience
    cand_experience = candidate_data.get('experience', [])

    # Education
    cand_education = candidate_data.get('education', [])

    # Personal info
    personal_info = candidate_data.get('personal_info', {})

    # ── Build candidate embedding (includes projects now!) ──
    cand_embedding = candidate_data.get('embedding')
    if not cand_embedding:
        summary = candidate_data.get('summary', '') or personal_info.get('summary', '') or ''
        exp_text = str(cand_experience)
        proj_texts = ' '.join(
            f"{p.get('name', '')} {p.get('description', '')} {' '.join(p.get('highlights', []))}"
            for p in cand_projects
        ) if cand_projects else ''
        skills_text = ' '.join(cand_skills)
        full_text = f"{summary} {skills_text} {exp_text} {proj_texts}"
        cand_embedding = get_embedding(full_text)

    # ── Calculate all 7 scores ──
    semantic_score   = calculate_semantic_score(job_data.get('embedding'), cand_embedding)
    skill_score      = calculate_skill_score(job_data.get('skills', []), cand_skills)
    project_score    = calculate_project_score(job_data, cand_projects)
    experience_score = calculate_experience_score(job_data.get('experience_level'), cand_experience)
    location_score   = calculate_location_score(job_data.get('location'), personal_info.get('location', ''))
    education_score  = calculate_education_score(job_data, cand_education)
    salary_score     = calculate_salary_score(job_data.get('salary_range'), candidate_data.get('desired_salary'))

    # ── Composite ──
    total_score = (
        (semantic_score   * 0.30) +
        (skill_score      * 0.25) +
        (project_score    * 0.15) +
        (experience_score * 0.15) +
        (location_score   * 0.05) +
        (education_score  * 0.05) +
        (salary_score     * 0.05)
    )

    return {
        "overall_match_score": round(total_score, 2),
        "breakdown": {
            "semantic_score":   round(semantic_score, 2),
            "skills_score":     round(skill_score, 2),
            "project_score":    round(project_score, 2),
            "experience_score": round(experience_score, 2),
            "location_score":   round(location_score, 2),
            "education_score":  round(education_score, 2),
            "salary_score":     round(salary_score, 2),
        }
    }
