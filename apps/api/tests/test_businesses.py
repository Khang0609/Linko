from __future__ import annotations

from copy import deepcopy
from time import perf_counter
from typing import Any

from fastapi.testclient import TestClient


def _post(client: TestClient, payload: dict[str, Any], headers: dict[str, str] | None = None):
    return client.post("/businesses", json=payload, headers=headers or {})


def test_create_business_201(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    response = _post(test_client, sample_business_payload)

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert body["name"] == sample_business_payload["name"]
    assert body["province"] == "TP. Hồ Chí Minh"
    assert body["verification_status"] == "unverified"
    assert body["warnings"] == []


def test_create_business_missing_name(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    payload = deepcopy(sample_business_payload)
    del payload["name"]

    response = _post(test_client, payload)

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


def test_create_business_missing_province(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    payload = deepcopy(sample_business_payload)
    del payload["province"]

    response = _post(test_client, payload)

    assert response.status_code == 422


def test_create_business_no_offers_needs(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["offers"] = []
    payload["needs"] = []

    response = _post(test_client, payload)

    assert response.status_code == 422
    assert response.json()["errors"][0]["type"] == "missing_offer_or_need"


def test_create_business_legacy_province(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["province"] = "Bình Dương"

    response = _post(test_client, payload)

    assert response.status_code == 201
    body = response.json()
    assert body["province"] == "TP. Hồ Chí Minh"
    assert body["warnings"] == ["province_converted: Bình Dương -> TP. Hồ Chí Minh"]


def test_create_business_invalid_province(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["province"] = "Atlantis"

    response = _post(test_client, payload)

    assert response.status_code == 422
    assert response.json()["errors"][0]["type"] == "invalid_province"


def test_create_business_invalid_industry_fk(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["industry_l1"] = "khong_ton_tai"

    response = _post(test_client, payload)

    assert response.status_code == 422
    assert response.json()["errors"][0]["code"] == "UNKNOWN_REFERENCE"


def test_create_business_invalid_intent_fk(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["offers"][0]["intent_type"] = "unknown_intent"

    response = _post(test_client, payload)

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


def test_create_business_duplicate_tax_id(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    first_payload = deepcopy(sample_business_payload)
    first_payload["tax_id"] = "0312345678"
    second_payload = deepcopy(sample_business_payload)
    second_payload["tax_id"] = "0312345678"
    second_payload["name"] = "Công ty TNHH Trùng MST"

    assert _post(test_client, first_payload).status_code == 201
    response = _post(test_client, second_payload)

    assert response.status_code == 409
    assert response.json()["errors"][0]["code"] == "DUPLICATE_TAX_ID"


def test_idempotency_replay(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    headers = {"Idempotency-Key": "issue-7-test-key"}
    first = _post(test_client, sample_business_payload, headers=headers)
    second = _post(test_client, sample_business_payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.headers["Idempotent-Replayed"] == "true"
    assert second.json()["id"] == first.json()["id"]


def test_idempotency_key_reuse_different_payload(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    headers = {"Idempotency-Key": "issue-7-test-key-mismatch"}
    first = _post(test_client, sample_business_payload, headers=headers)
    changed_payload = deepcopy(sample_business_payload)
    changed_payload["name"] = "Công ty TNHH Payload Khác"

    response = _post(test_client, changed_payload, headers=headers)

    assert first.status_code == 201
    assert response.status_code == 422
    assert response.json()["errors"][0]["code"] == "IDEMPOTENCY_PAYLOAD_MISMATCH"


def test_create_business_malformed_json(clean_db: None, test_client: TestClient) -> None:
    response = test_client.post("/businesses", content="not json", headers={"Content-Type": "application/json"})

    assert response.status_code == 400
    assert response.headers["content-type"].startswith("application/problem+json")


def test_create_business_without_persons(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["persons"] = []

    response = _post(test_client, payload)

    assert response.status_code == 201
    assert response.json()["persons"] == []


def test_create_business_with_persons(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    response = _post(test_client, sample_business_payload)

    assert response.status_code == 201
    assert response.json()["persons"][0]["full_name"] == "Nguyễn Văn Nam"


def test_response_time_under_1s(
    clean_db: None, test_client: TestClient, sample_business_payload: dict[str, Any]
) -> None:
    start = perf_counter()
    response = _post(test_client, sample_business_payload)
    elapsed = perf_counter() - start

    assert response.status_code == 201
    assert elapsed < 1
