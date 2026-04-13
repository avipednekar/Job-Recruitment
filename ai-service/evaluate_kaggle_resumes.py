import json
from pathlib import Path

from parser import parse_resume


def summarize_resume(result):
    info = result.get("personal_info", {})
    return {
        "name": info.get("name"),
        "email": info.get("email"),
        "phone": info.get("phone"),
        "location": info.get("location"),
        "linkedin": info.get("linkedin"),
        "github": info.get("github"),
        "skills_count": len(result.get("skills", {}).get("skills", [])),
        "education_count": len(result.get("education", [])),
        "experience_count": len(result.get("experience", [])),
        "projects_count": len(result.get("projects", [])),
        "has_summary": bool(result.get("summary")),
    }


def main():
    base_dir = Path(__file__).resolve().parent.parent / "Kaggle Resumes"
    files = sorted(
        path for path in base_dir.iterdir()
        if path.is_file() and path.suffix.lower() in {".pdf", ".docx"}
    )

    report = []
    for path in files:
        parsed = parse_resume(str(path))
        report.append({
            "file": path.name,
            "summary": summarize_resume(parsed),
            "parsed_data": parsed,
        })

    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
