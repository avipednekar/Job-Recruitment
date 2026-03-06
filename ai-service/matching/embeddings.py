import os
from threading import Lock

MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "sentence-transformers/all-MiniLM-L6-v2")
EMBEDDING_DIM = 384

_model = None
_model_lock = Lock()


def _get_model():
    """Lazily load the embedding model on first use."""
    global _model

    if _model is not None:
        return _model

    with _model_lock:
        if _model is None:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(MODEL_NAME)

    return _model


def get_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for the given text.
    Returns a list of floats representing the vector.
    """
    if not text or not text.strip():
        # Return a zero vector of the expected embedding size for empty input
        return [0.0] * EMBEDDING_DIM

    model = _get_model()
    embedding = model.encode(text)
    return embedding.tolist()
