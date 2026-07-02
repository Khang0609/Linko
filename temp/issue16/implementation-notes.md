# Implementation Notes

## Implemented

- Added `apps/api/scripts/export_openapi.py` to export `app.openapi()` into a deterministic static schema file.
- Added `packages/contracts` as `@linko/contracts`.
- Added Hey API code generation from `packages/contracts/openapi.json` into `packages/contracts/src/generated/`.
- Added public onboarding exports in `packages/contracts/src/businesses.ts`.
- Added shared RFC 9457 Problem Detail schemas in `packages/contracts/src/common.ts`.
- Added runtime/type/drift tests in `packages/contracts/src/businesses.test.ts`.
- Added `@linko/contracts` as a workspace dependency of `@linko/web-app`.
- Updated `.github/workflows/ci.yml` to run on PRs into `develop` and install `uv` before Nx test targets.

## Commands Run

```bash
pnpm install --lockfile-only
uv sync --frozen --extra dev
uv run python scripts/export_openapi.py --output ../../packages/contracts/openapi.json
pnpm install --frozen-lockfile
pnpm --filter @linko/contracts generate
pnpm --filter @linko/contracts lint
pnpm --filter @linko/contracts test
pnpm --filter @linko/contracts build
pnpm exec nx run-many -t lint --parallel=3
pnpm exec nx run-many -t test --parallel=3
pnpm exec nx run-many -t build --parallel=3
uv run --extra dev ruff check .
docker info --format '{{.ServerVersion}}'
docker run -d --rm --name linko-issue16-postgres -e POSTGRES_USER=linko -e POSTGRES_PASSWORD=linko -e POSTGRES_DB=linko -p 55432:5432 pgvector/pgvector:pg16
DATABASE_URL=postgresql+asyncpg://linko:linko@localhost:55432/linko ALEMBIC_DATABASE_URL=postgresql+psycopg://linko:linko@localhost:55432/linko uv run --extra dev alembic upgrade head
DATABASE_URL=postgresql+asyncpg://linko:linko@localhost:55432/linko ALEMBIC_DATABASE_URL=postgresql+psycopg://linko:linko@localhost:55432/linko uv run --extra dev pytest -q
```

## Verification Results

- `@linko/contracts` lint: passed.
- `@linko/contracts` test: passed, 8 Vitest tests plus OpenAPI drift check.
- `@linko/contracts` build: passed.
- Nx run-many test: passed for `@linko/core-utils`, `@linko/contracts`, and `@linko/web-app`.
- Nx run-many build: passed for all three projects.
- Nx run-many lint: passed after formatting existing `packages/core-utils/index.js`.
- Backend `ruff check .`: passed via `uv run --extra dev ruff check .`.
- Backend Alembic migration: passed against an isolated Postgres test container on `localhost:55432`.
- Backend pytest: passed, 26 tests with 1 Starlette/httpx deprecation warning.

## Notes

- Local package scripts require `uv` on `PATH`; CI installs it before Nx targets.
- The default local `5432` port was occupied by an unrelated `linko-postgres` container whose password did not match repo defaults, so backend tests used a separate throwaway container on `55432`.
