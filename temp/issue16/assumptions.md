# Assumptions

- The implementation starts from `origin/develop`.
- The current public onboarding endpoint is `POST /api/v1/businesses`.
- Backend Pydantic/FastAPI schemas in `apps/api/app/schemas.py` are the source of truth.
- FastAPI exports OpenAPI 3.1 and Hey API is used for TypeScript and Zod generation.
- The frontend branch has not been moved into `apps/web-app`; frontend hook integration is out of Phase 1.
- `NeedCreate` currently has the same request shape as `OfferCreate`.
