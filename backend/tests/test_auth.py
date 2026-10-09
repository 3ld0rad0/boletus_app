from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient

from tests.conftest import TEST_SECRET


def test_health(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_register_login_me(client: TestClient) -> None:
    res = client.post("/auth/register", json={"email": "Mario@Example.com", "password": "password123"})
    assert res.status_code == 201
    body = res.json()
    assert body["email"] == "mario@example.com"
    assert "password" not in body and "password_hash" not in body

    res = client.post("/auth/login", json={"email": "MARIO@example.com", "password": "password123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    assert res.json()["token_type"] == "bearer"

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "mario@example.com"


def test_register_duplicate_email(client: TestClient) -> None:
    payload = {"email": "a@example.com", "password": "password123"}
    assert client.post("/auth/register", json=payload).status_code == 201
    assert client.post("/auth/register", json=payload).status_code == 409


def test_register_validation(client: TestClient) -> None:
    assert client.post("/auth/register", json={"email": "a@example.com", "password": "corta"}).status_code == 422
    assert client.post("/auth/register", json={"email": "non-email", "password": "password123"}).status_code == 422


def test_login_error_is_generic(client: TestClient) -> None:
    client.post("/auth/register", json={"email": "a@example.com", "password": "password123"})
    wrong_pw = client.post("/auth/login", json={"email": "a@example.com", "password": "sbagliata"})
    unknown = client.post("/auth/login", json={"email": "b@example.com", "password": "password123"})
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json() == unknown.json()


def test_me_requires_valid_token(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer non-valido"}).status_code == 401

    forged = jwt.encode({"sub": "1", "exp": datetime.now(UTC) + timedelta(hours=1)}, "x" * 40, algorithm="HS256")
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401

    expired = jwt.encode({"sub": "1", "exp": datetime.now(UTC) - timedelta(minutes=1)}, TEST_SECRET, algorithm="HS256")
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401

    ghost = jwt.encode({"sub": "999", "exp": datetime.now(UTC) + timedelta(hours=1)}, TEST_SECRET, algorithm="HS256")
    assert client.get("/auth/me", headers={"Authorization": f"Bearer {ghost}"}).status_code == 401
