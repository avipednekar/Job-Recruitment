from matching.matcher import (
    calculate_semantic_score,
    calculate_skill_score,
    calculate_project_score,
    calculate_experience_score,
    calculate_location_score,
    calculate_education_score,
    calculate_salary_score
)

def recommend_jobs_for_candidate(candidate_data, jobs_list):
    """
    Given a candidate profile and a list of jobs, return a ranked list of jobs.
    Uses the exact same 7-factor scoring engine as match_candidate_to_job, 
    but optimized to process a batch of jobs for a single candidate.
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
    
    cand_embedding = candidate_data.get('embedding')
    cand_salary = candidate_data.get('desired_salary', None)

    results = []

    for job in jobs_list:
        # Calculate the 7 factors
        semantic_score   = calculate_semantic_score(job.get('embedding'), cand_embedding)
        skill_score      = calculate_skill_score(job.get('skills', []), cand_skills)
        project_score    = calculate_project_score(job, cand_projects)
        experience_score = calculate_experience_score(job.get('experience_level'), cand_experience)
        location_score   = calculate_location_score(job.get('location'), personal_info.get('location', ''))
        education_score  = calculate_education_score(job, cand_education)
        salary_score     = calculate_salary_score(job.get('salary_range'), cand_salary)

        total_score = (
            (semantic_score   * 0.30) +
            (skill_score      * 0.25) +
            (project_score    * 0.15) +
            (experience_score * 0.15) +
            (location_score   * 0.05) +
            (education_score  * 0.05) +
            (salary_score     * 0.05)
        )

        results.append({
            "job_id": str(job.get('_id', job.get('id', ''))),
            "title": job.get('title', 'Unknown Job'),
            "company": job.get('company', 'Unknown Company'),
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
        })

    # Sort highest score first
    results.sort(key=lambda x: x["overall_match_score"], reverse=True)
    return results
