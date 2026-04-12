"""
Quick smoke test for the LLM extractor's regex fallback.
Run with: python test_llm_extractor.py
"""

from job_data.llm_extractor import extract_job_details_with_llm, _regex_fallback, _html_to_text

# ── Test 1: HTML → text extraction ──
print("=" * 60)
print("TEST 1: HTML to text conversion")
print("=" * 60)

html = """
<div class="job-posting">
  <h1>Senior Backend Engineer</h1>
  <script>var tracking = true;</script>
  <p>Location: <strong>Bengaluru, India</strong> (Hybrid)</p>
  <p>Salary: 18-25 LPA</p>
  <p>Experience: 5+ years</p>
  <h2>Requirements</h2>
  <ul>
    <li>Python, Django, FastAPI</li>
    <li>PostgreSQL, Redis, Kafka</li>
    <li>Docker, Kubernetes, AWS</li>
    <li>We sponsor H1B visas for qualified candidates</li>
  </ul>
</div>
"""

text = _html_to_text(html)
print(f"Cleaned text ({len(text)} chars):")
print(text[:300])
print()

# ── Test 2: Regex fallback on HTML ──
print("=" * 60)
print("TEST 2: Regex fallback extraction")
print("=" * 60)

result = _regex_fallback(text, "Senior Backend Engineer")
print(f"  job_title:        {result['job_title']}")
print(f"  salary_min:       {result['salary_min']}")
print(f"  salary_max:       {result['salary_max']}")
print(f"  yoe_required:     {result['yoe_required']}")
print(f"  visa_sponsorship: {result['visa_sponsorship']}")
print(f"  technical_skills: {result['technical_skills']}")
print(f"  remote_status:    {result['remote_status']}")
print()

# Assertions
assert result["job_title"] == "Senior Backend Engineer"
assert result["salary_min"] == 1_800_000, f"Expected 1800000, got {result['salary_min']}"
assert result["salary_max"] == 2_500_000, f"Expected 2500000, got {result['salary_max']}"
assert result["yoe_required"] == 5
assert result["visa_sponsorship"] is True
assert "Python" in result["technical_skills"]
assert "Docker" in result["technical_skills"]
assert "Kubernetes" in result["technical_skills"]
assert result["remote_status"] == "Hybrid"

print("✅ All regex assertions passed!")
print()

# ── Test 3: Full pipeline (will use regex since no API key) ──
print("=" * 60)
print("TEST 3: Full extract_job_details_with_llm pipeline (no API key = fallback)")
print("=" * 60)

full_result = extract_job_details_with_llm(html, "Senior Backend Engineer")
print(f"  Result: {full_result}")
assert full_result["yoe_required"] == 5
assert len(full_result["technical_skills"]) >= 3
print("✅ Full pipeline test passed!")
print()

# ── Test 4: Plain text input (no HTML) ──
print("=" * 60)
print("TEST 4: Plain text input")
print("=" * 60)

plain = """
Software Engineer - Remote
We're looking for a Python developer with 3+ years of experience.
Tech stack: React, Node.js, MongoDB, AWS.
Salary: $120k-$150k per year.
"""

plain_result = extract_job_details_with_llm(plain, "Software Engineer")
print(f"  job_title:        {plain_result['job_title']}")
print(f"  salary_min:       {plain_result['salary_min']}")
print(f"  salary_max:       {plain_result['salary_max']}")
print(f"  yoe_required:     {plain_result['yoe_required']}")
print(f"  remote_status:    {plain_result['remote_status']}")
print(f"  technical_skills: {plain_result['technical_skills']}")
assert plain_result["yoe_required"] == 3
assert plain_result["remote_status"] == "Remote"
assert "Python" in plain_result["technical_skills"]
print("✅ Plain text test passed!")
print()

# ── Test 5: Empty input ──
print("=" * 60)
print("TEST 5: Empty input")
print("=" * 60)
empty_result = extract_job_details_with_llm("")
assert empty_result["job_title"] == "Unknown"
assert empty_result["salary_min"] is None
assert empty_result["technical_skills"] == []
print(f"  Result: {empty_result}")
print("✅ Empty input test passed!")
print()

print("=" * 60)
print("🎉 ALL TESTS PASSED")
print("=" * 60)
