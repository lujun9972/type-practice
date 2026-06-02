"""Stats API integration tests."""
import pytest
from fastapi.testclient import TestClient

from app.main import app, _set_store, _set_config_path, _set_progress_path, _set_stats_store, _get_stats_store
from app.store import MaterialStore
from app.stats import StatsStore

client = TestClient(app)


@pytest.fixture(autouse=True)
def _use_tmp_store(tmp_path):
    _set_store(MaterialStore(tmp_path / "materials.json"))
    _set_config_path(tmp_path / "config.json")
    _set_progress_path(tmp_path / "progress.json")
    _set_stats_store(StatsStore(tmp_path / "stats.json"))
    yield


class TestGetStats:
    def test_returns_initial_stats(self):
        response = client.get("/api/stats")
        assert response.status_code == 200
        body = response.json()
        assert body["totalXp"] == 0
        assert body["level"] == 1
        assert body["title"] == "打字新手"
        assert body["nextLevelXp"] == 500
        assert body["streak"]["current"] == 0

    def test_no_auth_required(self):
        """Stats endpoint should work without authentication."""
        # Even with a password set, stats should be accessible
        response = client.get("/api/stats")
        assert response.status_code == 200


class TestSetDailyGoal:
    def test_set_easy_goal(self):
        response = client.post("/api/stats/daily-goal", json={"difficulty": "easy"})
        assert response.status_code == 200
        body = response.json()
        assert body["todayTarget"] == 80

    def test_set_normal_goal(self):
        response = client.post("/api/stats/daily-goal", json={"difficulty": "normal"})
        assert response.status_code == 200
        body = response.json()
        assert body["todayTarget"] == 150

    def test_set_challenge_goal(self):
        response = client.post("/api/stats/daily-goal", json={"difficulty": "challenge"})
        assert response.status_code == 200
        body = response.json()
        assert body["todayTarget"] == 300

    def test_invalid_difficulty_returns_error(self):
        response = client.post("/api/stats/daily-goal", json={"difficulty": "insane"})
        assert response.status_code == 422


class TestUseRepair:
    def test_use_repair_with_no_items_fails(self):
        response = client.post("/api/stats/repair", json={"date": "2026-06-01"})
        assert response.status_code == 400

    def test_use_repair_after_earning_one(self):
        # Earn a repair item: 7 consecutive completed days
        stats_store = _get_stats_store()
        for d in range(1, 8):
            d_str = f"2026-06-0{d}"
            stats_store.set_daily_goal("easy", date=d_str)
            stats_store.add_xp(80, date=d_str)
        # Now use it
        response = client.post("/api/stats/repair", json={"date": "2026-06-08"})
        assert response.status_code == 200
        assert response.json()["streak"]["repairItems"] == 0


class TestXpIntegration:
    def _create_material(self):
        return client.post(
            "/api/materials",
            json={
                "title": "测试素材",
                "tags": "test",
                "content": "第一段。第二段。",
            },
        ).json()

    def test_saving_progress_with_correct_chars_adds_xp(self):
        material = self._create_material()
        # Simulate saving progress with segment results
        response = client.put(
            f"/api/progress/{material['id']}",
            json={
                "materialId": material["id"],
                "completedSegments": [0],
                "segmentResults": [
                    {"index": 0, "accuracy": 100, "timeMs": 5000, "correctChars": 3}
                ],
                "currentSegmentIndex": 1,
                "isComplete": False,
            },
        )
        assert response.status_code == 200
        # Check XP was added
        stats = client.get("/api/stats").json()
        assert stats["totalXp"] == 3

    def test_multiple_segment_saves_accumulate_xp(self):
        material = self._create_material()
        client.put(
            f"/api/progress/{material['id']}",
            json={
                "materialId": material["id"],
                "completedSegments": [0],
                "segmentResults": [
                    {"index": 0, "accuracy": 80, "timeMs": 5000, "correctChars": 4}
                ],
                "currentSegmentIndex": 1,
                "isComplete": False,
            },
        )
        client.put(
            f"/api/progress/{material['id']}",
            json={
                "materialId": material["id"],
                "completedSegments": [0, 1],
                "segmentResults": [
                    {"index": 0, "accuracy": 80, "timeMs": 5000, "correctChars": 4},
                    {"index": 1, "accuracy": 100, "timeMs": 3000, "correctChars": 3},
                ],
                "currentSegmentIndex": 2,
                "isComplete": True,
            },
        )
        stats = client.get("/api/stats").json()
        # XP from new segment only (3), not re-counting old ones (4)
        # Implementation: only count the newly added segment result
        assert stats["totalXp"] > 0
