import traceback
import pandas as pd
from jobspy import scrape_jobs


# Sites that reliably work for India-based job searches.
# LinkedIn: works consistently, broad coverage.
# Indeed:   works with country_indeed="India", good for India-specific roles.
# Naukri:   blocked by recaptcha (406) — excluded.
# Glassdoor/Google: unreliable API responses — excluded.
PRIMARY_SITES = ["linkedin", "indeed"]
FALLBACK_SITES = ["linkedin"]  # if Indeed fails, at least get LinkedIn


def _scrape_with_fallback(query, location, results_wanted, offset):
    """
    Try scraping all PRIMARY_SITES first.
    If that fails entirely, try FALLBACK_SITES one at a time.
    Returns a DataFrame (possibly empty).
    """
    # Attempt 1: all primary sites together
    try:
        df = scrape_jobs(
            site_name=PRIMARY_SITES,
            search_term=query,
            location=location,
            results_wanted=results_wanted,
            offset=offset,
            country_indeed="India",
            linkedin_fetch_description=True,
            hours_old=72,
            description_format="markdown",
            verbose=1,
        )
        if not df.empty:
            return df
    except Exception as e:
        print(f"[JobScraper] Primary scrape failed: {e}")

    # Attempt 2: try each fallback site individually
    for site in FALLBACK_SITES:
        try:
            print(f"[JobScraper] Attempting fallback with {site}...")
            df = scrape_jobs(
                site_name=[site],
                search_term=query,
                location=location,
                results_wanted=results_wanted,
                offset=offset,
                country_indeed="India",
                linkedin_fetch_description=True,
                hours_old=72,
                description_format="markdown",
                verbose=1,
            )
            if not df.empty:
                return df
        except Exception as e:
            print(f"[JobScraper] Fallback {site} failed: {e}")

    return pd.DataFrame()


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
    # Fallback: piece together from city/state if present
    city = _safe_str(row.get("city"))
    state = _safe_str(row.get("state"))
    parts = [p for p in [city, state] if p]
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
        return [s.strip() for s in skills.split(",") if s.strip()]
    return []


def fetch_jobs(query, location, page=1):
    """
    Scrapes jobs from LinkedIn and Indeed using python-jobspy.
    Returns a list of normalized dictionaries with job details.
    """
    try:
        results_wanted = 15
        offset = (page - 1) * results_wanted

        search_term = f"{query} {location}".strip() if location else query.strip()

        jobs_df = _scrape_with_fallback(
            query=search_term,
            location=location or "India",
            results_wanted=results_wanted,
            offset=offset,
        )

        if jobs_df.empty:
            print("[JobScraper] No jobs returned from any source")
            return []

        # Convert NaN to None for safe access
        jobs_df = jobs_df.where(pd.notna(jobs_df), None)

        jobs_list = []
        for _, row in jobs_df.iterrows():
            try:
                location_str = _build_location(row)
                salary_range = _build_salary_range(row)
                skills = _extract_skills(row)

                # Strip excessively long descriptions for the API response
                description = _safe_str(row.get("description"))
                if len(description) > 3000:
                    description = description[:3000] + "..."

                job = {
                    "id": _safe_str(row.get("id")),
                    "title": _safe_str(row.get("title")),
                    "company": _safe_str(row.get("company")),
                    "location": location_str,
                    "logo": _safe_str(row.get("company_logo")),
                    "employment_type": _safe_str(row.get("job_type")) or "Full-time",
                    "remote": bool(row.get("is_remote", False)),
                    "description": description,
                    "apply_link": _safe_str(row.get("job_url")),
                    "source": _safe_str(row.get("site")) or "external",
                    "postedAt": _safe_str(row.get("date_posted")) or None,
                    "salary_range": salary_range,
                    "job_level": _safe_str(row.get("job_level")),
                    "skills": skills,
                    "company_url": _safe_str(row.get("company_url")),
                }
                jobs_list.append(job)
            except Exception as row_err:
                print(f"[JobScraper] Skipping malformed row: {row_err}")
                continue

        print(f"[JobScraper] Returning {len(jobs_list)} jobs from {jobs_df['site'].unique().tolist() if 'site' in jobs_df.columns else 'unknown'}")
        return jobs_list

    except Exception as e:
        print(f"[JobScraper] Fatal error: {e}")
        traceback.print_exc()
        raise
