import re
import unicodedata


def clean_text(text):
    # Normalize unicode (curly quotes, em-dashes, etc.)
    text = unicodedata.normalize("NFKD", text)

    # Replace common special characters
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2013", "-").replace("\u2014", "-")

    # Replace bullet point characters with standard dash marker
    # (preserves bullet structure for downstream extractors)
    text = re.sub(r"[•◦▪▸►⬥⬦➤➢✓✔]", "-", text)

    # Collapse multiple blank lines into one
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Collapse multiple spaces/tabs into one space
    text = re.sub(r"[ \t]+", " ", text)

    # Clean up lines: strip trailing whitespace per line
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)

    return text.strip()
