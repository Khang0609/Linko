# Linko API (Backend)

Backend Python cho Linko, gồm:

- Issue #4: schema DB, migrations, Docker local PostgreSQL/pgvector.
- Issue #7: endpoint onboarding `POST /businesses`, validation, idempotency, province normalization, RFC 9457 errors.

## Stack

- **Python 3.11** + **uv** (lockfile reproducible)
- **FastAPI** + **SQLAlchemy 2.0** (async, asyncpg)
- **Alembic** (sync, psycopg) for migrations
- **PostgreSQL 16** + **pgvector** (local image: `pgvector/pgvector:pg16`)

## Environment

Copy `.env.example` to `.env` for local development. Never commit real `.env` values.

Required/current variables:

- `DATABASE_URL`: async app connection string, using `postgresql+asyncpg`.
- `ALEMBIC_DATABASE_URL`: sync migration connection string, using `postgresql+psycopg`.
- `TEST_DATABASE_URL`: test DB URL when a separate test database is used.
- `PERSON_REQUIRED`: optional feature flag for requiring `persons[]` in onboarding.
- `IDEMPOTENCY_TTL_SECONDS`: TTL for cached `Idempotency-Key` responses.

Secrets and deployment credentials must come from the deployment environment or Secret Manager. Do not hardcode Cloud SQL
passwords, project IDs, instance names, API keys, or service-account material in this repository.

## Connection Patterns

Pick one pattern for the environment you are running. Cloud SQL Auth Proxy and Docker Compose both default to
`localhost:5432`, so do not run them at the same time unless one of them is configured to use a different local port.

### A. Cloud SQL Unix socket (prod-like GCP runtime)

Recommended for Cloud Run, GKE, or Compute Engine when Cloud SQL is mounted as a Unix socket.

```env
DATABASE_URL=postgresql+asyncpg://<DB_USER>:<DB_PASSWORD>@/<DB_NAME>?host=/cloudsql/<PROJECT>:<REGION>:<INSTANCE>
ALEMBIC_DATABASE_URL=postgresql+psycopg://<DB_USER>:<DB_PASSWORD>@/<DB_NAME>?host=/cloudsql/<PROJECT>:<REGION>:<INSTANCE>
```

Use Secret Manager or runtime environment variables for `<DB_PASSWORD>` and other sensitive values.

### B. Local dev via Cloud SQL Auth Proxy

Use this only when you need to test against Cloud SQL from a local machine.

```bash
cloud-sql-proxy <PROJECT>:<REGION>:<INSTANCE> --port 5432
```

Then configure `.env`:

```env
DATABASE_URL=postgresql+asyncpg://<DB_USER>:<DB_PASSWORD>@localhost:5432/<DB_NAME>
ALEMBIC_DATABASE_URL=postgresql+psycopg://<DB_USER>:<DB_PASSWORD>@localhost:5432/<DB_NAME>
```

### C. Docker Compose local PostgreSQL/pgvector

Use this for day-to-day backend development when Cloud SQL is not needed.

```bash
docker compose up --build -d
```

Local defaults:

- App DB URL: `postgresql+asyncpg://linko:linko@localhost:5432/linko`
- Alembic DB URL: `postgresql+psycopg://linko:linko@localhost:5432/linko`
- API health: `http://localhost:8080/health` -> `{"status":"ok"}`

Migration runs automatically in the local Compose API container. For production, do not rely on container startup
auto-migration; run migrations as a separate deployment job.

## Dev Commands

```bash
uv venv --python 3.11 && uv sync --extra dev
uv run uvicorn app.main:app --reload --port 8080
uv run alembic upgrade head
uv run alembic downgrade base
uv run python scripts/seed.py
uv run ruff check .
uv run pytest -q
```

`pytest -q` requires a reachable PostgreSQL database with migrations already applied. For local Docker:

```bash
docker compose up -d db
uv run alembic upgrade head
uv run pytest -q
```

## API Endpoints

### `POST /businesses`

Main onboarding confirmation endpoint for issue #7. It accepts a reviewed business profile from the frontend and only
persists it when the core dataset is complete.

Required core fields:

- `name`
- `industry_l1`
- `province`
- at least one item in `offers[]` or `needs[]`, each with an `intent_type` and `title`

Optional fields include `tax_id`, `business_stage`, `revenue_range_vnd`, `employee_range`, `year_established`, and
`persons[]`. If `persons[]` is supplied, each person must include `full_name`.

`province` is normalized to the current 34-province list. Legacy names such as `Bình Dương` are converted to
`TP. Hồ Chí Minh` and returned with a warning:

```json
{
  "warnings": ["province_converted: Bình Dương -> TP. Hồ Chí Minh"]
}
```

This normalization follows current province-level administrative names. M2 should consider storing finer-grained
location data, such as original province text or district/ward, so geo matching does not lose useful local detail.

### Error Format

Errors use RFC 9457-style `application/problem+json`:

```json
{
  "type": "https://linko.vn/problems/request-validation",
  "title": "Request validation failed",
  "status": 422,
  "detail": "Request body failed validation.",
  "instance": "/businesses",
  "errors": []
}
```

Status codes:

- `201`: profile accepted and persisted
- `400`: malformed JSON
- `422`: missing/invalid profile data, unknown references, or `Idempotency-Key` reused with a different payload
- `409`: duplicate `tax_id` or an idempotency key still processing
- `500`: internal server error

### Idempotency

Clients may send `Idempotency-Key` on `POST /businesses`.

- Same key + same payload returns the cached response with `Idempotent-Replayed: true`.
- Same key + different payload returns `422`.
- Same key while the original request is still processing returns `409` with `Retry-After`.
- Cached responses expire after `IDEMPOTENCY_TTL_SECONDS`.
- Missing key is allowed in v0.1; the API falls back to duplicate protection through `tax_id` when present.

## Verify Schema (DoD)

Docker Compose uses the local `linko` user and database:

```bash
docker compose exec db psql -U linko -d linko -c "\d+ businesses"
docker compose exec db psql -U linko -d linko -c "\df set_updated_at"
docker compose exec db psql -U linko -d linko -c "SELECT extname FROM pg_extension"
docker compose exec db psql -U linko -d linko -c "SELECT count(*) FROM industries"
docker compose exec db psql -U linko -d linko -c "SELECT count(*) FROM intent_types"
docker compose exec db psql -U linko -d linko -c "SELECT count(*) FROM certifications"
```

Expected reference-data counts after `alembic upgrade head`:

- `industries = 30`
- `intent_types = 8`
- `certifications = 12`

## Architecture

- `app/models.py`: SQLAlchemy model source of truth for Alembic.
- `app/schemas.py`: Pydantic v2 request/response DTOs for onboarding.
- `app/routers/businesses.py`: `POST /businesses` endpoint.
- `app/exceptions.py`: RFC 9457 problem+json handlers.
- `core/province_mapping.py`: 63-to-34 province normalization.
- `core/idempotency.py`: `Idempotency-Key` hashing and response caching.
- `alembic/versions/0001_init.py`: extensions, 9 tables, triggers, indexes.
- `alembic/versions/0002_seed_reference_data.py`: idempotency table and reference-data seed.

## Embedding (M2)

- v0.1 stores `profile_embedding`, offer `embedding`, and need `embedding` as `NULL`.
- Planned model: `gemini-embedding-001` with `output_dimensionality=768`.
- If embeddings are truncated to 768 dimensions, normalize vectors consistently before using inner-product similarity.
- If using PostgreSQL HNSW with cosine distance, use `vector_cosine_ops`:

```sql
CREATE INDEX ON offers USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON needs  USING hnsw (embedding vector_cosine_ops);
```

Create HNSW indexes with raw SQL when the dataset is large enough; avoid Alembic `op.create_index` for pgvector HNSW.

## Production Notes

- Run migrations through a controlled job, such as a Cloud Run Job. Do not auto-migrate on every production container
  startup, because multi-instance startup can race.
- Prefer Cloud SQL Unix socket connections in GCP runtime. Use Cloud SQL Auth Proxy only for local development.
- Store secrets in Secret Manager or deployment environment variables.
- Keep `.env` out of git; commit only `.env.example`.

## Handoff (Cloud SQL)

1. Create Cloud SQL PostgreSQL 16 and enable `vector` and `unaccent`.
2. Enable `google_ml_integration` only if M2 embedding generation will run in Cloud SQL.
3. Grant the minimum required IAM permissions to the runtime service account.
4. Set `DATABASE_URL` and `ALEMBIC_DATABASE_URL` from Secret Manager or deployment env.
5. Run `alembic upgrade head` through a one-off migration job.
6. Verify schema and reference-data counts.
7. Deploy API separately after migration succeeds.

## Refs

- Issue #4: https://github.com/Khang0609/Linko/issues/4
- Issue #7: https://github.com/Khang0609/Linko/issues/7
- Implementation plan: `temp/issue7/implementation-plan.md`
- Research: `temp/issue7/research.md`
