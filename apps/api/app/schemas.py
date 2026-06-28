from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, field_validator, model_validator
from pydantic_core import PydanticCustomError

from core.province_mapping import normalize_province

LegalType = Literal[
    "ho_kinh_doanh",
    "doanh_nghiep_tu_nhan",
    "cong_ty_tnhh_1tv",
    "cong_ty_tnhh_2tv",
    "cong_ty_co_phan",
    "hop_tac_xa",
    "cong_ty_hop_danh",
    "khac",
]
BusinessStage = Literal["moi_thanh_lap", "dang_tang_truong", "on_dinh", "mo_rong_vung", "chuyen_doi_so"]
EmployeeRange = Literal["0", "1_5", "6_10", "11_50", "51_100", "101_200", "200_plus"]
RevenueRangeVnd = Literal[
    "duoi_100_trieu",
    "100_trieu_1_ty",
    "1_ty_3_ty",
    "3_ty_10_ty",
    "10_ty_50_ty",
    "50_ty_100_ty",
    "100_ty_300_ty",
    "tren_300_ty",
    "khong_tiet_lo",
]
DataSource = Literal["self_reported", "mst_lookup", "admin_input"]
VerificationStatus = Literal["unverified", "mst_matched", "manually_verified"]
IntentTypeCode = Literal[
    "find_supplier",
    "find_buyer",
    "find_distributor",
    "find_local_partner",
    "find_manufacturer",
    "co_marketing",
    "find_investment",
    "service_partnership",
]
InteractionType = Literal["view_profile", "send_invite", "accept_invite", "message"]
BusinessPersonRole = Literal["owner", "director", "sales_rep", "authorized_rep"]


def _blank_to_none(value: Any) -> Any:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


def _strip_required(value: Any) -> Any:
    if isinstance(value, str):
        return value.strip()
    return value


def _strip_list(values: list[str]) -> list[str]:
    return [item.strip() for item in values if item.strip()]


class LinkoSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class OfferCreate(LinkoSchema):
    intent_type: IntentTypeCode
    category_l1: str | None = None
    category_l2: str | None = None
    geo_scope: list[str] = Field(default_factory=list)
    title: str = Field(min_length=1)
    description: str | None = None
    structured_attrs: dict[str, Any] = Field(default_factory=dict)

    @field_validator("category_l1", "category_l2", "description", mode="before")
    @classmethod
    def optional_text(cls, value: Any) -> Any:
        return _blank_to_none(value)

    @field_validator("title", mode="before")
    @classmethod
    def required_text(cls, value: Any) -> Any:
        return _strip_required(value)

    @field_validator("geo_scope")
    @classmethod
    def normalize_geo_scope(cls, value: list[str]) -> list[str]:
        return _strip_list(value)


class NeedCreate(OfferCreate):
    pass


class PersonCreate(LinkoSchema):
    full_name: str = Field(min_length=1)
    phone: str | None = None
    email: str | None = None
    zalo_id: str | None = None
    role_title: str | None = None
    role: BusinessPersonRole | None = None

    @field_validator("phone", "email", "zalo_id", "role_title", mode="before")
    @classmethod
    def optional_text(cls, value: Any) -> Any:
        return _blank_to_none(value)

    @field_validator("full_name", mode="before")
    @classmethod
    def required_text(cls, value: Any) -> Any:
        return _strip_required(value)


class BusinessCreate(LinkoSchema):
    name: str = Field(min_length=1)
    tax_id: str | None = None
    legal_type: LegalType | None = None
    business_stage: BusinessStage | None = None
    year_established: int | None = Field(default=None, ge=1900, le=2100)
    industry_l1: str = Field(min_length=1)
    industry_l2: str | None = None
    employee_range: EmployeeRange | None = None
    revenue_range_vnd: RevenueRangeVnd | None = None
    city: str | None = None
    province: str = Field(min_length=1)
    geo_operating: list[str] = Field(default_factory=list)
    description: str | None = None
    offers: list[OfferCreate] = Field(default_factory=list)
    needs: list[NeedCreate] = Field(default_factory=list)
    persons: list[PersonCreate] = Field(default_factory=list)

    _province_input: str | None = PrivateAttr(default=None)
    _province_was_converted: bool = PrivateAttr(default=False)

    @field_validator("name", "industry_l1", "province", mode="before")
    @classmethod
    def required_text(cls, value: Any) -> Any:
        return _strip_required(value)

    @field_validator("tax_id", "industry_l2", "city", "description", mode="before")
    @classmethod
    def optional_text(cls, value: Any) -> Any:
        return _blank_to_none(value)

    @field_validator("geo_operating")
    @classmethod
    def normalize_geo_operating(cls, value: list[str]) -> list[str]:
        return _strip_list(value)

    @model_validator(mode="after")
    def validate_business_core(self) -> BusinessCreate:
        if not self.offers and not self.needs:
            raise PydanticCustomError(
                "missing_offer_or_need",
                "At least one offer or need is required.",
                {"code": "MISSING_OFFER_OR_NEED"},
            )

        normalized, was_converted = normalize_province(self.province)
        if normalized is None:
            raise PydanticCustomError(
                "invalid_province",
                "Province must match the current 34-province list or a supported legacy province.",
                {"code": "INVALID_PROVINCE"},
            )
        self._province_input = self.province
        self._province_was_converted = was_converted
        self.province = normalized
        return self

    @property
    def province_input(self) -> str:
        return self._province_input or self.province

    @property
    def province_was_converted(self) -> bool:
        return self._province_was_converted


class BusinessResponse(BusinessCreate):
    id: UUID
    created_at: datetime
    data_source: DataSource = "self_reported"
    verification_status: VerificationStatus = "unverified"
    warnings: list[str] = Field(default_factory=list)
