from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Certification, Industry, IntentType
from app.schemas import CertificationResponse, EnumOption, IndustryResponse, IntentTypeResponse, ReferenceEnumsResponse

router = APIRouter()


LEGAL_TYPE_OPTIONS = [
    ("ho_kinh_doanh", "Ho kinh doanh"),
    ("doanh_nghiep_tu_nhan", "Doanh nghiep tu nhan"),
    ("cong_ty_tnhh_1tv", "Cong ty TNHH 1 thanh vien"),
    ("cong_ty_tnhh_2tv", "Cong ty TNHH 2 thanh vien"),
    ("cong_ty_co_phan", "Cong ty co phan"),
    ("hop_tac_xa", "Hop tac xa"),
    ("cong_ty_hop_danh", "Cong ty hop danh"),
    ("khac", "Khac"),
]
BUSINESS_STAGE_OPTIONS = [
    ("moi_thanh_lap", "Moi thanh lap"),
    ("dang_tang_truong", "Dang tang truong"),
    ("on_dinh", "On dinh"),
    ("mo_rong_vung", "Mo rong vung"),
    ("chuyen_doi_so", "Chuyen doi so"),
]
EMPLOYEE_RANGE_OPTIONS = [
    ("0", "0"),
    ("1_5", "1-5"),
    ("6_10", "6-10"),
    ("11_50", "11-50"),
    ("51_100", "51-100"),
    ("101_200", "101-200"),
    ("200_plus", "Tren 200"),
]
REVENUE_RANGE_OPTIONS = [
    ("duoi_100_trieu", "Duoi 100 trieu VND"),
    ("100_trieu_1_ty", "100 trieu - 1 ty VND"),
    ("1_ty_3_ty", "1 - 3 ty VND"),
    ("3_ty_10_ty", "3 - 10 ty VND"),
    ("10_ty_50_ty", "10 - 50 ty VND"),
    ("50_ty_100_ty", "50 - 100 ty VND"),
    ("100_ty_300_ty", "100 - 300 ty VND"),
    ("tren_300_ty", "Tren 300 ty VND"),
    ("khong_tiet_lo", "Khong tiet lo"),
]


def _enum_options(rows: list[tuple[str, str]]) -> list[EnumOption]:
    return [EnumOption(code=code, label=label) for code, label in rows]


@router.get("/industries", response_model=list[IndustryResponse])
async def list_industries(
    session: Annotated[AsyncSession, Depends(get_db)],
    level: Annotated[int | None, Query(ge=1, le=2)] = None,
    parent: str | None = None,
) -> list[IndustryResponse]:
    statement = select(Industry).where(Industry.is_active.is_(True))
    if level is not None:
        statement = statement.where(Industry.level == level)
    if parent is not None:
        statement = statement.where(Industry.parent_code == parent)
    industries = (
        await session.execute(statement.order_by(Industry.level, Industry.sort_order, Industry.code))
    ).scalars()
    return [IndustryResponse.model_validate(industry) for industry in industries]


@router.get("/intent-types", response_model=list[IntentTypeResponse])
async def list_intent_types(session: Annotated[AsyncSession, Depends(get_db)]) -> list[IntentTypeResponse]:
    intent_types = (
        await session.execute(
            select(IntentType)
            .where(IntentType.is_active.is_(True))
            .order_by(IntentType.popularity.desc(), IntentType.code)
        )
    ).scalars()
    return [IntentTypeResponse.model_validate(intent_type) for intent_type in intent_types]


@router.get("/certifications", response_model=list[CertificationResponse])
async def list_certifications(session: Annotated[AsyncSession, Depends(get_db)]) -> list[CertificationResponse]:
    certifications = (
        await session.execute(
            select(Certification).where(Certification.is_active.is_(True)).order_by(Certification.code)
        )
    ).scalars()
    return [CertificationResponse.model_validate(certification) for certification in certifications]


@router.get("/enums", response_model=ReferenceEnumsResponse)
async def list_enums() -> ReferenceEnumsResponse:
    return ReferenceEnumsResponse(
        legal_types=_enum_options(LEGAL_TYPE_OPTIONS),
        business_stages=_enum_options(BUSINESS_STAGE_OPTIONS),
        employee_ranges=_enum_options(EMPLOYEE_RANGE_OPTIONS),
        revenue_ranges_vnd=_enum_options(REVENUE_RANGE_OPTIONS),
    )
