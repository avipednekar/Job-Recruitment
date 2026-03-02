from sentence_transformers import SentenceTransformer

# Initialize the model once
# all-MiniLM-L6-v2 is a lightweight, fast model good for semantic similarity
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for the given text.
    Returns a list of floats representing the vector.
    """
    if not text or not text.strip():
        # Return a zero vector of the correct dimension if text is empty
        return [0.0] * 384
        
    embedding = model.encode(text)
    return embedding.tolist()
