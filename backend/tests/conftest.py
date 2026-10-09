from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app

TEST_SECRET = "test-secret-" + "x" * 40


@pytest.fixture
def client(tmp_path) -> Iterator[TestClient]:
    settings = Settings(
        database_url=f"sqlite:///{tmp_path / 'test.db'}",
        jwt_secret=TEST_SECRET,
        cors_origins="http://localhost:5173",
        _env_file=None,  # type: ignore[call-arg]
    )
    with TestClient(create_app(settings)) as c:
        yield c


@pytest.fixture
def auth_headers(client: TestClient) -> Callable[[str], dict[str, str]]:
    """Registra (se serve) ed effettua il login, restituendo l'header Authorization."""

    def make(email: str = "mario@example.com", password: str = "password123") -> dict[str, str]:
        client.post("/auth/register", json={"email": email, "password": password})
        res = client.post("/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, res.text
        return {"Authorization": f"Bearer {res.json()['access_token']}"}

    return make
