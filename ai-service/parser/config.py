SKILLS = [
    # Programming Languages
    "python", "java", "javascript", "typescript", "c", "c++", "c#", "go",
    "rust", "ruby", "php", "swift", "kotlin", "scala", "r", "matlab",
    "perl", "dart", "lua", "shell", "bash", "powershell", "sql",

    # Web Frontend
    "html", "css", "sass", "less", "tailwind", "bootstrap",
    "react", "react.js", "reactjs", "react js",
    "angular", "angular.js", "angularjs",
    "vue", "vue.js", "vuejs",
    "next.js", "nextjs", "next js",
    "svelte", "jquery", "redux",

    # Web Backend
    "node.js", "nodejs", "node js",
    "express", "express.js", "expressjs",
    "django", "flask", "fastapi",
    "spring", "spring boot", "springboot",
    "asp.net", ".net", "laravel", "rails", "ruby on rails",

    # Databases
    "mongodb", "mysql", "postgresql", "postgres", "sqlite",
    "redis", "cassandra", "dynamodb", "firebase",
    "oracle", "sql server", "mariadb", "neo4j",

    # Cloud & DevOps
    "aws", "azure", "gcp", "google cloud",
    "docker", "kubernetes", "k8s",
    "jenkins", "gitlab ci", "github actions", "ci/cd",
    "terraform", "ansible", "nginx", "apache",
    "linux", "unix", "windows server",

    # Data Science & AI/ML
    "machine learning", "deep learning", "artificial intelligence",
    "natural language processing", "nlp", "computer vision",
    "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn",
    "pandas", "numpy", "matplotlib", "seaborn", "opencv",
    "data science", "data analysis", "data engineering",
    "big data", "hadoop", "spark", "apache spark",

    # Mobile
    "android", "ios", "react native", "flutter",
    "swift ui", "swiftui", "xamarin",

    # Tools & Version Control
    "git", "github", "gitlab", "bitbucket",
    "jira", "confluence", "trello",
    "figma", "adobe xd", "photoshop",
    "postman", "swagger", "rest api", "restful",
    "graphql", "grpc",

    # Testing
    "selenium", "cypress", "jest", "mocha", "junit",
    "pytest", "unittest", "testing",

    # Other
    "agile", "scrum", "microservices", "api",
    "blockchain", "iot", "embedded systems",
    "data structures", "algorithms", "oop",
    "design patterns", "system design",
]

# Maps regex patterns (case-insensitive) to canonical section names
SECTION_HEADER_MAP = {
    r"summary|objective|career\s+objective|profile|about\s*me": "summary",
    r"(technical\s+)?skills?(\s+set)?|key\s+skills|core\s+(skills?|competenc)": "skills",
    r"(work\s+)?experience|professional\s+experience|employment(\s+history)?": "experience",
    r"education(al)?(\s+(qualifications?|details|background))?|academic(\s+details)?": "education",
    r"(?:technical\s+|personal\s+|academic\s+)?projects?(?:\s*\|.*)?": "projects",
    r"certifications?|certificates?|licenses?": "certifications",
    r"languages?(\s+known)?|linguistic": "languages",
    r"achievements?|awards?|honors?|accomplishments?": "achievements",
    r"hobbies|interests?|extra\s*curricular|extra\s+information|additional\s+(info(rmation)?|details)": "interests",
    r"references?": "references",
    r"publications?|research": "publications",
    r"volunteer(ing)?|community\s+service": "volunteering",
    r"internships?": "internship",
}

DEGREE_PATTERNS = [
    r"\bb\.?\s?tech\b", r"\bm\.?\s?tech\b",
    r"\bb\.?\s?e\.?\b", r"\bm\.?\s?e\.?\b",
    r"\bb\.?\s?sc\.?\b", r"\bm\.?\s?sc\.?\b",
    r"\bb\.?\s?a\.?\b", r"\bm\.?\s?a\.?\b",
    r"\bb\.?\s?com\.?\b", r"\bm\.?\s?com\.?\b",
    r"\bbca\b", r"\bmca\b", r"\bmba\b",
    r"\bbachelor\b", r"\bmaster\b", r"\bphd\b", r"\bph\.?\s?d\b",
    r"\bdiploma\b", r"\bassociate\b",
    r"\bhsc\b|higher\s+secondary", r"\bssc\b|secondary\s+school",
    r"\b12th\b|\bxii\b", r"\b10th\b",
]

JOB_TITLE_KEYWORDS = [
    "developer", "engineer", "intern", "trainee",
    "analyst", "architect", "consultant", "manager",
    "designer", "administrator", "specialist", "lead",
    "associate", "coordinator", "officer", "executive",
    "scientist", "researcher", "tester", "qa",
    "devops", "full stack", "fullstack", "frontend", "front-end",
    "backend", "back-end",
    # NOTE: removed standalone "web", "data", "software", "mobile",
    # "cloud", "security", "network" — they are too broad and match
    # non-job lines like "Web Development: HTML, CSS, JavaScript".
    # Instead, use compound forms:
    "software engineer", "software developer", "web developer",
    "data analyst", "data engineer", "data scientist",
    "mobile developer", "cloud engineer", "network engineer",
    "security analyst", "security engineer",
]
