import traceback

import pandas as pd
from jobspy import scrape_jobs


# Scrape each source independently so one weak source does not suppress the others.
PRIMARY_SITES = ["linkedin", "indeed"]
RESULTS_PER_SITE = 12


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
        site_args["country_indeed"] = "India"

    return scrape_jobs(**site_args)


def _safe_str(value):
    """Convert a value to string, returning empty string for None/NaN."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    return str(value)


def _build_location(row):
    """Extract the best location string from a row."""
    loc = _safe_str(row.get("location"))
    if loc:
        return loc
    city = _safe_str(row.get("city"))
    state = _safe_str(row.get("state"))
    parts = [part for part in [city, state] if part]
    return ", ".join(parts) if parts else ""


def _build_salary_range(row):
    """Build a human-readable salary string from min/max amounts."""
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
    """Extract skills list from the row if available."""
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


def fetch_jobs(query, location, page=1):
    """
    Scrape jobs from LinkedIn and Indeed using python-jobspy.
    Each site is queried independently, then the results are merged and deduped.
    """
    try:
        offset = max(page - 1, 0) * RESULTS_PER_SITE
        search_term = (query or "").strip() or "software engineer"
        search_location = (location or "").strip() or "India"

        per_site_frames = []
        seen_sites = []

        for site in PRIMARY_SITES:
            try:
                df = _scrape_site(
                    site=site,
                    query=search_term,
                    location=search_location,
                    results_wanted=RESULTS_PER_SITE,
                    offset=offset,
                )
                if df is not None and not df.empty:
                    per_site_frames.append(df)
                    seen_sites.append(site)
                    print(f"[JobScraper] {site} returned {len(df)} rows")
                else:
                    print(f"[JobScraper] {site} returned no rows")
            except Exception as site_err:
                print(f"[JobScraper] {site} scrape failed: {site_err}")

        if not per_site_frames:
            print("[JobScraper] No jobs returned from any source")
            return []

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

        print(f"[JobScraper] Returning {len(jobs_list)} jobs from sites: {seen_sites}")
        return jobs_list

    except Exception as error:
        print(f"[JobScraper] Fatal error: {error}")
        traceback.print_exc()
        raise
