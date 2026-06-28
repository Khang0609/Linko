import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Business, Need, Offer


def _business_by_name(session: Session, name: str) -> Business | None:
    return session.scalar(select(Business).where(Business.name == name))


def seed(session: Session) -> None:
    nha_sx = _business_by_name(session, "Công ty TNHH Thực phẩm Nam Phúc")
    if nha_sx is None:
        nha_sx = Business(
            name="Công ty TNHH Thực phẩm Nam Phúc",
            legal_type="cong_ty_tnhh_2tv",
            business_stage="dang_tang_truong",
            year_established=2019,
            industry_l1="san_xuat_che_bien",
            industry_l2="san_xuat_che_bien.che_bien_thuc_pham",
            employee_range="11_50",
            revenue_range_vnd="3_ty_10_ty",
            city="TP.HCM",
            province="TP. Hồ Chí Minh",
            data_source="self_reported",
        )
        session.add(nha_sx)

    cua_hang = _business_by_name(session, "Hộ kinh doanh Tạp hóa Minh Anh")
    if cua_hang is None:
        cua_hang = Business(
            name="Hộ kinh doanh Tạp hóa Minh Anh",
            legal_type="ho_kinh_doanh",
            business_stage="on_dinh",
            year_established=2015,
            industry_l1="ban_buon_ban_le",
            industry_l2="ban_buon_ban_le.thuc_pham_che_bien",
            employee_range="1_5",
            revenue_range_vnd="1_ty_3_ty",
            city="TP.HCM",
            province="TP. Hồ Chí Minh",
            data_source="self_reported",
        )
        session.add(cua_hang)

    session.flush()

    offer_exists = session.scalar(
        select(Offer.id).where(Offer.business_id == nha_sx.id, Offer.intent_type == "find_buyer")
    )
    if offer_exists is None:
        session.add(
            Offer(
                business_id=nha_sx.id,
                intent_type="find_buyer",
                category_l1="ban_buon_ban_le",
                category_l2="ban_buon_ban_le.gia_vi_nuoc_cham",
                geo_scope=["TP. Hồ Chí Minh"],
                title="Bán sỉ nước mắm truyền thống",
                structured_attrs={
                    "product_category": "gia_vi_nuoc_cham",
                    "moq": {"value": 50, "unit": "thung"},
                    "certifications": ["ATVSTP", "OCOP_4_sao"],
                },
            )
        )

    need_exists = session.scalar(
        select(Need.id).where(Need.business_id == cua_hang.id, Need.intent_type == "find_supplier")
    )
    if need_exists is None:
        session.add(
            Need(
                business_id=cua_hang.id,
                intent_type="find_supplier",
                category_l1="ban_buon_ban_le",
                category_l2="ban_buon_ban_le.gia_vi_nuoc_cham",
                geo_scope=["TP. Hồ Chí Minh"],
                title="Cần nguồn nước mắm/gia vị giá sỉ",
                structured_attrs={
                    "product_category": "gia_vi_nuoc_cham",
                    "required_certifications": ["ATVSTP"],
                },
            )
        )

    session.commit()


if __name__ == "__main__":
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.config import settings

    engine = create_engine(settings.alembic_database_url)
    with Session(engine) as session:
        seed(session)
        print("Seed completed: demo businesses and offer/need are present.")
