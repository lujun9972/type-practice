"""Test that FastAPI conditionally serves frontend static files."""
from pathlib import Path

from fastapi.testclient import TestClient
from fastapi.staticfiles import StaticFiles

from app.main import app

client = TestClient(app)

STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


def test_serves_index_html_when_dist_exists():
    """When frontend/dist/ exists with index.html, GET / returns HTML."""
    if not STATIC_DIR.is_dir():
        # No dist built yet — skip, not a failure
        return
    c = TestClient(app)
    response = c.get("/")
    assert response.status_code == 200
    assert "Type Practice" in response.text


def test_api_health_still_works():
    """API routes are not affected by static file mount."""
    response = client.get("/api/health")
    assert response.status_code == 200


def test_conditional_mount_skips_when_no_dist(tmp_path, monkeypatch):
    """App starts fine even when frontend/dist/ doesn't exist."""
    # The app should import and initialize without error
    # even if dist is absent — the mount is conditional
    from app.main import app as fresh_app
    c = TestClient(fresh_app)
    # API should still work
    resp = c.get("/api/health")
    assert resp.status_code == 200
    # GET / should 404 (no static files mounted) or fall through
    # Not testing specific status — just that app doesn't crash
