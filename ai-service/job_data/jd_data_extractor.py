import argparse
import json
import time
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait


class GlassdoorJobExtractor:
    """
    Selenium + BeautifulSoup extractor for Glassdoor job listings.

    The CSS selectors are intentionally flexible because Glassdoor markup
    changes often. If the site UI shifts, this class can be updated without
    changing the rest of the ingestion pipeline.
    """

    CARD_SELECTORS = [
        "li[data-test='jobListing']",
        "article[data-test='jobListing']",
        ".react-job-listing",
        ".JobsList_jobListItem__wjTHv",
    ]
    NEXT_BUTTON_SELECTORS = [
        "button[aria-label='Next']",
        "button[data-test='next-page']",
        "button.nextButton",
    ]
    TITLE_SELECTORS = [
        "[data-test='job-title']",
        "a.jobLink",
        "a.JobCard_jobTitle___7I6y",
        "a[href*='/job-listing/']",
    ]
    COMPANY_SELECTORS = [
        "[data-test='employer-name']",
        ".EmployerProfile_compactEmployerName__LE242",
        ".job-search-card__company-name",
    ]
    LOCATION_SELECTORS = [
        "[data-test='location']",
        ".JobCard_location__Ds1fM",
        ".job-search-card__location",
    ]
    SALARY_SELECTORS = [
        "[data-test='detailSalary']",
        ".JobCard_salaryEstimate__QpbTW",
        ".job-search-card__salary-estimate",
    ]
    DETAIL_PANEL_SELECTORS = [
        ".JobDetails_jobDescription__uW_fK",
        "[data-test='jobDescriptionContent']",
        ".jobDescriptionContent",
    ]

    def __init__(self, driver, wait_timeout=15, pause_seconds=2.0, base_url="https://www.glassdoor.com"):
        self.driver = driver
        self.wait = WebDriverWait(driver, wait_timeout)
        self.pause_seconds = pause_seconds
        self.base_url = base_url

    def extract_jobs(self, search_url, max_pages=1, include_details=True):
        self.driver.get(search_url)
        collected_jobs = []
        seen_ids = set()

        for page_number in range(max_pages):
            self._wait_for_listings()
            time.sleep(self.pause_seconds)

            page_jobs = self._extract_jobs_from_current_page(include_details=include_details)
            for job in page_jobs:
                key = job.get("job_id") or job.get("source_url") or f"{job.get('title')}|{job.get('company')}"
                if key and key not in seen_ids:
                    collected_jobs.append(job)
                    seen_ids.add(key)

            if page_number == max_pages - 1:
                break
            current_signature = self._get_page_signature()
            if not self._go_to_next_page(current_signature):
                break

        return collected_jobs

    def _wait_for_listings(self):
        def _listing_present(driver):
            return any(driver.find_elements(By.CSS_SELECTOR, selector) for selector in self.CARD_SELECTORS)

        self.wait.until(_listing_present)

    def _extract_jobs_from_current_page(self, include_details=True):
        soup = BeautifulSoup(self.driver.page_source, "html.parser")
        cards = self._select_cards(soup)
        jobs = []

        for card in cards:
            summary = self._extract_card_summary(card)
            if not summary:
                continue
            if include_details and summary.get("source_url"):
                summary.update(self._extract_job_detail(summary["source_url"]))
            jobs.append(summary)

        return jobs

    def _select_cards(self, soup):
        for selector in self.CARD_SELECTORS:
            cards = soup.select(selector)
            if cards:
                return cards
        return []

    def _extract_card_summary(self, card):
        title_node = self._select_first(card, self.TITLE_SELECTORS)
        company_node = self._select_first(card, self.COMPANY_SELECTORS)
        location_node = self._select_first(card, self.LOCATION_SELECTORS)
        salary_node = self._select_first(card, self.SALARY_SELECTORS)

        title = self._get_text(title_node)
        company = self._get_text(company_node)

        if not title or not company:
            return None

        source_url = self._build_absolute_url(self._get_attr(title_node, "href"))
        return {
            "job_id": self._extract_job_id(source_url),
            "title": title,
            "company": company,
            "location": self._get_text(location_node),
            "salary": self._get_text(salary_node),
            "source": "Glassdoor",
            "source_url": source_url,
        }

    def _extract_job_detail(self, detail_url):
        if not detail_url:
            return {}

        current_handle = self.driver.current_window_handle
        self.driver.switch_to.new_window("tab")
        try:
            self.driver.get(detail_url)
            self._wait_for_detail_panel()
            detail_soup = BeautifulSoup(self.driver.page_source, "html.parser")
            description = self._extract_description(detail_soup)
            metadata = self._extract_metadata(detail_soup)
            return {
                "description": description,
                **metadata,
            }
        finally:
            self.driver.close()
            self.driver.switch_to.window(current_handle)

    def _extract_description(self, soup):
        for selector in self.DETAIL_PANEL_SELECTORS:
            node = soup.select_one(selector)
            text = self._get_text(node)
            if text:
                return text
        return ""

    def _extract_metadata(self, soup):
        text = soup.get_text(" ", strip=True)
        apply_node = soup.select_one("a[data-test='apply-button'], a[href*='easyApply'], a.applyButton")
        return {
            "apply_url": self._build_absolute_url(self._get_attr(apply_node, "href")),
            "easy_apply": "easy apply" in text.lower(),
            "remote": "remote" in text.lower(),
        }

    def _go_to_next_page(self, previous_signature):
        for selector in self.NEXT_BUTTON_SELECTORS:
            buttons = self.driver.find_elements(By.CSS_SELECTOR, selector)
            for button in buttons:
                disabled = (
                    button.get_attribute("disabled") is not None or
                    button.get_attribute("aria-disabled") == "true"
                )
                if disabled:
                    continue
                self.driver.execute_script("arguments[0].click();", button)
                self._wait_for_page_change(previous_signature)
                return True
        return False

    def _wait_for_detail_panel(self):
        def _detail_loaded(driver):
            for selector in self.DETAIL_PANEL_SELECTORS:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if any(element.text.strip() for element in elements):
                    return True
            return False

        self.wait.until(_detail_loaded)
        time.sleep(self.pause_seconds / 2)

    def _wait_for_page_change(self, previous_signature):
        def _page_changed(driver):
            current_signature = self._get_page_signature()
            return bool(current_signature and current_signature != previous_signature)

        self.wait.until(_page_changed)
        self._wait_for_listings()
        time.sleep(self.pause_seconds / 2)

    def _get_page_signature(self):
        soup = BeautifulSoup(self.driver.page_source, "html.parser")
        cards = self._select_cards(soup)
        signatures = []

        for card in cards[:3]:
            title_node = self._select_first(card, self.TITLE_SELECTORS)
            title = self._get_text(title_node)
            href = self._get_attr(title_node, "href")
            if title or href:
                signatures.append(f"{title}|{href}")

        return "||".join(signatures)

    def _select_first(self, parent, selectors):
        for selector in selectors:
            node = parent.select_one(selector)
            if node is not None:
                return node
        return None

    def _get_text(self, node):
        if node is None:
            return ""
        return " ".join(node.get_text(" ", strip=True).split())

    def _get_attr(self, node, attribute):
        if node is None:
            return ""
        return (node.get(attribute) or "").strip()

    def _build_absolute_url(self, url):
        if not url:
            return ""
        return urljoin(self.base_url, url)

    def _extract_job_id(self, url):
        if not url:
            return ""
        marker = "jobListingId="
        if marker in url:
            return url.split(marker, 1)[1].split("&", 1)[0]
        return url.rstrip("/").split("/")[-1]


def _build_driver(headless=True):
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options

    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    return webdriver.Chrome(options=options)


def main():
    parser = argparse.ArgumentParser(description="Extract Glassdoor jobs with Selenium.")
    parser.add_argument("search_url", help="Glassdoor jobs search URL.")
    parser.add_argument("output_path", help="Path to write raw JSON records.")
    parser.add_argument("--max-pages", type=int, default=1, help="Number of listing pages to scan.")
    parser.add_argument(
        "--skip-details",
        action="store_true",
        help="Skip job-detail pages and keep only listing-card fields.",
    )
    parser.add_argument("--show-browser", action="store_true", help="Run the browser in non-headless mode.")
    args = parser.parse_args()

    driver = _build_driver(headless=not args.show_browser)
    try:
        extractor = GlassdoorJobExtractor(driver)
        jobs = extractor.extract_jobs(
            args.search_url,
            max_pages=max(1, args.max_pages),
            include_details=not args.skip_details,
        )
    finally:
        driver.quit()

    output_path = Path(args.output_path)
    output_path.write_text(json.dumps(jobs, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Extracted {len(jobs)} jobs -> {output_path}")


if __name__ == "__main__":
    main()
