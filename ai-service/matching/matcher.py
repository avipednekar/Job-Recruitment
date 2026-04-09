"""
Enhanced 8-Signal AI Matching Algorithm
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
from sklearn.feature_extraction.text import TfidfVectorizer
from matching.embeddings import get_embedding


SKILL_ALIASES = {
    'node js': 'nodejs',
    'node.js': 'nodejs',
    'react js': 'react',
    'react.js': 'react',
    'next js': 'nextjs',
    'next.js': 'nextjs',
    'vue js': 'vue',
    'vue.js': 'vue',
    'express js': 'express',
    'express.js': 'express',
    'mongo': 'mongodb',
    'postgres': 'postgresql',
    'machine learning': 'ml',
    'artificial intelligence': 'ai',
}

REMOTE_KEYWORDS = ('remote', 'work from home', 'wfh', 'anywhere')
INDIA_STATE_TERMS = {
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
    'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya',
    'mizoram', 'nagaland', 'odisha', 'orissa', 'punjab', 'rajasthan',
    'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh',
    'uttarakhand', 'west bengal', 'andaman and nicobar islands', 'chandigarh',
    'dadra and nagar haveli and daman and diu', 'daman and diu', 'delhi',
    'national capital territory of delhi', 'jammu and kashmir', 'ladakh',
    'lakshadweep', 'puducherry',
}
LOCATION_PREFIX_PATTERN = re.compile(
    r'^(village|vill|post|po|tal|taluka|tehsil|dist|district|near|via)\s+',
    re.IGNORECASE,
)


def _normalize_text(value):
    if value is None:
        return ''
    normalized = re.sub(r'[^a-z0-9#+]+', ' ', str(value).lower())
    return re.sub(r'\s+', ' ', normalized).strip()


def _canonicalize_skill(skill):
    normalized = _normalize_text(skill)
    return SKILL_ALIASES.get(normalized, normalized)


def _skill_variants(skill):
    canonical = _canonicalize_skill(skill)
    compact = canonical.replace(' ', '')
    variants = {canonical, compact}

    if canonical.endswith(' js'):
        variants.add(canonical[:-3].strip())
    if compact.endswith('js') and len(compact) > 2:
        variants.add(compact[:-2])

    return {variant for variant in variants if variant}


def _skills_match(required_skill, candidate_skill):
    required_variants = _skill_variants(required_skill)
    candidate_variants = _skill_variants(candidate_skill)

    if required_variants.intersection(candidate_variants):
        return True

    required_text = _canonicalize_skill(required_skill)
    candidate_text = _canonicalize_skill(candidate_skill)
    required_tokens = set(required_text.split())
    candidate_tokens = set(candidate_text.split())

    if required_tokens and candidate_tokens:
        if required_tokens.issubset(candidate_tokens) or candidate_tokens.issubset(required_tokens):
            return True

    for required_variant in required_variants:
        for candidate_variant in candidate_variants:
            shorter, longer = sorted((required_variant, candidate_variant), key=len)
            if len(shorter) >= 4 and shorter in longer:
                return True

    return False


def _entry_to_text(entry):
    if isinstance(entry, str):
        return entry
    if isinstance(entry, dict):
        parts = []
        for value in entry.values():
            if isinstance(value, list):
                parts.extend(str(item) for item in value if item)
            elif value:
                parts.append(str(value))
        return ' '.join(parts)
    return ''


def _flatten_profile_entries(entries):
    if isinstance(entries, dict):
        entries = entries.get('entries', [])
    if not isinstance(entries, list):
        return ''
    return ' '.join(_entry_to_text(entry) for entry in entries if entry)


def build_candidate_profile_text(candidate_data):
    personal_info = candidate_data.get('personal_info', {}) or {}
    cand_skills_data = candidate_data.get('skills', {})
    cand_projects = candidate_data.get('projects', [])
    cand_experience = candidate_data.get('experience', [])
    cand_education = candidate_data.get('education', [])

    if isinstance(cand_skills_data, dict):
        cand_skills = cand_skills_data.get('skills', [])
    else:
        cand_skills = cand_skills_data if isinstance(cand_skills_data, list) else []

    if isinstance(cand_projects, dict):
        cand_projects = cand_projects.get('entries', [])

    summary = candidate_data.get('summary', '') or personal_info.get('summary', '') or ''
    location_text = personal_info.get('location', '') or ''
    skills_text = ' '.join(str(skill) for skill in cand_skills if skill)
    experience_text = _flatten_profile_entries(cand_experience)
    projects_text = _flatten_profile_entries(cand_projects)
    education_text = _flatten_profile_entries(cand_education)

    return f"{summary} {skills_text} {experience_text} {projects_text} {education_text} {location_text}".strip()


def build_candidate_profile_embedding(candidate_data):
    existing_embedding = candidate_data.get('embedding')
    if existing_embedding:
        return existing_embedding

    full_text = build_candidate_profile_text(candidate_data)

    try:
        return get_embedding(full_text)
    except Exception:
        return [0.0] * 384


def build_job_profile_text(job_data):
    title = job_data.get('title', '') or ''
    company = job_data.get('company', '') or ''
    description = job_data.get('description', '') or ''
    location = job_data.get('location', '') or ''
    experience_level = job_data.get('experience_level', '') or ''
    employment_type = job_data.get('employment_type', '') or ''
    skills = ' '.join(str(skill) for skill in job_data.get('skills', []) if skill)

    return f"{title} {company} {description} {skills} {location} {experience_level} {employment_type}".strip()


def _is_remote_location(location_text):
    normalized = _normalize_text(location_text)
    return any(keyword in normalized for keyword in REMOTE_KEYWORDS)


def _location_variants(location_text):
    if not location_text:
        return set()

    raw = str(location_text).replace('|', ',')
    parts = re.split(r'[,/;()]', raw)
    variants = set()

    normalized_full = _normalize_text(raw)
    if normalized_full:
        variants.add(normalized_full)

    for part in parts:
        cleaned_part = LOCATION_PREFIX_PATTERN.sub('', str(part).strip())
        normalized_part = _normalize_text(cleaned_part)
        if normalized_part:
            variants.add(normalized_part)

    return variants


def _partition_location_terms(variants):
    locality_terms = set()
    broader_terms = set()

    for variant in variants:
        if variant == 'remote':
            continue
        if variant in INDIA_STATE_TERMS:
            broader_terms.add(variant)
        else:
            locality_terms.add(variant)

    return locality_terms, broader_terms


def _location_sets_overlap(left_terms, right_terms):
    for left_term in left_terms:
        for right_term in right_terms:
            if left_term == right_term:
                return True
            if left_term in right_term or right_term in left_term:
                return True
    return False


def _extract_location_snippets(text):
    if not text:
        return set()

    snippets = set()
    lowered = str(text).lower()
    if _is_remote_location(lowered):
        snippets.add('remote')

    for match in re.findall(r'([A-Za-z][A-Za-z .-]+,\s*[A-Za-z][A-Za-z .-]+)', str(text)):
        snippets.add(match.strip())

    return snippets


def _collect_candidate_locations(candidate_location, candidate_projects=None, candidate_experience=None):
    collected = []

    if candidate_location:
        collected.append(candidate_location)

    for entries in (candidate_projects or [], candidate_experience or []):
        if isinstance(entries, dict):
            entries = entries.get('entries', [])

        for entry in entries or []:
            if isinstance(entry, dict):
                for field in ('location', 'company', 'description'):
                    value = entry.get(field)
                    if value:
                        collected.append(value)
            elif isinstance(entry, str):
                collected.append(entry)

    variants = set()
    for item in collected:
        variants.update(_location_variants(item))
        for snippet in _extract_location_snippets(item):
            variants.update(_location_variants(snippet))

    return variants


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


def calculate_tfidf_score(job_text, candidate_text):
    """Lexical similarity between job and candidate texts using TF-IDF (0-100)."""
    if not job_text or not candidate_text:
        return 0.0

    try:
        vectorizer = TfidfVectorizer(
            stop_words='english',
            lowercase=True,
            ngram_range=(1, 2),
            max_features=5000,
        )
        tfidf_matrix = vectorizer.fit_transform([job_text, candidate_text])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return max(0.0, float(similarity) * 100)
    except ValueError:
        return 0.0


# ─────────────────────────────────────────────
# 3. SKILLS MATCH (25%)
# ─────────────────────────────────────────────
def calculate_skill_score(job_skills, candidate_skills):
    """Percentage of required job skills that the candidate possesses."""
    if not job_skills:
        return 100.0
    if not candidate_skills:
        return 0.0

    matched = 0
    for job_skill in job_skills:
        if any(_skills_match(job_skill, candidate_skill) for candidate_skill in candidate_skills):
            matched += 1

    return (matched / len(job_skills)) * 100.0


# ─────────────────────────────────────────────
# 4. PROJECT RELEVANCE (15%)
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

    job_skills = {_canonicalize_skill(skill) for skill in job_data.get('skills', []) if skill}

    # Collect all project text and tech/skill mentions
    project_text_parts = []
    matched_project_skills = set()
    total_possible = max(len(job_skills), 1)

    for proj in candidate_projects:
        if isinstance(proj, str):
            name = proj
            desc = ''
            highlights = []
        else:
            name = proj.get('name', '') or proj.get('title', '') or ''
            desc = proj.get('description', '') or ''
            highlights = proj.get('highlights', []) or []

        highlight_text = ' '.join(highlights) if isinstance(highlights, list) else str(highlights)

        full_text = f"{name} {desc} {highlight_text}"
        project_text_parts.append(full_text)

        # Check how many job skills are mentioned in this project
        project_skills_in_text = {_canonicalize_skill(skill) for skill in re.split(r'[,/|]', full_text) if skill}
        for skill in job_skills:
            if any(_skills_match(skill, project_skill) for project_skill in project_skills_in_text):
                matched_project_skills.add(skill)
                continue

            full_lower = _canonicalize_skill(full_text)
            skill_tokens = set(skill.split())
            if skill in full_lower or (skill_tokens and skill_tokens.issubset(set(full_lower.split()))):
                matched_project_skills.add(skill)

    # Sub-score A: skill overlap (what % of job skills appear in any project)
    skill_overlap_score = min(100.0, (len(matched_project_skills) / total_possible) * 100)

    # Sub-score B: semantic similarity of all project text vs job embedding
    semantic_score = 0.0
    job_embedding = job_data.get('embedding')
    if job_embedding and project_text_parts:
        combined_project_text = ' '.join(project_text_parts)
        try:
            proj_embedding = get_embedding(combined_project_text)
            semantic_score = calculate_semantic_score(job_embedding, proj_embedding)
        except Exception:
            semantic_score = 0.0

    # Weighted blend: 60% skill overlap, 40% semantic
    return (skill_overlap_score * 0.6) + (semantic_score * 0.4)


# ─────────────────────────────────────────────
# 5. EXPERIENCE MATCH (15%)
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
            if isinstance(entry, dict):
                dur = entry.get('duration', '')
            else:
                dur = ''
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
# 6. LOCATION MATCH (5%)
# ─────────────────────────────────────────────
def calculate_location_score(job_location, candidate_location, candidate_projects=None, candidate_experience=None):
    """
    Score location fit using preferred location plus any location hints from
    project/experience data. Missing location no longer receives full credit.
    """
    if _is_remote_location(job_location):
        return 100.0

    candidate_variants = _collect_candidate_locations(
        candidate_location,
        candidate_projects=candidate_projects,
        candidate_experience=candidate_experience,
    )
    job_variants = _location_variants(job_location)
    explicit_remote_preference = _is_remote_location(candidate_location)

    if not job_variants and not candidate_variants:
        return 50.0
    if not job_variants:
        return 60.0
    if explicit_remote_preference:
        return 25.0

    candidate_variants = {variant for variant in candidate_variants if variant != 'remote'}
    if not candidate_variants:
        return 40.0

    candidate_locality, candidate_broader = _partition_location_terms(candidate_variants)
    job_locality, job_broader = _partition_location_terms(job_variants)

    if _location_sets_overlap(job_locality, candidate_locality):
        return 100.0

    if not candidate_locality and _location_sets_overlap(job_broader, candidate_broader):
        return 70.0

    if _location_sets_overlap(job_broader, candidate_broader):
        return 35.0

    for job_variant in job_variants:
        for candidate_variant in candidate_variants:
            if job_variant == candidate_variant:
                return 100.0
            if job_variant in candidate_variant or candidate_variant in job_variant:
                return 90.0

            job_tokens = set(job_variant.split())
            candidate_tokens = set(candidate_variant.split())
            if job_tokens and candidate_tokens and len(job_tokens.intersection(candidate_tokens)) >= 1:
                return 75.0

    return 0.0


# ─────────────────────────────────────────────
# 7. EDUCATION RELEVANCE (5%)
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
# 8. SALARY MATCH (5%)
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
    Computes the composite match score using the enhanced 8-signal algorithm.

    Weights:
      Semantic   22%  |  TF-IDF     8%  |  Skills    25%  |  Projects  15%
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
    cand_embedding = build_candidate_profile_embedding(candidate_data)

    # ── Calculate all 8 scores ──
    candidate_text = build_candidate_profile_text(candidate_data)
    job_text = build_job_profile_text(job_data)

    semantic_score   = calculate_semantic_score(job_data.get('embedding'), cand_embedding)
    tfidf_score      = calculate_tfidf_score(job_text, candidate_text)
    skill_score      = calculate_skill_score(job_data.get('skills', []), cand_skills)
    project_score    = calculate_project_score(job_data, cand_projects)
    experience_score = calculate_experience_score(job_data.get('experience_level'), cand_experience)
    location_score   = calculate_location_score(
        job_data.get('location'),
        personal_info.get('location', ''),
        candidate_projects=cand_projects,
        candidate_experience=cand_experience,
    )
    education_score  = calculate_education_score(job_data, cand_education)
    salary_score     = calculate_salary_score(job_data.get('salary_range'), candidate_data.get('desired_salary'))

    # ── Composite ──
    total_score = (
        (semantic_score   * 0.22) +
        (tfidf_score      * 0.08) +
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
            "tfidf_score":      round(tfidf_score, 2),
            "skills_score":     round(skill_score, 2),
            "project_score":    round(project_score, 2),
            "experience_score": round(experience_score, 2),
            "location_score":   round(location_score, 2),
            "education_score":  round(education_score, 2),
            "salary_score":     round(salary_score, 2),
        }
    }
