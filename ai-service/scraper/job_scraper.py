import os
import traceback

import pandas as pd
from bs4 import BeautifulSoup
from jobspy import scrape_jobs

from scraper.direct_scraper import scrape_direct_company_boards


def _normalize_sites(raw_value):
    default_sites = ["linkedin", "indeed"]
    source = raw_value if raw_value is not None else os.getenv("JOB_SCRAPER_SITES", "")
    values = source if isinstance(source, list) else str(source).split(",")

    normalized = []
    seen = set()
    for item in values:
        site = str(item or "").strip().lower()
        if not site or site in seen:
            continue
        seen.add(site)
        normalized.append(site)

    return normalized or default_sites


PRIMARY_SITES = _normalize_sites(None)
RESULTS_PER_QUERY = int(os.getenv("JOB_SCRAPER_RESULTS_PER_QUERY", "10"))
MAX_QUERY_VARIANTS = int(os.getenv("JOB_SCRAPER_MAX_QUERY_VARIANTS", "5"))
DIRECT_JOB_BOARD_URLS = [
    url.strip()
    for url in os.getenv("DIRECT_JOB_BOARD_URLS", "").split(",")
    if url.strip()
]


def _normalize_queries(query):
    if isinstance(query, list):
        raw_queries = query
    else:
        raw_queries = [query]

    normalized = []
    seen = set()
    for item in raw_queries:
        value = str(item or "").strip()
        if not value:
            continue
        lowered = value.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalized.append(value)

    return normalized[:MAX_QUERY_VARIANTS] or ["software engineer"]


def _scrape_site(site, query, location, results_wanted, offset):
    site_args = {
        "site_name": [site],
        "search_term": query,
        "location": location,
        "results_wanted": results_wanted,
        "offset": offset,
        "linkedin_fetch_description": True,
        "hours_old": 168,
        "description_format": "markdown",
        "verbose": 1,
    }

    if site == "indeed":
        site_args["country_indeed"] = "india"
    elif site == "google":
        site_args["google_search_term"] = query

    return scrape_jobs(**site_args)


def _safe_str(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value)


def _build_location(row):
    loc = _safe_str(row.get("location"))
    if loc:
        return loc
    city = _safe_str(row.get("city"))
    state = _safe_str(row.get("state"))
    parts = [part for part in [city, state] if part]
    return ", ".join(parts) if parts else ""


def _build_salary_range(row):
    min_amt = row.get("min_amount")
    max_amt = row.get("max_amount")
    currency = _safe_str(row.get("currency")) or "INR"
    interval = _safe_str(row.get("interval"))

    if min_amt is not None and max_amt is not None:
        try:
            min_val = float(min_amt)
            max_val = float(max_amt)
            if min_val > 0 and max_val > 0:
                suffix = f"/{interval}" if interval else ""
                return f"{currency} {min_val:,.0f} - {max_val:,.0f}{suffix}"
        except (ValueError, TypeError):
            pass
    return ""


def _extract_skills(row):
    skills = row.get("skills")
    if skills is None or (isinstance(skills, float) and pd.isna(skills)):
        return []
    if isinstance(skills, list):
        return skills
    if isinstance(skills, str) and skills.strip():
        return [skill.strip() for skill in skills.split(",") if skill.strip()]
    return []


def _row_key(row):
    return (
        _safe_str(row.get("job_url")).strip().lower(),
        _safe_str(row.get("title")).strip().lower(),
        _safe_str(row.get("company")).strip().lower(),
        _safe_str(row.get("location")).strip().lower(),
    )


def _job_key(job):
    return (
        _safe_str(job.get("apply_link") or job.get("job_url")).strip().lower(),
        _safe_str(job.get("title")).strip().lower(),
        _safe_str(job.get("company")).strip().lower(),
        _safe_str(job.get("location")).strip().lower(),
    )


def _html_to_text(value):
    if not value:
        return ""
    return BeautifulSoup(str(value), "html.parser").get_text(" ", strip=True)


def _job_matches_queries(job, queries):
    haystack = " ".join([
        _safe_str(job.get("title")),
        _safe_str(job.get("company")),
        _safe_str(job.get("location")),
        _safe_str(job.get("description")),
        _html_to_text(job.get("description_html")),
    ]).lower()

    for query in queries:
        tokens = [token for token in query.lower().split() if len(token) >= 3]
        if not tokens:
            continue
        matched = sum(1 for token in tokens if token in haystack)
        if matched >= max(1, min(2, len(tokens))):
            return True

    return False


def _fetch_jobspy_jobs(queries, location, page):
    offset = max(page - 1, 0) * RESULTS_PER_QUERY
    search_location = (location or "").strip() or "India"
    per_site_frames = []
    seen_sites = set()

    for query in queries:
        for site in PRIMARY_SITES:
            try:
                df = _scrape_site(
                    site=site,
                    query=query,
                    location=search_location,
                    results_wanted=RESULTS_PER_QUERY,
                    offset=offset,
                )
                if df is not None and not df.empty:
                    per_site_frames.append(df)
                    seen_sites.add(site)
                    print(f"[JobScraper] {site} returned {len(df)} rows for query '{query}'")
                else:
                    print(f"[JobScraper] {site} returned no rows for query '{query}'")
            except Exception as site_err:
                print(f"[JobScraper] {site} scrape failed for '{query}': {site_err}")

    if not per_site_frames:
        return [], []

    jobs_df = pd.concat(per_site_frames, ignore_index=True)
    jobs_df = jobs_df.where(pd.notna(jobs_df), None)

    jobs_list = []
    seen_keys = set()
    for _, row in jobs_df.iterrows():
        try:
            key = _row_key(row)
            if key in seen_keys:
                continue
            seen_keys.add(key)

            description = _safe_str(row.get("description"))
            if len(description) > 3000:
                description = description[:3000] + "..."

            jobs_list.append({
                "id": _safe_str(row.get("id")) or _safe_str(row.get("job_url")),
                "title": _safe_str(row.get("title")),
                "company": _safe_str(row.get("company")),
                "location": _build_location(row),
                "logo": _safe_str(row.get("company_logo")),
                "employment_type": _safe_str(row.get("job_type")) or "Full-time",
                "remote": bool(row.get("is_remote", False)),
                "description": description,
                "apply_link": _safe_str(row.get("job_url")),
                "source": _safe_str(row.get("site")) or "external",
                "postedAt": _safe_str(row.get("date_posted")) or None,
                "salary_range": _build_salary_range(row),
                "job_level": _safe_str(row.get("job_level")),
                "skills": _extract_skills(row),
                "company_url": _safe_str(row.get("company_url")),
            })
        except Exception as row_err:
            print(f"[JobScraper] Skipping malformed row: {row_err}")

    return jobs_list, sorted(seen_sites)


def _fetch_direct_jobs(queries):
    if not DIRECT_JOB_BOARD_URLS:
        return []

    try:
        direct_jobs = scrape_direct_company_boards(DIRECT_JOB_BOARD_URLS)
    except Exception as error:
        print(f"[JobScraper] Direct ATS scrape failed: {error}")
        return []

    filtered_jobs = []
    seen_keys = set()
    for job in direct_jobs:
        if not _job_matches_queries(job, queries):
            continue
        key = _job_key(job)
        if key in seen_keys:
            continue
        seen_keys.add(key)

        description = _html_to_text(job.get("description_html"))
        if len(description) > 3000:
            description = description[:3000] + "..."

        filtered_jobs.append({
            "id": _safe_str(job.get("id")) or _safe_str(job.get("apply_link")),
            "title": _safe_str(job.get("title")),
            "company": _safe_str(job.get("company")),
            "location": _safe_str(job.get("location")),
            "logo": "",
            "employment_type": _safe_str(job.get("employment_type")) or "Full-time",
            "remote": "remote" in _safe_str(job.get("location")).lower(),
            "description": description,
            "apply_link": _safe_str(job.get("apply_link")),
            "source": _safe_str(job.get("source")) or "direct",
            "postedAt": _safe_str(job.get("postedAt")) or None,
            "salary_range": _safe_str(job.get("salary_range")),
            "job_level": _safe_str(job.get("job_level")),
            "skills": job.get("technical_skills", []) if isinstance(job.get("technical_skills"), list) else [],
            "company_url": _safe_str(job.get("source_board_url")),
        })

    print(f"[JobScraper] Direct ATS returned {len(filtered_jobs)} filtered jobs")
    return filtered_jobs


def fetch_jobs(query, location, page=1):
    """
    Scrape jobs using multiple query variants across LinkedIn/Indeed,
    and optionally merge direct ATS board results configured in env.
    """
    try:
        queries = _normalize_queries(query)
        jobs_list, seen_sites = _fetch_jobspy_jobs(queries, location, page)
        direct_jobs = _fetch_direct_jobs(queries) if page == 1 else []

        all_jobs = []
        seen_keys = set()
        for job in [*jobs_list, *direct_jobs]:
            key = _job_key(job)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            all_jobs.append(job)

        print(f"[JobScraper] Returning {len(all_jobs)} jobs from sites: {seen_sites} and direct={len(direct_jobs)}")
        return all_jobs

    except Exception as error:
        print(f"[JobScraper] Fatal error: {error}")
        traceback.print_exc()
        raise
