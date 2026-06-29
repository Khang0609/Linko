"""seed reference data and add idempotency keys

Revision ID: 0002_ref_data
Revises: 0001_init
Create Date: 2026-06-27 22:20:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002_ref_data"
down_revision: str | None = "0001_init"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


L1_INDUSTRIES = [
    ("ban_buon_ban_le", "Bán buôn & Bán lẻ", "Wholesale & Retail", ["G"]),
    ("an_uong_luu_tru", "Ăn uống & Lưu trú", "Food Service & Accommodation", ["I"]),
    ("san_xuat_che_bien", "Sản xuất & Chế biến", "Manufacturing", ["C"]),
    ("xay_dung_vat_lieu", "Xây dựng & Vật liệu", "Construction & Materials", ["F"]),
    ("nong_lam_thuy_san", "Nông - Lâm - Thủy sản", "Agriculture", ["A"]),
    ("van_tai_logistics", "Vận tải & Logistics", "Transport & Logistics", ["H"]),
    ("cong_nghe_phan_mem", "Công nghệ & Phần mềm", "Technology & Software", ["J"]),
    ("giao_duc_dao_tao", "Giáo dục & Đào tạo", "Education", ["P"]),
    ("suc_khoe_y_te", "Sức khỏe & Y tế", "Healthcare", ["Q"]),
    ("tai_chinh_bao_hiem", "Tài chính & Bảo hiểm", "Finance & Insurance", ["K"]),
    ("bat_dong_san", "Bất động sản", "Real Estate", ["L"]),
    ("khac", "Khác", "Other", []),
]
L2_BAN_BUON_BAN_LE = {
    "thuc_pham_tuoi_song": "Thực phẩm tươi sống",
    "thuc_pham_che_bien": "Thực phẩm chế biến",
    "do_uong": "Đồ uống",
    "gia_vi_nuoc_cham": "Gia vị & Nước chấm",
    "hang_tieu_dung_nhanh": "Hàng tiêu dùng nhanh (FMCG)",
    "thoi_trang_may_mac": "Thời trang & May mặc",
    "dien_tu_dien_lanh": "Điện tử & Điện lạnh",
    "noi_that_gia_dung": "Nội thất & Gia dụng",
    "vat_tu_nong_nghiep": "Vật tư nông nghiệp",
    "phan_phoi_tong_hop": "Phân phối tổng hợp",
}
L2_SAN_XUAT_CHE_BIEN = {
    "che_bien_thuc_pham": "Chế biến thực phẩm",
    "may_mac_det": "May mặc & Dệt",
    "go_noi_that": "Gỗ & Nội thất",
    "bao_bi_in_an": "Bao bì & In ấn",
    "hoa_chat_nhua": "Hóa chất & Nhựa",
    "co_khi_gia_cong": "Cơ khí & Gia công",
    "thu_cong_my_nghe": "Thủ công mỹ nghệ",
    "duoc_my_pham": "Dược & Mỹ phẩm",
}
INTENTS = [
    ("find_supplier", "Tìm nhà cung cấp", "Find supplier", "complementarity", "find_buyer", 5),
    ("find_buyer", "Tìm người mua", "Find buyer", "complementarity", "find_supplier", 5),
    ("find_distributor", "Tìm nhà phân phối", "Find distributor", "complementarity", None, 4),
    ("find_local_partner", "Tìm đối tác địa phương", "Find local partner", "complementarity", None, 3),
    ("find_manufacturer", "Tìm nhà gia công", "Find manufacturer", "complementarity", None, 3),
    ("co_marketing", "Hợp tác marketing", "Co-marketing", "similarity", "co_marketing", 2),
    ("find_investment", "Tìm vốn đầu tư", "Find investment", "complementarity", None, 1),
    ("service_partnership", "Hợp tác dịch vụ", "Service partnership", "mixed", None, 1),
]
CERTIFICATIONS = [
    ("ATVSTP", "An toàn vệ sinh thực phẩm", "food_safety"),
    ("OCOP_3_sao", "OCOP 3 sao", "ocop"),
    ("OCOP_4_sao", "OCOP 4 sao", "ocop"),
    ("OCOP_5_sao", "OCOP 5 sao", "ocop"),
    ("VietGAP", "VietGAP", "origin"),
    ("GlobalGAP", "GlobalGAP", "origin"),
    ("ISO_22000", "ISO 22000", "food_safety"),
    ("HACCP", "HACCP", "food_safety"),
    ("Halal", "Halal", "origin"),
    ("Organic_VN", "Hữu cơ Việt Nam", "organic"),
    ("chinh_hang", "Hàng chính hãng", "origin"),
    ("khong_co", "Không có", None),
]


def upgrade() -> None:
    op.create_table(
        "idempotency_keys",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("payload_hash", sa.Text(), nullable=False),
        sa.Column("response_status", sa.Integer(), nullable=True),
        sa.Column("response_body", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )
    op.create_index("idx_idempotency_keys_expires_at", "idempotency_keys", ["expires_at"])

    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            INSERT INTO industries (code, parent_code, level, name_vi, name_en, vsic_2025, sort_order)
            VALUES (:code, NULL, 1, :name_vi, :name_en, :vsic_2025, :sort_order)
            ON CONFLICT (code) DO NOTHING
            """
        ),
        [
            {
                "code": code,
                "name_vi": name_vi,
                "name_en": name_en,
                "vsic_2025": vsic_2025,
                "sort_order": index,
            }
            for index, (code, name_vi, name_en, vsic_2025) in enumerate(L1_INDUSTRIES, start=1)
        ],
    )

    l2_rows = [
        (f"ban_buon_ban_le.{code}", "ban_buon_ban_le", name_vi)
        for code, name_vi in L2_BAN_BUON_BAN_LE.items()
    ] + [
        (f"san_xuat_che_bien.{code}", "san_xuat_che_bien", name_vi)
        for code, name_vi in L2_SAN_XUAT_CHE_BIEN.items()
    ]
    bind.execute(
        sa.text(
            """
            INSERT INTO industries (code, parent_code, level, name_vi, sort_order)
            VALUES (:code, :parent_code, 2, :name_vi, :sort_order)
            ON CONFLICT (code) DO NOTHING
            """
        ),
        [
            {"code": code, "parent_code": parent_code, "name_vi": name_vi, "sort_order": index}
            for index, (code, parent_code, name_vi) in enumerate(l2_rows, start=1)
        ],
    )

    bind.execute(
        sa.text(
            """
            INSERT INTO intent_types (code, name_vi, name_en, match_kind, complement_code, popularity)
            VALUES (:code, :name_vi, :name_en, :match_kind, NULL, :popularity)
            ON CONFLICT (code) DO NOTHING
            """
        ),
        [
            {
                "code": code,
                "name_vi": name_vi,
                "name_en": name_en,
                "match_kind": match_kind,
                "popularity": popularity,
            }
            for code, name_vi, name_en, match_kind, _complement_code, popularity in INTENTS
        ],
    )
    for code, _name_vi, _name_en, _match_kind, complement_code, _popularity in INTENTS:
        if complement_code is not None:
            bind.execute(
                sa.text(
                    """
                    UPDATE intent_types
                    SET complement_code = :complement_code
                    WHERE code = :code
                    """
                ),
                {"code": code, "complement_code": complement_code},
            )

    bind.execute(
        sa.text(
            """
            INSERT INTO certifications (code, name_vi, category)
            VALUES (:code, :name_vi, :category)
            ON CONFLICT (code) DO NOTHING
            """
        ),
        [{"code": code, "name_vi": name_vi, "category": category} for code, name_vi, category in CERTIFICATIONS],
    )


def downgrade() -> None:
    op.drop_index("idx_idempotency_keys_expires_at", table_name="idempotency_keys")
    op.drop_table("idempotency_keys")
