# Implementation Plan - Linko Shared API Contracts (Issue #16)

> Document for: agent or reviewer continuing Issue #16.
> Purpose: explain the implementation path for the shared API contract package and record what was completed in this PR.
> Read with: `temp/issue16/research.md`, `temp/issue16/fe-integration-guide.md`, and `packages/contracts/README.md`.
> Base branch: `develop`.

---

## 0. Goal

Create a shared contract package so TypeScript consumers can use backend API types and Zod schemas without guessing request or response fields.

The backend remains the source of truth:

```text
apps/api/app/schemas.py
  -> FastAPI OpenAPI schema
  -> packages/contracts/openapi.json
  -> Hey API generated TypeScript + Zod
  -> apps/web-app imports @linko/contracts
```

## 1. Scope

### In scope for Phase 1

- Add `packages/contracts` as `@linko/contracts`.
- Export deterministic OpenAPI from FastAPI.
- Generate TypeScript types and Zod schemas from committed `openapi.json`.
- Expose public onboarding/business contracts.
- Add Zod runtime tests, type-level tests, and OpenAPI drift check.
- Wire `@linko/contracts` as a workspace dependency of `@linko/web-app`.
- Document FE integration path without implementing FE hooks yet.

### Out of scope for Phase 1

- Rewriting backend validation from Pydantic to Zod.
- Adding TanStack Query, React Hook Form, or FE API hooks.
- Moving the existing onboarding UI branch into `apps/web-app`.
- Generating a full SDK/client layer.

## 2. Files Added or Changed

```text
apps/api/scripts/export_openapi.py
packages/contracts/
  README.md
  openapi.json
  openapi-ts.config.ts
  package.json
  src/businesses.ts
  src/common.ts
  src/generated/*
  src/index.ts
  src/businesses.test.ts
  tsconfig.json
  vitest.config.ts
apps/web-app/package.json
.github/workflows/ci.yml
.prettierignore
temp/issue16/
  implementation-plan.md
  research.md
  fe-integration-guide.md
```

## 3. Implementation Steps Completed

### Step 1 - OpenAPI export

Added `apps/api/scripts/export_openapi.py`.

The script imports `app.main:app`, renders `app.openapi()` with stable JSON settings, and supports:

```bash
uv run python scripts/export_openapi.py --output ../../packages/contracts/openapi.json
uv run python scripts/export_openapi.py --output ../../packages/contracts/openapi.json --check
```

### Step 2 - Contract package

Added `packages/contracts` with package name `@linko/contracts`.

Scripts:

```bash
pnpm --filter @linko/contracts generate
pnpm --filter @linko/contracts test
pnpm --filter @linko/contracts build
pnpm --filter @linko/contracts lint
```

### Step 3 - Code generation

Configured Hey API in `packages/contracts/openapi-ts.config.ts`.

Generated outputs live under:

```text
packages/contracts/src/generated/
```

Public exports are intentionally wrapped in:

```text
packages/contracts/src/businesses.ts
packages/contracts/src/common.ts
packages/contracts/src/index.ts
```

### Step 4 - Backend invariant preservation

`BusinessCreateSchema` adds a Zod `superRefine` for the Pydantic invariant that OpenAPI cannot fully represent: at least one `offers[]` or `needs[]` entry is required.

### Step 5 - Drift protection

`@linko/contracts:test` runs:

```bash
vitest run && pnpm run check:openapi
```

The drift check fails if backend schemas change but `packages/contracts/openapi.json` is not regenerated.

`.prettierignore` excludes `packages/contracts/openapi.json` so Prettier cannot reformat the generated schema and make the drift check fail.

### Step 6 - CI wiring

Updated `.github/workflows/ci.yml` to:

- run for PRs targeting `develop`;
- install Python 3.11;
- install `uv`;
- keep Nx affected lint/test/build as the gate.

## 4. Verification

Local commands run successfully:

```bash
pnpm install --frozen-lockfile
pnpm --filter @linko/contracts lint
pnpm --filter @linko/contracts test
pnpm --filter @linko/contracts build
pnpm exec nx affected -t lint --parallel=3 --base=origin/develop --head=HEAD
pnpm exec nx affected -t test --parallel=3 --base=origin/develop --head=HEAD
pnpm exec nx affected -t build --parallel=3 --base=origin/develop --head=HEAD
uv run --extra dev ruff check .
```

Backend verification with Docker:

```bash
docker run -d --rm --name linko-issue16-postgres -e POSTGRES_USER=linko -e POSTGRES_PASSWORD=linko -e POSTGRES_DB=linko -p 55432:5432 pgvector/pgvector:pg16
DATABASE_URL=postgresql+asyncpg://linko:linko@localhost:55432/linko ALEMBIC_DATABASE_URL=postgresql+psycopg://linko:linko@localhost:55432/linko uv run --extra dev alembic upgrade head
DATABASE_URL=postgresql+asyncpg://linko:linko@localhost:55432/linko ALEMBIC_DATABASE_URL=postgresql+psycopg://linko:linko@localhost:55432/linko uv run --extra dev pytest -q
```

Result:

- Contract tests: 8 passed.
- Backend pytest: 26 passed, 1 Starlette/httpx deprecation warning.
- CI Pipeline: success after the `openapi.json` formatting fix.
- CI Backend: success.

## 5. DoD Status

| Requirement                                     | Status | Evidence                               |
| ----------------------------------------------- | ------ | -------------------------------------- |
| `@linko/contracts` package exists               | Done   | `packages/contracts/package.json`      |
| Exports Zod schemas and inferred TS types       | Done   | `src/businesses.ts`, `src/common.ts`   |
| First domain covers onboarding/business profile | Done   | `POST /api/v1/businesses` mapping      |
| Drift test exists                               | Done   | `check:openapi`                        |
| Tests run through Nx                            | Done   | `nx affected -t test`                  |
| `web-app` can import package                    | Done   | `apps/web-app/package.json`            |
| Backend validation remains Pydantic             | Done   | no backend runtime rewrite             |
| FE integration guidance exists                  | Done   | `temp/issue16/fe-integration-guide.md` |

## 6. Future Work

- Move or reconcile the onboarding UI branch into `apps/web-app` if the team keeps that monorepo convention.
- Add FE API wrapper and response guards.
- Add TanStack Query and React Hook Form integration if the FE team chooses that stack.
- Consider enabling Hey API SDK or TanStack plugins after the FE API layer is ready.
