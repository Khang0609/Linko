# start-local.sh
#!/bin/bash
set -e

echo "Spinning up local PostgreSQL with pgvector..."
docker compose up -d

echo "Waiting for database to be ready..."
sleep 5

cd apps/api

if [ -f .env.example ] && [ ! -f .env ]; then
  cp .env.example .env
  echo "Created apps/api/.env from .env.example"
fi

# Ensure JWT_SECRET is populated in .env if missing
if grep -q "replace-with-a-long-random-secret-at-least-32-chars" .env; then
  sed -i 's/replace-with-a-long-random-secret-at-least-32-chars/local-development-jwt-secret-key-at-least-32-chars/g' .env
fi

echo "Synchronizing Python dependencies and running migrations..."
if command -v uv &> /dev/null; then
  uv sync --extra dev
  uv run alembic upgrade head
  uv run python scripts/seed.py
else
  echo "uv not found, trying virtual environment..."
  if [ -d .venv ]; then
    source .venv/bin/activate
    python -m pip install -e .
    alembic upgrade head
    python scripts/seed.py
  else
    echo "Python virtual environment not found. Please install dependencies manually."
  fi
fi

cd ../..
echo "Local database started and seeded successfully!"
