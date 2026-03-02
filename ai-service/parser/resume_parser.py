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
    extract_linkedin, extract_github,
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
            "linkedin": extract_linkedin(cleaned_text),
            "github": extract_github(cleaned_text),
        },
        "skills": extract_skills(sections.get("skills", cleaned_text)),
        "education": extract_education(sections.get("education", cleaned_text)),
        "experience": extract_experience(sections.get("experience", cleaned_text)),
    }

    # Optional sections
    if "summary" in sections:
        parsed_data["summary"] = sections["summary"]

    if "projects" in sections:
        parsed_data["projects"] = extract_projects(sections["projects"])

    if "certifications" in sections:
        raw_certs = sections["certifications"]
        certs = [
            line.strip() for line in raw_certs.split("\n")
            if line.strip() and line.strip() not in ("-", "\u200b")
            and "www." not in line and "http" not in line
        ]
        if certs:
            parsed_data["certifications"] = certs

    if "languages" in sections:
        parsed_data["languages"] = sections["languages"]

    parsed_data["_detected_sections"] = list(sections.keys())

    return parsed_data


if __name__ == "__main__":
    import sys
    file_path = sys.argv[1] if len(sys.argv) > 1 else "test_resume.pdf"
    result = parse_resume(file_path)
    print(json.dumps(result, indent=2, ensure_ascii=False))
