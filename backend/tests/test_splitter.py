"""Segment Splitter tests."""
from app.splitter import split_into_segments


class TestChineseText:
    def test_splits_on_period(self):
        text = "侦探走进黑暗的房间。他看到了一张桌子。桌子上有一封信。"
        result = split_into_segments(text)
        assert len(result) == 3
        assert all(seg["type"] == "text" for seg in result)

    def test_segment_length_within_range(self):
        text = (
            "深夜，侦探站在废弃工厂前。寒风吹过，门发出吱呀一声。"
            "他深吸一口气，推开了生锈的铁门。里面漆黑一片，只有远处微弱的光线。"
            "他小心翼翼地走了进去，脚下的地板发出咯吱咯吱的响声。"
        )
        result = split_into_segments(text)
        for seg in result:
            if seg["type"] == "text":
                assert 1 <= len(seg["content"]) <= 60

    def test_long_sentence_no_punctuation_forces_split(self):
        """A sentence exceeding max length with no punctuation should be force-split."""
        text = "侦探慢慢地走向那扇古老的门然后他轻轻地推开了门但是门后面什么都没有他感到非常惊讶因为房间里空空如也完全不像有人住过的样子"
        result = split_into_segments(text)
        assert len(result) > 1
        for seg in result:
            assert len(seg["content"]) <= 60

    def test_single_short_sentence(self):
        text = "你好。"
        result = split_into_segments(text)
        assert len(result) == 1
        assert result[0]["content"] == "你好。"


class TestEnglishText:
    def test_splits_on_period(self):
        text = "The detective entered the dark room. He saw a table. On the table was a letter."
        result = split_into_segments(text)
        assert len(result) == 3

    def test_splits_on_question_mark(self):
        text = "Who was there? Nobody knew. What happened next?"
        result = split_into_segments(text)
        assert len(result) == 3

    def test_long_paragraph_forces_split(self):
        text = (
            "The detective walked slowly toward the ancient door "
            "and then he gently pushed it open but there was nothing "
            "behind the door and he felt very surprised because the "
            "room was completely empty and did not look like anyone "
            "had ever lived there before in all these long years"
        )
        result = split_into_segments(text)
        assert len(result) > 1
        for seg in result:
            assert len(seg["content"]) <= 40


class TestMixedText:
    def test_chinese_with_english_terms(self):
        text = "他打开了 Minecraft 的红石教程。第一步是放置 Redstone Dust。然后连接到活塞。"
        result = split_into_segments(text)
        assert len(result) == 3
        assert "Minecraft" in result[0]["content"]


class TestImages:
    def test_images_inserted_between_segments(self):
        text = "侦探走进了房间。他看到了一幅画。房间里有一张桌子。"
        images = [
            {"url": "https://example.com/door.jpg", "position": 10},
            {"url": "https://example.com/table.jpg", "position": 30},
        ]
        result = split_into_segments(text, images)
        image_nodes = [seg for seg in result if seg["type"] == "image"]
        assert len(image_nodes) == 2
        assert image_nodes[0]["url"] == "https://example.com/door.jpg"
        assert image_nodes[1]["url"] == "https://example.com/table.jpg"

    def test_image_at_beginning(self):
        text = "这是第一句话。这是第二句话。"
        images = [{"url": "https://example.com/cover.jpg", "position": 0}]
        result = split_into_segments(text, images)
        assert result[0]["type"] == "image"

    def test_no_images(self):
        text = "只有文字没有图片。"
        result = split_into_segments(text)
        assert all(seg["type"] == "text" for seg in result)


class TestEdgeCases:
    def test_empty_text(self):
        result = split_into_segments("")
        assert result == []

    def test_whitespace_only(self):
        result = split_into_segments("   \n\t  ")
        assert result == []

    def test_strips_html_tags(self):
        text = "<p>侦探走进了房间。</p><script>alert('xss')</script>他看到了桌子。"
        result = split_into_segments(text)
        for seg in result:
            assert "<" not in seg["content"]
            assert "script" not in seg["content"]

    def test_single_character(self):
        result = split_into_segments("好")
        assert len(result) == 1

    def test_splits_on_newlines(self):
        """URL-extracted text uses newlines as paragraph separators."""
        text = "第一段内容。\n第二段内容。\n第三段内容。"
        result = split_into_segments(text)
        assert len(result) == 3
        assert result[0]["content"] == "第一段内容。"
        assert result[1]["content"] == "第二段内容。"
        assert result[2]["content"] == "第三段内容。"

    def test_splits_on_newlines_without_punctuation(self):
        """URL-extracted text may have no punctuation, only newlines."""
        text = "第一段内容\n第二段内容\n第三段内容"
        result = split_into_segments(text)
        assert len(result) == 3
        assert result[0]["content"] == "第一段内容"
        assert result[1]["content"] == "第二段内容"
        assert result[2]["content"] == "第三段内容"
