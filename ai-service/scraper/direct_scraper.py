"""
Direct Company Board Scraper with Proxy Integration
====================================================

Scrapes job listings directly from employer ATS pages:
- Greenhouse (boards.greenhouse.io)
- Lever (jobs.lever.co)
- Workday (*.myworkdayjobs.com)
- Ashby (jobs.ashbyhq.com)
- Generic career pages (via ScraperAPI proxy)

Proxy support:
    Set SCRAPER_API_KEY in .env to route requests through ScraperAPI.
    Without a key, requests go direct (may get blocked on some sites).

Usage:
    from scraper.direct_scraper import scrape_direct_company_boards

    jobs = scrape_direct_company_boards([
        "https://boards.greenhouse.io/openai",
        "https://jobs.lever.co/stripe",
    ])
"""

import json
import os
import re
import traceback
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

# ─────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────

SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY", "")
SCRAPER_API_URL = "https://api.scraperapi.com"

REQUEST_TIMEOUT = 30  # seconds
MAX_JOBS_PER_BOARD = 50  # cap per company to avoid overload

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}


# ─────────────────────────────────────────────
# HTTP layer (direct or proxy)
# ─────────────────────────────────────────────

def _fetch_url(url: str, render_js: bool = False) -> str:
    """
    Fetch a URL's HTML content.
    Routes through ScraperAPI if SCRAPER_API_KEY is set, otherwise goes direct.
    """
    if SCRAPER_API_KEY:
        params = {
            "api_key": SCRAPER_API_KEY,
            "url": url,
            "country_code": "in",
        }
        if render_js:
            params["render"] = "true"

        print(f"[DIRECT_SCRAPER] Fetching via ScraperAPI: {url}")
        response = requests.get(SCRAPER_API_URL, params=params, timeout=REQUEST_TIMEOUT)
    else:
        print(f"[DIRECT_SCRAPER] Fetching direct (no proxy): {url}")
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)

    response.raise_for_status()
    return response.text


def _fetch_json(url: str) -> dict | list | None:
    """Fetch a URL expecting JSON response."""
    if SCRAPER_API_KEY:
        params = {
            "api_key": SCRAPER_API_KEY,
            "url": url,
            "country_code": "in",
        }
        response = requests.get(SCRAPER_API_URL, params=params, timeout=REQUEST_TIMEOUT)
    else:
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)

    response.raise_for_status()
    return response.json()


# ─────────────────────────────────────────────
# ATS: Greenhouse
# boards.greenhouse.io/{company} has a public JSON API
# ─────────────────────────────────────────────

def _detect_greenhouse_company(url: str) -> str | None:
    """Extract company slug from a Greenhouse URL."""
    parsed = urlparse(url)
    if "greenhouse.io" in parsed.hostname:
        # boards.greenhouse.io/openai  →  openai
        parts = parsed.path.strip("/").split("/")
        if parts and parts[0]:
            return parts[0]
    return None


def _scrape_greenhouse(company_slug: str, board_url: str) -> list[dict]:
    """Scrape Greenhouse board using their public JSON API."""
    api_url = f"https://boards-api.greenhouse.io/v1/boards/{company_slug}/jobs"
    print(f"[DIRECT_SCRAPER] Greenhouse API: {api_url}")

    try:
        data = _fetch_json(api_url)
        jobs_raw = data.get("jobs", []) if isinstance(data, dict) else []
    except Exception as e:
        print(f"[DIRECT_SCRAPER] Greenhouse API failed, falling back to HTML scrape: {e}")
        return _scrape_greenhouse_html(board_url, company_slug)

    jobs = []
    for job in jobs_raw[:MAX_JOBS_PER_BOARD]:
        location_name = ""
        if job.get("location"):
            location_name = job["location"].get("name", "")

        jobs.append({
            "id": f"gh-{company_slug}-{job.get('id', '')}",
            "title": job.get("title", ""),
            "company": company_slug.replace("-", " ").title(),
            "location": location_name,
            "apply_link": job.get("absolute_url", ""),
            "source": "greenhouse",
            "source_board_url": board_url,
            "description_html": job.get("content", ""),
            "postedAt": job.get("updated_at", None),
        })

    print(f"[DIRECT_SCRAPER] Greenhouse: {len(jobs)} jobs from {company_slug}")
    return jobs


def _scrape_greenhouse_html(url: str, company_slug: str) -> list[dict]:
    """Fallback: scrape Greenhouse board listing page via HTML."""
    try:
        html = _fetch_url(url)
        soup = BeautifulSoup(html, "html.parser")
        jobs = []

        # Greenhouse boards use <div class="opening"> with <a> tags
        openings = soup.select("div.opening a, section.level-0 div.opening a, tr.job-post a")
        for link in openings[:MAX_JOBS_PER_BOARD]:
            title = link.get_text(strip=True)
            href = link.get("href", "")
            if not title or not href:
                continue

            full_url = urljoin(url, href)
            location_node = link.find_next("span", class_="location") or link.find_next_sibling("span")
            location = location_node.get_text(strip=True) if location_node else ""

            jobs.append({
                "id": f"gh-{company_slug}-{href.split('/')[-1]}",
                "title": title,
                "company": company_slug.replace("-", " ").title(),
                "location": location,
                "apply_link": full_url,
                "source": "greenhouse",
                "source_board_url": url,
                "description_html": "",
                "postedAt": None,
            })

        print(f"[DIRECT_SCRAPER] Greenhouse HTML fallback: {len(jobs)} jobs")
        return jobs
    except Exception as e:
        print(f"[DIRECT_SCRAPER] Greenhouse HTML scrape failed: {e}")
        return []


# ─────────────────────────────────────────────
# ATS: Lever
# jobs.lever.co/{company} returns HTML listings
# ─────────────────────────────────────────────

def _detect_lever_company(url: str) -> str | None:
    """Extract company slug from a Lever URL."""
    parsed = urlparse(url)
    if "lever.co" in parsed.hostname:
        parts = parsed.path.strip("/").split("/")
        if parts and parts[0]:
            return parts[0]
    return None


def _scrape_lever(company_slug: str, board_url: str) -> list[dict]:
    """Scrape Lever job board."""
    print(f"[DIRECT_SCRAPER] Scraping Lever: {board_url}")

    try:
        html = _fetch_url(board_url)
        soup = BeautifulSoup(html, "html.parser")
        jobs = []

        # Lever boards use <div class="posting"> or <a class="posting-title">
        postings = soup.select("div.posting, a.posting-title")
        for posting in postings[:MAX_JOBS_PER_BOARD]:
            title_el = posting.select_one("h5[data-qa='posting-name'], .posting-name h5, .posting-title")
            title = title_el.get_text(strip=True) if title_el else posting.get_text(strip=True)

            # Get apply link
            link_el = posting if posting.name == "a" else posting.find("a", class_="posting-title")
            href = link_el.get("href", "") if link_el else ""
            if not title:
                continue

            full_url = urljoin(board_url, href) if href else ""

            # Location
            loc_el = posting.select_one("span.sort-by-location, .posting-categories .location, .workplaceTypes")
            location = loc_el.get_text(strip=True) if loc_el else ""

            # Team/department
            team_el = posting.select_one("span.sort-by-team, .posting-categories .department")
            team = team_el.get_text(strip=True) if team_el else ""

            jobs.append({
                "id": f"lever-{company_slug}-{href.split('/')[-1] if href else len(jobs)}",
                "title": title,
                "company": company_slug.replace("-", " ").title(),
                "location": location,
                "department": team,
                "apply_link": full_url,
                "source": "lever",
                "source_board_url": board_url,
                "description_html": "",
                "postedAt": None,
            })

        print(f"[DIRECT_SCRAPER] Lever: {len(jobs)} jobs from {company_slug}")
        return jobs
    except Exception as e:
        print(f"[DIRECT_SCRAPER] Lever scrape failed: {e}")
        traceback.print_exc()
        return []


# ─────────────────────────────────────────────
# ATS: Workday
# *.myworkdayjobs.com (requires JS rendering)
# ─────────────────────────────────────────────

def _detect_workday(url: str) -> bool:
    """Check if the URL is a Workday jobs page."""
    return "myworkdayjobs.com" in url or "workday.com" in url


def _scrape_workday(board_url: str) -> list[dict]:
    """
    Scrape Workday job board.
    Workday boards are React SPAs — they need JS rendering via ScraperAPI,
    or we parse the embedded JSON data if available.
    """
    print(f"[DIRECT_SCRAPER] Scraping Workday: {board_url}")

    try:
        # Workday pages are JS-heavy; request with render if using proxy
        html = _fetch_url(board_url, render_js=True)
        soup = BeautifulSoup(html, "html.parser")
        jobs = []

        # Try to find embedded JSON data (Workday sometimes includes it)
        scripts = soup.find_all("script", type="application/ld+json")
        for script in scripts:
            try:
                ld_data = json.loads(script.string)
                if isinstance(ld_data, dict) and ld_data.get("@type") == "JobPosting":
                    ld_data = [ld_data]
                if isinstance(ld_data, list):
                    for item in ld_data[:MAX_JOBS_PER_BOARD]:
                        if item.get("@type") == "JobPosting":
                            loc = item.get("jobLocation", {})
                            if isinstance(loc, list):
                                loc = loc[0] if loc else {}
                            address = loc.get("address", {}) if isinstance(loc, dict) else {}

                            jobs.append({
                                "id": f"wd-{item.get('identifier', {}).get('value', len(jobs))}",
                                "title": item.get("title", ""),
                                "company": item.get("hiringOrganization", {}).get("name", ""),
                                "location": address.get("addressLocality", ""),
                                "apply_link": item.get("url", board_url),
                                "source": "workday",
                                "source_board_url": board_url,
                                "description_html": item.get("description", ""),
                                "postedAt": item.get("datePosted", None),
                            })
            except (json.JSONDecodeError, TypeError):
                continue

        if jobs:
            print(f"[DIRECT_SCRAPER] Workday (LD+JSON): {len(jobs)} jobs")
            return jobs

        # Fallback: parse visible HTML elements
        cards = soup.select(
            "[data-automation-id='jobTitle'], "
            ".css-19uc56f, "
            "a[data-automation-id='jobLink']"
        )
        for card in cards[:MAX_JOBS_PER_BOARD]:
            title = card.get_text(strip=True)
            href = card.get("href", "")
            if not title:
                continue

            full_url = urljoin(board_url, href) if href else board_url

            jobs.append({
                "id": f"wd-{len(jobs)}",
                "title": title,
                "company": urlparse(board_url).hostname.split(".")[0].title(),
                "location": "",
                "apply_link": full_url,
                "source": "workday",
                "source_board_url": board_url,
                "description_html": "",
                "postedAt": None,
            })

        print(f"[DIRECT_SCRAPER] Workday (HTML): {len(jobs)} jobs")
        return jobs
    except Exception as e:
        print(f"[DIRECT_SCRAPER] Workday scrape failed: {e}")
        traceback.print_exc()
        return []


# ─────────────────────────────────────────────
# ATS: Ashby
# jobs.ashbyhq.com/{company} has a public API
# ─────────────────────────────────────────────

def _detect_ashby_company(url: str) -> str | None:
    """Extract company slug from an Ashby URL."""
    parsed = urlparse(url)
    if "ashbyhq.com" in parsed.hostname:
        parts = parsed.path.strip("/").split("/")
        if parts and parts[0]:
            return parts[0]
    return None


def _scrape_ashby(company_slug: str, board_url: str) -> list[dict]:
    """Scrape Ashby using their posting API."""
    api_url = f"https://api.ashbyhq.com/posting-api/job-board/{company_slug}"
    print(f"[DIRECT_SCRAPER] Ashby API: {api_url}")

    try:
        data = _fetch_json(api_url)
        jobs_raw = data.get("jobs", []) if isinstance(data, dict) else []
    except Exception as e:
        print(f"[DIRECT_SCRAPER] Ashby API failed: {e}")
        return []

    jobs = []
    for job in jobs_raw[:MAX_JOBS_PER_BOARD]:
        location = job.get("location", "")
        if isinstance(location, dict):
            location = location.get("name", "")

        jobs.append({
            "id": f"ashby-{company_slug}-{job.get('id', len(jobs))}",
            "title": job.get("title", ""),
            "company": job.get("organizationName", company_slug.replace("-", " ").title()),
            "location": location,
            "apply_link": job.get("jobUrl", ""),
            "source": "ashby",
            "source_board_url": board_url,
            "description_html": job.get("descriptionHtml", ""),
            "postedAt": job.get("publishedAt", None),
            "department": job.get("department", ""),
        })

    print(f"[DIRECT_SCRAPER] Ashby: {len(jobs)} jobs from {company_slug}")
    return jobs


# ─────────────────────────────────────────────
# Generic: scrape any careers page via HTML
# ─────────────────────────────────────────────

def _scrape_generic(board_url: str) -> list[dict]:
    """
    Best-effort scrape for unknown ATS pages.
    Looks for LD+JSON JobPosting schema first, then falls back to link scanning.
    """
    print(f"[DIRECT_SCRAPER] Generic scrape: {board_url}")

    try:
        html = _fetch_url(board_url, render_js=bool(SCRAPER_API_KEY))
        soup = BeautifulSoup(html, "html.parser")
        company_name = urlparse(board_url).hostname.split(".")[0].title()
        jobs = []

        # Strategy 1: LD+JSON (best quality)
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                ld = json.loads(script.string)
                items = ld if isinstance(ld, list) else [ld]
                for item in items:
                    if item.get("@type") == "JobPosting":
                        loc = item.get("jobLocation", {})
                        if isinstance(loc, list):
                            loc = loc[0] if loc else {}
                        addr = loc.get("address", {}) if isinstance(loc, dict) else {}

                        jobs.append({
                            "id": f"generic-{len(jobs)}",
                            "title": item.get("title", ""),
                            "company": item.get("hiringOrganization", {}).get("name", company_name),
                            "location": addr.get("addressLocality", ""),
                            "apply_link": item.get("url", board_url),
                            "source": "direct",
                            "source_board_url": board_url,
                            "description_html": item.get("description", ""),
                            "postedAt": item.get("datePosted", None),
                        })
            except (json.JSONDecodeError, TypeError):
                continue

        if jobs:
            print(f"[DIRECT_SCRAPER] Generic (LD+JSON): {len(jobs)} jobs")
            return jobs[:MAX_JOBS_PER_BOARD]

        # Strategy 2: scan for links that look like job postings
        job_link_patterns = re.compile(
            r"/(job|position|opening|career|role|apply|posting)s?/",
            re.IGNORECASE,
        )
        links = soup.find_all("a", href=job_link_patterns)
        seen = set()

        for link in links[:MAX_JOBS_PER_BOARD]:
            href = link.get("href", "")
            title = link.get_text(strip=True)
            if not title or len(title) < 3 or len(title) > 200:
                continue

            full_url = urljoin(board_url, href)
            if full_url in seen:
                continue
            seen.add(full_url)

            jobs.append({
                "id": f"generic-{len(jobs)}",
                "title": title,
                "company": company_name,
                "location": "",
                "apply_link": full_url,
                "source": "direct",
                "source_board_url": board_url,
                "description_html": "",
                "postedAt": None,
            })

        print(f"[DIRECT_SCRAPER] Generic (link scan): {len(jobs)} jobs")
        return jobs
    except Exception as e:
        print(f"[DIRECT_SCRAPER] Generic scrape failed: {e}")
        traceback.print_exc()
        return []


# ─────────────────────────────────────────────
# Router: detect ATS type and dispatch
# ─────────────────────────────────────────────

def _scrape_single_board(url: str) -> list[dict]:
    """Detect the ATS type from the URL and scrape appropriately."""
    url = url.strip()
    if not url:
        return []

    # Greenhouse
    gh_slug = _detect_greenhouse_company(url)
    if gh_slug:
        return _scrape_greenhouse(gh_slug, url)

    # Lever
    lever_slug = _detect_lever_company(url)
    if lever_slug:
        return _scrape_lever(lever_slug, url)

    # Ashby
    ashby_slug = _detect_ashby_company(url)
    if ashby_slug:
        return _scrape_ashby(ashby_slug, url)

    # Workday
    if _detect_workday(url):
        return _scrape_workday(url)

    # Generic / unknown
    return _scrape_generic(url)


# ─────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────

def scrape_direct_company_boards(company_urls: list[str]) -> list[dict]:
    """
    Scrape job listings from a list of direct company ATS URLs.

    Supports:
        - Greenhouse (boards.greenhouse.io/*)
        - Lever (jobs.lever.co/*)
        - Ashby (jobs.ashbyhq.com/*)
        - Workday (*.myworkdayjobs.com/*)
        - Generic career pages (any URL)

    Args:
        company_urls: List of ATS board URLs to scrape.

    Returns:
        List of normalized job dicts with keys:
        id, title, company, location, apply_link, source,
        source_board_url, description_html, postedAt
    """
    if not company_urls:
        return []

    all_jobs = []
    for url in company_urls:
        try:
            print(f"\n[DIRECT_SCRAPER] -- Scraping board: {url} --")
            board_jobs = _scrape_single_board(url)
            all_jobs.extend(board_jobs)
        except Exception as e:
            print(f"[DIRECT_SCRAPER] Failed to scrape {url}: {e}")
            traceback.print_exc()
            continue

    print(f"\n[DIRECT_SCRAPER] Total: {len(all_jobs)} jobs scraped from {len(company_urls)} board(s)")
    return all_jobs
