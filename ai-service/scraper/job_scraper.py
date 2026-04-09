import pandas as pd
from jobspy import scrape_jobs

def fetch_jobs(query, location, page=1):
    """
    Scrapes jobs from LinkedIn and Naukri using python-jobspy.
    Returns a list of dictionaries with job details.
    """
    try:
        # jobspy expects integers for results_wanted. We'll set a standard limit per page.
        # we can fetch 20 jobs for LinkedIn and 20 for Naukri.
        results = 20

        # We need to map `page` to an offset or limit.
        offset = (page - 1) * results

        jobs_df = scrape_jobs(
            site_name=["linkedin", "naukri"], 
            search_term=f"{query} {location}".strip(),
            location=location,
            results_wanted=results,
            offset=offset,
            country_indeed='India', # just in case, though we are not explicitly calling indeed right now.
        )
        
        if jobs_df.empty:
            return []

        # Convert NaNs to None for JSON serialization
        jobs_df = jobs_df.where(pd.notna(jobs_df), None)

        jobs_list = []
        for _, row in jobs_df.iterrows():
            # Format the output to vaguely match what JSearch used to give,
            # or what our external-jobs.controller.js maps to.
            # We'll return full jobspy columns and let Node.js do the mapping.
            location_str = ""
            if row.get('location'):
                location_str = row['location']
            elif row.get('city') or row.get('state'):
                location_str = f"{row.get('city', '')}, {row.get('state', '')}".strip(', ')
                
            job = {
                "id": str(row.get('id', '')),
                "title": row.get('title', ''),
                "company": row.get('company', ''),
                "location": location_str,
                "logo": row.get('company_logo', ''),
                "employment_type": row.get('job_type', 'Full-time'),
                "remote": bool(row.get('is_remote', False)),
                "description": row.get('description', ''),
                "apply_link": row.get('job_url', ''),
                "source": row.get('site', 'linkedin'),
                "postedAt": str(row.get('date_posted', '')) if row.get('date_posted') else None
            }
            jobs_list.append(job)

        return jobs_list

    except Exception as e:
        print(f"Error scraping jobs: {str(e)}")
        raise
