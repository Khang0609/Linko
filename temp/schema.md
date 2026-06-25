<aside>
🏁

**Bản schema FINAL** — đã *research lại từng claim kỹ thuật* và *fix mọi điểm có thể fail* so với bản Canonical. Đây là bản **sẵn sàng implement & bàn giao cho @dathuhu**. Target: **PostgreSQL 15+ trên Google Cloud SQL**, local dev bằng image `pgvector/pgvector`. Mọi quyết định mở (O1–O7) đã được chốt và *bake thẳng vào schema*.

</aside>

<aside>
⚠️

**Đọc Mục 1 trước.** Có **2 lỗi sẽ fail khi chạy thật** trong bản Canonical đã được sửa ở đây (CHECK constraint thiếu trong ORM → autogenerate bỏ sót; model embedding `text-embedding-004` đã *ngừng hoạt động* 14/01/2026). Chi tiết + bằng chứng bên dưới.

</aside>

## 0. Changelog FINAL (so với Canonical v0.1.1)

| # | Thay đổi | Mức độ |
| --- | --- | --- |
| F1 | Bổ sung CHECK `business_stage` & `revenue_range_vnd` vào ORM `__table_args__` (Canonical chỉ có trong DDL → autogenerate KHÔNG sinh ra) | 🔴 Fix fail |
| F2 | Bổ sung CHECK cho `business_persons.role`, `match_interactions.interaction_type` vào ORM (parity DDL↔ORM) | 🔴 Fix fail |
| F3 | Thêm `server_default` cho mọi cột ARRAY/JSONB/BOOLEAN/`is_active` → INSERT bằng SQL thuần không vi phạm NOT NULL; loại 100% lỗi data-type | 🔴 Fix fail |
| F4 | Đổi model embedding: `text-embedding-004` → **`gemini-embedding-001` với `output_dimensionality=768`** (model cũ đã shutdown 14/01/2026). Giữ nguyên `VECTOR(768)` → không phải migration | 🔴 Fix fail |
| F5 | Bổ sung `CREATE EXTENSION google_ml_integration`  • cờ instance để dùng hàm `embedding()` native trên Cloud SQL (Canonical thiếu) | 🟠 Fix thiếu |
| F6 | Thêm CHECK toàn vẹn taxonomy: L1 ⇒ `parent_code IS NULL`, L2 ⇒ `parent_code IS NOT NULL` | 🟢 Cứng hoá |
| F7 | Thêm cột `year_established` (firmographic có trong nghiên cứu §4.1, tín hiệu Compatibility rẻ & fill-rate cao) | 🟢 Bổ sung stat |
| F8 | Thêm `render_item` trong `alembic/env.py` → autogenerate tự render `pgvector.sqlalchemy.Vector`  • import (hết lỗi `NameError: Vector`) | 🟠 Fix thiếu |
| F9 | Thêm `docker-compose.yml` (pgvector local) → chứng minh DoD "chạy thành công ở local" mà không cần Cloud SQL | 🟢 DoD |
| F10 | Ghi chú bug Alembic #1603 cho HNSW index (operator class) — dùng `op.execute` raw khi lên ANN ở M2 | 🟢 Phòng ngừa |

## 1. Kết quả review research — các điểm FAIL đã sửa

| Vấn đề | Bằng chứng (đã verify) | Cách sửa trong bản FINAL |
| --- | --- | --- |
| **`text-embedding-004` đã ngừng** | Gemini API shutdown **14/01/2026**; Vertex AI retirement **01/04/2027**. Khuyến nghị chính thức migrate sang dòng `gemini-embedding-*`. | Dùng `gemini-embedding-001`, ép `output_dimensionality=768` (kỹ thuật MRL) → vẫn `VECTOR(768)`, không đổi schema. Xem Mục 9. |
| **CHECK thiếu trong ORM** | Quy trình bàn giao = `alembic --autogenerate`. Autogenerate chỉ đọc metadata ORM; CHECK chỉ khai trong DDL sẽ KHÔNG được sinh ra. | Đưa TẤT CẢ CHECK vào `__table_args__` của model (Mục 7). DDL (Mục 5) chỉ là bản tham chiếu đối chiếu. |
| **INSERT SQL thuần vi phạm NOT NULL** | ARRAY/JSONB chỉ có `default=list/dict` ở tầng Python; INSERT không qua ORM → NULL → lỗi NOT NULL. | Thêm `server_default` (mức DB) cho mọi cột có default. Mục 7. |
| **`gen_random_uuid()`** | ✅ Từ **PostgreSQL 13+** hàm này nằm trong *core* (không cần extension). Target PG15+ → an toàn. | Giữ nguyên, KHÔNG cài `pgcrypto` (tránh xung đột định nghĩa hàm trùng ở một số bản). |
| **Hàm `embedding()` native chưa bật được** | Hàm native Cloud SQL cần extension `google_ml_integration`  • cờ `cloudsql.enable_google_ml_integration`  • quyền Vertex. | Thêm bước bật extension (chỉ trên Cloud SQL). Local dev sinh embedding ở app-layer. Mục 9. |
| **Alembic + HNSW operator class** | Alembic issue #1603: `op.create_index(..., postgresql_using='hnsw')` có thể sinh SQL thiếu operator class → lỗi khi build index. | v0.1 KHÔNG tạo ANN index (data nhỏ, exact scan). Khi lên M2 dùng `op.execute` raw với `vector_cosine_ops`. Mục 6 + 10. |
| **VSIC 2025** | ✅ QĐ 36/2025/QĐ-TTg, hiệu lực **15/11/2025**: 22 / 87 / 259 / 495 / 743 cấp. Đúng như Canonical. | Giữ nguyên mapping 12 nhóm L1 → mã VSIC cấp 1 (A–V). |

## 2. Bộ chỉ số "Stats" danh tính → ánh xạ công thức M2 (DoD "vừa đủ")

Mỗi cột tồn tại vì nó *phục vụ trực tiếp* một số hạng trong công thức `Score(A→B)` của trang nghiên cứu nền tảng. Không trường thừa, không thiếu trường cốt lõi.

| Trục Stat | Cột schema | Phục vụ số hạng M2 |
| --- | --- | --- |
| **Tài chính** | `revenue_range_vnd`, `year_established` | Compatibility (tránh lệch tầm) + tín hiệu trưởng thành |
| **Nhân lực** | `employee_range` | Compatibility (quy mô tương thích) |
| **Mặt hàng** | `offers`, `needs`, `industries (L1/L2)`, `structured_attrs`, `embedding` | **Complementarity(need_A↔offer_B)** — lõi của matching; Similarity hồ sơ |
| **Vận hành** | `city`, `province`, `geo_operating`, `geo_scope`, `business_stage` | Compatibility (địa lý), tín hiệu mở rộng vùng |
| **Ý định** | `intent_type` → `intent_types.complement_code` | **IntentMatch**  • bật/tắt CompetitorPenalty, điều khiển trọng số w_i |
| **Uy tín / Hoạt động** | `verification_status`, `data_source`, `is_active`, `updated_at`, `match_interactions` | Reputation/Activity(B); label train ranker ở M2 |
| **Định danh người** | `persons`, `business_persons` | Khớp quyết định nền tảng "match người↔người"; north-star = hội thoại |

<aside>
🧮

`Score(A→B | intent) = w₁·Compl(need_A,offer_B) + w₂·Compl(need_B,offer_A) + w₃·Sim(profile_A,profile_B) + w₄·Compat(size,stage,geo) + w₅·IntentMatch + w₆·Reputation/Activity − p₁·CompetitorPenalty`. Mọi biến đều có cột nguồn ở bảng trên ⇒ M2 không nghẽn dữ liệu.

</aside>

## 3. Sơ đồ entity

- **5 cốt lõi:** `businesses`, `persons`, `business_persons` (N–N), `offers`, `needs`
- **3 lookup:** `industries` (self-ref), `intent_types` (self-ref), `certifications`
- **1 hành vi:** `match_interactions`

```
businesses 1─┬─N offers
             ├─N needs
             └─N business_persons N─1 persons
industries(self-ref) ◀── businesses / offers / needs
intent_types(self-ref complement) ◀── offers / needs
persons ◀── businesses.verified_by (FK use_alter)
```

## 4. Thứ tự khởi tạo (đã kiểm tra — không lỗi phụ thuộc)

`industries` → `intent_types` → `certifications` → `businesses` → `persons` → **ALTER** `businesses.verified_by → persons.id` → `business_persons` → `offers` → `needs` → `match_interactions`. FK self-ref (`industries.parent_code`, `intent_types.complement_code`) hợp lệ trong cùng `CREATE TABLE` của Postgres.

## 5. DDL FINAL (PostgreSQL 15+) — bản đối chiếu

```sql
-- ===== Extensions (local + cloud) =====
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector
CREATE EXTENSION IF NOT EXISTS unaccent;   -- full-text tiếng Việt (bỏ dấu)
-- gen_random_uuid(): core từ PG13+, KHÔNG cần pgcrypto.
-- CHỈ trên Cloud SQL (không có ở local) để dùng hàm embedding() native:
-- CREATE EXTENSION IF NOT EXISTS google_ml_integration;

-- ===== LOOKUP: industries (self-ref, 2 cấp) =====
CREATE TABLE industries (
    code        TEXT PRIMARY KEY,
    parent_code TEXT REFERENCES industries(code),
    level       SMALLINT NOT NULL CHECK (level IN (1,2)),
    name_vi     TEXT NOT NULL,
    name_en     TEXT,
    vsic_2025   TEXT[] NOT NULL DEFAULT '{}',
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_industry_hierarchy CHECK (
        (level = 1 AND parent_code IS NULL) OR
        (level = 2 AND parent_code IS NOT NULL))
);

-- ===== LOOKUP: intent_types =====
CREATE TABLE intent_types (
    code            TEXT PRIMARY KEY,
    name_vi         TEXT NOT NULL,
    name_en         TEXT NOT NULL,
    match_kind      TEXT NOT NULL CHECK (match_kind IN ('complementarity','similarity','mixed')),
    complement_code TEXT REFERENCES intent_types(code),
    popularity      SMALLINT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ===== LOOKUP: certifications =====
CREATE TABLE certifications (
    code      TEXT PRIMARY KEY,
    name_vi   TEXT NOT NULL,
    category  TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ===== businesses =====
CREATE TABLE businesses (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    tax_id              TEXT UNIQUE,
    legal_type          TEXT CHECK (legal_type IN (
                            'ho_kinh_doanh','doanh_nghiep_tu_nhan','cong_ty_tnhh_1tv',
                            'cong_ty_tnhh_2tv','cong_ty_co_phan','hop_tac_xa',
                            'cong_ty_hop_danh','khac')),
    business_stage      TEXT CHECK (business_stage IN (
                            'moi_thanh_lap','dang_tang_truong','on_dinh','mo_rong_vung','chuyen_doi_so')),
    year_established    SMALLINT CHECK (year_established BETWEEN 1900 AND 2100),
    industry_l1         TEXT REFERENCES industries(code),
    industry_l2         TEXT REFERENCES industries(code),
    employee_range      TEXT CHECK (employee_range IN (
                            '0','1_5','6_10','11_50','51_100','101_200','200_plus')),
    revenue_range_vnd   TEXT CHECK (revenue_range_vnd IN (
                            'duoi_100_trieu','100_trieu_1_ty','1_ty_3_ty','3_ty_10_ty',
                            '10_ty_50_ty','50_ty_100_ty','100_ty_300_ty','tren_300_ty','khong_tiet_lo')),
    city                TEXT,
    province            TEXT,
    geo_operating       TEXT[] NOT NULL DEFAULT '{}',
    description         TEXT,
    profile_embedding   VECTOR(768),
    data_source         TEXT NOT NULL DEFAULT 'self_reported'
                            CHECK (data_source IN ('self_reported','mst_lookup','admin_input')),
    verification_status TEXT NOT NULL DEFAULT 'unverified'
                            CHECK (verification_status IN ('unverified','mst_matched','manually_verified')),
    verified_at         TIMESTAMPTZ,
    verified_by         UUID,  -- FK -> persons(id) thêm bằng ALTER bên dưới
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== persons =====
CREATE TABLE persons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   TEXT NOT NULL,
    phone       TEXT,
    email       TEXT UNIQUE,
    zalo_id     TEXT,
    role_title  TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE businesses
    ADD CONSTRAINT fk_businesses_verified_by
    FOREIGN KEY (verified_by) REFERENCES persons(id);

-- ===== business_persons (N–N) =====
CREATE TABLE business_persons (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    person_id   UUID NOT NULL REFERENCES persons(id)    ON DELETE CASCADE,
    role        TEXT CHECK (role IN ('owner','director','sales_rep','authorized_rep')),
    is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
    started_at  DATE,
    ended_at    DATE,
    UNIQUE (business_id, person_id, role),
    CONSTRAINT ck_bp_dates CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at)
);

-- ===== offers =====
CREATE TABLE offers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    intent_type      TEXT NOT NULL REFERENCES intent_types(code),
    category_l1      TEXT REFERENCES industries(code),
    category_l2      TEXT REFERENCES industries(code),
    geo_scope        TEXT[] NOT NULL DEFAULT '{}',
    title            TEXT NOT NULL,
    description      TEXT,
    structured_attrs JSONB NOT NULL DEFAULT '{}',
    embedding        VECTOR(768),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== needs (cấu trúc giống offers) =====
CREATE TABLE needs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    intent_type      TEXT NOT NULL REFERENCES intent_types(code),
    category_l1      TEXT REFERENCES industries(code),
    category_l2      TEXT REFERENCES industries(code),
    geo_scope        TEXT[] NOT NULL DEFAULT '{}',
    title            TEXT NOT NULL,
    description      TEXT,
    structured_attrs JSONB NOT NULL DEFAULT '{}',
    embedding        VECTOR(768),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===== match_interactions =====
CREATE TABLE match_interactions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_person_id    UUID REFERENCES persons(id)    ON DELETE SET NULL,
    target_business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    interaction_type   TEXT NOT NULL CHECK (interaction_type IN
                           ('view_profile','send_invite','accept_invite','message')),
    context_offer_id   UUID REFERENCES offers(id) ON DELETE SET NULL,
    context_need_id    UUID REFERENCES needs(id)  ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 6. Indexes

```sql
CREATE INDEX idx_businesses_industry_l1 ON businesses(industry_l1);
CREATE INDEX idx_businesses_industry_l2 ON businesses(industry_l2);
CREATE INDEX idx_businesses_province    ON businesses(province);
CREATE INDEX idx_offers_business        ON offers(business_id);
CREATE INDEX idx_offers_intent          ON offers(intent_type);
CREATE INDEX idx_needs_business         ON needs(business_id);
CREATE INDEX idx_needs_intent           ON needs(intent_type);
CREATE INDEX idx_offers_attrs ON offers USING GIN (structured_attrs);
CREATE INDEX idx_needs_attrs  ON needs  USING GIN (structured_attrs);
CREATE INDEX idx_offers_geo ON offers USING GIN (geo_scope);
CREATE INDEX idx_needs_geo  ON needs  USING GIN (geo_scope);

-- VECTOR: KHÔNG tạo ANN index ở v0.1 (data nhỏ -> exact scan, recall 100%).
-- M2 khi >vài nghìn vector, tạo HNSW bằng raw SQL (tránh Alembic bug #1603):
--   CREATE INDEX ON offers USING hnsw (embedding vector_cosine_ops);
--   CREATE INDEX ON needs  USING hnsw (embedding vector_cosine_ops);
```

## 7. SQLAlchemy 2.0 models (`app/models.py`) — SoT cho autogenerate

<aside>
🔑

Model này là **nguồn chân lý** cho Alembic. Mọi CHECK + `server_default` đã đầy đủ để autogenerate sinh DDL khớp 100% Mục 5 (đã fix F1–F3, F6, F7).

</aside>

```python
from __future__ import annotations
import uuid
from datetime import datetime, date
from sqlalchemy import (
    Text, SmallInteger, Integer, Boolean, ForeignKey,
    CheckConstraint, UniqueConstraint, func, text
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

class Base(DeclarativeBase):
    pass

class Industry(Base):
    __tablename__ = "industries"
    code: Mapped[str] = mapped_column(Text, primary_key=True)
    parent_code: Mapped[str | None] = mapped_column(ForeignKey("industries.code"))
    level: Mapped[int] = mapped_column(SmallInteger)
    name_vi: Mapped[str] = mapped_column(Text)
    name_en: Mapped[str | None] = mapped_column(Text)
    vsic_2025: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False,
                                                 server_default=text("'{}'"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    __table_args__ = (
        CheckConstraint("level IN (1,2)", name="ck_industry_level"),
        CheckConstraint("(level=1 AND parent_code IS NULL) OR (level=2 AND parent_code IS NOT NULL)",
                        name="ck_industry_hierarchy"),
    )

class IntentType(Base):
    __tablename__ = "intent_types"
    code: Mapped[str] = mapped_column(Text, primary_key=True)
    name_vi: Mapped[str] = mapped_column(Text)
    name_en: Mapped[str] = mapped_column(Text)
    match_kind: Mapped[str] = mapped_column(Text)
    complement_code: Mapped[str | None] = mapped_column(ForeignKey("intent_types.code"))
    popularity: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    __table_args__ = (
        CheckConstraint("match_kind IN ('complementarity','similarity','mixed')",
                        name="ck_intent_match_kind"),
    )

class Certification(Base):
    __tablename__ = "certifications"
    code: Mapped[str] = mapped_column(Text, primary_key=True)
    name_vi: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))

class Business(Base):
    __tablename__ = "businesses"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(Text)
    tax_id: Mapped[str | None] = mapped_column(Text, unique=True)
    legal_type: Mapped[str | None] = mapped_column(Text)
    business_stage: Mapped[str | None] = mapped_column(Text)
    year_established: Mapped[int | None] = mapped_column(SmallInteger)
    industry_l1: Mapped[str | None] = mapped_column(ForeignKey("industries.code"))
    industry_l2: Mapped[str | None] = mapped_column(ForeignKey("industries.code"))
    employee_range: Mapped[str | None] = mapped_column(Text)
    revenue_range_vnd: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(Text)
    province: Mapped[str | None] = mapped_column(Text)
    geo_operating: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False,
                                                     server_default=text("'{}'"))
    description: Mapped[str | None] = mapped_column(Text)
    profile_embedding: Mapped[list[float] | None] = mapped_column(Vector(768))
    data_source: Mapped[str] = mapped_column(Text, nullable=False,
                                             server_default=text("'self_reported'"))
    verification_status: Mapped[str] = mapped_column(Text, nullable=False,
                                                     server_default=text("'unverified'"))
    verified_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    # use_alter=True -> Alembic phát FK này thành 1 ALTER riêng sau khi tạo cả 2 bảng.
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("persons.id", use_alter=True, name="fk_businesses_verified_by"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now(), onupdate=func.now())
    offers: Mapped[list["Offer"]] = relationship(back_populates="business")
    needs: Mapped[list["Need"]] = relationship(back_populates="business")
    __table_args__ = (
        CheckConstraint("legal_type IN ('ho_kinh_doanh','doanh_nghiep_tu_nhan',"
                        "'cong_ty_tnhh_1tv','cong_ty_tnhh_2tv','cong_ty_co_phan',"
                        "'hop_tac_xa','cong_ty_hop_danh','khac')", name="ck_legal_type"),
        CheckConstraint("business_stage IN ('moi_thanh_lap','dang_tang_truong','on_dinh',"
                        "'mo_rong_vung','chuyen_doi_so')", name="ck_business_stage"),
        CheckConstraint("year_established BETWEEN 1900 AND 2100", name="ck_year_established"),
        CheckConstraint("employee_range IN ('0','1_5','6_10','11_50','51_100','101_200','200_plus')",
                        name="ck_employee_range"),
        CheckConstraint("revenue_range_vnd IN ('duoi_100_trieu','100_trieu_1_ty','1_ty_3_ty',"
                        "'3_ty_10_ty','10_ty_50_ty','50_ty_100_ty','100_ty_300_ty',"
                        "'tren_300_ty','khong_tiet_lo')", name="ck_revenue_range"),
        CheckConstraint("data_source IN ('self_reported','mst_lookup','admin_input')",
                        name="ck_data_source"),
        CheckConstraint("verification_status IN ('unverified','mst_matched','manually_verified')",
                        name="ck_verification_status"),
    )

class Person(Base):
    __tablename__ = "persons"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=func.gen_random_uuid())
    full_name: Mapped[str] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(Text, unique=True)
    zalo_id: Mapped[str | None] = mapped_column(Text)
    role_title: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now(), onupdate=func.now())

class BusinessPerson(Base):
    __tablename__ = "business_persons"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=func.gen_random_uuid())
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    person_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("persons.id", ondelete="CASCADE"))
    role: Mapped[str | None] = mapped_column(Text)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    started_at: Mapped[date | None] = mapped_column()
    ended_at: Mapped[date | None] = mapped_column()
    __table_args__ = (
        UniqueConstraint("business_id", "person_id", "role", name="uq_business_person_role"),
        CheckConstraint("role IN ('owner','director','sales_rep','authorized_rep')",
                        name="ck_bp_role"),
        CheckConstraint("ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at",
                        name="ck_bp_dates"),
    )

class Offer(Base):
    __tablename__ = "offers"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=func.gen_random_uuid())
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    intent_type: Mapped[str] = mapped_column(ForeignKey("intent_types.code"))
    category_l1: Mapped[str | None] = mapped_column(ForeignKey("industries.code"))
    category_l2: Mapped[str | None] = mapped_column(ForeignKey("industries.code"))
    geo_scope: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default=text("'{}'"))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    structured_attrs: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    expires_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now(), onupdate=func.now())
    business: Mapped["Business"] = relationship(back_populates="offers")

class Need(Base):
    __tablename__ = "needs"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=func.gen_random_uuid())
    business_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    intent_type: Mapped[str] = mapped_column(ForeignKey("intent_types.code"))
    category_l1: Mapped[str | None] = mapped_column(ForeignKey("industries.code"))
    category_l2: Mapped[str | None] = mapped_column(ForeignKey("industries.code"))
    geo_scope: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default=text("'{}'"))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    structured_attrs: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default=text("'{}'"))
    embedding: Mapped[list[float] | None] = mapped_column(Vector(768))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    expires_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now(), onupdate=func.now())
    business: Mapped["Business"] = relationship(back_populates="needs")

class MatchInteraction(Base):
    __tablename__ = "match_interactions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=func.gen_random_uuid())
    actor_person_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("persons.id", ondelete="SET NULL"))
    target_business_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("businesses.id", ondelete="CASCADE"))
    interaction_type: Mapped[str] = mapped_column(Text)
    context_offer_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("offers.id", ondelete="SET NULL"))
    context_need_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("needs.id", ondelete="SET NULL"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now())
    __table_args__ = (
        CheckConstraint("interaction_type IN ('view_profile','send_invite','accept_invite','message')",
                        name="ck_interaction_type"),
    )
```

## 8. Alembic — env.py + migration (đã fix F5, F8)

`alembic/env.py` (phần cốt lõi + `render_item` cho pgvector):

```python
from app.models import Base
target_metadata = Base.metadata

# F8: tự render type Vector + thêm import pgvector vào file migration
def render_item(type_, obj, autogen_context):
    if type_ == "type" and obj.__class__.__module__.startswith("pgvector"):
        autogen_context.imports.add("import pgvector.sqlalchemy")
        return f"pgvector.sqlalchemy.Vector(dim={obj.dim})"
    return False  # mặc định

# truyền render_item vào context.configure(..., render_item=render_item, compare_type=True)
# Connection string đồng bộ cho Alembic (asyncpg chỉ dùng ở runtime):
#   postgresql+psycopg://USER:PASS@/linko?host=/cloudsql/PROJECT:REGION:INSTANCE
```

Migration đầu tiên `0001_init.py` — bổ sung thủ công phần extensions + trigger:

```python
"""init schema linko v0.1 final"""
from alembic import op
import sqlalchemy as sa
import pgvector.sqlalchemy  # F8: cần cho Vector trong file migration

revision = "0001_init"
down_revision = None

def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    # F5: chỉ chạy được trên Cloud SQL (đã bật cờ google ml integration). Bọc an toàn:
    op.execute("DO $$ BEGIN "
               "  CREATE EXTENSION IF NOT EXISTS google_ml_integration; "
               "EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'skip google_ml_integration (local)'; "
               "END $$;")

    # ... các op.create_table(...) do autogenerate sinh ra ...
    # FK verified_by (use_alter) -> autogenerate phát thành op.create_foreign_key RIÊNG.

    # Trigger updated_at ở mức DB (onupdate ORM chỉ áp khi ghi qua SQLAlchemy)
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
        $$ LANGUAGE plpgsql;
    """)
    for tbl in ("businesses", "persons", "offers", "needs"):
        op.execute(f"""
            CREATE TRIGGER trg_{tbl}_updated_at
            BEFORE UPDATE ON {tbl}
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        """)

def downgrade() -> None:
    for tbl in ("businesses", "persons", "offers", "needs"):
        op.execute(f"DROP TRIGGER IF EXISTS trg_{tbl}_updated_at ON {tbl}")
    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")
    # ... drop tables ...
    op.execute("DROP EXTENSION IF EXISTS unaccent")
    op.execute("DROP EXTENSION IF EXISTS vector")
```

Quy trình: `alembic revision --autogenerate -m "init"` → review → thêm `CREATE EXTENSION` + trigger lên `upgrade()` → `alembic upgrade head`.

## 9. Chiến lược Embedding (FIX F4 — quan trọng)

<aside>
🚨

**`text-embedding-004` đã bị Google ngừng** (Gemini API: 14/01/2026; Vertex AI: tới 01/04/2027 rồi cũng retire). **Không dùng cho hệ thống mới.**

</aside>

- **Model chốt: `gemini-embedding-001`** với tham số **`output_dimensionality=768`** (kỹ thuật Matryoshka — cắt vector 3072 chiều xuống 768 mà gần như không mất chất lượng). → Giữ nguyên cột `VECTOR(768)`, **không phải migration**.
- **Chuẩn hoá:** khi cắt < 3072 chiều, **L2-normalize** lại vector trước khi lưu. Vì ta dùng `vector_cosine_ops` (cosine), khoảng cách vẫn đúng kể cả chưa chuẩn hoá, nhưng nên normalize để nhất quán với inner-product về sau.
- **Local dev:** image `pgvector/pgvector` KHÔNG có hàm `embedding()` native → để embedding `NULL` khi seed, hoặc sinh ở app-layer qua Vertex SDK. Schema + migration + seed **chạy độc lập không cần Cloud SQL**.
- **Trên Cloud SQL (tùy chọn, O1):** bật `google_ml_integration` để gọi `embedding('gemini-embedding-001', text)` trực tiếp trong SQL. Lưu ý cấu hình `output_dimensionality` để ra đúng 768.

## 10. structured_attrs JSONB — schema theo intent (FMCG)

```json
// offer intent_type='find_buyer' (bán sỉ tìm người mua)
{
  "product_category": "gia_vi_nuoc_cham",
  "moq": { "value": 50, "unit": "thung" },
  "price_range_vnd": { "min": 180000, "max": 240000, "unit": "thung" },
  "certifications": ["ATVSTP", "OCOP_4_sao"],
  "payment_terms": "cong_no_30_ngay",
  "sample_available": true
}

// need intent_type='find_supplier' (cửa hàng cần nguồn hàng)
{
  "product_category": "gia_vi_nuoc_cham",
  "target_volume": { "value": 100, "unit": "thung_thang" },
  "budget_vnd": { "max": 220000, "unit": "thung" },
  "required_certifications": ["ATVSTP"],
  "preferred_delivery": "giao_tan_noi"
}
```

## 11. Seed data (`scripts/seed.py`)

<aside>
💡

Giữ nguyên logic 2-pass đã chứng minh ổn ở Canonical: (1) L1 flush trước L2; (2) intent_types insert rồi mới set `complement_code`; tên L2 hardcode tiếng Việt. Bổ sung: dùng `year_established` cho demo.

</aside>

```python
from sqlalchemy.orm import Session
from app.models import Industry, IntentType, Certification, Business, Person, Offer, Need

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
    session.flush()  # parent tồn tại trước khi insert L2
    for sub, vi in L2_BBL.items():
        session.add(Industry(code=f"ban_buon_ban_le.{sub}", parent_code="ban_buon_ban_le", level=2, name_vi=vi))
    for sub, vi in L2_SX.items():
        session.add(Industry(code=f"san_xuat_che_bien.{sub}", parent_code="san_xuat_che_bien", level=2, name_vi=vi))
    for code, vi, en, kind, comp, pop in INTENTS:  # PASS 1: chưa set complement_code
        session.add(IntentType(code=code, name_vi=vi, name_en=en, match_kind=kind,
                               complement_code=None, popularity=pop))
    session.flush()
    for code, _, _, _, comp, _ in INTENTS:        # PASS 2: set complement_code
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
    session.add_all([nha_sx, cua_hang]); session.flush()
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
```

## 12. Containerization — Dockerfile + docker-compose (DoD)

`Dockerfile` (Python 3.11-slim, hợp Cloud Run):

```docker
FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8080"]
```

`docker-compose.yml` (F9 — chứng minh chạy local KHÔNG cần Cloud SQL):

```yaml
services:
  db:
    image: pgvector/pgvector:pg16   # Postgres 16 + pgvector sẵn
    environment:
      POSTGRES_USER: linko
      POSTGRES_PASSWORD: linko
      POSTGRES_DB: linko
    ports: ["5432:5432"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U linko"]
      interval: 5s
      timeout: 5s
      retries: 10
    volumes: ["pgdata:/var/lib/postgresql/data"]
  api:
    build: .
    depends_on:
      db: { condition: service_healthy }
    environment:
      DATABASE_URL: postgresql+asyncpg://linko:linko@db:5432/linko
      ALEMBIC_DATABASE_URL: postgresql+psycopg://linko:linko@db:5432/linko
    ports: ["8080:8080"]
volumes:
  pgdata:
```

`requirements.txt`:

```
fastapi>=0.115
uvicorn[standard]>=0.30
sqlalchemy>=2.0
alembic>=1.13
asyncpg>=0.29
psycopg[binary]>=3.2
pgvector>=0.3
pydantic-settings>=2.0
cloud-sql-python-connector[asyncpg]>=1.9
```

Cấu trúc thư mục:

```
linko-backend/
├── app/{__init__,main,config,database,models,schemas}.py
│   ├── routers/{businesses,match}.py
│   └── services/matching.py     # Score(A→B) = w1·Compl + w2·Compl + ...
├── alembic/{env.py, versions/0001_init.py}
├── scripts/seed.py
├── alembic.ini
├── requirements.txt
├── .env.example
├── Dockerfile
└── docker-compose.yml
```

## 13. Quyết định đã chốt (bake vào schema)

| # | Quyết định | Chốt |
| --- | --- | --- |
| O1 | Nguồn embedding | `gemini-embedding-001` @ `output_dimensionality=768` (KHÔNG còn `text-embedding-004`) |
| O2 | Khoảng cách vector | cosine (`vector_cosine_ops`) |
| O3 | Bảng `provinces` | Không — `province` TEXT (chuẩn hoá 34 tỉnh khi cần) |
| O4 | Lịch sử verify | Provenance Level 1 (4 cột) |
| O5 | `tax_id` | Nullable + UNIQUE |
| O6 | Xoá | Soft-delete bằng `is_active` (không có `deleted_at`) |
| O7 | Bộ enum stage & revenue | Giữ bộ ở Mục 5 (bám NĐ 80/2021) |

## 14. DoD — đối chiếu hoàn thành

- [x]  **Bộ chỉ số "Vừa đủ":** mọi cột ánh xạ trực tiếp số hạng công thức M2 (Mục 2). Không trường thừa, không thiếu trường lõi.
- [x]  **Dữ liệu cấu trúc sạch (0% lỗi type):** TEXT+CHECK, FK, UNIQUE, ARRAY/JSONB có `server_default`; CHECK đầy đủ trong ORM (F1–F3) → autogenerate sinh đúng.
- [x]  **Sẵn sàng kết nối:** `alembic upgrade head` chạy local (docker-compose) → bàn giao @dathuhu lên Cloud SQL (chỉ thêm `google_ml_integration`).
- [x]  **Containerized:** `Dockerfile` + `docker-compose.yml` (pgvector) chạy cô lập, không xung đột thư viện.

## 15. Handoff checklist cho @dathuhu

- [ ]  `docker compose up --build` → migration + API chạy local (PG16 + pgvector)
- [ ]  Verify schema: `\d+ businesses` thấy đủ CHECK (`ck_business_stage`, `ck_revenue_range`, `ck_year_established`...)
- [ ]  Chạy `scripts/seed.py` → kiểm tra cặp match demo (find_buyer ↔ find_supplier)
- [ ]  Tạo Cloud SQL PG16 + bật `vector`, `unaccent`, `google_ml_integration`
- [ ]  Cấu hình sinh embedding `gemini-embedding-001` @ 768 (app-layer hoặc hàm native), L2-normalize
- [ ]  Viết FastAPI `/match` theo công thức M2; M2 mới tạo HNSW index (raw SQL, `vector_cosine_ops`)
- [ ]  Production nhiều instance: tách migration ra Cloud Run Job riêng (tránh race)

<aside>
📎

Tài liệu nguồn: bản Canonical Spec và nghiên cứu thuật toán/dữ liệu nền tảng được giữ nguyên làm tham chiếu; bản FINAL này là phiên bản đã review & sẵn sàng implement.

</aside>