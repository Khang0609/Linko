"""Matching service logic — Issue #10 / M2.

Handles generating 768-dim vectors from company profiles using text-embedding-004
(or deterministic mock fallback for offline/CI mode).
Queries database using pgvector cosine_distance to return top matches.
"""

from __future__ import annotations

import hashlib
import logging
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.models import Business

logger = logging.getLogger(__name__)


def _generate_mock_embedding(text: str) -> list[float]:
    """Generate a deterministic mock 768-dimensional float vector."""
    digest = hashlib.sha256(text.encode()).digest()
    vector = []
    for i in range(768):
        # Deterministic float in [-1.0, 1.0]
        val = ((digest[i % 32] + i) % 200) / 100.0 - 1.0
        vector.append(val)
    return vector


async def generate_profile_text(session: AsyncSession, business_id: UUID) -> str:
    """Construct a unified text representation of a business profile."""
    stmt = (
        select(Business)
        .where(Business.id == business_id)
        .options(
            selectinload(Business.offers),
            selectinload(Business.needs),
        )
    )
    business = (await session.execute(stmt)).scalar_one_or_none()
    if not business:
        return ""

    parts = []
    if business.name:
        parts.append(f"Name: {business.name}")
    if business.description:
        parts.append(f"Description: {business.description}")
    if business.industry_l1:
        parts.append(f"Industry L1: {business.industry_l1}")
    if business.industry_l2:
        parts.append(f"Industry L2: {business.industry_l2}")

    for offer in business.offers:
        if offer.is_active:
            parts.append(f"Offer: {offer.title}. {offer.description or ''}")
    for need in business.needs:
        if need.is_active:
            parts.append(f"Need: {need.title}. {need.description or ''}")

    return "\n".join(parts)


async def generate_embedding(text: str) -> list[float]:
    """Generate a 768-dimensional embedding from text using Vertex AI."""
    if not text.strip():
        return [0.0] * 768

    if not settings.gemini_project:
        logger.info("VERTEX_PROJECT not set, returning deterministic mock embedding.")
        return _generate_mock_embedding(text)

    try:
        from google import genai

        client = genai.Client(
            vertexai=True,
            project=settings.gemini_project,
            location=settings.gemini_region,
        )
        # Call Google Vertex AI Text Embedding API
        response = client.models.embed_content(
            model="text-embedding-004",
            contents=text,
        )
        if response.embeddings and len(response.embeddings) > 0:
            return [float(x) for x in response.embeddings[0].values]
        else:
            raise ValueError("Empty response from Vertex embedding API.")
    except Exception as exc:
        logger.warning("Vertex embedding failed: %s. Falling back to mock.", exc)
        return _generate_mock_embedding(text)


async def update_business_embedding(session: AsyncSession, business_id: UUID) -> list[float] | None:
    """Generate and persist vector embedding for a specific business."""
    profile_text = await generate_profile_text(session, business_id)
    if not profile_text:
        return None

    embedding = await generate_embedding(profile_text)

    # Update business profile_embedding field directly
    stmt = select(Business).where(Business.id == business_id)
    business = (await session.execute(stmt)).scalar_one_or_none()
    if business:
        business.profile_embedding = embedding
        session.add(business)
        await session.flush()
        logger.info("Updated profile embedding for business %s", business_id)

    return embedding


async def get_top_matches(
    session: AsyncSession,
    business_id: UUID,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """Query pgvector cosine similarity to find top matches for a business."""
    # 1. Fetch business embedding
    business = await session.get(Business, business_id)
    if not business or not business.is_active:
        return []

    embedding = business.profile_embedding
    if not embedding:
        # Generate embedding dynamically on-the-fly
        embedding = await update_business_embedding(session, business_id)
        if not embedding:
            return []

    # 2. Query other active businesses sorted by cosine distance
    # cosine_distance returns value in [0, 2] where 0 is identical, 2 is opposite.
    # similarity score = 1.0 - cosine_distance.
    stmt = (
        select(Business)
        .where(
            Business.id != business_id,
            Business.is_active.is_(True),
            Business.profile_embedding.is_not(None),
        )
        .order_by(Business.profile_embedding.cosine_distance(embedding))
        .limit(limit)
    )

    results = (await session.execute(stmt)).scalars().all()

    matches = []
    for matched in results:
        # Calculate score (1.0 - distance)
        # We compute cosine distance natively using pgvector operations
        distance = await session.scalar(
            select(matched.profile_embedding.cosine_distance(embedding))
        )
        score = 1.0 - float(distance) if distance is not None else 0.0

        matches.append({
            "business_id": matched.id,
            "name": matched.name,
            "industry_l1": matched.industry_l1,
            "industry_l2": matched.industry_l2,
            "province": matched.province,
            "score": round(score, 4),
        })

    # Sort descending by score just in case
    matches.sort(key=lambda m: m["score"], reverse=True)
    return matches
