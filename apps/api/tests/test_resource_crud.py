from __future__ import annotations

from copy import deepcopy
from typing import Any

from fastapi.testclient import TestClient


def _create_business(
    test_client: TestClient,
    sample_business_payload: dict[str, Any],
    headers: dict[str, str],
) -> str:
    response = test_client.post("/api/v1/businesses", json=sample_business_payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_offer_need_and_person_crud_with_ownership(
    clean_db: None,
    test_client: TestClient,
    signup_account,
    sample_business_payload: dict[str, Any],
) -> None:
    owner = signup_account("crud-owner@example.com")
    other = signup_account("crud-other@example.com")
    business_id = _create_business(test_client, sample_business_payload, owner["headers"])

    offer_payload = {
        "intent_type": "find_distributor",
        "category_l1": "ban_buon_ban_le",
        "category_l2": "ban_buon_ban_le.phan_phoi_tong_hop",
        "geo_scope": ["TP.HCM"],
        "title": "Can nha phan phoi khu vuc",
        "structured_attrs": {"channel": "traditional_trade"},
    }
    offer_create = test_client.post(
        f"/api/v1/businesses/{business_id}/offers",
        json=offer_payload,
        headers=owner["headers"],
    )
    offer_id = offer_create.json()["id"]
    offer_update = test_client.patch(
        f"/api/v1/offers/{offer_id}",
        json={"title": "Can nha phan phoi mien Nam"},
        headers=owner["headers"],
    )
    offer_other_update = test_client.patch(
        f"/api/v1/offers/{offer_id}",
        json={"title": "Other edit"},
        headers=other["headers"],
    )
    offer_delete = test_client.delete(f"/api/v1/offers/{offer_id}", headers=owner["headers"])
    offers_after_delete = test_client.get(f"/api/v1/businesses/{business_id}/offers", headers=owner["headers"])

    need_payload = deepcopy(offer_payload)
    need_payload["intent_type"] = "find_supplier"
    need_payload["title"] = "Can nha cung cap bao bi"
    need_create = test_client.post(
        f"/api/v1/businesses/{business_id}/needs",
        json=need_payload,
        headers=owner["headers"],
    )
    need_id = need_create.json()["id"]
    need_update = test_client.patch(
        f"/api/v1/needs/{need_id}",
        json={"description": "Uu tien nha cung cap co HACCP"},
        headers=owner["headers"],
    )
    need_other_delete = test_client.delete(f"/api/v1/needs/{need_id}", headers=other["headers"])
    need_delete = test_client.delete(f"/api/v1/needs/{need_id}", headers=owner["headers"])

    person_create = test_client.post(
        f"/api/v1/businesses/{business_id}/persons",
        json={"full_name": "Tran Thi Lan", "email": "Lan@Example.com", "role": "sales_rep"},
        headers=owner["headers"],
    )
    person_id = person_create.json()["id"]
    person_update = test_client.patch(
        f"/api/v1/persons/{person_id}",
        json={"phone": "0912345678", "role": "director"},
        headers=owner["headers"],
    )
    person_other_delete = test_client.delete(f"/api/v1/persons/{person_id}", headers=other["headers"])
    person_delete = test_client.delete(f"/api/v1/persons/{person_id}", headers=owner["headers"])
    persons_after_delete = test_client.get(f"/api/v1/businesses/{business_id}/persons", headers=owner["headers"])

    assert offer_create.status_code == 201
    assert offer_update.status_code == 200
    assert offer_update.json()["title"] == "Can nha phan phoi mien Nam"
    assert offer_other_update.status_code == 403
    assert offer_delete.status_code == 200
    assert offer_delete.json()["is_active"] is False
    assert offer_id not in {offer["id"] for offer in offers_after_delete.json()}

    assert need_create.status_code == 201
    assert need_update.status_code == 200
    assert need_update.json()["description"] == "Uu tien nha cung cap co HACCP"
    assert need_other_delete.status_code == 403
    assert need_delete.status_code == 200
    assert need_delete.json()["is_active"] is False

    assert person_create.status_code == 201
    assert person_create.json()["email"] == "lan@example.com"
    assert person_update.status_code == 200
    assert person_update.json()["role"] == "director"
    assert person_other_delete.status_code == 403
    assert person_delete.status_code == 200
    assert person_delete.json()["is_active"] is False
    assert person_id not in {person["id"] for person in persons_after_delete.json()}


def test_business_detail_allows_empty_active_offers_after_soft_delete(
    clean_db: None,
    test_client: TestClient,
    signup_account,
    sample_business_payload: dict[str, Any],
) -> None:
    owner = signup_account("empty-offers-owner@example.com")
    business_id = _create_business(test_client, sample_business_payload, owner["headers"])
    offers = test_client.get(f"/api/v1/businesses/{business_id}/offers", headers=owner["headers"])
    offer_id = offers.json()[0]["id"]

    delete_offer = test_client.delete(f"/api/v1/offers/{offer_id}", headers=owner["headers"])
    detail = test_client.get(f"/api/v1/businesses/{business_id}", headers=owner["headers"])

    assert delete_offer.status_code == 200
    assert detail.status_code == 200
    assert detail.json()["offers"] == []


def test_contacts_endpoint_rejects_protected_roles(
    clean_db: None,
    test_client: TestClient,
    signup_account,
    sample_business_payload: dict[str, Any],
) -> None:
    owner = signup_account("protected-role-owner@example.com")
    business_id = _create_business(test_client, sample_business_payload, owner["headers"])

    create_owner = test_client.post(
        f"/api/v1/businesses/{business_id}/persons",
        json={"full_name": "Extra Owner", "role": "owner"},
        headers=owner["headers"],
    )
    create_authorized_rep = test_client.post(
        f"/api/v1/businesses/{business_id}/persons",
        json={"full_name": "Extra Rep", "role": "authorized_rep"},
        headers=owner["headers"],
    )
    person_create = test_client.post(
        f"/api/v1/businesses/{business_id}/persons",
        json={"full_name": "Normal Contact", "role": "sales_rep"},
        headers=owner["headers"],
    )
    update_authorized_rep = test_client.patch(
        f"/api/v1/persons/{person_create.json()['id']}",
        json={"role": "authorized_rep"},
        headers=owner["headers"],
    )

    assert create_owner.status_code == 422
    assert create_owner.json()["errors"][0]["code"] == "PROTECTED_ROLE_ASSIGNMENT"
    assert create_authorized_rep.status_code == 422
    assert create_authorized_rep.json()["errors"][0]["code"] == "PROTECTED_ROLE_ASSIGNMENT"
    assert person_create.status_code == 201
    assert update_authorized_rep.status_code == 422
    assert update_authorized_rep.json()["errors"][0]["code"] == "PROTECTED_ROLE_ASSIGNMENT"
