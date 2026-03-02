import re
from parser.config import DEGREE_PATTERNS


def extract_education(text):
    """
    Extract education information including:
    - Degree type(s)
    - Institution name(s)
    - Year(s)
    - GPA/Percentage/CGPA
    """
    entries = []
    lines = text.split("\n")

    for i, line in enumerate(lines):
        line_stripped = line.strip()
        if not line_stripped:
            continue

        # Check if this line contains a degree keyword
        degree = _match_degree(line_stripped)
        if degree:
            entry = {"degree": degree, "details": line_stripped}

            # Look for institution in nearby lines
            institution = _find_institution(lines, i)
            if institution:
                entry["institution"] = institution

            # Look for GPA/percentage in nearby lines
            gpa = _find_gpa(lines, i)
            if gpa:
                entry["gpa"] = gpa

            # Look for year in nearby lines
            year = _find_year(lines, i)
            if year:
                entry["year"] = year

            entries.append(entry)

    # If no structured entries found, do a basic scan
    if not entries:
        entries = _basic_education_scan(text)

    # Deduplicate entries: if two entries share the same institution,
    # keep the one with more detail (longer details string)
    if len(entries) > 1:
        seen_institutions = {}
        deduped = []
        for entry in entries:
            inst = (entry.get("institution") or "").lower().strip()
            if inst and inst in seen_institutions:
                # Keep the entry with longer details
                existing = seen_institutions[inst]
                if len(entry.get("details", "")) > len(existing.get("details", "")):
                    deduped.remove(existing)
                    deduped.append(entry)
                    seen_institutions[inst] = entry
            else:
                deduped.append(entry)
                if inst:
                    seen_institutions[inst] = entry
        entries = deduped

    # Extract all years mentioned
    year_pattern = r"(?:19|20)\d{2}"
    years = re.findall(year_pattern, text)

    return {
        "entries": entries,
        "years": sorted(set(years)),
    }


def _match_degree(line):
    """Check if a line contains a degree mention and return the match."""
    line_lower = line.lower()
    for pattern in DEGREE_PATTERNS:
        if re.search(pattern, line_lower):
            return re.search(pattern, line_lower).group(0)
    return None


def _find_institution(lines, degree_index):
    """Look for institution name near a degree mention."""
    institution_keywords = [
        "university", "institute", "college", "school",
        "academy", "iit", "nit", "iiit", "bits",
    ]

    # Date patterns to strip from institution lines
    date_patterns = [
        r"\s*(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4}\s*[-–]\s*(?:Present|Current|Ongoing|"
        r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
        r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|"
        r"Dec(?:ember)?)\s*\.?\s*\d{4})",
        r"\s*\d{1,2}[/\-]\d{4}\s*[-–]\s*(?:\d{1,2}[/\-]\d{4}|Present|Current)",
        r"\s*(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current)",
    ]

    # Search in a window around the degree line
    for offset in range(-2, 4):
        idx = degree_index + offset
        if 0 <= idx < len(lines):
            line = lines[idx].strip()
            line_lower = line.lower()

            if any(keyword in line_lower for keyword in institution_keywords):
                # Strip trailing date ranges from institution name
                cleaned = line
                for pattern in date_patterns:
                    cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()
                return cleaned

    return None


def _find_gpa(lines, degree_index):
    """Look for GPA, CGPA, or percentage near a degree mention."""
    gpa_patterns = [
        r"(?:cgpa|gpa|grade)\s*[:=]?\s*(\d+\.?\d*)\s*(?:/\s*\d+)?",
        r"(\d+\.?\d*)\s*(?:cgpa|gpa)",
        r"(\d{1,3}\.?\d*)\s*%",
        r"percentage\s*[:=]?\s*(\d+\.?\d*)",
    ]

    for offset in range(-2, 4):
        idx = degree_index + offset
        if 0 <= idx < len(lines):
            line = lines[idx].strip()
            for pattern in gpa_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    return match.group(0)

    return None


def _find_year(lines, degree_index):
    """Find graduation year near a degree mention."""
    year_pattern = r"(?:19|20)\d{2}"

    for offset in range(-2, 4):
        idx = degree_index + offset
        if 0 <= idx < len(lines):
            line = lines[idx].strip()
            years = re.findall(year_pattern, line)
            if years:
                return " - ".join(years)

    return None


def _basic_education_scan(text):
    """Fallback: scan entire text for degree keywords."""
    entries = []
    text_lower = text.lower()

    for pattern in DEGREE_PATTERNS:
        matches = re.findall(pattern, text_lower)
        for match in matches:
            if match not in [e.get("degree") for e in entries]:
                entries.append({"degree": match})

    return entries
