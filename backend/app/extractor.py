"""Extract readable content and images from HTML."""
from __future__ import annotations

from urllib.parse import urljoin

from bs4 import BeautifulSoup
from readability import Document


def extract_content(html: str, base_url: str) -> dict:
    """Extract main text content and images from an HTML page.

    Returns {"text": str, "images": [{"url": str, "position": int}]}.
    """
    doc = Document(html)
    summary_html = doc.summary()

    soup = BeautifulSoup(summary_html, "lxml")

    # Remove scripts, styles, nav, footer.
    for tag in soup.find_all(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    # Extract images before stripping tags.
    images: list[dict] = []
    char_pos = 0
    for img in soup.find_all("img"):
        src = img.get("src", "")
        if not src:
            continue
        full_url = urljoin(base_url, src)
        images.append({"url": full_url, "position": char_pos})
        img.decompose()

    # Get clean text.
    text = soup.get_text(separator="\n", strip=True)
    # Collapse multiple newlines.
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    text = "\n".join(lines)

    return {"text": text, "images": images}
