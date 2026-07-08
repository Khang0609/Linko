from __future__ import annotations

from datetime import UTC, datetime, timedelta

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from app.config import settings


def test_signup_login_email_normalization_and_duplicate_case(
    clean_db: None,
    test_client: TestClient,
) -> None:
    signup = test_client.post(
        "/api/v1/auth/signup",
        json={"email": " Test@Example.com ", "password": "Password123!"},
    )
    lower_login = test_client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "Password123!"},
    )
    upper_login = test_client.post(
        "/api/v1/auth/login",
        json={"email": "TEST@example.com", "password": "Password123!"},
    )
    duplicate = test_client.post(
        "/api/v1/auth/signup",
        json={"email": "TEST@example.com", "password": "Password123!"},
    )

    assert signup.status_code == 201
    assert lower_login.status_code == 200
    assert upper_login.status_code == 200
    assert duplicate.status_code == 409
    assert duplicate.json()["errors"][0]["code"] == "DUPLICATE_EMAIL"


def test_password_hash_is_not_plaintext(clean_db: None, test_client: TestClient) -> None:
    password = "Password123!"
    response = test_client.post(
        "/api/v1/auth/signup",
        json={"email": "hash@example.com", "password": password},
    )

    engine = create_engine(settings.alembic_database_url)
    with engine.begin() as connection:
        password_hash = connection.execute(
            text("SELECT password_hash FROM accounts WHERE email = 'hash@example.com'")
        ).scalar_one()

    assert response.status_code == 201
    assert password_hash != password
    assert password_hash.startswith("$argon2id$")


def test_wrong_password_invalid_token_and_expired_token_return_401(
    clean_db: None,
    test_client: TestClient,
    signup_account,
) -> None:
    account = signup_account("token@example.com")
    wrong_password = test_client.post(
        "/api/v1/auth/login",
        json={"email": "token@example.com", "password": "WrongPass123!"},
    )
    invalid_token = test_client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid"})
    expired = jwt.encode(
        {
            "sub": account["account_id"],
            "iat": datetime.now(UTC) - timedelta(hours=2),
            "exp": datetime.now(UTC) - timedelta(hours=1),
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    expired_token = test_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired}"})

    assert wrong_password.status_code == 401
    assert invalid_token.status_code == 401
    assert expired_token.status_code == 401


def test_logout_is_stateless_mvp(test_client: TestClient) -> None:
    response = test_client.post("/api/v1/auth/logout")

    assert response.status_code == 200
    assert response.json()["message"].startswith("Logged out.")
