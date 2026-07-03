# @linko/contracts

Shared TypeScript types and Zod schemas for Linko API boundaries.

Backend Pydantic/FastAPI schemas remain the source of truth. This package commits a static `openapi.json`, then generates TypeScript and Zod artifacts from it with Hey API.

## Commands

```bash
pnpm --filter @linko/contracts generate
pnpm --filter @linko/contracts test
pnpm --filter @linko/contracts build
```

## Endpoint Mapping

| API endpoint              | Backend schema                         | Contract exports                                                                       |
| ------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `POST /api/v1/businesses` | `BusinessCreate` -> `BusinessResponse` | `BusinessCreateSchema`, `BusinessCreate`, `BusinessResponseSchema`, `BusinessResponse` |
| Problem responses         | `ProblemDetail`                        | `ProblemDetailSchema`, `ProblemDetail`                                                 |

## Notes

- The first supported domain is onboarding/business profile creation.
- `NeedCreate` currently mirrors `OfferCreate` in the backend.
- Frontend hooks and TanStack Query integration are intentionally left for a later phase.
