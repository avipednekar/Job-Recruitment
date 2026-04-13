import re
from parser.config import JOB_TITLE_KEYWORDS


def extract_experience(text):
    """
    Extract work experience entries from text.
    Each entry contains a job title, optional company, and duration.
    """
    entries = []
    durations = _extract_durations(text)
    lines = text.split("\n")
    current_entry = None

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped:
            continue

        # Check if this line contains a job title keyword
        if _is_job_title_line(stripped):
            # Save the previous entry if it exists
            if current_entry and current_entry.get("title"):
                entries.append(current_entry)
            
            clean_title, inline_duration = _strip_inline_duration(stripped)
            current_entry = {"title": clean_title, "description": ""}
            
            # Context around the title
            context = _get_context(lines, i, window=3)

            company = _extract_company(lines, i)
            if company:
                current_entry["company"] = company

            duration = _find_nearby_duration(context)
            if duration:
                current_entry["duration"] = duration
            elif inline_duration:
                current_entry["duration"] = inline_duration

        elif current_entry is not None:
            # Check if line is just a company name or duration that we missed
            if not current_entry.get("company") and len(stripped) < 50 and not _is_duration_line(stripped) and not stripped.startswith("-") and not stripped.startswith("•"):
                current_entry["company"] = stripped
            elif not current_entry.get("duration") and _is_duration_line(stripped):
                current_entry["duration"] = stripped
            else:
                # Part of description
                if current_entry["description"]:
                    current_entry["description"] += "\n" + stripped
                else:
                    current_entry["description"] = stripped

    # Save the last entry
    if current_entry and current_entry.get("title"):
        entries.append(current_entry)

    return {
        "entries": entries,
        "durations": durations,
    }


def _extract_durations(text):
    """Extract all date range patterns from text."""
    patterns = [
        # "Jan 2024 - Present", "January 2024 - Dec 2025"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4}\s*[-–]\s*(?:Present|Current|Ongoing|"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4})",

        # "06/2024 - 10/2025", "06-2024 - 10-2025"
        r"\d{1,2}[/\-]\d{4}\s*[-–]\s*(?:\d{1,2}[/\-]\d{4}|Present|Current)",

        # "2023 - 2025", "2023 - Present"
        r"(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current|Ongoing)",
    ]

    durations = []
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        durations.extend(matches)

    return list(set(durations))


def _is_job_title_line(line):
    """Check if a line likely contains a job title."""
    line_lower = line.lower().strip()

    # Job titles are short (typically < 60 chars)
    if len(line_lower) > 60:
        return False

    # Lines starting with description verbs are not job titles
    desc_starters = [
        "developed", "built", "created", "designed", "implemented",
        "worked", "used", "focused", "provided", "integrated",
        "managed", "responsible", "a ", "an ", "the ",
        "development company", "focusing", "passionate",
        "open to", "quick learner", "strong", "eager",
        "enabled", "technologies",
    ]
    if any(line_lower.startswith(s) for s in desc_starters):
        return False

    # Reject skill/tech listings (lines like "Web Development: HTML, CSS, JS")
    if ":" in line_lower and line_lower.count(",") >= 1:
        return False

    # Reject lines containing education institution keywords
    edu_keywords = ["college", "university", "institute", "school", "academy", "iit", "nit"]
    if any(kw in line_lower for kw in edu_keywords):
        return False

    # Reject lines starting with bullet/dash markers
    if line_lower.startswith("-") or line_lower.startswith("•"):
        return False

    return any(keyword in line_lower for keyword in JOB_TITLE_KEYWORDS)


def _get_context(lines, index, window=3):
    """Get nearby lines for context."""
    start = max(0, index - window)
    end = min(len(lines), index + window + 1)
    return "\n".join(lines[start:end])


def _extract_company(lines, title_index):
    """Try to extract company name from lines near the job title."""
    # Check the line above and below the title for a company name
    for offset in [-1, 1, 2]:
        idx = title_index + offset
        if 0 <= idx < len(lines):
            line = lines[idx].strip()
            if not line:
                continue
            # Skip lines that are dates, empty, or too short
            if re.match(r"^[\d/\-\s]+$", line):
                continue
            # Skip lines that look like bullet points or descriptions
            if line.startswith(("-", "*", "•")) or len(line) > 100:
                continue
            # Skip lines that are job titles themselves
            if _is_job_title_line(line):
                continue
            # This might be a company name
            if len(line) > 3 and not any(
                keyword in line.lower() for keyword in JOB_TITLE_KEYWORDS
            ):
                return line

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
