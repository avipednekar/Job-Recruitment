from matching.matcher import (
    calculate_semantic_score,
    calculate_tfidf_score,
    calculate_skill_score,
    calculate_project_score,
    calculate_experience_score,
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

    results = []

    for job in jobs_list:
        # Calculate the 7 factors
        job_text = build_job_profile_text(job)
        semantic_score   = calculate_semantic_score(job.get('embedding'), cand_embedding)
        tfidf_score      = calculate_tfidf_score(job_text, candidate_text)
        skill_score      = calculate_skill_score(job.get('skills', []), cand_skills)
        project_score    = calculate_project_score(job, cand_projects)
        experience_score = calculate_experience_score(job.get('experience_level'), cand_experience)
        location_score   = calculate_location_score(
            job.get('location'),
            personal_info.get('location', ''),
            candidate_projects=cand_projects,
            candidate_experience=cand_experience,
        )
        education_score  = calculate_education_score(job, cand_education)
        salary_score     = calculate_salary_score(job.get('salary_range'), cand_salary)

        base_score = (
            (semantic_score   * 0.10) +
            (tfidf_score      * 0.10) +
            (skill_score      * 0.36) +
            (project_score    * 0.20) +
            (experience_score * 0.10) +
            (location_score   * 0.10) +
            (education_score  * 0.02) +
            (salary_score     * 0.02)
        )

        relevance_multiplier = 1.0
        if skill_score < 20 and project_score < 20:
            relevance_multiplier *= 0.35
        if location_score == 0 and not job.get('remote'):
            relevance_multiplier *= 0.75

        total_score = base_score * relevance_multiplier

        match_reasons = []
        if skill_score >= 50:
            match_reasons.append("Strong skill overlap")
        if project_score >= 45:
            match_reasons.append("Projects align with the role")
        if location_score >= 75:
            match_reasons.append("Location preference is aligned")
        if experience_score >= 75:
            match_reasons.append("Experience level fits")

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
