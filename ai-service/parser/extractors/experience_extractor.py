import re

from parser.config import JOB_TITLE_KEYWORDS


def extract_experience(text):
    """
    Extract work experience entries from text.
    Handles both:
    - title -> company -> duration
    - company -> duration -> title
    """
    entries = []
    durations = _extract_durations(text)
    lines = text.split("\n")
    current_entry = None
    pending_company = None
    pending_duration = None

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        if _looks_like_company_line(stripped) and _next_job_title_within(lines, i, 4):
            if current_entry and current_entry.get("title"):
                entries.append(_finalize_entry(current_entry))
                current_entry = None
            pending_company = stripped
            pending_duration = None
            continue

        if _is_duration_line(stripped) and current_entry is None and _next_job_title_within(lines, i, 2):
            pending_duration = stripped
            continue

        if _is_job_title_line(stripped):
            if current_entry and current_entry.get("title"):
                entries.append(_finalize_entry(current_entry))

            clean_title, inline_duration = _strip_inline_duration(stripped)
            current_entry = {"title": _normalize_title(clean_title), "description": ""}

            company = pending_company or _extract_company(lines, i)
            if company:
                current_entry["company"] = company

            duration = pending_duration or inline_duration or _find_nearby_duration(_get_context(lines, i, window=3))
            if duration:
                current_entry["duration"] = duration

            pending_company = None
            pending_duration = None
            continue

        if current_entry is None:
            continue

        if _looks_like_company_line(stripped) and _next_job_title_within(lines, i, 4):
            entries.append(_finalize_entry(current_entry))
            current_entry = None
            pending_company = stripped
            pending_duration = None
            continue

        if not current_entry.get("company") and _looks_like_company_line(stripped):
            current_entry["company"] = stripped
            continue

        if not current_entry.get("duration") and _is_duration_line(stripped):
            current_entry["duration"] = stripped
            continue

        if current_entry["description"]:
            current_entry["description"] += "\n" + stripped
        else:
            current_entry["description"] = stripped

    if current_entry and current_entry.get("title"):
        entries.append(_finalize_entry(current_entry))

    return {
        "entries": [entry for entry in entries if entry and entry.get("title")],
        "durations": durations,
    }


def _extract_durations(text):
    """Extract all date range patterns from text."""
    patterns = [
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4}\s*[-–]\s*(?:Present|Current|Ongoing|"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4})",
        r"\d{1,2}[/\-]\d{4}\s*[-–]\s*(?:\d{1,2}[/\-]\d{4}|Present|Current)",
        r"(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current|Ongoing)",
    ]

    durations = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        durations.extend(matches)

    return list(set(durations))


def _is_job_title_line(line):
    """Check if a line likely contains a job title."""
    normalized = _normalize_title(line.lower().strip())

    if len(normalized) > 80:
        return False

    desc_starters = [
        "developed", "built", "created", "designed", "implemented",
        "worked", "used", "focused", "provided", "integrated",
        "managed", "responsible", "a ", "an ", "the ",
        "development company", "focusing", "passionate",
        "open to", "quick learner", "strong", "eager",
        "enabled", "technologies",
    ]
    if any(normalized.startswith(starter) for starter in desc_starters):
        return False

    if ":" in normalized and normalized.count(",") >= 1:
        return False

    edu_keywords = ["college", "university", "institute", "school", "academy", "iit", "nit"]
    if any(keyword in normalized for keyword in edu_keywords):
        return False

    if normalized.startswith("-") or normalized.startswith("\u2022"):
        return False

    return any(keyword in normalized for keyword in JOB_TITLE_KEYWORDS)


def _get_context(lines, index, window=3):
    """Get nearby lines for context."""
    start = max(0, index - window)
    end = min(len(lines), index + window + 1)
    return "\n".join(lines[start:end])


def _extract_company(lines, title_index):
    """Try to extract company name from lines near the job title."""
    for offset in [1, 2, -1, -2, -3]:
        idx = title_index + offset
        if 0 <= idx < len(lines):
            candidate = lines[idx].strip()
            if _looks_like_company_line(candidate):
                return candidate

    return None


def _find_nearby_duration(context):
    """Find a date duration in nearby context text."""
    patterns = [
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4}\s*[-–]\s*(?:Present|Current|Ongoing|"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4})",
        r"(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current)",
    ]

    for pattern in patterns:
        match = re.search(pattern, context, re.IGNORECASE)
        if match:
            return match.group(0)

    return None


def _is_duration_line(line):
    """Check if a line is primarily a date range or duration string."""
    stripped = line.strip()
    patterns = [
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4}\s*[-–]\s*(?:Present|Current|Ongoing|"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4})",
        r"\d{1,2}[/\-]\d{4}\s*[-–]\s*(?:\d{1,2}[/\-]\d{4}|Present|Current)",
        r"(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current|Ongoing)",
    ]

    return any(re.fullmatch(pattern, stripped, re.IGNORECASE) for pattern in patterns)


def _strip_inline_duration(line):
    """Extract inline duration from a line and return (cleaned_line, duration)."""
    patterns = [
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4}\s*[-–]\s*(?:Present|Current|Ongoing|"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4})",
        r"\d{1,2}[/\-]\d{4}\s*[-–]\s*(?:\d{1,2}[/\-]\d{4}|Present|Current)",
        r"(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current)",
    ]

    for pattern in patterns:
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            duration = match.group(0)
            cleaned = re.sub(pattern, "", line, flags=re.IGNORECASE).strip()
            return cleaned, duration

    return line, None


def _normalize_title(value):
    cleaned = re.sub(r"\s*\|\s*$", "", str(value)).strip(" |,-")
    return re.sub(r"\s+", " ", cleaned).strip()


def _looks_like_descriptor_line(line):
    lowered = line.lower().strip()
    if len(lowered.split()) > 8:
        return True
    return any(token in lowered for token in ["revenue", "employees", "annual", "saas", "firm"])


def _looks_like_company_line(line):
    cleaned = line.strip()
    if not cleaned:
        return False
    if cleaned[0].islower():
        return False
    if cleaned.startswith(("-", "*", "\u2022")):
        return False
    if _is_duration_line(cleaned) or _is_job_title_line(cleaned):
        return False
    if _looks_like_descriptor_line(cleaned):
        return False
    if len(cleaned) > 90:
        return False
    return True


def _next_job_title_within(lines, index, lookahead):
    seen = 0
    for idx in range(index + 1, len(lines)):
        candidate = lines[idx].strip()
        if not candidate:
            continue
        seen += 1
        if _is_job_title_line(candidate):
            return True
        if seen >= lookahead:
            break
    return False


def _finalize_entry(entry):
    title = _normalize_title(entry.get("title", ""))
    if not title:
        return None

    cleaned = {"title": title}
    for field in ["company", "duration", "description"]:
        value = entry.get(field)
        if value:
            cleaned[field] = value.strip()

    return cleaned
