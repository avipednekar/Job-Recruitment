"""Quick test: scrape a real Greenhouse board."""
from scraper.direct_scraper import scrape_direct_company_boards

jobs = scrape_direct_company_boards(["https://boards.greenhouse.io/discord"])
print(f"\nResults: {len(jobs)} jobs")
if jobs:
    j = jobs[0]
    print(f"  First job: {j['title']} at {j['company']}")
    print(f"  Location:  {j['location']}")
    print(f"  Link:      {j['apply_link'][:80]}...")
    print(f"  Source:    {j['source']}")
    print("\nSample of titles:")
    for job in jobs[:5]:
        print(f"  - {job['title']} ({job['location']})")
else:
    print("  No jobs returned")
