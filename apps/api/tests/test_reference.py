from __future__ import annotations

from fastapi.testclient import TestClient


def test_reference_data_counts(test_client: TestClient) -> None:
    level_1 = test_client.get("/api/v1/reference/industries?level=1")
    level_2 = test_client.get("/api/v1/reference/industries?level=2")
    retail_children = test_client.get("/api/v1/reference/industries?parent=ban_buon_ban_le")
    intent_types = test_client.get("/api/v1/reference/intent-types")
    certifications = test_client.get("/api/v1/reference/certifications")
    enums = test_client.get("/api/v1/reference/enums")

    assert level_1.status_code == 200
    assert len(level_1.json()) == 12
    assert level_2.status_code == 200
    assert len(level_2.json()) == 18
    assert retail_children.status_code == 200
    assert len(retail_children.json()) == 10
    assert intent_types.status_code == 200
    assert len(intent_types.json()) == 8
    assert certifications.status_code == 200
    assert len(certifications.json()) == 12
    assert enums.status_code == 200
    assert any(item["code"] == "cong_ty_tnhh_1tv" for item in enums.json()["legal_types"])


def test_cors_preflight_allows_localhost_5173(test_client: TestClient) -> None:
    response = test_client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "POST" in response.headers["access-control-allow-methods"]
