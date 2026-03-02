import re
from parser.config import SKILLS


def extract_skills(text):
    """
    Extract skills using case-insensitive matching against the skills database.
    Uses word-boundary-aware matching to avoid false positives (e.g., 'c' in 'computer').
    """
    text_lower = text.lower()
    found_skills = set()

    for skill in SKILLS:
        skill_lower = skill.lower()

        # For very short skills (1-2 chars like 'c', 'r'), require word boundaries
        if len(skill_lower) <= 2:
            pattern = r"\b" + re.escape(skill_lower) + r"\b"
            if re.search(pattern, text_lower):
                found_skills.add(skill)
        else:
            # For longer skills, use simple substring matching but with some
            # boundary awareness to avoid partial matches
            pattern = r"(?:^|[\s,;|/(])" + re.escape(skill_lower) + r"(?:$|[\s,;|/)])"
            if re.search(pattern, text_lower):
                found_skills.add(skill)

    # Deduplicate variations (keep the most specific version)
    deduplicated = _deduplicate_skills(found_skills)

    # Confidence: ratio of found skills to a reasonable expected count
    confidence = round(min((len(deduplicated) / 8) * 100, 100), 2)

    return {
        "skills": sorted(deduplicated),
        "count": len(deduplicated),
        "confidence_score": confidence,
    }


def _deduplicate_skills(skills):
    """
    Remove duplicate variations of the same skill.
    E.g., if both 'react' and 'react.js' and 'reactjs' are found,
    keep only 'react.js' (the most descriptive).
    """
    # Group variations
    variation_groups = {
        frozenset(["react", "react.js", "reactjs", "react js"]): "React.js",
        frozenset(["angular", "angular.js", "angularjs"]): "Angular",
        frozenset(["vue", "vue.js", "vuejs"]): "Vue.js",
        frozenset(["node.js", "nodejs", "node js"]): "Node.js",
        frozenset(["next.js", "nextjs", "next js"]): "Next.js",
        frozenset(["express", "express.js", "expressjs"]): "Express.js",
        frozenset(["scikit-learn", "sklearn"]): "Scikit-learn",
        frozenset(["spring", "spring boot", "springboot"]): "Spring Boot",
    }

    result = set()
    matched_groups = set()

    for skill in skills:
        skill_lower = skill.lower()
        grouped = False

        for group_set, canonical_name in variation_groups.items():
            if skill_lower in group_set:
                if id(group_set) not in matched_groups:
                    matched_groups.add(id(group_set))
                    result.add(canonical_name)
                grouped = True
                break

        if not grouped:
            result.add(skill)

    return result
