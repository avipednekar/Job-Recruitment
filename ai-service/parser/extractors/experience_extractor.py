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

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        if not line:
            i += 1
            continue

        # Check if this line contains a job title keyword
        if _is_job_title_line(line):
            # Extract and strip inline duration from the title
            clean_title, inline_duration = _strip_inline_duration(line)
            entry = {"title": clean_title}

            # Look at nearby lines for company and duration
            context = _get_context(lines, i, window=3)

            # Try to find company name (usually line before or after title)
            company = _extract_company(lines, i)
            if company:
                entry["company"] = company

            # Try to find duration in nearby lines, or use inline
            duration = _find_nearby_duration(context)
            if duration:
                entry["duration"] = duration
            elif inline_duration:
                entry["duration"] = inline_duration

            entries.append(entry)

        i += 1

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
