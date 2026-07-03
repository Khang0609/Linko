# Verification - Issue #17

## Backend

Commands run from `apps/api` with:

```powershell
$env:JWT_SECRET='test-only-jwt-secret-with-32-characters'
$env:DATABASE_URL='postgresql+asyncpg://postgres:postgres@localhost:5432/linko_issue17'
$env:ALEMBIC_DATABASE_URL='postgresql+psycopg://postgres:postgres@localhost:5432/linko_issue17'
```

Results:

- `uv run ruff check .` -> passed.
- `uv run alembic upgrade head` -> passed on fresh `linko_issue17`.
- `uv run pytest -q` -> `38 passed, 1 warning`.

The local Docker container available during verification was `linko-postgres` using `postgres/postgres`, so a separate
database named `linko_issue17` was created for this run.

## Contracts

Commands run from repo root:

- `pnpm --filter @linko/contracts generate` -> passed.
- `pnpm --filter @linko/contracts test` -> passed; includes OpenAPI drift check.
- `pnpm --filter @linko/contracts lint` -> passed.
- `pnpm --filter @linko/contracts build` -> passed.
- `pnpm exec nx affected -t lint test build --parallel=3 --uncommitted` with `NX_DAEMON=false` and `NX_NO_CLOUD=true`
  -> passed for `@linko/contracts`, `@linko/web-app`, and dependent `@linko/core-utils:build`.

## Endpoint Coverage

- Auth: signup/login/logout/me.
- Case-insensitive email login and duplicate email conflict.
- Password hash not plaintext.
- Invalid and expired token return `401`.
- Business owner creation, `/auth/me`, owner update/delete, other-account `403`, anonymous `401`.
- Offer, need, and person CRUD with soft delete.
- Reference counts: 12 level-1 industries, 18 level-2 industries, 10 children under `ban_buon_ban_le`, 8 intent types,
  12 certifications.
- CORS preflight from `http://localhost:5173`.
