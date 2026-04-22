from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from matching.matcher import (
    calculate_semantic_score,
    calculate_tfidf_score,
    calculate_skill_score,
    calculate_project_score,
    calculate_experience_score,
    extract_candidate_years,
    extract_required_years,
    calculate_location_score,
    calculate_education_score,
    calculate_salary_score,
    build_candidate_profile_text,
    build_candidate_profile_embedding,
    build_job_profile_text,
)

def recommend_jobs_for_candidate(candidate_data, jobs_list):
    """
    Given a candidate profile and a list of jobs, return a ranked list of jobs.
    Recommendations prioritize concrete fit signals:
    skills, project relevance, and location are weighted above generic
    semantic similarity so clearly unrelated jobs fall lower in the ranking.
    """
    
    # ── Pre-extract candidate data so we don't do it per-job ──
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
    
    candidate_text = build_candidate_profile_text(candidate_data)
    cand_embedding = build_candidate_profile_embedding(candidate_data)
    cand_salary = candidate_data.get('desired_salary', None)

    # ── BATCH TF-IDF (Optimization: Calculate for all jobs at once) ──
    job_texts = [build_job_profile_text(job) for job in jobs_list]
    tfidf_scores = [0.0] * len(jobs_list)

    if candidate_text and any(job_texts):
        try:
            vectorizer = TfidfVectorizer(
                stop_words='english',
                lowercase=True,
                ngram_range=(1, 2),
                max_features=5000,
            )
            # Combine candidate + jobs for vocabulary
            tfidf_matrix = vectorizer.fit_transform([candidate_text] + job_texts)
            # Matrix: row 0 is candidate, rows 1..N are jobs
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])[0]
            tfidf_scores = [max(0.0, float(sim) * 100) for sim in similarities]
        except Exception:
            pass

    results = []

    for i, job in enumerate(jobs_list):
        # ── STEP 1: Check experience fit FIRST (gating signal) ──
        experience_score = calculate_experience_score(job.get('experience_level'), cand_experience)
        candidate_years = extract_candidate_years(cand_experience)
        required_years = extract_required_years(job.get('experience_level'))

        # Hard gate: if experience is a clear mismatch, skip expensive scoring
        experience_gap = required_years - candidate_years if required_years > 0 else 0
        if required_years > 0 and experience_score == 0:
            # Complete mismatch — don't waste compute on embedding/tfidf
            results.append({
                "job_id": str(job.get('_id', job.get('id', ''))),
                "title": job.get('title', 'Unknown Job'),
                "company": job.get('company', 'Unknown Company'),
                "overall_match_score": 0.0,
                "match_reasons": [],
                "breakdown": {
                    "semantic_score": 0, "tfidf_score": 0, "skills_score": 0,
                    "project_score": 0, "experience_score": 0, "location_score": 0,
                    "education_score": 0, "salary_score": 0, "relevance_multiplier": 0,
                }
            })
            continue

        # ── STEP 2: Calculate remaining signals ──
        semantic_score   = calculate_semantic_score(job.get('embedding'), cand_embedding)
        tfidf_score      = tfidf_scores[i]
        skill_score      = calculate_skill_score(job.get('skills', []), cand_skills)
        
        # Optimization: Skip expensive project embeddings if skill match is too low
        if skill_score < 15:
            project_score = 0.0
        else:
            project_score    = calculate_project_score(job, cand_projects)
            
        location_score   = calculate_location_score(
            job.get('location'),
            personal_info.get('location', ''),
            candidate_projects=cand_projects,
            candidate_experience=cand_experience,
        )
        education_score  = calculate_education_score(job, cand_education)
        salary_score     = calculate_salary_score(job.get('salary_range'), cand_salary)

        # ── STEP 3: Weighted composite — experience is now 20% ──
        base_score = (
            (semantic_score   * 0.07) +
            (tfidf_score      * 0.07) +
            (skill_score      * 0.32) +
            (project_score    * 0.18) +
            (experience_score * 0.20) +
            (location_score   * 0.10) +
            (education_score  * 0.03) +
            (salary_score     * 0.03)
        )

        # ── STEP 4: Relevance multipliers (experience penalties applied first) ──
        relevance_multiplier = 1.0

        # Experience penalties — strongest factor
        if required_years > 0 and experience_gap >= 3:
            relevance_multiplier *= 0.15
        elif required_years > 0 and experience_gap >= 2:
            relevance_multiplier *= 0.35
        elif required_years > 0 and experience_score < 50:
            relevance_multiplier *= 0.55

        # Other penalties
        if skill_score < 20 and project_score < 20:
            relevance_multiplier *= 0.35
        if job.get('source') == 'external' and len(job.get('skills', [])) <= 1:
            relevance_multiplier *= 0.7
        if location_score == 0 and not job.get('remote'):
            relevance_multiplier *= 0.75

        total_score = base_score * relevance_multiplier

        match_reasons = []
        if experience_score >= 75:
            match_reasons.append("Experience level fits")
        if skill_score >= 50:
            match_reasons.append("Strong skill overlap")
        if project_score >= 45:
            match_reasons.append("Projects align with the role")
        if location_score >= 75:
            match_reasons.append("Location preference is aligned")

        results.append({
            "job_id": str(job.get('_id', job.get('id', ''))),
            "title": job.get('title', 'Unknown Job'),
            "company": job.get('company', 'Unknown Company'),
            "overall_match_score": round(total_score, 2),
            "match_reasons": match_reasons,
            "breakdown": {
                "semantic_score":   round(semantic_score, 2),
                "tfidf_score":      round(tfidf_score, 2),
                "skills_score":     round(skill_score, 2),
                "project_score":    round(project_score, 2),
                "experience_score": round(experience_score, 2),
                "location_score":   round(location_score, 2),
                "education_score":  round(education_score, 2),
                "salary_score":     round(salary_score, 2),
                "relevance_multiplier": round(relevance_multiplier, 2),
            }
        })

    # Sort highest score first
    results.sort(key=lambda x: x["overall_match_score"], reverse=True)
    return results
