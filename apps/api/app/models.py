from __future__ import annotations

import uuid
from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    SmallInteger,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


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
    # use_alter=True -> Alembic emits this FK as a separate ALTER after both tables are created.
    verified_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("persons.id", use_alter=True, name="fk_businesses_verified_by"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False,
                                                 server_default=func.now(), onupdate=func.now())
    offers: Mapped[list[Offer]] = relationship(back_populates="business")
    needs: Mapped[list[Need]] = relationship(back_populates="business")
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
    business: Mapped[Business] = relationship(back_populates="offers")

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
    business: Mapped[Business] = relationship(back_populates="needs")

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
