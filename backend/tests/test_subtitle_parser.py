"""Subtitle parser tests."""
import pytest

from app.subtitle_parser import parse_subtitle


class TestSRTParsing:
    """SRT format parsing."""

    def test_multiple_entries_produces_segments_with_timestamps(self):
        """A valid SRT with 3 entries produces 3 segments with correct timestamps and content."""
        srt_content = """\
1
00:00:01,000 --> 00:00:04,000
你好世界

2
00:00:05,000 --> 00:00:08,000
今天天气真好

3
00:00:10,000 --> 00:00:13,000
我们去玩吧
"""
        result = parse_subtitle(srt_content, "test.srt")

        assert len(result) == 3
        assert result[0] == {"content": "你好世界", "startTimeMs": 1000, "endTimeMs": 4000}
        assert result[1] == {"content": "今天天气真好", "startTimeMs": 5000, "endTimeMs": 8000}
        assert result[2] == {"content": "我们去玩吧", "startTimeMs": 10000, "endTimeMs": 13000}


class TestVTTParsing:
    """VTT format parsing."""

    def test_multiple_entries_produces_segments_with_timestamps(self):
        """A valid VTT with 3 entries produces 3 segments with correct timestamps."""
        vtt_content = """\
WEBVTT

00:00:01.000 --> 00:00:04.000
你好世界

00:00:05.000 --> 00:00:08.000
今天天气真好

00:00:10.000 --> 00:00:13.000
我们去玩吧
"""
        result = parse_subtitle(vtt_content, "test.vtt")

        assert len(result) == 3
        assert result[0] == {"content": "你好世界", "startTimeMs": 1000, "endTimeMs": 4000}
        assert result[1] == {"content": "今天天气真好", "startTimeMs": 5000, "endTimeMs": 8000}
        assert result[2] == {"content": "我们去玩吧", "startTimeMs": 10000, "endTimeMs": 13000}


class TestContentPreservation:
    """Mixed language and special character content."""

    def test_chinese_english_mixed_content_preserved(self):
        """Chinese, English, and numbers are all preserved correctly."""
        srt_content = """\
1
00:00:01,000 --> 00:00:04,000
我喜欢玩 Minecraft，这是第 1 次玩

2
00:00:05,000 --> 00:00:08,000
Let's go! 出发吧
"""
        result = parse_subtitle(srt_content, "mixed.srt")

        assert len(result) == 2
        assert "Minecraft" in result[0]["content"]
        assert "1" in result[0]["content"]
        assert "Let's go!" in result[1]["content"]
        assert "出发吧" in result[1]["content"]

    def test_multiline_subtitle_joined_with_space(self):
        """Multi-line subtitle text is joined into single content."""
        srt_content = """\
1
00:00:01,000 --> 00:00:04,000
第一行
第二行
"""
        result = parse_subtitle(srt_content, "multiline.srt")

        assert len(result) == 1
        assert result[0]["content"] == "第一行 第二行"


class TestFormatTagCleaning:
    """Formatting tags and control sequences are stripped."""

    def test_html_tags_stripped(self):
        """HTML tags like <i>, <b>, <u> are removed."""
        srt_content = """\
1
00:00:01,000 --> 00:00:04,000
<i>这是斜体</i>和<b>粗体</b>
"""
        result = parse_subtitle(srt_content, "tags.srt")
        assert result[0]["content"] == "这是斜体和粗体"

    def test_ass_control_sequences_stripped(self):
        """ASS control sequences like {\\an8} are removed."""
        srt_content = """\
1
00:00:01,000 --> 00:00:04,000
{\\an8}这是顶部字幕
"""
        result = parse_subtitle(srt_content, "ctrl.srt")
        assert result[0]["content"] == "这是顶部字幕"

    def test_mixed_tags_and_text(self):
        """Tags are stripped but surrounding text is preserved."""
        srt_content = """\
1
00:00:01,000 --> 00:00:04,000
正常文字 <b>加粗</b> {\\an8}正常
"""
        result = parse_subtitle(srt_content, "mixed_tags.srt")
        assert result[0]["content"] == "正常文字 加粗 正常"


class TestErrorHandling:
    """Invalid input produces clear errors."""

    def test_empty_content_raises_value_error(self):
        """Empty string raises ValueError."""
        with pytest.raises(ValueError, match="empty"):
            parse_subtitle("", "empty.srt")

    def test_whitespace_only_raises_value_error(self):
        """Whitespace-only content raises ValueError."""
        with pytest.raises(ValueError, match="empty"):
            parse_subtitle("   \n\n  ", "ws.srt")

    def test_no_valid_entries_raises_value_error(self):
        """Content with no parseable subtitle entries raises ValueError."""
        with pytest.raises(ValueError, match="No valid"):
            parse_subtitle("random text\nwithout timestamps", "bad.srt")

    def test_bytes_input_supported(self):
        """bytes input is decoded and parsed normally."""
        content = "1\n00:00:01,000 --> 00:00:02,000\n测试\n".encode("utf-8")
        result = parse_subtitle(content, "bytes.srt")
        assert len(result) == 1
        assert result[0]["content"] == "测试"


class TestEncodingDetection:
    """Auto-detect file encoding for bytes input."""

    def test_gbk_encoded_srt_parsed_correctly(self):
        """GBK-encoded SRT file is auto-detected and parsed."""
        srt_text = "1\n00:00:01,000 --> 00:00:04,000\n你好世界\n"
        gbk_bytes = srt_text.encode("gbk")
        result = parse_subtitle(gbk_bytes, "gbk.srt")
        assert len(result) == 1
        assert result[0]["content"] == "你好世界"

    def test_utf8_bom_parsed_correctly(self):
        """UTF-8 with BOM is parsed without issues."""
        srt_text = "1\n00:00:01,000 --> 00:00:04,000\n你好世界\n"
        bom_bytes = b"\xef\xbb\xbf" + srt_text.encode("utf-8")
        result = parse_subtitle(bom_bytes, "bom.srt")
        assert len(result) == 1
        assert result[0]["content"] == "你好世界"
