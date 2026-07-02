import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.orm import Session

from app.models import Business, Certification, Industry, IntentType, Need, Offer

L1 = [
    ("ban_buon_ban_le",    "Bán buôn & Bán lẻ",       "Wholesale & Retail", ["G"]),
    ("an_uong_luu_tru",    "Ăn uống & Lưu trú",       "Food Service & Accommodation", ["I"]),
    ("san_xuat_che_bien",  "Sản xuất & Chế biến",     "Manufacturing", ["C"]),
    ("xay_dung_vat_lieu",  "Xây dựng & Vật liệu",     "Construction & Materials", ["F"]),
    ("nong_lam_thuy_san",  "Nông - Lâm - Thủy sản",   "Agriculture", ["A"]),
    ("van_tai_logistics",  "Vận tải & Logistics",     "Transport & Logistics", ["H"]),
    ("cong_nghe_phan_mem", "Công nghệ & Phần mềm",    "Technology & Software", ["J"]),
    ("giao_duc_dao_tao",   "Giáo dục & Đào tạo",      "Education", ["P"]),
    ("suc_khoe_y_te",      "Sức khỏe & Y tế",         "Healthcare", ["Q"]),
    ("tai_chinh_bao_hiem", "Tài chính & Bảo hiểm",    "Finance & Insurance", ["K"]),
    ("bat_dong_san",       "Bất động sản",            "Real Estate", ["L"]),
    ("khac",               "Khác",                    "Other", []),
]
L2_BBL = {
    "thuc_pham_tuoi_song":  "Thực phẩm tươi sống",
    "thuc_pham_che_bien":   "Thực phẩm chế biến",
    "do_uong":              "Đồ uống",
    "gia_vi_nuoc_cham":     "Gia vị & Nước chấm",
    "hang_tieu_dung_nhanh": "Hàng tiêu dùng nhanh (FMCG)",
    "thoi_trang_may_mac":   "Thời trang & May mặc",
    "dien_tu_dien_lanh":    "Điện tử & Điện lạnh",
    "noi_that_gia_dung":    "Nội thất & Gia dụng",
    "vat_tu_nong_nghiep":   "Vật tư nông nghiệp",
    "phan_phoi_tong_hop":   "Phân phối tổng hợp",
}
L2_SX = {
    "che_bien_thuc_pham": "Chế biến thực phẩm",
    "may_mac_det":        "May mặc & Dệt",
    "go_noi_that":        "Gỗ & Nội thất",
    "bao_bi_in_an":       "Bao bì & In ấn",
    "hoa_chat_nhua":      "Hóa chất & Nhựa",
    "co_khi_gia_cong":    "Cơ khí & Gia công",
    "thu_cong_my_nghe":   "Thủ công mỹ nghệ",
    "duoc_my_pham":       "Dược & Mỹ phẩm",
}
INTENTS = [
    ("find_supplier",       "Tìm nhà cung cấp",      "Find supplier",       "complementarity", "find_buyer",    5),
    ("find_buyer",          "Tìm người mua",         "Find buyer",          "complementarity", "find_supplier", 5),
    ("find_distributor",    "Tìm nhà phân phối",     "Find distributor",    "complementarity", None,            4),
    ("find_local_partner",  "Tìm đối tác địa phương","Find local partner",  "complementarity", None,            3),
    ("find_manufacturer",   "Tìm nhà gia công",      "Find manufacturer",   "complementarity", None,            3),
    ("co_marketing",        "Hợp tác marketing",     "Co-marketing",        "similarity",      "co_marketing",  2),
    ("find_investment",     "Tìm vốn đầu tư",        "Find investment",     "complementarity", None,            1),
    ("service_partnership", "Hợp tác dịch vụ",       "Service partnership", "mixed",           None,            1),
]
CERTS = [
    ("ATVSTP","An toàn vệ sinh thực phẩm","food_safety"),
    ("OCOP_3_sao","OCOP 3 sao","ocop"), ("OCOP_4_sao","OCOP 4 sao","ocop"), ("OCOP_5_sao","OCOP 5 sao","ocop"),
    ("VietGAP","VietGAP","origin"), ("GlobalGAP","GlobalGAP","origin"),
    ("ISO_22000","ISO 22000","food_safety"), ("HACCP","HACCP","food_safety"),
    ("Halal","Halal","origin"), ("Organic_VN","Hữu cơ Việt Nam","organic"),
    ("chinh_hang","Hàng chính hãng","origin"), ("khong_co","Không có",None),
]

def seed(session: Session) -> None:
    for code, vi, en, vsic in L1:
        session.add(Industry(code=code, level=1, name_vi=vi, name_en=en, vsic_2025=vsic))
    session.flush()  # parent exists before inserting L2
    for sub, vi in L2_BBL.items():
        session.add(Industry(code=f"ban_buon_ban_le.{sub}", parent_code="ban_buon_ban_le", level=2, name_vi=vi))
    for sub, vi in L2_SX.items():
        session.add(Industry(code=f"san_xuat_che_bien.{sub}", parent_code="san_xuat_che_bien", level=2, name_vi=vi))
    for code, vi, en, kind, _comp, pop in INTENTS:  # PASS 1: no complement_code yet
        session.add(IntentType(code=code, name_vi=vi, name_en=en, match_kind=kind,
                               complement_code=None, popularity=pop))
    session.flush()
    for code, _, _, _, comp, _ in INTENTS:          # PASS 2: set complement_code
        if comp:
            session.get(IntentType, code).complement_code = comp
    for code, vi, cat in CERTS:
        session.add(Certification(code=code, name_vi=vi, category=cat))
    session.flush()

    nha_sx = Business(name="Công ty TNHH Thực phẩm Nam Phúc", legal_type="cong_ty_tnhh_2tv",
                      business_stage="dang_tang_truong", year_established=2019,
                      industry_l1="san_xuat_che_bien", industry_l2="san_xuat_che_bien.che_bien_thuc_pham",
                      employee_range="11_50", revenue_range_vnd="3_ty_10_ty",
                      city="TP.HCM", province="TP.HCM", data_source="self_reported")
    cua_hang = Business(name="Hộ kinh doanh Tạp hóa Minh Anh", legal_type="ho_kinh_doanh",
                        business_stage="on_dinh", year_established=2015,
                        industry_l1="ban_buon_ban_le", industry_l2="ban_buon_ban_le.thuc_pham_che_bien",
                        employee_range="1_5", revenue_range_vnd="1_ty_3_ty",
                        city="TP.HCM", province="TP.HCM", data_source="self_reported")
    session.add_all([nha_sx, cua_hang])
    session.flush()
    session.add(Offer(business_id=nha_sx.id, intent_type="find_buyer",
                      category_l1="ban_buon_ban_le", category_l2="ban_buon_ban_le.gia_vi_nuoc_cham",
                      geo_scope=["TP.HCM"], title="Bán sỉ nước mắm truyền thống",
                      structured_attrs={"product_category": "gia_vi_nuoc_cham",
                                        "moq": {"value": 50, "unit": "thung"},
                                        "certifications": ["ATVSTP", "OCOP_4_sao"]}))
    session.add(Need(business_id=cua_hang.id, intent_type="find_supplier",
                     category_l1="ban_buon_ban_le", category_l2="ban_buon_ban_le.gia_vi_nuoc_cham",
                     geo_scope=["TP.HCM"], title="Cần nguồn nước mắm/gia vị giá sỉ",
                     structured_attrs={"product_category": "gia_vi_nuoc_cham",
                                       "required_certifications": ["ATVSTP"]}))
    session.commit()


if __name__ == "__main__":
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from app.config import settings

    engine = create_engine(settings.alembic_database_url)
    with Session(engine) as session:
        seed(session)
        print("✅ Seed completed: 2 businesses, 1 offer (find_buyer), 1 need (find_supplier).")
