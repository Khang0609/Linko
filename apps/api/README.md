# Linko API (Backend)

Backend Python cho Linko — business matching platform. Implement issue #4 (Schema DB).

## Stack

- **Python 3.11** + **uv** (lockfile reproducible)
- **FastAPI** + **SQLAlchemy 2.0** (async, asyncpg)
- **Alembic** (sync, psycopg) — migrations
- **PostgreSQL 16** + **pgvector** (local: `pgvector/pgvector:pg16`)

## Connecting to Cloud SQL

This project supports **2 connection patterns** — pick based on where you're running.

### A. Cloud SQL Unix socket (Cloud Run / GKE / Compute Engine)

Cloud SQL instances are **not accessible by IP by default** — they use Unix domain sockets for security. No IP needed.

```env
# .env — values for Cloud Run deployment
DATABASE_URL=postgresql+asyncpg://USER:PASS@/DB_NAME?host=/cloudsql/PROJECT:REGION:INSTANCE
ALEMBIC_DATABASE_URL=postgresql+psycopg://USER:PASS@/DB_NAME?host=/cloudsql/PROJECT:REGION:INSTANCE
```

Example with our dev instance:

```env
DATABASE_URL=postgresql+asyncpg://postgres:linkohcmut@/postgres?host=/cloudsql/project-8cf76e15-7314-466b-b9f1:us-central1:linko-db-dev
ALEMBIC_DATABASE_URL=postgresql+psycopg://postgres:linkohcmut@/postgres?host=/cloudsql/project-8cf76e15-7314-466b-b9f1:us-central1:linko-db-dev
```

The socket path `/cloudsql/<PROJECT>:<REGION>:<INSTANCE>` is auto-mounted by GCP.  
**No IP to share — the socket is local to the GCP environment.**

### B. Local dev via Cloud SQL Auth Proxy

To connect to Cloud SQL from your laptop, use [`cloud-sql-proxy`](https://cloud.google.com/sql/docs/postgres/connect-auth-proxy):

```bash
# 1. Download & authenticate
cloud-sql-proxy project-8cf76e15-7314-466b-b9f1:us-central1:linko-db-dev

# 2. Proxy creates a TCP tunnel on localhost:5432 → Cloud SQL
# Now connect via localhost:
```

```env
# .env — local via proxy
DATABASE_URL=postgresql+asyncpg://postgres:linkohcmut@localhost:5432/postgres
ALEMBIC_DATABASE_URL=postgresql+psycopg://postgres:linkohcmut@localhost:5432/postgres
```

### C. Docker Compose (pgvector local — no Cloud SQL)

If you don't need Cloud SQL and just want to develop locally:

```bash
docker compose up --build -d
# DB: pgvector/pgvector:pg16 → localhost:5432
# API: http://localhost:8080/health → {"status":"ok"}
```

Migration runs automatically on container start.

## Dev commands

```bash
uv venv --python 3.11 && uv sync --extra dev   # setup
uv run uvicorn app.main:app --reload            # dev server (need DB running)
uv run alembic upgrade head                     # migrate
uv run alembic downgrade base                   # rollback
uv run python scripts/seed.py                   # seed demo data
uv run ruff check .                             # lint
uv run pytest -q                                # test
```

## Verify schema (DoD)

```bash
docker compose exec db psql -U linko -c "\d+ businesses"   # see all CHECK ck_*
docker compose exec db psql -U linko -c "\df set_updated_at" # trigger function
docker compose exec db psql -U linko -c "SELECT extname FROM pg_extension" # vector, unaccent
```

## Architecture

- `app/models.py` — **SoT** for Alembic (fixed F1–F7, see `temp/verification.md`).
- `alembic/env.py` — `render_item` for `pgvector.sqlalchemy.Vector` (F8).
- `alembic/versions/0001_init.py` — ext + 9 tables + triggers.

## Embedding (Cloud SQL only — M2)

- Model: `gemini-embedding-001` @ `output_dimensionality=768` (F4: `text-embedding-004` shutdown 14/01/2026).
- Cloud SQL: `CREATE EXTENSION google_ml_integration` + flag `cloudsql.enable_google_ml_integration` (F5, confirm C1).
- Local: embedding NULL when seed; generate at app-layer when needed.

## Production notes (M2+)

- **Multi-instance:** split migration to Cloud Run Job (avoid race when N containers run `alembic upgrade head`).
- **ANN index:** create HNSW with raw SQL when >few thousand vectors (F10: Alembic #1603 bug, do NOT use `op.create_index`).
  ```sql
  CREATE INDEX ON offers USING hnsw (embedding vector_cosine_ops);
  CREATE INDEX ON needs  USING hnsw (embedding vector_cosine_ops);
  ```

## Handoff (for @dathuhu — Cloud SQL)

1. `docker compose up --build` → verify local OK.
2. Create Cloud SQL PG16 + enable `vector`, `unaccent`, `google_ml_integration`.
3. Set `cloudsql.enable_google_ml_integration = on` (database flag).
4. Grant Vertex AI IAM to Cloud SQL service account.
5. Run `alembic upgrade head` (via Cloud Run Job or psql).
6. Verify `\d+ businesses` shows all CHECK.
7. Configure `DATABASE_URL` using `cloud-sql-python-connector`.

## Refs

- Issue: https://github.com/Khang0609/Linko/issues/4
- Schema: `temp/schema.md`
- Verification: `temp/verification.md`
