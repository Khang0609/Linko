# Decisions

- Use Track A: generate contracts from FastAPI OpenAPI instead of hand-writing TypeScript/Zod as a separate source of truth.
- Add `packages/contracts` as `@linko/contracts` to match the monorepo package convention.
- Commit a static `packages/contracts/openapi.json` so contract changes are reviewable in diffs.
- Keep backend runtime validation in Pydantic; Zod is only for TypeScript consumers and contract tests.
- Keep Problem Detail schemas hand-authored in `src/common.ts` because backend error handlers define runtime problem shapes outside the endpoint success schema.
- Leave TanStack Query/react-hook-form/frontend adapters for a later phase.
