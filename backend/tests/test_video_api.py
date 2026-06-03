"""Integration tests for Video Material API."""
import io

import pytest
from fastapi.testclient import TestClient

from app.main import app, _set_store, _set_config_path, _set_progress_path, _set_video_dir
from app.store import MaterialStore

client = TestClient(app)


@pytest.fixture(autouse=True)
def _use_tmp_store(tmp_path):
    _set_store(MaterialStore(tmp_path / "materials.json"))
    _set_config_path(tmp_path / "config.json")
    _set_progress_path(tmp_path / "progress.json")
    _set_video_dir(tmp_path / "videos")
    yield


class TestCreateVideoMaterial:
    """POST /api/materials/video"""

    def test_create_returns_201_with_video_url_and_timestamped_segments(self):
        video_file = io.BytesIO(b"fake-video-content")
        subtitle_content = (
            "1\n"
            "00:00:01,000 --> 00:00:04,000\n"
            "你好世界\n\n"
            "2\n"
            "00:00:05,000 --> 00:00:08,000\n"
            "今天天气真好\n"
        )
        subtitle_file = io.BytesIO(subtitle_content.encode("utf-8"))

        response = client.post(
            "/api/materials/video",
            files={
                "video": ("test.mp4", video_file, "video/mp4"),
                "subtitle": ("test.srt", subtitle_file, "text/plain"),
            },
            data={"title": "测试视频", "tags": "视频,测试"},
        )

        assert response.status_code == 201
        body = response.json()
        assert body["id"]
        assert body["title"] == "测试视频"
        assert body["tags"] == ["视频", "测试"]
        assert body["videoUrl"] == "test.mp4"
        assert len(body["segments"]) == 2
        assert body["segments"][0]["type"] == "text"
        assert body["segments"][0]["content"] == "你好世界"
        assert body["segments"][0]["startTimeMs"] == 1000
        assert body["segments"][0]["endTimeMs"] == 4000
        assert body["segments"][1]["content"] == "今天天气真好"
        assert body["segments"][1]["startTimeMs"] == 5000
        assert body["segments"][1]["endTimeMs"] == 8000


class TestServeVideo:
    """GET /api/videos/{filename}"""

    def test_serves_video_file(self, tmp_path):
        video_content = b"fake-video-content"
        (tmp_path / "videos").mkdir(exist_ok=True)
        (tmp_path / "videos" / "test.mp4").write_bytes(video_content)

        response = client.get("/api/videos/test.mp4")

        assert response.status_code == 200
        assert response.content == video_content

    def test_returns_404_for_missing_video(self):
        response = client.get("/api/videos/nonexistent.mp4")
        assert response.status_code == 404


class TestDeleteVideoMaterial:
    """DELETE /api/materials/{id} — with video file cleanup"""

    def test_delete_removes_video_file_from_disk(self, tmp_path):
        video_file = io.BytesIO(b"fake-video-content")
        subtitle_content = "1\n00:00:01,000 --> 00:00:02,000\n测试\n"
        subtitle_file = io.BytesIO(subtitle_content.encode("utf-8"))

        create_resp = client.post(
            "/api/materials/video",
            files={
                "video": ("test.mp4", video_file, "video/mp4"),
                "subtitle": ("test.srt", subtitle_file, "text/plain"),
            },
            data={"title": "测试视频", "tags": "测试"},
        )
        material_id = create_resp.json()["id"]

        assert (tmp_path / "videos" / "test.mp4").exists()

        response = client.delete(f"/api/materials/{material_id}")
        assert response.status_code == 204
        assert not (tmp_path / "videos" / "test.mp4").exists()

    def test_delete_text_material_does_not_touch_files(self, tmp_path):
        create_resp = client.post(
            "/api/materials",
            json={"title": "文本素材", "tags": "测试", "content": "你好世界。"},
        )
        material_id = create_resp.json()["id"]

        response = client.delete(f"/api/materials/{material_id}")
        assert response.status_code == 204


class TestVideoFileConflict:
    """Same-name video file upload conflict detection."""

    def test_conflict_returns_409(self, tmp_path):
        (tmp_path / "videos").mkdir(exist_ok=True)
        (tmp_path / "videos" / "test.mp4").write_bytes(b"existing-video")

        video_file = io.BytesIO(b"new-video-content")
        subtitle_content = "1\n00:00:01,000 --> 00:00:02,000\n测试\n"
        subtitle_file = io.BytesIO(subtitle_content.encode("utf-8"))

        response = client.post(
            "/api/materials/video",
            files={
                "video": ("test.mp4", video_file, "video/mp4"),
                "subtitle": ("test.srt", subtitle_file, "text/plain"),
            },
            data={"title": "冲突测试", "tags": "测试"},
        )

        assert response.status_code == 409
        assert "already exists" in response.json()["detail"].lower() or "conflict" in response.json()["detail"].lower() or "已存在" in response.json()["detail"]

    def test_overwrite_with_flag_succeeds(self, tmp_path):
        (tmp_path / "videos").mkdir(exist_ok=True)
        (tmp_path / "videos" / "test.mp4").write_bytes(b"existing-video")

        video_file = io.BytesIO(b"new-video-content")
        subtitle_content = "1\n00:00:01,000 --> 00:00:02,000\n测试\n"
        subtitle_file = io.BytesIO(subtitle_content.encode("utf-8"))

        response = client.post(
            "/api/materials/video?overwrite=true",
            files={
                "video": ("test.mp4", video_file, "video/mp4"),
                "subtitle": ("test.srt", subtitle_file, "text/plain"),
            },
            data={"title": "覆盖测试", "tags": "测试"},
        )

        assert response.status_code == 201
        assert (tmp_path / "videos" / "test.mp4").read_bytes() == b"new-video-content"


class TestExportImportVideoMaterial:
    """Export and import preserve videoUrl and timestamped segments."""

    def _create_video_material(self):
        video_file = io.BytesIO(b"fake-video-content")
        subtitle_content = (
            "1\n00:00:01,000 --> 00:00:04,000\n你好世界\n\n"
            "2\n00:00:05,000 --> 00:00:08,000\n今天天气真好\n"
        )
        subtitle_file = io.BytesIO(subtitle_content.encode("utf-8"))
        resp = client.post(
            "/api/materials/video",
            files={
                "video": ("export_test.mp4", video_file, "video/mp4"),
                "subtitle": ("test.srt", subtitle_file, "text/plain"),
            },
            data={"title": "导出测试", "tags": "视频"},
        )
        assert resp.status_code == 201
        return resp.json()

    def test_export_includes_video_url_and_segments(self):
        mat = self._create_video_material()
        resp = client.post("/api/materials/export", json={"mode": "all"})
        assert resp.status_code == 200
        items = resp.json()["materials"]
        exported = next(m for m in items if m["id"] == mat["id"])
        assert exported["videoUrl"] == "export_test.mp4"
        assert len(exported["segments"]) == 2
        assert exported["segments"][0]["startTimeMs"] == 1000

    def test_export_text_material_has_no_video_fields(self):
        client.post(
            "/api/materials",
            json={"title": "纯文本", "tags": "测试", "content": "你好。世界。"},
        )
        resp = client.post("/api/materials/export", json={"mode": "all"})
        assert resp.status_code == 200
        items = resp.json()["materials"]
        text_mat = next(m for m in items if m["title"] == "纯文本")
        assert "videoUrl" not in text_mat
        assert "segments" not in text_mat

    def test_import_preserves_video_url_and_timestamped_segments(self, tmp_path):
        mat = self._create_video_material()
        export_resp = client.post("/api/materials/export", json={"mode": "all"})
        export_json = export_resp.json()

        # Delete the original material so import has no conflict
        client.delete(f"/api/materials/{mat['id']}")

        # Import the exported file
        import_resp = client.post(
            "/api/materials/import",
            files={"file": ("export.json", io.BytesIO(__import__("json").dumps(export_json).encode()), "application/json")},
        )
        assert import_resp.status_code == 200
        body = import_resp.json()
        upload_id = body["upload_id"]
        assert len(body["conflicts"]) == 0

        # Resolve (auto, no conflicts)
        resolve_resp = client.post(
            "/api/materials/import/resolve",
            json={"upload_id": upload_id, "decisions": []},
        )
        assert resolve_resp.status_code == 200

        # Verify the imported material has videoUrl and timestamped segments
        list_resp = client.get("/api/materials")
        imported = next(m for m in list_resp.json() if m.get("videoUrl") == "export_test.mp4")
        assert imported["videoUrl"] == "export_test.mp4"
        assert len(imported["segments"]) == 2
        assert imported["segments"][0]["startTimeMs"] == 1000
        assert imported["segments"][0]["endTimeMs"] == 4000


class TestAttachVideo:
    """POST /api/materials/{id}/video — attach video to existing material."""

    def test_attach_video_to_existing_material(self, tmp_path):
        # Create a plain text material first
        create_resp = client.post(
            "/api/materials",
            json={"title": "待附加视频", "tags": "测试", "content": "你好世界。"},
        )
        mat_id = create_resp.json()["id"]

        # Attach a video file
        video_file = io.BytesIO(b"attached-video-content")
        resp = client.post(
            f"/api/materials/{mat_id}/video",
            files={"video": ("attached.mp4", video_file, "video/mp4")},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["videoUrl"] == "attached.mp4"
        assert (tmp_path / "videos" / "attached.mp4").exists()

    def test_attach_video_returns_404_for_missing_material(self):
        video_file = io.BytesIO(b"fake")
        resp = client.post(
            "/api/materials/nonexistent123/video",
            files={"video": ("test.mp4", video_file, "video/mp4")},
        )
        assert resp.status_code == 404
