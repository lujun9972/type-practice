"""Integration tests for Material CRUD API."""
import pytest
from fastapi.testclient import TestClient

from app.main import app, _set_store, _set_config_path, _set_progress_path
from app.store import MaterialStore

client = TestClient(app)


@pytest.fixture(autouse=True)
def _use_tmp_store(tmp_path):
    """Use temp files for each test."""
    _set_store(MaterialStore(tmp_path / "materials.json"))
    _set_config_path(tmp_path / "config.json")
    _set_progress_path(tmp_path / "progress.json")
    yield


class TestCreateMaterial:
    """POST /api/materials"""

    def test_create_returns_201_with_segments(self):
        response = client.post(
            "/api/materials",
            json={
                "title": "小王子",
                "tags": "童话,经典",
                "content": "从前有一个小王子。他住在一颗小行星上。",
            },
        )
        assert response.status_code == 201
        body = response.json()
        assert body["id"]
        assert body["title"] == "小王子"
        assert body["tags"] == ["童话", "经典"]
        # Segment Splitter should have split the content.
        assert len(body["segments"]) >= 1
        assert body["segments"][0]["type"] == "text"
        assert "小王子" in body["segments"][0]["content"]

    def test_create_with_prebuilt_segments_preserves_images(self):
        prebuilt = [
            {"type": "text", "content": "图片前文字。"},
            {"type": "image", "url": "https://example.com/img.jpg", "position": 6},
            {"type": "text", "content": "图片后文字。"},
        ]
        response = client.post(
            "/api/materials",
            json={
                "title": "带图素材",
                "tags": "图",
                "content": "图片前文字。图片后文字。",
                "segments": prebuilt,
            },
        )
        assert response.status_code == 201
        body = response.json()
        assert body["segments"] == prebuilt
        assert any(s["type"] == "image" for s in body["segments"])
    """GET /api/materials"""

    def test_list_returns_all_materials(self):
        client.post(
            "/api/materials",
            json={"title": "A", "tags": "x", "content": "你好。"},
        )
        client.post(
            "/api/materials",
            json={"title": "B", "tags": "y", "content": "世界。"},
        )
        response = client.get("/api/materials")
        assert response.status_code == 200
        body = response.json()
        assert len(body) >= 2
        titles = [m["title"] for m in body]
        assert "A" in titles
        assert "B" in titles


class TestGetMaterial:
    """GET /api/materials/:id"""

    def test_get_single_material(self):
        create_resp = client.post(
            "/api/materials",
            json={"title": "测试", "tags": "a,b", "content": "你好世界。"},
        )
        mat_id = create_resp.json()["id"]

        response = client.get(f"/api/materials/{mat_id}")
        assert response.status_code == 200
        body = response.json()
        assert body["id"] == mat_id
        assert body["title"] == "测试"
        assert body["segments"]

    def test_get_nonexistent_returns_404(self):
        response = client.get("/api/materials/nonexistent")
        assert response.status_code == 404


class TestUpdateMaterial:
    """PUT /api/materials/:id"""

    def test_update_re_splits_content(self):
        create_resp = client.post(
            "/api/materials",
            json={"title": "旧标题", "tags": "x", "content": "第一句。"},
        )
        mat_id = create_resp.json()["id"]

        response = client.put(
            f"/api/materials/{mat_id}",
            json={"title": "新标题", "tags": "y,z", "content": "新的内容。很好。"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "新标题"
        assert body["tags"] == ["y", "z"]
        assert len(body["segments"]) >= 2

    def test_update_nonexistent_returns_404(self):
        response = client.put(
            "/api/materials/nonexistent",
            json={"title": "X", "tags": "", "content": "test"},
        )
        assert response.status_code == 404


class TestDeleteMaterial:
    """DELETE /api/materials/:id"""

    def test_delete_removes_material(self):
        create_resp = client.post(
            "/api/materials",
            json={"title": "待删", "tags": "", "content": "内容。"},
        )
        mat_id = create_resp.json()["id"]

        response = client.delete(f"/api/materials/{mat_id}")
        assert response.status_code == 204

        # Verify it's gone.
        get_resp = client.get(f"/api/materials/{mat_id}")
        assert get_resp.status_code == 404

    def test_delete_nonexistent_returns_404(self):
        response = client.delete("/api/materials/nonexistent")
        assert response.status_code == 404


class TestTagFilter:
    """GET /api/materials?tag=X"""

    def test_filter_by_tag(self):
        client.post(
            "/api/materials",
            json={"title": "A", "tags": "童话,经典", "content": "内容。"},
        )
        client.post(
            "/api/materials",
            json={"title": "B", "tags": "科幻", "content": "内容。"},
        )
        response = client.get("/api/materials?tag=童话")
        assert response.status_code == 200
        body = response.json()
        assert len(body) == 1
        assert body[0]["title"] == "A"

    def test_filter_by_nonexistent_tag_returns_empty(self):
        client.post(
            "/api/materials",
            json={"title": "A", "tags": "童话", "content": "内容。"},
        )
        response = client.get("/api/materials?tag=不存在")
        assert response.status_code == 200
        assert response.json() == []


class TestPersistence:
    """Materials survive store reload."""

    def test_materials_persist_after_save(self, tmp_path):
        from app.store import MaterialStore

        store = MaterialStore(tmp_path / "materials.json")
        store.save({"id": "abc", "title": "持久化测试", "tags": [], "segments": []})

        store2 = MaterialStore(tmp_path / "materials.json")
        assert store2.get("abc")["title"] == "持久化测试"


class TestFetchUrl:
    """POST /api/fetch/url"""

    def test_fetch_url_returns_segments(self, monkeypatch):
        import httpx

        sample_html = """
        <html><body>
          <article><p>这是从网页抓取的内容。很好看。</p><p>继续阅读更多。</p></article>
        </body></html>
        """

        class MockResponse:
            status_code = 200
            text = sample_html
            def raise_for_status(self): pass

        monkeypatch.setattr(httpx, "get", lambda *a, **kw: MockResponse())

        response = client.post(
            "/api/fetch/url",
            json={"url": "https://example.com/article"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["title"]
        assert len(body["segments"]) >= 1
        assert "网页抓取" in body["segments"][0]["content"]

    def test_fetch_url_empty_content_returns_error(self, monkeypatch):
        import httpx

        class MockResponse:
            status_code = 200
            text = "<html><body><nav>导航</nav></body></html>"

        monkeypatch.setattr(httpx, "get", lambda *a, **kw: MockResponse())

        response = client.post(
            "/api/fetch/url",
            json={"url": "https://example.com/empty"},
        )
        assert response.status_code == 422


class TestConfig:
    """GET /api/config and PUT /api/config"""

    def test_get_config_returns_defaults(self):
        response = client.get("/api/config")
        assert response.status_code == 200
        body = response.json()
        assert body["skipPunctuation"] is True
        assert body["skipLimit"] == 3
        assert "baseUrl" in body["llm"]

    def test_put_config_updates_values(self):
        client.get("/api/config")  # ensure config exists
        response = client.put("/api/config", json={
            "skipPunctuation": False,
            "skipLimit": 5,
            "llm": {
                "baseUrl": "https://api.openai.com",
                "apiKey": "sk-test",
                "model": "gpt-4",
            },
        })
        assert response.status_code == 200
        body = response.json()
        assert body["skipPunctuation"] is False
        assert body["skipLimit"] == 5
        assert body["llm"]["model"] == "gpt-4"

    def test_config_persists_after_update(self):
        client.get("/api/config")
        client.put("/api/config", json={
            "skipPunctuation": False,
            "skipLimit": 10,
            "llm": {"baseUrl": "https://test.com", "apiKey": "", "model": "test"},
        })
        # Re-fetch.
        response = client.get("/api/config")
        assert response.json()["skipLimit"] == 10


class TestFetchTopic:
    """POST /api/fetch/topic — LLM content generation."""

    def test_generates_content_and_splits(self, monkeypatch):
        import httpx

        class MockResponse:
            status_code = 200
            def raise_for_status(self): pass
            def json(self):
                return {
                    "choices": [{
                        "message": {
                            "content": "很久很久以前，有一座山。山上有一座庙。庙里有个老和尚。"
                        }
                    }]
                }

        monkeypatch.setattr(httpx, "post", lambda *a, **kw: MockResponse())
        monkeypatch.setenv("LLM_API_KEY", "test-key")

        response = client.post(
            "/api/fetch/topic",
            json={"topic": "童话故事", "language": "zh", "length": "short"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "童话故事"
        assert len(body["segments"]) >= 1

    def test_missing_api_key_returns_error(self, monkeypatch):
        monkeypatch.delenv("LLM_API_KEY", raising=False)

        response = client.post(
            "/api/fetch/topic",
            json={"topic": "test", "language": "zh", "length": "short"},
        )
        assert response.status_code == 503

    def test_llm_api_failure_returns_error(self, monkeypatch):
        import httpx

        def mock_post(*a, **kw):
            raise httpx.HTTPStatusError("error", request=None, response=None)

        monkeypatch.setattr(httpx, "post", mock_post)
        monkeypatch.setenv("LLM_API_KEY", "test-key")

        response = client.post(
            "/api/fetch/topic",
            json={"topic": "test", "language": "zh", "length": "short"},
        )
        assert response.status_code == 502

    def test_uses_api_key_from_config(self, monkeypatch):
        import httpx

        class MockResponse:
            status_code = 200
            def raise_for_status(self): pass
            def json(self):
                return {"choices": [{"message": {"content": "内容。"}}]}

        monkeypatch.setattr(httpx, "post", lambda *a, **kw: MockResponse())
        # No env var — key should come from config.json
        monkeypatch.delenv("LLM_API_KEY", raising=False)
        # Save config with apiKey via the API
        client.put("/api/config", json={
            "skipPunctuation": True,
            "skipLimit": 3,
            "llm": {"baseUrl": "https://test.com", "apiKey": "sk-from-config", "model": "test"},
        })

        response = client.post(
            "/api/fetch/topic",
            json={"topic": "测试", "language": "zh", "length": "short"},
        )
        assert response.status_code == 200

    def test_length_min_max_sends_range_to_prompt(self, monkeypatch):
        import httpx

        captured = {}

        class MockResponse:
            status_code = 200
            def raise_for_status(self): pass
            def json(self):
                return {"choices": [{"message": {"content": "生成的。"}}]}

        def mock_post(url, **kw):
            captured["prompt"] = kw["json"]["messages"][0]["content"]
            return MockResponse()

        monkeypatch.setattr(httpx, "post", mock_post)
        monkeypatch.setenv("LLM_API_KEY", "test-key")

        response = client.post(
            "/api/fetch/topic",
            json={"topic": "测试", "language": "zh", "lengthMin": 50, "lengthMax": 100},
        )
        assert response.status_code == 200
        assert "50" in captured["prompt"]
        assert "100" in captured["prompt"]


class TestProgress:
    """Progress CRUD API."""

    def _create_material(self) -> str:
        resp = client.post(
            "/api/materials",
            json={"title": "测试", "tags": "", "content": "第一句。第二句。第三句。"},
        )
        return resp.json()["id"]

    def test_save_and_get_progress(self):
        mat_id = self._create_material()
        progress = {
            "materialId": mat_id,
            "currentSegmentIndex": 1,
            "completedSegments": [0],
            "segmentResults": [{"index": 0, "accuracy": 95, "timeMs": 3000}],
            "isComplete": False,
        }
        resp = client.put(f"/api/progress/{mat_id}", json=progress)
        assert resp.status_code == 200

        resp = client.get(f"/api/progress/{mat_id}")
        assert resp.status_code == 200
        body = resp.json()
        assert body["currentSegmentIndex"] == 1
        assert body["completedSegments"] == [0]
        assert body["segmentResults"][0]["accuracy"] == 95

    def test_get_nonexistent_progress_returns_404(self):
        resp = client.get("/api/progress/nonexistent")
        assert resp.status_code == 404

    def test_delete_progress(self):
        mat_id = self._create_material()
        client.put(f"/api/progress/{mat_id}", json={
            "materialId": mat_id, "currentSegmentIndex": 1,
            "completedSegments": [0], "segmentResults": [], "isComplete": False,
        })
        resp = client.delete(f"/api/progress/{mat_id}")
        assert resp.status_code == 204

        resp = client.get(f"/api/progress/{mat_id}")
        assert resp.status_code == 404

    def test_editing_material_clears_progress(self):
        mat_id = self._create_material()
        client.put(f"/api/progress/{mat_id}", json={
            "materialId": mat_id, "currentSegmentIndex": 1,
            "completedSegments": [0], "segmentResults": [], "isComplete": False,
        })
        # Update material content — should clear progress.
        client.put(f"/api/materials/{mat_id}", json={
            "title": "改过", "tags": "", "content": "新内容。",
        })
        resp = client.get(f"/api/progress/{mat_id}")
        assert resp.status_code == 404
