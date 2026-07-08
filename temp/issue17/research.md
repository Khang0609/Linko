# Research - Issue #17 Backend API

## Existing Backend Shape

- FastAPI app lives in `apps/api/app`.
- Pydantic DTOs are centralized in `apps/api/app/schemas.py`.
- SQLAlchemy models are centralized in `apps/api/app/models.py`.
- Migrations use Alembic under `apps/api/alembic/versions`.
- Issue #16 added `packages/contracts` and a deterministic OpenAPI export script.

## Auth Decisions

- Password hashing uses Argon2id through `argon2-cffi`.
- Access tokens use PyJWT HS256 with 30-minute expiry.
- `JWT_SECRET` is required and must be at least 32 characters.
- Email normalization is applied at schema validation and again in auth service code.
- Login lookup uses `func.lower(Account.email) == normalized_email`.
- Database uniqueness uses a Postgres unique index on `lower(email)`.

## Authorization Decisions

- Business ownership is represented by `accounts.person_id -> business_persons.person_id`.
- Owner and authorized representative roles can access business-scoped resources.
- Anonymous requests return `401`; authenticated non-owners return `403`.
- Missing business/resource returns `404`.

## Reference Data Decisions

- Keep current Issue #7 taxonomy: 12 level-1 industries, 18 level-2 industries, 8 intent types, and 12 certifications.
- Add public reference endpoints so FE no longer hardcodes dropdown options.
- `/reference/enums` exposes backend enum codes for legal type, business stage, employee range, and revenue range.

## Contracts Decisions

- Backend Pydantic/OpenAPI remains the source of truth.
- `packages/contracts/openapi.json` is committed and drift-checked.
- Public wrappers export friendly schemas such as `AccountCreateSchema`, `BusinessDetailResponseSchema`, and
  `ReferenceEnumsResponseSchema`.
