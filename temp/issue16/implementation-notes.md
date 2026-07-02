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
```

## Verification Results

- `@linko/contracts` lint: passed.
- `@linko/contracts` test: passed, 8 Vitest tests plus OpenAPI drift check.
- `@linko/contracts` build: passed.
- Nx run-many test: passed for `@linko/core-utils`, `@linko/contracts`, and `@linko/web-app`.
- Nx run-many build: passed for all three projects.
- Nx run-many lint: passed after formatting existing `packages/core-utils/index.js`.
- Backend `ruff check .`: passed via `uv run --extra dev ruff check .`.

## Notes

- Local package scripts require `uv` on `PATH`; CI installs it before Nx targets.
- Backend pytest requires a running Postgres service. Docker Desktop was not reachable in this local session (`docker info` could not connect to `dockerDesktopLinuxEngine`), so full backend integration tests were not rerun here.
