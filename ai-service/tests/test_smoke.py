"""Smoke tests to verify test infrastructure is working."""
import os
import numpy as np


def test_flask_client_works(client):
    """Verify Flask test client can make requests."""
    response = client.get("/")
    assert response is not None


def test_embedding_model_is_mocked(mock_embedding_model):
    """Verify the embedding model mock produces deterministic 384-dim vectors."""
    result = mock_embedding_model.encode(["test text"])
    assert result.shape == (1, 384)
    # Should be deterministic — same input produces same output
    result2 = mock_embedding_model.encode(["test text"])
    np.testing.assert_array_equal(result, result2)


def test_fixtures_exist(fixtures_dir):
    """Verify resume fixture files are present."""
    pdf_path = os.path.join(fixtures_dir, "sample_resume.pdf")
    docx_path = os.path.join(fixtures_dir, "sample_resume.docx")
    assert os.path.exists(pdf_path), f"PDF fixture missing: {pdf_path}"
    assert os.path.exists(docx_path), f"DOCX fixture missing: {docx_path}"


def test_parsed_resume_has_expected_fields(sample_parsed_resume):
    """Verify the sample parsed resume fixture has all expected fields."""
    required_fields = ["name", "email", "phone", "skills", "education", "experience"]
    for field in required_fields:
        assert field in sample_parsed_resume, f"Missing field: {field}"
    assert sample_parsed_resume["name"] == "Rahul Sharma"
    assert len(sample_parsed_resume["skills"]["technical"]) >= 3


def test_job_data_has_expected_fields(sample_job_data):
    """Verify the sample job data fixture has all expected fields."""
    required_fields = ["title", "skills_required", "experience_required", "location"]
    for field in required_fields:
        assert field in sample_job_data, f"Missing field: {field}"
    assert "React" in sample_job_data["skills_required"]
