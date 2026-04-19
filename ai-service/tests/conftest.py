"""
Shared test fixtures for the AI service test suite.
Provides Flask test client, model mocks, and common test data.
"""
import sys
import os
import pytest
from unittest.mock import MagicMock, patch
import numpy as np

# Add project root to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture
def app():
    """Create Flask test client."""
    from app import app as flask_app
    flask_app.config["TESTING"] = True
    return flask_app


@pytest.fixture
def client(app):
    """Flask test client for making HTTP requests."""
    return app.test_client()


@pytest.fixture
def mock_embedding_model():
    """Mock sentence-transformer model that returns deterministic 384-dim vectors."""
    mock_model = MagicMock()

    def encode_side_effect(texts, **kwargs):
        if isinstance(texts, str):
            texts = [texts]
        result = []
        for text in texts:
            seed = hash(text) % (2**32)
            rng = np.random.RandomState(seed)
            vec = rng.randn(384).astype(np.float32)
            vec = vec / np.linalg.norm(vec)
            result.append(vec)
        return np.array(result)

    mock_model.encode = MagicMock(side_effect=encode_side_effect)
    return mock_model


@pytest.fixture(autouse=True)
def patch_embedding_model(mock_embedding_model):
    """Auto-patch the embedding model in all tests to avoid loading the real model."""
    with patch("matching.embeddings._get_model", return_value=mock_embedding_model):
        yield mock_embedding_model


@pytest.fixture
def sample_parsed_resume():
    """Known parsed resume data for testing downstream components."""
    return {
        "name": "Rahul Sharma",
        "email": "rahul.sharma@example.com",
        "phone": "+91-9876543210",
        "location": "Mumbai, Maharashtra, India",
        "skills": {
            "technical": ["Python", "JavaScript", "React", "Node.js", "MongoDB", "Flask"],
            "soft": ["Communication", "Team Leadership", "Problem Solving"],
        },
        "education": [
            {
                "degree": "B.Tech in Computer Science",
                "university": "Indian Institute of Technology, Mumbai",
                "year": "2020",
                "gpa": "8.5/10",
            }
        ],
        "experience": [
            {
                "title": "Software Developer",
                "company": "Tech Solutions Pvt Ltd",
                "duration": "2 years",
                "start_date": "Jan 2021",
                "end_date": "Jan 2023",
                "description": "Developed web applications using React and Node.js",
            },
            {
                "title": "Junior Developer",
                "company": "StartupXYZ",
                "duration": "1 year",
                "start_date": "Jan 2020",
                "end_date": "Dec 2020",
                "description": "Built REST APIs using Flask and Python",
            },
        ],
        "projects": [
            {
                "name": "E-Commerce Platform",
                "description": "Full-stack e-commerce with React and Node.js",
                "skills": ["React", "Node.js", "MongoDB"],
            }
        ],
        "certifications": ["AWS Certified Developer"],
        "summary": "Experienced software developer with 3 years of expertise in full-stack web development.",
    }


@pytest.fixture
def sample_job_data():
    """Known job posting data for testing matching algorithms."""
    return {
        "title": "Senior Full Stack Developer",
        "company": "TechCorp India",
        "description": "We are looking for a Senior Full Stack Developer to join our team. "
                       "You will work on building scalable web applications using React and Node.js.",
        "skills_required": ["React", "Node.js", "MongoDB", "Python", "JavaScript"],
        "experience_required": "3-5 years",
        "location": "Mumbai, India",
        "salary_min": 1200000,
        "salary_max": 2000000,
        "education_required": "B.Tech or equivalent",
        "job_type": "Full-time",
    }


@pytest.fixture
def fixtures_dir():
    """Path to the test fixtures directory."""
    return os.path.join(os.path.dirname(__file__), "fixtures")
