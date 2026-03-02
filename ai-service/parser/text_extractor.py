import fitz  # PyMuPDF
from docx import Document


def extract_text(file_path):
    if file_path.endswith(".pdf"):
        return extract_pdf(file_path)
    elif file_path.endswith(".docx"):
        return extract_docx(file_path)
    else:
        raise ValueError("Unsupported file format")


def extract_pdf(file_path):
    """
    Extract text from PDF with column-aware extraction.
    Detects multi-column layouts and extracts columns separately
    to prevent text interleaving.
    """
    doc = fitz.open(file_path)
    full_text = ""

    for page in doc:
        full_text += _extract_page_text(page) + "\n"

    doc.close()
    return full_text.strip()


def _extract_page_text(page):
    """
    Extract text from a single page. Detects if the page uses a
    multi-column layout by analyzing text block x-positions of
    body content (excluding centered headers), and extracts each
    column separately if needed.
    """
    blocks = page.get_text("dict")["blocks"]
    text_blocks = [b for b in blocks if b["type"] == 0 and b.get("lines")]

    if not text_blocks:
        return ""

    page_width = page.rect.width

    # Gather x0 positions only from body-width blocks
    # (skip centered header blocks that span most of the page width)
    body_x_positions = []
    for block in text_blocks:
        bx0, _, bx1, _ = block["bbox"]
        block_width = bx1 - bx0

        # Skip blocks that are very narrow (decorative) or very wide/centered
        # A centered header typically starts far from the left edge
        for line in block["lines"]:
            for span in line["spans"]:
                if span["text"].strip():
                    sx0 = span["bbox"][0]
                    sx1 = span["bbox"][2]
                    span_width = sx1 - sx0

                    # Only consider spans that look like body text
                    # (start near the left edge or near a right-column edge)
                    if sx0 < page_width * 0.15 or (
                        span_width > 50 and sx0 > page_width * 0.3
                    ):
                        body_x_positions.append(sx0)

    if not body_x_positions:
        return page.get_text("text")

    # Detect column split point using body text positions only
    split_x = _detect_column_split(body_x_positions, page_width)

    if split_x is not None:
        return _extract_columns(page, split_x)
    else:
        # Single-column layout - use standard extraction
        return page.get_text("text")


def _detect_column_split(x_positions, page_width):
    """
    Detect if there's a true two-column layout by finding a gap
    in body-text x-positions that divides the page.
    """
    if not x_positions:
        return None

    # Round x positions to cluster nearby values
    rounded = sorted(set(int(x / 5) * 5 for x in x_positions))

    if len(rounded) < 3:
        return None

    # Count how many spans start in the left vs right region
    left_count = sum(1 for x in x_positions if x < page_width * 0.35)
    right_count = sum(1 for x in x_positions if x > page_width * 0.35)

    # For a true two-column layout, both sides need substantial content
    # At least 20% of spans should be on each side
    total = left_count + right_count
    if total == 0:
        return None
    if left_count / total < 0.2 or right_count / total < 0.2:
        return None

    # Look for a significant gap between x-position clusters
    min_split = page_width * 0.25
    max_split = page_width * 0.55

    best_gap = 0
    best_split = None

    for i in range(1, len(rounded)):
        gap = rounded[i] - rounded[i - 1]
        mid = (rounded[i] + rounded[i - 1]) / 2

        if gap > best_gap and min_split < mid < max_split:
            best_gap = gap
            best_split = mid

    # Only consider it a column split if the gap is significant
    if best_gap >= 30:
        return best_split

    return None


def _extract_columns(page, split_x):
    """
    Extract text from left and right columns separately using
    block-level text assembly. Each span is assigned to the left or
    right column based on its x0 position, preserving full text
    without mid-word truncation that clip rects cause.
    """
    blocks = page.get_text("dict")["blocks"]
    page_rect = page.rect

    # Classify spans into header, left-column, and right-column
    # First pass: find where columnar content starts
    left_min_y = page_rect.height
    right_min_y = page_rect.height

    for block in blocks:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                if not span["text"].strip():
                    continue
                x0 = span["bbox"][0]
                y0 = span["bbox"][1]
                if x0 < split_x:
                    left_min_y = min(left_min_y, y0)
                else:
                    right_min_y = min(right_min_y, y0)

    col_start_y = min(left_min_y, right_min_y)
    header_end_y = max(left_min_y, right_min_y)

    # Determine if there's a header region
    has_header = (header_end_y - col_start_y) > 20
    effective_col_start = header_end_y if has_header else col_start_y

    # Second pass: assemble text per region using span-level assignment
    header_lines = []
    left_lines = []
    right_lines = []

    for block in sorted(blocks, key=lambda b: b["bbox"][1]):
        if block["type"] != 0 or not block.get("lines"):
            continue

        for line in block["lines"]:
            line_text_parts = []
            line_y = line["bbox"][1]

            for span in line["spans"]:
                text = span["text"]
                if text.strip():
                    line_text_parts.append(text)

            line_text = "".join(line_text_parts).strip()
            if not line_text:
                continue

            # Determine which region this line belongs to
            line_x0 = line["bbox"][0]

            if has_header and line_y < effective_col_start:
                header_lines.append(line_text)
            elif line_x0 < split_x:
                left_lines.append(line_text)
            else:
                right_lines.append(line_text)

    # Combine: header, then right (main content), then left (sidebar)
    parts = []
    if header_lines:
        parts.append("\n".join(header_lines))
    if right_lines:
        parts.append("\n".join(right_lines))
    if left_lines:
        parts.append("\n".join(left_lines))

    return "\n\n".join(parts)


def extract_docx(file_path):
    doc = Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])
