import argparse
import json
import re
from pathlib import Path


EMPTY_TEXT_MARKERS = {"", "na", "n/a", "none", "null", "nan", "-", "--"}
EMPLOYMENT_TYPE_MAP = {
    "full time": "Full-time",
    "full-time": "Full-time",
    "part time": "Part-time",
    "part-time": "Part-time",
    "contract": "Contract",
    "internship": "Internship",
    "temporary": "Temporary",
}


def _is_empty(value):
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip().lower() in EMPTY_TEXT_MARKERS
    if isinstance(value, (list, tuple, set, dict)):
        return len(value) == 0
    return False


def _clean_text(value):
    if value is None:
        return ""
    text = str(value).replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return "" if text.lower() in EMPTY_TEXT_MARKERS else text


def _clean_url(value):
    text = _clean_text(value)
    if not text:
        return ""
    if text.startswith("//"):
        return f"https:{text}"
    return text


def _coerce_float(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)

    text = _clean_text(value).lower().replace(",", "")
    if not text:
        return None

    multiplier = 1.0
    if "k" in text:
        multiplier = 1000.0
    if any(marker in text for marker in ("lakh", "lac", "lpa")):
        multiplier = 100000.0

    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        return None

    return float(match.group(1)) * multiplier


def _coerce_int(value):
    parsed = _coerce_float(value)
    if parsed is None:
        return None
    return int(round(parsed))


def _clean_boolean(value):
    if isinstance(value, bool):
        return value
    text = _clean_text(value).lower()
    if text in {"true", "yes", "1", "remote", "easy apply"}:
        return True
    if text in {"false", "no", "0"}:
        return False
    return None


def _clean_list(value):
    if _is_empty(value):
        return []
    if isinstance(value, list):
        items = value
    else:
        items = re.split(r"[,|;]", str(value))
    cleaned = []
    seen = set()
    for item in items:
        normalized = _clean_text(item)
        key = normalized.lower()
        if normalized and key not in seen:
            cleaned.append(normalized)
            seen.add(key)
    return cleaned


def _normalize_employment_type(value):
    text = _clean_text(value).lower()
    if not text:
        return ""
    return EMPLOYMENT_TYPE_MAP.get(text, _clean_text(value))


def _normalize_location(value):
    text = _clean_text(value)
    if not text:
        return ""

    text = re.sub(r"\s*\|\s*", ", ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip(", ")


def _parse_salary_range(record):
    salary_text = _clean_text(record.get("salary_text") or record.get("salary"))
    salary_min = _coerce_int(record.get("salary_min"))
    salary_max = _coerce_int(record.get("salary_max"))

    if salary_text and (salary_min is None or salary_max is None):
        matches = re.findall(r"(\d+(?:\.\d+)?)\s*(k|lakh|lac|lpa)?", salary_text.lower())
        parsed_values = []
        for raw_number, unit in matches[:2]:
            value = float(raw_number)
            if unit == "k":
                value *= 1000
            elif unit in {"lakh", "lac", "lpa"}:
                value *= 100000
            parsed_values.append(int(round(value)))
        if parsed_values:
            salary_min = salary_min if salary_min is not None else parsed_values[0]
            salary_max = salary_max if salary_max is not None else parsed_values[-1]

    if salary_min is not None and salary_max is not None and salary_min > salary_max:
        salary_min, salary_max = salary_max, salary_min

    return salary_text, salary_min, salary_max


def _infer_remote_status(location_text, description_text):
    combined_text = f"{location_text} {description_text}".lower()

    negative_patterns = [
        r"\bnot remote\b",
        r"\bno remote\b",
        r"\bnon remote\b",
        r"\bwithout remote\b",
        r"\bremote work unavailable\b",
        r"\bremote not available\b",
        r"\bon[- ]site only\b",
        r"\bin office only\b",
    ]
    for pattern in negative_patterns:
        if re.search(pattern, combined_text):
            return False

    positive_patterns = [
        r"\bremote\b",
        r"\bwork from home\b",
        r"\bwfh\b",
        r"\bhybrid\b",
    ]
    for pattern in positive_patterns:
        if re.search(pattern, combined_text):
            return True

    return False


def clean_job_record(record):
    salary_text, salary_min, salary_max = _parse_salary_range(record)
    cleaned = {
        "title": _clean_text(record.get("title")),
        "company": _clean_text(record.get("company")),
        "location": _normalize_location(record.get("location")),
        "description": _clean_text(record.get("description")),
        "employment_type": _normalize_employment_type(record.get("employment_type")),
        "salary_text": salary_text,
        "salary_min": salary_min,
        "salary_max": salary_max,
        "rating": _coerce_float(record.get("rating")),
        "company_size": _clean_text(record.get("company_size")),
        "revenue": _clean_text(record.get("revenue")),
        "industry": _clean_text(record.get("industry")),
        "seniority_level": _clean_text(record.get("seniority_level")),
        "source": _clean_text(record.get("source")) or "Glassdoor",
        "source_url": _clean_url(record.get("source_url")),
        "apply_url": _clean_url(record.get("apply_url")),
        "job_id": _clean_text(record.get("job_id")),
        "skills": _clean_list(record.get("skills")),
        "easy_apply": _clean_boolean(record.get("easy_apply")),
        "remote": _clean_boolean(record.get("remote")),
        "posted_at": _clean_text(record.get("posted_at")),
    }

    if cleaned.get("remote") is None:
        cleaned["remote"] = _infer_remote_status(
            cleaned.get("location", ""),
            cleaned.get("description", ""),
        )

    return {key: value for key, value in cleaned.items() if not _is_empty(value)}


def clean_job_dataset(records, drop_incomplete=True):
    cleaned_records = []

    for raw_record in records:
        if not isinstance(raw_record, dict):
            continue

        cleaned = clean_job_record(raw_record)
        required_fields = ("title", "company", "description")
        if drop_incomplete and any(_is_empty(cleaned.get(field)) for field in required_fields):
            continue

        cleaned_records.append(cleaned)

    return cleaned_records


def _load_records(path):
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_records(path, records):
    with Path(path).open("w", encoding="utf-8") as handle:
        json.dump(records, handle, indent=2, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description="Clean scraped Glassdoor job data.")
    parser.add_argument("input_path", help="Path to raw JSON records.")
    parser.add_argument("output_path", help="Path to write cleaned JSON records.")
    parser.add_argument(
        "--keep-incomplete",
        action="store_true",
        help="Keep records even if title, company, or description is missing.",
    )
    args = parser.parse_args()

    records = _load_records(args.input_path)
    cleaned_records = clean_job_dataset(
        records,
        drop_incomplete=not args.keep_incomplete,
    )
    _save_records(args.output_path, cleaned_records)
    print(
        f"Cleaned {len(cleaned_records)} records "
        f"from {args.input_path} -> {args.output_path}"
    )


if __name__ == "__main__":
    main()
