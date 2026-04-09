import re

with open('backend/controllers/job.controller.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace the condition and axios call
old_call = r'''if \(query\.trim\(\) && process\.env\.RAPIDAPI_KEY\) \{
        const externalResponse = await axios\.get\("https://jsearch\.p\.rapidapi\.com/search", \{
          params: \{ query: query, num_pages: 1 \},
          headers: \{
            "x-rapidapi-key": process\.env\.RAPIDAPI_KEY,
            "x-rapidapi-host": "jsearch\.p\.rapidapi\.com"
          \}
        \}\);'''

new_call = r'''if (query.trim()) {
        const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5000";
        const externalResponse = await axios.post(`${AI_SERVICE_URL}/scrape_jobs`, {
          query: query,
          location: candidateLocation || "India",
          page: 1
        });'''

text = re.sub(old_call, new_call, text)

# Now we adjust mapping because previously it mapped JSearch `data.data`, now it maps `data.jobs`
old_map = r'''externalJobs = externalResponse\.data\.data
          \.filter\(\(job\) => !exceedsCandidateExperience\(job, candidateYears\)\)
          \.filter\(\(job\) => isIndiaExternalJob\(\{
            job_country: job\.job_country,
            job_location: \[job\.job_city, job\.job_state, job\.job_country\]\.filter\(Boolean\)\.join\(", "\),
            location: \[job\.job_city, job\.job_state, job\.job_country\]\.filter\(Boolean\)\.join\(", "\),
          \}\)\)
          \.filter\(\(job\) => matchesCandidateLocation\(job, candidateLocation\)\)
          \.map\(\(job\) => \{
            const localRanking = scoreExternalJobLocally\(
              job,
              candidateSkills,
              candidateLocation,
              candidateYears,
              inferredRole,
            \);

            return \{
              _id: job\.job_id,
              id: job\.job_id,
              title: job\.job_title,
              company: job\.employer_name,
              location: \[job\.job_city, job\.job_state, job\.job_country\]\.filter\(Boolean\)\.join\(", "\) \|\| "Remote",
              description: job\.job_description \|\| "",
              employment_type: job\.job_employment_type\?\.replace\(/_/g, " "\),
              remote: job\.job_is_remote,
              logo: job\.employer_logo,
              apply_link: job\.job_apply_link,
              external_url: job\.job_apply_link,
              postedAt: job\.job_posted_at_datetime_utc,
              salary_range: job\.job_min_salary && job\.job_max_salary
                \? `\$\{job\.job_min_salary\}-\$\{job\.job_max_salary\}`
                : "",
              experience_level: job\.job_required_experience\?\.required_experience_in_months
                \? `\$\{Math\.round\(job\.job_required_experience\.required_experience_in_months / 12\)\}\+ years`
                : "",
              skills: localRanking\.inferredSkills,
              source: "external",
              local_match_score: localRanking\.score,
            \};
          \}\)'''

new_map = r'''externalJobs = (externalResponse.data.jobs || [])
          .map((job) => {
            const localRanking = scoreExternalJobLocally(
              job,
              candidateSkills,
              candidateLocation,
              candidateYears,
              inferredRole,
            );

            return {
              _id: job.id,
              id: job.id,
              title: job.title,
              company: job.company,
              location: job.location || "Remote",
              description: job.description || "",
              employment_type: job.employment_type,
              remote: job.remote,
              logo: job.logo,
              apply_link: job.apply_link,
              external_url: job.apply_link,
              postedAt: job.postedAt,
              salary_range: "", // JobSpy rarely returns min/max natively structured
              experience_level: "",
              skills: localRanking.inferredSkills,
              source: job.source || "external",
              local_match_score: localRanking.score,
            };
          })'''

text = re.sub(old_map, new_map, text)

# Lastly rename the catch log
text = re.sub(r'console\.error\("External JSearch Error:", err\.message\);', r'console.error("External JobSpy Engine Error:", err.message);', text)


with open('backend/controllers/job.controller.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("job.controller patched")
