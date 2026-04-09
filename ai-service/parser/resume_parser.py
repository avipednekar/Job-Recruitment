"""
Resume Parser — Orchestrates the full parsing pipeline.
Extracts structured data from PDF/DOCX resume files.
"""
import json

from parser.text_extractor import extract_text
from parser.preprocessing import clean_text
from parser.section_splitter import split_sections
from parser.skill_matcher import extract_skills
from parser.extractors import (
    extract_name, extract_email, extract_phone,
    extract_linkedin, extract_github, extract_location,
    extract_experience, extract_education, extract_projects,
)


def parse_resume(file_path: str) -> dict:
    """Parse a resume file and return structured JSON data."""

    # Step 1: Extract raw text from PDF/DOCX
    raw_text = extract_text(file_path)

    # Step 2: Clean and normalize text
    cleaned_text = clean_text(raw_text)

    # Step 3: Split into sections
    sections = split_sections(cleaned_text)

    # Step 4: Extract structured data
    parsed_data = {
        "personal_info": {
            "name": extract_name(cleaned_text),
            "email": extract_email(cleaned_text),
            "phone": extract_phone(cleaned_text),
            "location": extract_location(cleaned_text),
            "linkedin": extract_linkedin(cleaned_text),
            "github": extract_github(cleaned_text),
        },
        "skills": extract_skills(sections.get("skills", cleaned_text)),
    }

    edu_data = extract_education(sections.get("education", cleaned_text))
    parsed_data["education"] = edu_data.get("entries", [])

    # Extract Experience (with fallback if regex fails but section was found)
    exp_text = sections.get("experience", cleaned_text)
    exp_data = extract_experience(exp_text)
    if not exp_data.get("entries") and "experience" in sections:
        exp_entries = [{"title": "Experience Overview", "company": "Various", "description": sections["experience"][:2000]}]
    else:
        exp_entries = exp_data.get("entries", [])
    
    parsed_data["experience"] = exp_entries

    # Optional sections
    if "summary" in sections:
        parsed_data["summary"] = sections["summary"]

    if "projects" in sections:
        proj_data = extract_projects(sections["projects"])
        if not proj_data and sections["projects"].strip():
            proj_data = [{"name": "Projects Portfolio", "description": sections["projects"][:2000]}]
        parsed_data["projects"] = proj_data
        raw_certs = sections["certifications"]
        certs = [
            line.strip() for line in raw_certs.split("\n")
            if line.strip() and line.strip() not in ("-", "\u200b")
            and "www." not in line and "http" not in line
        ]
        if certs:
            parsed_data["certifications"] = certs

    if "categories" in sections:
        parsed_data["categories"] = sections["categories"]
        
    # ------------- DEBUG DUMP -------------
    try:
        with open("debug_parsed_data.json", "w") as f:
            json.dump(parsed_data, f, indent=2)
    except Exception as e:
        print(f"Debug dump failed: {e}")
    # --------------------------------------

    return parsed_data


if __name__ == "__main__":
    import sys
    file_path = sys.argv[1] if len(sys.argv) > 1 else "test_resume.pdf"
    result = parse_resume(file_path)
    print(json.dumps(result, indent=2, ensure_ascii=False))
