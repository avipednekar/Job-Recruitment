import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

# Add ai-service to path
base_dir = os.path.dirname(os.path.abspath(__file__))
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

from parser import parse_resume
from matching.ats_gemini import calculate_ats_score

JOB_DESCRIPTIONS = {
    "Full Stack Web Developer": """
Job Title: Full Stack Web Developer
Requirements:
- 3+ years of experience in full stack web development.
- Strong proficiency in React, Node.js, Express, and MongoDB (MERN stack).
- Experience with building RESTful APIs.
- Familiarity with Git, Docker, and AWS.
- Strong problem-solving skills and ability to work in a team.
""",
    "Senior Data Analyst": """
Job Title: Senior Data Analyst
Requirements:
- 5+ years of experience as a Data Analyst or similar role.
- Strong proficiency in SQL, Python (Pandas, NumPy), and Tableau or Power BI.
- Experience with A/B testing, statistical modeling, and data visualization.
- Strong analytical skills and ability to communicate findings to stakeholders.
- Bachelor's or Master's degree in a quantitative field.
"""
}

def main():
    resume_dir = Path(base_dir).parent / "Kaggle Resumes"
    resumes_to_test = {
        "AVINASH MANOHAR PEDNEKAR - Full Stack Web Developer Resume.pdf": "Full Stack Web Developer",
        "senior-data-analyst.pdf": "Senior Data Analyst"
    }

    for filename, job_role in resumes_to_test.items():
        file_path = resume_dir / filename
        if not file_path.exists():
            print(f"File not found: {file_path}")
            continue

        print(f"\n--- Testing {filename} for {job_role} ---")
        try:
            # Parse resume
            parsed = parse_resume(str(file_path))
            
            # Extract data similar to backend
            personal_info = parsed.get("personal_info", {})
            raw_skills = parsed.get("skills", {})
            skills_list = raw_skills if isinstance(raw_skills, list) else raw_skills.get("skills", [])
            
            candidate_data = {
                "name": personal_info.get("name", "Unknown"),
                "skills": skills_list,
                "education": parsed.get("education", []),
                "experience": parsed.get("experience", []),
                "projects": parsed.get("projects", [])
            }
            
            # Calculate ATS score
            job_desc = JOB_DESCRIPTIONS[job_role]
            resume_text = json.dumps(candidate_data)
            
            result = calculate_ats_score(resume_text, job_desc)
            
            print(f"Overall Match Score: {result.get('overall_match_score')}")
            print("Breakdown:")
            for k, v in result.get("breakdown", {}).items():
                print(f"  {k}: {v}")
            print(f"Missing Skills: {result.get('missing_skills')}")
            
        except Exception as e:
            print(f"Error testing {filename}: {e}")

if __name__ == "__main__":
    main()
