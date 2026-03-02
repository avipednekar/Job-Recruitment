import re
from parser.config import SECTION_HEADER_MAP


def split_sections(text):
    """
    Split resume text into sections by detecting section headers.
    Uses regex patterns from config to match diverse header formats.
    """
    sections = {}
    current = "general"
    sections[current] = ""

    for line in text.split("\n"):
        stripped = line.strip()

        # Skip empty lines but preserve them in sections
        if not stripped:
            sections[current] += "\n"
            continue

        # Check if this line is a section header
        matched_section = _match_section_header(stripped)

        if matched_section:
            current = matched_section
            if current not in sections:
                sections[current] = ""
        else:
            sections[current] += line + "\n"

    # Clean up: strip excess whitespace from each section
    for key in sections:
        sections[key] = sections[key].strip()

    # Remove empty sections
    sections = {k: v for k, v in sections.items() if v}

    return sections


def _match_section_header(line):
    """
    Check if a line matches any known section header pattern.
    A section header is typically:
    - A short line (< 50 chars)
    - Matches a known pattern
    - Usually all uppercase or title case
    - May have trailing colon or dashes
    """
    # Clean up the line for matching
    cleaned = line.strip().rstrip(":").rstrip("-").rstrip("_").strip()
    cleaned_lower = cleaned.lower()

    # Section headers are usually short
    if len(cleaned) > 50:
        return None

    # Lines with lots of commas or periods are likely content, not headers
    if cleaned.count(",") > 2 or cleaned.count(".") > 2:
        return None

    for pattern, section_name in SECTION_HEADER_MAP.items():
        if re.fullmatch(pattern, cleaned_lower):
            return section_name

    return None