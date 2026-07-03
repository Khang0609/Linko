# Implementation Plan - Issue #17 Backend API for FE Integration

## Goal

Implement the backend surface FE needs after Issue #16 shared contracts:

- Auth endpoints with account storage and bearer JWTs.
- Owner-scoped CRUD for businesses, offers, needs, and people.
- Public reference data endpoints for dropdowns.
- CORS for the local Vite FE origin.
- Regenerated `@linko/contracts` from FastAPI OpenAPI.

## Branching

- Base branch: `develop`.
- Working branch: `feat/issue-17-backend-api`.
- Issue #16 must be merged before this work so `packages/contracts` is available.

## Scope

Backend only. The real frontend integration happens later on branch `feature/onboarding-ui`, where the app source is
`apps/src`. The empty `apps/web-app` on `develop` is not the implementation target.

## Implemented Steps

1. Added migration `0003_accounts` with `accounts`, `person_id`, `last_login_at`, and unique index on `lower(email)`.
2. Added auth schemas, security helpers, Argon2id password hashing, HS256 JWT creation/validation, and fail-secure
   `JWT_SECRET` settings.
3. Added `/api/v1/auth/signup`, `/login`, `/logout`, and `/me`.
4. Required auth on `POST /api/v1/businesses`; first business links `accounts.person_id` to an owner person and
   creates `business_persons.role = 'owner'`.
5. Added `GET/PATCH/DELETE /api/v1/businesses/{business_id}` with owner/authorized representative checks.
6. Added offer, need, and person CRUD routes with soft delete.
7. Added public reference routes for industries, intent types, certifications, and enums.
8. Added CORS allow-list for `http://localhost:5173`.
9. Regenerated OpenAPI and Hey API generated TypeScript/Zod contracts.
10. Added backend and contract regression tests.

## Out of Scope

- Refresh tokens, cookie sessions, forgot password, OTP, and rate limit policy.
- Actual FE code changes in `feature/onboarding-ui`.
- Taxonomy changes beyond the current Issue #7 reference data.
