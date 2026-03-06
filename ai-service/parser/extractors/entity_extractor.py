import re
from threading import Lock

_nlp = None
_nlp_lock = Lock()

EMAIL_REGEX = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
PHONE_REGEX = r"(\+?\d{1,3}[\s\-.]?)?\(?\d{2,5}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}"
LINKEDIN_REGEX = r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+"
GITHUB_REGEX = r"(?:https?://)?(?:www\.)?github\.com/[\w\-]+"


def _get_nlp():
    """
    Lazily load spaCy model on first name extraction call.
    Returns None if model cannot be loaded, so heuristics still run.
    """
    global _nlp

    if _nlp is not None:
        return _nlp

    with _nlp_lock:
        if _nlp is None:
            try:
                import spacy
                _nlp = spacy.load("en_core_web_sm")
            except Exception:
                _nlp = False

    return _nlp if _nlp is not False else None


def extract_name(text):
    """
    Extract name using a combination of:
    1. spaCy NER for PERSON entities in the first few lines
    2. Heuristic: 2-4 word line near the top with only letters
    """
    first_lines = text.split("\n")[:10]
    top_text = "\n".join(first_lines)

    # Strategy 1: spaCy NER
    nlp = _get_nlp()
    if nlp is not None:
        doc = nlp(top_text)
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                name = ent.text.strip()
                # Strip newlines and everything after (NER can span lines)
                if "\n" in name:
                    name = name.split("\n")[0].strip()
                # Strip label text that may be attached
                for label in ["phone", "email", "linkedin", "github", "address", "mobile"]:
                    name = re.sub(r"\s*" + label + r".*$", "", name, flags=re.IGNORECASE).strip()
                # Validate: should be 2-4 words, mostly letters
                words = name.split()
                if 2 <= len(words) <= 4 and all(w.isalpha() for w in words):
                    return name

    # Strategy 2: Heuristic - look for a 2-4 word all-alpha line
    for line in first_lines:
        line = line.strip()
        if not line:
            continue

        # Skip lines with URLs, emails, numbers
        if any(skip in line.lower() for skip in ["http", "www", "@", "|"]):
            continue
        if any(char.isdigit() for char in line):
            continue

        words = line.split()
        if 2 <= len(words) <= 4 and all(word.isalpha() for word in words):
            return line

    return None


def extract_email(text):
    match = re.search(EMAIL_REGEX, text)
    return match.group(0) if match else None


def extract_phone(text):
    """
    Extract phone number, trying multiple patterns for
    Indian and international formats.
    """
    # Indian mobile number patterns
    patterns = [
        r"\+91[\s\-.]?\d{5}[\s\-.]?\d{5}",  # +91-XXXXX XXXXX
        r"\+91[\s\-.]?\d{10}",                # +91XXXXXXXXXX
        r"0?\d{10}",                           # 0XXXXXXXXXX or XXXXXXXXXX
        r"\(\d{3,5}\)[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}",  # (XXX) XXX-XXXX
        PHONE_REGEX,                           # Generic fallback
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            phone = match.group(0).strip()
            # Validate: should have at least 10 digits
            digits = re.sub(r"\D", "", phone)
            if len(digits) >= 10:
                return phone

    return None


def extract_linkedin(text):
    match = re.search(LINKEDIN_REGEX, text, re.IGNORECASE)
    return match.group(0) if match else None


def extract_github(text):
    match = re.search(GITHUB_REGEX, text, re.IGNORECASE)
    return match.group(0) if match else None
