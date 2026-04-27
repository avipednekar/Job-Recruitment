"""
Skill Gap Learning Resources — Gemini-powered recommendations
=============================================================
Given a list of missing skills and a target role, generates curated
learning resources using Google Gemini with a static fallback.
"""
import os
import json

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODELS_ENV = os.getenv("GEMINI_MODELS", "gemini-3-flash-preview,gemini-3.1-flash-lite-preview")
GEMINI_MODELS = [m.strip() for m in GEMINI_MODELS_ENV.split(",") if m.strip()]

SKILL_RESOURCES_PROMPT = """You are a career development AI advisor. Given a list of missing skills and a target job role, suggest the BEST learning resources for each skill.

For each skill, return exactly ONE resource object with:
- skill: the skill name
- course: course/resource name
- platform: one of "Coursera", "Udemy", "YouTube", "freeCodeCamp", "Pluralsight", "edX", "Codecademy", "LeetCode", "MDN", "Official Docs"
- url: a real, working URL to the resource (use actual course URLs you know)
- estimated_hours: estimated completion time in hours (number)
- difficulty: one of "Beginner", "Intermediate", "Advanced"
- reason: 1 sentence explaining why this resource is the best choice for this skill gap

Return ONLY valid JSON — an array of objects. No markdown, no code fences.
Example: [{"skill": "Docker", "course": "Docker Mastery", "platform": "Udemy", "url": "https://www.udemy.com/course/docker-mastery/", "estimated_hours": 20, "difficulty": "Intermediate", "reason": "Comprehensive hands-on Docker course with Kubernetes intro."}]
"""

# Static fallback mapping for common skills
FALLBACK_RESOURCES = {
    "python": {"course": "Python for Everybody", "platform": "Coursera", "url": "https://www.coursera.org/specializations/python", "estimated_hours": 40, "difficulty": "Beginner", "reason": "University of Michigan's comprehensive Python specialization."},
    "javascript": {"course": "The Complete JavaScript Course", "platform": "Udemy", "url": "https://www.udemy.com/course/the-complete-javascript-course/", "estimated_hours": 69, "difficulty": "Beginner", "reason": "Most popular JS course covering modern ES6+ features."},
    "react": {"course": "React - The Complete Guide", "platform": "Udemy", "url": "https://www.udemy.com/course/react-the-complete-guide-incl-redux/", "estimated_hours": 50, "difficulty": "Intermediate", "reason": "Covers React 18, hooks, Redux, and Next.js."},
    "node.js": {"course": "The Complete Node.js Developer Course", "platform": "Udemy", "url": "https://www.udemy.com/course/the-complete-nodejs-developer-course-2/", "estimated_hours": 35, "difficulty": "Intermediate", "reason": "Full-stack Node.js with Express and MongoDB."},
    "typescript": {"course": "Understanding TypeScript", "platform": "Udemy", "url": "https://www.udemy.com/course/understanding-typescript/", "estimated_hours": 15, "difficulty": "Intermediate", "reason": "Deep dive into TypeScript types, generics, and decorators."},
    "docker": {"course": "Docker Mastery", "platform": "Udemy", "url": "https://www.udemy.com/course/docker-mastery/", "estimated_hours": 20, "difficulty": "Intermediate", "reason": "Hands-on Docker with Kubernetes introduction."},
    "kubernetes": {"course": "Kubernetes for the Absolute Beginners", "platform": "Udemy", "url": "https://www.udemy.com/course/learn-kubernetes/", "estimated_hours": 10, "difficulty": "Beginner", "reason": "Hands-on labs with Kubernetes fundamentals."},
    "aws": {"course": "AWS Certified Cloud Practitioner", "platform": "Coursera", "url": "https://www.coursera.org/professional-certificates/aws-cloud-technology-consultant", "estimated_hours": 30, "difficulty": "Beginner", "reason": "Official AWS preparation course."},
    "sql": {"course": "The Complete SQL Bootcamp", "platform": "Udemy", "url": "https://www.udemy.com/course/the-complete-sql-bootcamp/", "estimated_hours": 9, "difficulty": "Beginner", "reason": "Learn PostgreSQL with practical exercises."},
    "git": {"course": "Git & GitHub Crash Course", "platform": "YouTube", "url": "https://www.youtube.com/watch?v=RGOj5yH7evk", "estimated_hours": 2, "difficulty": "Beginner", "reason": "freeCodeCamp's popular Git tutorial."},
    "machine learning": {"course": "Machine Learning Specialization", "platform": "Coursera", "url": "https://www.coursera.org/specializations/machine-learning-introduction", "estimated_hours": 60, "difficulty": "Intermediate", "reason": "Andrew Ng's updated ML course with Python."},
    "system design": {"course": "Grokking System Design Interview", "platform": "Udemy", "url": "https://www.udemy.com/course/system-design-interview-prep/", "estimated_hours": 15, "difficulty": "Advanced", "reason": "Essential for senior engineering interviews."},
    "ci/cd": {"course": "GitHub Actions - The Complete Guide", "platform": "Udemy", "url": "https://www.udemy.com/course/github-actions-the-complete-guide/", "estimated_hours": 10, "difficulty": "Intermediate", "reason": "Modern CI/CD pipeline automation."},
    "graphql": {"course": "Modern GraphQL with Node.js", "platform": "Udemy", "url": "https://www.udemy.com/course/graphql-bootcamp/", "estimated_hours": 20, "difficulty": "Intermediate", "reason": "Full-stack GraphQL with Apollo and React."},
    "redis": {"course": "Redis: The Complete Developer's Guide", "platform": "Udemy", "url": "https://www.udemy.com/course/redis-the-complete-developers-guide-p/", "estimated_hours": 15, "difficulty": "Intermediate", "reason": "Complete guide to Redis data structures and caching."},
}


def fallback_skill_resources(missing_skills: list, target_role: str = "") -> list:
    """Return static resource recommendations for known skills."""
    resources = []
    for skill in missing_skills[:10]:  # Cap at 10
        skill_lower = skill.lower().strip()
        if skill_lower in FALLBACK_RESOURCES:
            entry = FALLBACK_RESOURCES[skill_lower].copy()
            entry["skill"] = skill
            resources.append(entry)
        else:
            resources.append({
                "skill": skill,
                "course": f"Learn {skill}",
                "platform": "YouTube",
                "url": f"https://www.youtube.com/results?search_query=learn+{skill.replace(' ', '+')}+tutorial",
                "estimated_hours": 10,
                "difficulty": "Intermediate",
                "reason": f"Search for top-rated {skill} tutorials on YouTube.",
            })
    return resources


def generate_skill_resources(missing_skills: list, target_role: str = "") -> list:
    """
    Use Gemini to generate learning resource recommendations.
    Falls back to static mapping if Gemini is unavailable.
    """
    if not missing_skills:
        return []

    if not GEMINI_API_KEY:
        print("[SKILL_RESOURCES] No GEMINI_API_KEY. Using fallback.")
        return fallback_skill_resources(missing_skills, target_role)

    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=GEMINI_API_KEY)

        prompt = f"""Target Role: {target_role or 'Not specified'}
Missing Skills: {json.dumps(missing_skills)}

Generate learning resource recommendations for each missing skill."""

        for model_name in GEMINI_MODELS:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=[SKILL_RESOURCES_PROMPT, prompt],
                    config=types.GenerateContentConfig(
                        temperature=0.3,
                        max_output_tokens=4096,
                        response_mime_type="application/json"
                    ),
                )

                raw_text = response.text.strip()
                if raw_text.startswith("```"):
                    raw_text = raw_text.split("\n", 1)[-1]
                    if raw_text.endswith("```"):
                        raw_text = raw_text[:-3].strip()

                result = json.loads(raw_text)
                if isinstance(result, list):
                    return result[:10]  # Cap at 10

                print(f"[SKILL_RESOURCES] Unexpected response type: {type(result)}")
            except json.JSONDecodeError as e:
                print(f"[SKILL_RESOURCES] JSON parse error with {model_name}: {e}")
            except Exception as e:
                print(f"[SKILL_RESOURCES] Gemini call failed with {model_name}: {e}")

        print("[SKILL_RESOURCES] All models failed. Using fallback.")
        return fallback_skill_resources(missing_skills, target_role)

    except Exception as e:
        print(f"[SKILL_RESOURCES] Critical error: {e}")
        return fallback_skill_resources(missing_skills, target_role)
