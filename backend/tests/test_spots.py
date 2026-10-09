from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

Headers = Callable[..., dict[str, str]]

SPOT = {"name": "Partenza", "kind": "start", "lat": 46.07, "lon": 11.12}


def test_spots_require_auth(client: TestClient) -> None:
    assert client.get("/spots").status_code == 401
    assert client.post("/spots", json=SPOT).status_code == 401
    assert client.delete("/spots/1").status_code == 401


def test_create_list_delete(client: TestClient, auth_headers: Headers) -> None:
    h = auth_headers()
    res = client.post("/spots", json={**SPOT, "name": "  Partenza  "}, headers=h)
    assert res.status_code == 201
    spot = res.json()
    assert spot["name"] == "Partenza"
    assert spot["kind"] == "start"

    client.post("/spots", json={**SPOT, "name": "Bel posto", "kind": "note"}, headers=h)
    names = [s["name"] for s in client.get("/spots", headers=h).json()]
    assert names == ["Bel posto", "Partenza"]

    assert client.delete(f"/spots/{spot['id']}", headers=h).status_code == 204
    assert [s["name"] for s in client.get("/spots", headers=h).json()] == ["Bel posto"]
    assert client.delete(f"/spots/{spot['id']}", headers=h).status_code == 404


def test_users_are_isolated(client: TestClient, auth_headers: Headers) -> None:
    alice = auth_headers("alice@example.com")
    bob = auth_headers("bob@example.com")
    spot = client.post("/spots", json=SPOT, headers=alice).json()

    assert client.get("/spots", headers=bob).json() == []
    assert client.delete(f"/spots/{spot['id']}", headers=bob).status_code == 404
    assert len(client.get("/spots", headers=alice).json()) == 1


@pytest.mark.parametrize(
    "override",
    [
        {"lat": 90.1},
        {"lat": -91},
        {"lon": 180.5},
        {"lon": -181},
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 101},
        {"kind": "altro"},
    ],
)
def test_spot_validation(client: TestClient, auth_headers: Headers, override: dict) -> None:
    res = client.post("/spots", json={**SPOT, **override}, headers=auth_headers())
    assert res.status_code == 422
