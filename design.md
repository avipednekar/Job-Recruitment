# Dashboard UI Update: Design Strategy & Stitch Prompt

## 1. UX/UI Suggestions for the Dashboard

The current platform routes users to `/profile` as their "Dashboard", which functions mainly as a profile editor. A true Dashboard should be a centralized hub for actionable insights. 

**Recommended Layout Structure:**
*   **Top Bar (Hero):** A personalized greeting ("Welcome back, Avinash") with a high-level summary (e.g., "Profile 85% Complete" progress bar).
*   **Bento Grid Layout:** Move away from linear lists. Use a modern, asymmetrical "Bento Box" grid to display different widgets simultaneously.
*   **Key Widgets:**
    1.  **AI Job Matches (Priority):** A prominent widget showing the top 3 highly ranked AI job matches with their match percentage (e.g., "92% Match: Senior React Developer").
    2.  **Application Tracker:** A mini-timeline or status board showing recent applications ("In Review", "Interview Scheduled").
    3.  **ATS Score Snapshot:** A quick visual gauge showing the recent ATS score of their uploaded resume.
    4.  **Action Center:** A call-to-action block suggesting next steps (e.g., "Take a skill quiz", "Update your portfolio").

**Aesthetics:** 
*   Follow "The Intelligent Concierge" theme we defined in your Stitch project. 
*   Deep Navy backgrounds for primary areas, clean white/glassmorphism for cards, and subtle Cyan/Purple glowing accents for AI features. No hard 1px borders.

---

## 2. The Stitch Text-to-UI Prompt

*When you are ready, I will send this exact prompt to Stitch to generate the UI components.*

**Prompt for Stitch:**
> Generate a modern Job Seeker Dashboard page. Do not use standard row-by-row layouts; use an asymmetric Bento Grid. 
> 
> Include a personalized Top Hero section welcoming the user with a subtle profile completeness progress bar. 
> Below that, create a 3-column bento grid. 
> 
> The largest widget (spanning 2 columns) should be "AI Recommended Roles" displaying 3 job cards. Each job card should have a glowing match-percentage badge (e.g., 95% Match) and a primary 'Quick Apply' button.
> 
> The smaller widgets should include: 
> 1. An "Application Status" card showing a vertical timeline of a recent application.
> 2. An "ATS Health Score" widget featuring a circular progress gauge. 
> 
> Follow the "No-Line" rule: separate these bento boxes using background surface shifts (e.g., a white card on a light-gray background) rather than solid borders. Use a premium, high-tech aesthetic with subtle glassmorphic elements for the AI recommendation highlights.
