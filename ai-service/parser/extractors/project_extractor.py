import re


def extract_projects(text):
    """
    Extract structured project entries from the projects section text.
    Each project typically has: name, duration, description, and bullet points.
    """
    if not text or not text.strip():
        return []

    lines = text.split("\n")
    projects = []
    current_project = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if this line is a project title
        # Project titles are typically: short, non-bullet, may be followed by date
        if _is_project_title(stripped, lines):
            # Save previous project
            if current_project:
                projects.append(_finalize_project(current_project))

            current_project = {
                "name": _clean_project_name(stripped),
                "duration": _extract_inline_duration(stripped),
                "description": "",
                "highlights": [],
            }

        elif current_project is not None:
            # Check if it's a bullet point
            if _is_bullet_point(stripped):
                bullet_text = _clean_bullet(stripped)
                if bullet_text:
                    current_project["highlights"].append(bullet_text)

            # Check if it's a duration line
            elif _is_duration_line(stripped) and not current_project.get("duration"):
                current_project["duration"] = stripped

            # Otherwise it's part of the description
            else:
                if current_project["description"]:
                    current_project["description"] += " " + stripped
                else:
                    current_project["description"] = stripped

    # Save the last project
    if current_project:
        projects.append(_finalize_project(current_project))

    # Filter out garbage entries
    projects = [p for p in projects if p is not None]

    return projects


def _is_project_title(line, all_lines):
    """
    Determine if a line is likely a project title.
    Project titles are typically:
    - Short (< 80 chars without date)
    - Not a bullet point
    - Don't start with common description words
    - May contain a date range
    """
    if _is_bullet_point(line):
        return False

    # Reject lines that are purely date/duration ranges
    if _is_duration_line(line):
        return False

    # Remove inline duration for length check
    cleaned = _remove_duration(line).strip()

    # Too long for a title
    if len(cleaned) > 80:
        return False

    # Too short (likely a fragment)
    if len(cleaned) < 3:
        return False

    # Reject lines that are phone numbers
    if re.match(r"^[\+\d\s\-\(\)]{10,}$", cleaned):
        return False

    # Reject lines containing URLs or footer-like content
    footer_patterns = ["www.", "http", "powered by", ".com", ".org", ".net"]
    if any(p in cleaned.lower() for p in footer_patterns):
        return False

    # Reject lines that are only zero-width spaces or whitespace
    if not cleaned.replace("\u200b", "").strip():
        return False

    # Starts with lowercase (likely a continuation sentence)
    if cleaned[0].islower():
        return False

    # Common description starters — not titles
    desc_starters = [
        "a ", "an ", "the ", "developed", "built", "created",
        "designed", "implemented", "worked", "used", "focused",
        "provided", "integrated", "managed", "responsible",
        "technologies", "tech stack", "tools used",
        "open to", "quick learner", "strong",
    ]
    if any(cleaned.lower().startswith(s) for s in desc_starters):
        return False

    # Reject lines with colon followed by comma-separated items (skill lists)
    if ":" in cleaned and cleaned.count(",") >= 1:
        return False

    # If the line is short and looks like a name, it's a title
    word_count = len(cleaned.split())
    if 1 <= word_count <= 6:
        return True

    return False


def _is_bullet_point(line):
    """Check if a line is a bullet point."""
    return bool(re.match(r"^[\s]*[●•◦▪▸►⬥\-\*]\s*", line))


def _is_duration_line(line):
    """Check if a line is primarily a date/duration."""
    stripped = line.strip()

    duration_patterns = [
        # "Jan 2024 - Present", "January 2024 - Dec 2025"
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
        r"[a-z]*\.?\s*\d{4}\s*[-–]\s*"
        r"(?:Present|Current|Ongoing|(?:Jan|Feb|Mar|Apr|May|Jun|"
        r"Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})",
        # "01/2025 - 05/2025", "06-2024 - 10-2025"
        r"\d{1,2}[/\-]\d{4}\s*[-–]\s*(?:\d{1,2}[/\-]\d{4}|Present|Current)",
        # "2023 - 2025", "2023 - Present"
        r"(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current)",
    ]

    for pattern in duration_patterns:
        if re.fullmatch(pattern, stripped, re.IGNORECASE):
            return True
        # Also check if the line is just the duration with trailing whitespace
        if re.fullmatch(pattern + r"\s*", stripped, re.IGNORECASE):
            return True

    return False


def _extract_inline_duration(line):
    """Extract a duration that may be inline with the project title."""
    patterns = [
        r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
        r"[a-z]*\.?\s*\d{4}\s*[-–]\s*"
        r"(?:Present|Current|Ongoing|(?:Jan|Feb|Mar|Apr|May|Jun|"
        r"Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}))",
        r"((?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current))",
    ]

    for pattern in patterns:
        match = re.search(pattern, line, re.IGNORECASE)
        if match:
            return match.group(1)

    return None


def _remove_duration(line):
    """Remove duration text from a line."""
    patterns = [
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)"
        r"[a-z]*\.?\s*\d{4}\s*[-–]\s*"
        r"(?:Present|Current|Ongoing|(?:Jan|Feb|Mar|Apr|May|Jun|"
        r"Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4})",
        r"(?:19|20)\d{2}\s*[-–]\s*(?:(?:19|20)\d{2}|Present|Current)",
    ]

    result = line
    for pattern in patterns:
        result = re.sub(pattern, "", result, flags=re.IGNORECASE)
    return result.strip()


def _clean_project_name(line):
    """Clean a project name by removing inline duration."""
    return _remove_duration(line).strip()


def _clean_bullet(line):
    """Remove bullet point characters from the start of a line."""
    return re.sub(r"^[\s]*[●•◦▪▸►⬥\-\*]\s*", "", line).strip()


def _finalize_project(project):
    """Clean up a project entry before returning. Returns None for garbage entries."""
    name = project["name"].replace("\u200b", "").strip()

    # Reject projects with empty names
    if not name:
        return None

    cleaned = {"name": name}

    if project.get("duration"):
        cleaned["duration"] = project["duration"]

    if project.get("description"):
        # Clean zero-width spaces, phone numbers, emails, and footer noise
        desc = project["description"]
        desc = desc.replace("\u200b", "").strip()
        # Remove phone numbers and emails from description
        desc = re.sub(r"\+?\d[\d\s\-]{9,}", "", desc)
        desc = re.sub(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", "", desc)
        # Remove footer-like content
        desc = re.sub(r"Powered by.*", "", desc, flags=re.IGNORECASE)
        desc = re.sub(r"www\.\S+", "", desc)
        desc = desc.strip()
        if desc:
            cleaned["description"] = desc

    if project.get("highlights"):
        cleaned["highlights"] = project["highlights"]

    # Reject projects that have no meaningful content beyond a name
    # (single-word names with no description, duration, or highlights are noise)
    has_content = "description" in cleaned or "duration" in cleaned or "highlights" in cleaned
    if not has_content and len(name.split()) <= 1:
        return None

    return cleaned
