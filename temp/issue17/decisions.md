# Decisions - Issue #17

| Topic            | Decision                                                  | Reason                                                           |
| ---------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| Auth storage     | Add `accounts` in migration `0003`                        | Keeps auth separate from `persons` while allowing a person link. |
| Email uniqueness | Unique index on `lower(email)`                            | Enforces case-insensitive uniqueness at DB level.                |
| Email lookup     | Normalize lowercase/trim before login query               | Makes login behavior match signup and DB constraint.             |
| JWT config       | No runtime default for `JWT_SECRET`; min 32 chars         | Fail-secure and avoids weak shared signing keys.                 |
| Logout           | Stateless MVP                                             | Refresh/cookie/session revocation is post-MVP.                   |
| Authorization    | `owner` and `authorized_rep` can access scoped resources  | Matches current role model without adding RBAC tables.           |
| Deletes          | Soft delete business, offer, need, person                 | Preserves data for later audit/matching history.                 |
| FE source        | Document `apps/src` on `feature/onboarding-ui`            | `apps/web-app` on `develop` is not the real UI branch.           |
| Reference labels | API returns label/code; FE renders label and submits code | Prevents drift between hardcoded FE dropdowns and backend enums. |
