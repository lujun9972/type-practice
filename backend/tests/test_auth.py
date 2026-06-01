"""Integration tests for Auth API."""
import pytest
from fastapi.testclient import TestClient

from app.main import app, _set_store, _set_config_path, _set_progress_path, _clear_tokens
from app.store import MaterialStore

client = TestClient(app)


@pytest.fixture(autouse=True)
def _use_tmp_store(tmp_path):
    """Use temp files for each test."""
    _set_store(MaterialStore(tmp_path / "materials.json"))
    _set_config_path(tmp_path / "config.json")
    _set_progress_path(tmp_path / "progress.json")
    _clear_tokens()
    yield


class TestAuthStatus:
    """GET /api/auth/status"""

    def test_initial_status_shows_password_not_set(self):
        response = client.get("/api/auth/status")
        assert response.status_code == 200
        assert response.json() == {"passwordSet": False}


class TestAuthSetup:
    """POST /api/auth/setup"""

    def test_setup_sets_password_and_returns_token(self):
        response = client.post("/api/auth/setup", json={"password": "mypassword"})
        assert response.status_code == 200
        body = response.json()
        assert "token" in body
        assert len(body["token"]) > 0

        # Status should now show password set.
        status = client.get("/api/auth/status")
        assert status.json()["passwordSet"] is True

    def test_setup_when_password_already_exists_returns_409(self):
        client.post("/api/auth/setup", json={"password": "first"})
        response = client.post("/api/auth/setup", json={"password": "second"})
        assert response.status_code == 409


class TestAuthLogin:
    """POST /api/auth/login"""

    def test_login_with_correct_password_returns_token(self):
        client.post("/api/auth/setup", json={"password": "mypassword"})
        response = client.post("/api/auth/login", json={"password": "mypassword"})
        assert response.status_code == 200
        assert "token" in response.json()

    def test_login_with_wrong_password_returns_401(self):
        client.post("/api/auth/setup", json={"password": "mypassword"})
        response = client.post("/api/auth/login", json={"password": "wrong"})
        assert response.status_code == 401

    def test_login_when_no_password_set_returns_403(self):
        response = client.post("/api/auth/login", json={"password": "anything"})
        assert response.status_code == 403


class TestPasswordChange:
    """PUT /api/auth/password"""

    def _setup(self):
        setup = client.post("/api/auth/setup", json={"password": "oldpass"})
        return setup.json()["token"]

    def test_change_password_success(self):
        token = self._setup()
        response = client.put(
            "/api/auth/password",
            json={"currentPassword": "oldpass", "newPassword": "newpass"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200

        # Login with new password should work.
        login = client.post("/api/auth/login", json={"password": "newpass"})
        assert login.status_code == 200

        # Login with old password should fail.
        login_old = client.post("/api/auth/login", json={"password": "oldpass"})
        assert login_old.status_code == 401

    def test_change_password_wrong_current_returns_401(self):
        token = self._setup()
        response = client.put(
            "/api/auth/password",
            json={"currentPassword": "wrong", "newPassword": "newpass"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 401

    def test_change_password_without_token_returns_401(self):
        self._setup()
        response = client.put(
            "/api/auth/password",
            json={"currentPassword": "oldpass", "newPassword": "newpass"},
        )
        assert response.status_code == 401

    def test_old_token_still_valid_after_password_change(self):
        token = self._setup()
        client.put(
            "/api/auth/password",
            json={"currentPassword": "oldpass", "newPassword": "newpass"},
            headers={"Authorization": f"Bearer {token}"},
        )
        # The token should still be valid.
        response = client.get("/api/materials")
        assert response.status_code == 200


class TestMiddlewareProtection:
    """Protected endpoints require valid token."""

    def _setup_and_login(self):
        setup = client.post("/api/auth/setup", json={"password": "testpass"})
        token = setup.json()["token"]
        return token

    def test_create_material_without_token_returns_401(self):
        self._setup_and_login()
        response = client.post(
            "/api/materials",
            json={"title": "test", "tags": "", "content": "hello。"},
        )
        assert response.status_code == 401

    def test_create_material_with_valid_token_succeeds(self):
        token = self._setup_and_login()
        response = client.post(
            "/api/materials",
            json={"title": "test", "tags": "", "content": "hello。"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 201

    def test_get_materials_works_without_token(self):
        self._setup_and_login()
        response = client.get("/api/materials")
        assert response.status_code == 200
