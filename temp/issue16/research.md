# Research - Linko Shared API Contracts (Issue #16)

> This file records the reasoning behind the Issue #16 implementation. It replaces the older split notes for assumptions, decisions, and open questions.

---

## 1. Repo Facts Verified

| Area                                | Finding                                                   |
| ----------------------------------- | --------------------------------------------------------- |
| Backend framework                   | FastAPI with Pydantic v2                                  |
| Backend source of truth             | `apps/api/app/schemas.py`                                 |
| OpenAPI version                     | FastAPI emits OpenAPI 3.1                                 |
| Current public domain endpoint      | `POST /api/v1/businesses`                                 |
| Current success schemas             | `BusinessCreate`, `BusinessResponse`                      |
| Current related schemas             | `OfferCreate`, `NeedCreate`, `PersonCreate`               |
| Runtime error shape                 | RFC 9457-style `application/problem+json`                 |
| Monorepo package convention         | packages live under `packages/*` and use `@linko/*` names |
| FE package available in this branch | `apps/web-app`                                            |

## 2. Decision: Track A, Generate From OpenAPI

Issue #16 is about preventing frontend/backend field drift. The safest source of truth is the backend Pydantic schema exposed through FastAPI OpenAPI.

Chosen path:

```text
Pydantic/FastAPI -> OpenAPI -> Hey API -> TypeScript + Zod
```

Why this path:

- It avoids hand-writing the same contract twice.
- It keeps backend validation in Python/Pydantic.
- It gives FE both compile-time types and runtime Zod guards.
- It makes API changes reviewable through `packages/contracts/openapi.json`.
- It supports drift checking in CI without running uvicorn or Postgres in the Node/Nx job.

Alternative rejected:

| Option                                | Why not selected                                           |
| ------------------------------------- | ---------------------------------------------------------- |
| Hand-written Zod only                 | Creates a second source of truth and will drift over time. |
| Type-only generation                  | Does not meet the TS + Zod contract goal.                  |
| Full SDK/client generation in Phase 1 | Larger FE integration scope than Issue #16 needs.          |
| Backend Zod validation                | Not applicable because the backend is Python.              |

## 3. Decision: Package Location and Name

Chosen package:

```text
packages/contracts
```

Package name:

```text
@linko/contracts
```

Reasoning:

- Matches existing `packages/*` workspace convention.
- Avoids creating a new root `shared/` tree.
- Lets FE depend on it with `workspace:*`.

## 4. Decision: Commit Static `openapi.json`

The PR commits:

```text
packages/contracts/openapi.json
```

Reasoning:

- Reviewers can inspect API contract diffs.
- Code generation is deterministic.
- Nx test can fail if the backend schema and committed contract drift.
- The Node CI job does not need a running backend server.

Important follow-up from CI failure:

- Prettier reformatted `openapi.json` during commit.
- The drift check compares exact bytes from `json.dumps(..., indent=2, sort_keys=True)`.
- Fix: exclude `packages/contracts/openapi.json` in `.prettierignore`.

## 5. Decision: Public Wrappers Around Generated Files

Generated files are intentionally not the main API surface.

Public imports should come from:

```ts
import {
  BusinessCreateSchema,
  BusinessResponseSchema,
  ProblemDetailSchema,
  type BusinessCreate,
  type BusinessResponse,
  type ProblemDetail,
} from '@linko/contracts';
```

Reasoning:

- Generated names can change when the codegen tool changes.
- Public wrappers can preserve backend invariants that OpenAPI cannot represent.
- FE code should have a stable import path.

## 6. Business Contract Mapping

| Backend endpoint          | Request contract                         | Response contract                            |
| ------------------------- | ---------------------------------------- | -------------------------------------------- |
| `POST /api/v1/businesses` | `BusinessCreateSchema`, `BusinessCreate` | `BusinessResponseSchema`, `BusinessResponse` |

Related contracts:

| Domain object    | Contract exports                       |
| ---------------- | -------------------------------------- |
| Offer            | `OfferCreateSchema`, `OfferCreate`     |
| Need             | `NeedCreateSchema`, `NeedCreate`       |
| Contact person   | `PersonCreateSchema`, `PersonCreate`   |
| Problem response | `ProblemDetailSchema`, `ProblemDetail` |

## 7. Known Backend Invariant

`BusinessCreate` requires:

- `name`
- `industry_l1`
- `province`
- at least one entry in `offers[]` or `needs[]`

FastAPI OpenAPI exposes required object fields, but it does not fully encode the cross-field validator requiring at least one offer or need.

Therefore `BusinessCreateSchema` adds:

```ts
zBusinessCreate.superRefine(...)
```

This keeps frontend validation aligned with the Pydantic model validator.

## 8. Problem Detail Research

Backend runtime errors use Problem Detail shape:

```ts
{
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errors?: Array<BusinessErrorItem | ValidationErrorItem>;
}
```

There are two observed item families:

```ts
{ code: string; field: string; value?: unknown | null; message: string }
{ field: string; message: string; type: string; context?: Record<string, string> }
```

The contract package defines this manually in `src/common.ts` because these runtime exception handlers are broader than one endpoint's success OpenAPI schema.

## 9. Assumptions Carried Forward

- `develop` is the correct base branch for Issue #16.
- `POST /api/v1/businesses` is the first and only Phase 1 endpoint.
- `NeedCreate` currently mirrors `OfferCreate`.
- FE hook integration is Phase 2, not part of this PR.
- The existing onboarding UI work still needs team alignment with `apps/web-app`.
- CI should install `uv` before Nx test targets because `@linko/contracts:test` runs the OpenAPI drift check.

## 10. Open Questions

| Question                                                         | Owner / phase                |
| ---------------------------------------------------------------- | ---------------------------- |
| Should the onboarding UI branch be moved into `apps/web-app`?    | FE / repo structure          |
| Should FE use TanStack Query, plain fetch, or another API layer? | FE integration phase         |
| Should Hey API SDK or TanStack Query plugins be enabled later?   | After FE API layer is chosen |
| Should response guards run in production or dev/test only?       | FE product decision          |
| Should FE send `Idempotency-Key` for onboarding submit?          | FE/API coordination          |
