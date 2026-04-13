import re
from threading import Lock

_nlp = None
_nlp_lock = Lock()

EMAIL_REGEX = r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
PHONE_REGEX = r"(\+?\d{1,3}[\s\-.]?)?\(?\d{2,5}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}"
LINKEDIN_REGEX = r"(?:https?://)?(?:www\.)?linkedin\.com/in/[\w\-]+"
GITHUB_REGEX = r"(?:https?://)?(?:www\.)?github\.com/[\w\-]+"
LOCATION_LABEL_REGEX = r"(?i)(?:current\s+location|preferred\s+location|location|address|based\s+in)\s*[:\-]\s*([^\n|]+)"

INDIA_LOCATION_KEYWORDS = {
    "india", "mumbai", "pune", "bangalore", "bengaluru", "hyderabad", "chennai",
    "delhi", "new delhi", "noida", "gurugram", "gurgaon", "kolkata", "ahmedabad",
    "surat", "jaipur", "lucknow", "kanpur", "nagpur", "indore", "thane", "bhopal",
    "visakhapatnam", "patna", "vadodara", "ludhiana", "agra", "nashik", "faridabad",
    "meerut", "rajkot", "varanasi", "srinagar", "aurangabad", "dhanbad", "amritsar",
    "navi mumbai", "allahabad", "prayagraj", "ranchi", "howrah", "coimbatore",
    "jabalpur", "gwalior", "vijayawada", "jodhpur", "madurai", "raipur", "kochi",
    "cochin", "chandigarh", "trivandrum", "thiruvananthapuram", "goa", "kolhapur",
    "maharashtra", "karnataka", "telangana", "tamil nadu", "kerala", "gujarat",
    "rajasthan", "uttar pradesh", "madhya pradesh", "west bengal",
}

US_STATE_KEYWORDS = {
    "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
    "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
    "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
    "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada",
    "new hampshire", "new jersey", "new mexico", "new york", "north carolina",
    "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania", "rhode island",
    "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
    "virginia", "washington", "west virginia", "wisconsin", "wyoming",
}

US_STATE_ABBREVIATIONS = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN",
    "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV",
    "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN",
    "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
}

INSTITUTION_KEYWORDS = {
    "college", "university", "institute", "school", "campus", "academy",
    "polytechnic", "faculty", "department", "education", "engineering college",
    "bachelor", "master", "btech", "mtech", "b e", "be", "bsc", "msc", "mba",
}


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

    # Strategy 1: prefer the first strong-looking line near the top.
    for idx, line in enumerate(first_lines[:4]):
        line = line.strip()
        if not line:
            continue

        lowered = line.lower()
        if any(skip in lowered for skip in [
            "http", "www", "@", "|", "linkedin", "github", "summary",
            "experience", "education", "skills",
        ]):
            continue
        if any(char.isdigit() for char in line):
            continue

        words = line.split()
        if 2 <= len(words) <= 4 and all(word.replace(".", "").isalpha() for word in words):
            if idx == 0 or line.isupper() or all(word[:1].isupper() for word in words):
                return line

    # Strategy 2: spaCy NER
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

    # Strategy 3: Heuristic - look for a 2-4 word all-alpha line
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


def _clean_location_text(value):
    if not value:
        return None

    cleaned = re.sub(r"(https?://\S+|www\.\S+|linkedin\.com/\S+|github\.com/\S+)", "", str(value), flags=re.IGNORECASE)
    cleaned = re.sub(EMAIL_REGEX, "", cleaned)
    cleaned = re.sub(r"\+?\d[\d\s().\-]{7,}\d", "", cleaned)
    cleaned = re.sub(r"\b\d{4,6}\b", "", cleaned)
    cleaned = cleaned.replace("•", "|")
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,|-")
    if not cleaned:
        return None

    lowered = cleaned.lower()
    if any(token in lowered for token in ["@", "http", "www", "linkedin", "github"]):
        return None

    digit_count = sum(char.isdigit() for char in cleaned)
    if digit_count > 3:
        return None

    return cleaned


def _normalize_location_segment(value):
    cleaned = _clean_location_text(value)
    if not cleaned:
        return None

    parts = [part.strip() for part in cleaned.split(",") if part.strip()]
    filtered = []
    for part in parts:
        if re.fullmatch(r"\d{4,6}", part):
            continue
        if part.upper() == "IN" and filtered:
            continue
        filtered.append(part)

    if not filtered:
        return None

    if len(filtered) >= 2:
        last = filtered[-1]
        last_lower = last.lower()
        if (
            last_lower in INDIA_LOCATION_KEYWORDS
            or last_lower in US_STATE_KEYWORDS
            or last.upper() in US_STATE_ABBREVIATIONS
        ):
            prev = filtered[-2]
            if prev and not _looks_like_institution(prev):
                return f"{prev}, {last}"

    if _looks_like_institution(filtered[-1]):
        return None

    return ", ".join(filtered[-2:]) if len(filtered) >= 2 else filtered[0]


def _contains_location_anchor(value):
    cleaned = _clean_location_text(value)
    if not cleaned:
        return False

    lowered = cleaned.lower()
    if any(keyword in lowered for keyword in INDIA_LOCATION_KEYWORDS):
        return True

    if any(keyword in lowered for keyword in US_STATE_KEYWORDS):
        return True

    parts = [part.strip() for part in cleaned.split(",") if part.strip()]
    if len(parts) >= 2 and parts[-1].upper() in US_STATE_ABBREVIATIONS:
        return True

    return False


def _looks_like_institution(value):
    cleaned = _clean_location_text(value)
    if not cleaned:
        return False

    lowered = cleaned.lower()
    return any(keyword in lowered for keyword in INSTITUTION_KEYWORDS)


def _extract_location_fragment(value):
    normalized = _normalize_location_segment(value)
    cleaned = _clean_location_text(normalized or value)
    if not cleaned:
        return None

    if normalized and _contains_location_anchor(normalized):
        return normalized

    parts = [part.strip() for part in re.split(r"[,|;/()-]+", cleaned) if part.strip()]
    if not parts:
        return None

    collected = []
    for part in reversed(parts):
        part_clean = _clean_location_text(part)
        if not part_clean:
            continue

        lowered = part_clean.lower()
        if _looks_like_institution(part_clean):
            if collected:
                break
            continue

        if any(keyword in lowered for keyword in INDIA_LOCATION_KEYWORDS) or lowered in US_STATE_KEYWORDS or part_clean.upper() in US_STATE_ABBREVIATIONS:
            collected.insert(0, part_clean)
            if len(collected) >= 2:
                break
            continue

        if collected:
            if len(collected) == 1 and re.fullmatch(r"[A-Za-z .]{2,40}", part_clean):
                collected.insert(0, part_clean)
            break

    if collected:
        return ", ".join(collected)

    if _looks_like_institution(cleaned):
        return None

    return cleaned


def _looks_like_location(value):
    cleaned = _clean_location_text(_extract_location_fragment(value))
    if not cleaned:
        return False

    if _contains_location_anchor(cleaned):
        return True

    words = [word for word in re.split(r"\s+", cleaned) if word]
    if "," in cleaned and 2 <= len(words) <= 5 and all(
        word[0].isupper() or word.upper() in US_STATE_ABBREVIATIONS
        for word in words
        if word[0].isalnum()
    ):
        return True

    return False


def extract_location(text):
    """
    Extract candidate location from the top portion of the resume.
    Prefers explicit labels such as "Location: Pune, India", then falls back
    to short top-of-resume lines that look like Indian city/state strings.
    """
    first_lines = [line.strip() for line in text.split("\n")[:8] if line.strip()]
    top_text = "\n".join(first_lines)

    label_match = re.search(LOCATION_LABEL_REGEX, top_text)
    if label_match:
        labeled_location = _extract_location_fragment(label_match.group(1))
        if _looks_like_location(labeled_location):
            return labeled_location

    for line in first_lines:
        for segment in re.split(r"[|•]", line):
            candidate = _extract_location_fragment(segment)
            if _looks_like_location(candidate):
                return candidate

        if _looks_like_location(line):
            return _extract_location_fragment(line)

    return None
