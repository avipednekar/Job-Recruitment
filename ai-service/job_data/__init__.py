from job_data.jd_data_cleaner import clean_job_dataset, clean_job_record
from job_data.llm_extractor import extract_job_details_with_llm

# Lazy import: GlassdoorJobExtractor requires selenium which may not be installed
def __getattr__(name):
    if name == "GlassdoorJobExtractor":
        from job_data.jd_data_extractor import GlassdoorJobExtractor
        return GlassdoorJobExtractor
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    "clean_job_dataset",
    "clean_job_record",
    "extract_job_details_with_llm",
    "GlassdoorJobExtractor",
]
