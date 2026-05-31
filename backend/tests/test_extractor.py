"""Tests for URL content extractor — pure function on HTML input."""
from app.extractor import extract_content


class TestExtractContent:
    """extract_content(html, url) -> {text, images}"""

    def test_extracts_paragraph_text(self):
        html = """
        <html><body>
          <nav>导航栏</nav>
          <article><p>这是正文内容。很重要。</p><p>第二段内容。</p></article>
          <footer>页脚</footer>
        </body></html>
        """
        result = extract_content(html, "https://example.com/page")
        assert "正文内容" in result["text"]
        assert "第二段" in result["text"]
        assert "导航栏" not in result["text"]
        assert "页脚" not in result["text"]

    def test_extracts_images(self):
        html = """
        <html><body>
          <article>
            <p>正文段落。</p>
            <img src="/images/photo.jpg" alt="照片">
            <p>更多内容。</p>
          </article>
        </body></html>
        """
        result = extract_content(html, "https://example.com/page")
        assert len(result["images"]) >= 1
        assert result["images"][0]["url"] == "https://example.com/images/photo.jpg"

    def test_returns_empty_for_no_content(self):
        html = "<html><body><nav>导航</nav><footer>页脚</footer></body></html>"
        result = extract_content(html, "https://example.com/page")
        assert result["text"].strip() == ""

    def test_strips_scripts_and_styles(self):
        html = """
        <html><body>
          <article>
            <script>alert('xss')</script>
            <style>.cls{color:red}</style>
            <p>安全内容。</p>
          </article>
        </body></html>
        """
        result = extract_content(html, "https://example.com/page")
        assert "alert" not in result["text"]
        assert "color" not in result["text"]
        assert "安全内容" in result["text"]

    def test_resolves_relative_image_urls(self):
        html = """
        <html><body>
          <article>
            <p>内容。</p>
            <img src="//cdn.example.com/img.png">
          </article>
        </body></html>
        """
        result = extract_content(html, "https://example.com/page")
        assert result["images"][0]["url"].startswith("https://")
