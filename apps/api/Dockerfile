# Python 3.11-slim (T3): 3.14 is too new for asyncpg/psycopg wheels.
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# uv (T1): lockfile reproducible, cache mount better than pip.
COPY --from=ghcr.io/astral-sh/uv:0.10.8 /uv /uvx /bin/

WORKDIR /app

# Build deps for psycopg/asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install deps first (cache layer) — only need pyproject + lock
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# Copy source + install project
COPY . .
RUN uv sync --frozen --no-dev

EXPOSE 8080

# Cloud Run convention: port 8080. Migration runs on each start (OK single-instance;
# multi-instance production: split migration to Cloud Run Job — see README).
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8080"]
