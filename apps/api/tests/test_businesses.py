from __future__ import annotations

from copy import deepcopy
from time import perf_counter
from typing import Any

from fastapi.testclient import TestClient

BUSINESSES_URL = "/api/v1/businesses"


def _post(client: TestClient, payload: dict[str, Any], headers: dict[str, str] | None = None):
    return client.post(BUSINESSES_URL, json=payload, headers=headers or {})


def test_create_business_requires_auth(test_client: TestClient, sample_business_payload: dict[str, Any]) -> None:
    response = _post(test_client, sample_business_payload)

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_create_business_201(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    response = _post(test_client, sample_business_payload, headers=auth_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["id"]
    assert body["name"] == sample_business_payload["name"]
    assert body["province"] == sample_business_payload["province"]
    assert body["verification_status"] == "unverified"
    assert body["warnings"] == []


def test_create_business_missing_name(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    payload = deepcopy(sample_business_payload)
    del payload["name"]

    response = _post(test_client, payload, headers=auth_headers)

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


def test_create_business_missing_province(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    payload = deepcopy(sample_business_payload)
    del payload["province"]

    response = _post(test_client, payload, headers=auth_headers)

    assert response.status_code == 422


def test_create_business_no_offers_needs(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["offers"] = []
    payload["needs"] = []

    response = _post(test_client, payload, headers=auth_headers)

    assert response.status_code == 422
    assert response.json()["errors"][0]["type"] == "missing_offer_or_need"


def test_create_business_legacy_province(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["province"] = "Binh Duong"

    response = _post(test_client, payload, headers=auth_headers)

    assert response.status_code == 201
    body = response.json()
    assert body["province"] == sample_business_payload["province"]
    assert body["warnings"] == [f"province_converted: Binh Duong -> {sample_business_payload['province']}"]


def test_create_business_invalid_province(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["province"] = "Atlantis"

    response = _post(test_client, payload, headers=auth_headers)

    assert response.status_code == 422
    assert response.json()["errors"][0]["type"] == "invalid_province"


def test_create_business_invalid_industry_fk(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["industry_l1"] = "khong_ton_tai"

    response = _post(test_client, payload, headers=auth_headers)

    assert response.status_code == 422
    assert response.json()["errors"][0]["code"] == "UNKNOWN_REFERENCE"


def test_create_business_invalid_intent_fk(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["offers"][0]["intent_type"] = "unknown_intent"

    response = _post(test_client, payload, headers=auth_headers)

    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")


def test_create_business_duplicate_tax_id(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    first_payload = deepcopy(sample_business_payload)
    first_payload["tax_id"] = "0312345678"
    second_payload = deepcopy(sample_business_payload)
    second_payload["tax_id"] = "0312345678"
    second_payload["name"] = "CÃ´ng ty TNHH TrÃ¹ng MST"

    assert _post(test_client, first_payload, headers=auth_headers).status_code == 201
    response = _post(test_client, second_payload, headers=auth_headers)

    assert response.status_code == 409
    assert response.json()["errors"][0]["code"] == "DUPLICATE_TAX_ID"


def test_missing_idempotency_key_falls_back_to_tax_id_duplicate_protection(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    first_payload = deepcopy(sample_business_payload)
    first_payload["tax_id"] = "0312345679"
    second_payload = deepcopy(sample_business_payload)
    second_payload["tax_id"] = "0312345679"
    second_payload["name"] = "CÃ´ng ty TNHH KhÃ´ng CÃ³ Idempotency Key"

    first = _post(test_client, first_payload, headers=auth_headers)
    second = _post(test_client, second_payload, headers=auth_headers)

    assert first.status_code == 201
    assert second.status_code == 409
    assert second.json()["errors"][0]["code"] == "DUPLICATE_TAX_ID"


def test_idempotency_replay(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    headers = {**auth_headers, "Idempotency-Key": "issue-17-test-key"}
    first = _post(test_client, sample_business_payload, headers=headers)
    second = _post(test_client, sample_business_payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.headers["Idempotent-Replayed"] == "true"
    assert second.json()["id"] == first.json()["id"]


def test_idempotency_key_reuse_different_payload(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    headers = {**auth_headers, "Idempotency-Key": "issue-17-test-key-mismatch"}
    first = _post(test_client, sample_business_payload, headers=headers)
    changed_payload = deepcopy(sample_business_payload)
    changed_payload["name"] = "CÃ´ng ty TNHH Payload KhÃ¡c"

    response = _post(test_client, changed_payload, headers=headers)

    assert first.status_code == 201
    assert response.status_code == 422
    assert response.json()["errors"][0]["code"] == "IDEMPOTENCY_PAYLOAD_MISMATCH"


def test_create_business_malformed_json(test_client: TestClient, auth_headers: dict[str, str]) -> None:
    response = test_client.post(
        BUSINESSES_URL,
        content="not json",
        headers={**auth_headers, "Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert response.headers["content-type"].startswith("application/problem+json")


def test_first_business_without_persons_requires_owner_contact(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["persons"] = []

    response = _post(test_client, payload, headers=auth_headers)

    assert response.status_code == 422
    assert response.json()["errors"][0]["code"] == "MISSING_OWNER_PERSON"


def test_existing_account_person_can_create_next_business_without_persons(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    first = _post(test_client, sample_business_payload, headers=auth_headers)
    payload = deepcopy(sample_business_payload)
    payload["name"] = "CÃ´ng ty TNHH Chi NhÃ¡nh"
    payload["persons"] = []

    response = _post(test_client, payload, headers=auth_headers)

    assert first.status_code == 201
    assert response.status_code == 201
    assert response.json()["persons"] == []


def test_create_business_with_persons(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    response = _post(test_client, sample_business_payload, headers=auth_headers)

    assert response.status_code == 201
    assert response.json()["persons"][0]["full_name"] == sample_business_payload["persons"][0]["full_name"]


def test_first_business_owner_role_is_returned_when_missing_from_payload(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    payload = deepcopy(sample_business_payload)
    payload["persons"][0].pop("role")

    response = _post(test_client, payload, headers=auth_headers)

    assert response.status_code == 201
    assert response.json()["persons"][0]["role"] == "owner"


def test_business_owner_me_update_and_delete_flow(
    clean_db: None,
    test_client: TestClient,
    signup_account,
    sample_business_payload: dict[str, Any],
) -> None:
    owner = signup_account("owner@example.com")
    other = signup_account("other@example.com")
    create_response = _post(test_client, sample_business_payload, headers=owner["headers"])
    business_id = create_response.json()["id"]

    me_response = test_client.get("/api/v1/auth/me", headers=owner["headers"])
    owner_get = test_client.get(f"{BUSINESSES_URL}/{business_id}", headers=owner["headers"])
    other_get = test_client.get(f"{BUSINESSES_URL}/{business_id}", headers=other["headers"])
    anonymous_get = test_client.get(f"{BUSINESSES_URL}/{business_id}")
    owner_patch = test_client.patch(
        f"{BUSINESSES_URL}/{business_id}",
        json={"description": "Updated by owner"},
        headers=owner["headers"],
    )
    other_patch = test_client.patch(
        f"{BUSINESSES_URL}/{business_id}",
        json={"description": "Updated by other"},
        headers=other["headers"],
    )
    delete_response = test_client.delete(f"{BUSINESSES_URL}/{business_id}", headers=owner["headers"])
    get_after_delete = test_client.get(f"{BUSINESSES_URL}/{business_id}", headers=owner["headers"])

    assert create_response.status_code == 201
    assert me_response.status_code == 200
    assert me_response.json()["businesses"][0]["id"] == business_id
    assert owner_get.status_code == 200
    assert other_get.status_code == 403
    assert anonymous_get.status_code == 401
    assert owner_patch.status_code == 200
    assert owner_patch.json()["description"] == "Updated by owner"
    assert other_patch.status_code == 403
    assert delete_response.status_code == 200
    assert delete_response.json()["is_active"] is False
    assert get_after_delete.status_code == 404


def test_response_time_under_1s(
    test_client: TestClient,
    auth_headers: dict[str, str],
    sample_business_payload: dict[str, Any],
) -> None:
    start = perf_counter()
    response = _post(test_client, sample_business_payload, headers=auth_headers)
    elapsed = perf_counter() - start

    assert response.status_code == 201
    assert elapsed < 1
