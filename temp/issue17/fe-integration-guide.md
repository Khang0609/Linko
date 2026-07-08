# FE Integration Guide - Issue #17 Backend API

## Real FE Location

The real onboarding UI is on branch `feature/onboarding-ui` under:

```text
apps/src
```

Do not use `apps/web-app` from `develop` as the integration target for this issue; it is not the active FE source.

## Auth Flow

Use the backend auth endpoints:

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

Signup and login accept:

```json
{ "email": "test@example.com", "password": "Password123!" }
```

The API normalizes email case on signup and login. Store the returned `access_token` client-side for MVP and send:

```http
Authorization: Bearer <access_token>
```

## Business Submit Flow

`POST /api/v1/businesses` is now authenticated. For the first business, include `persons[0]` so the backend can link the
account to an owner contact:

```json
{
  "name": "Nam Phuc Foods",
  "industry_l1": "san_xuat_che_bien",
  "province": "TP.HCM",
  "offers": [{ "intent_type": "find_buyer", "title": "Wholesale fish sauce" }],
  "persons": [{ "full_name": "Nguyen Van Nam", "role": "owner" }]
}
```

After creation, `GET /api/v1/auth/me` returns owned businesses for the account.

## Dropdown Integration

The heaviest FE task is replacing hardcoded English dropdowns with Reference Data API calls.

Use:

- `GET /api/v1/reference/industries?level=1`
- `GET /api/v1/reference/industries?parent=ban_buon_ban_le`
- `GET /api/v1/reference/intent-types`
- `GET /api/v1/reference/certifications`
- `GET /api/v1/reference/enums`

Render the label to users, but submit backend codes. Examples:

| UI meaning                | Submit code         |
| ------------------------- | ------------------- |
| Cong ty TNHH 1 thanh vien | `cong_ty_tnhh_1tv`  |
| Find supplier             | `find_supplier`     |
| San xuat & che bien       | `san_xuat_che_bien` |

For industries, level 2 options should depend on the selected level 1 parent code.

## Shared Contracts

Import from package root only:

```ts
import {
  AccountCreateSchema,
  BusinessCreateSchema,
  BusinessDetailResponseSchema,
  ReferenceEnumsResponseSchema,
  type AuthMeResponse,
} from '@linko/contracts';
```

Avoid importing generated internals directly. If a schema is missing from the public wrapper, add it to
`packages/contracts/src/*.ts` instead of copying local FE types.

## FE Progress Report Checklist

| Area                                                | Status      | Notes                                          |
| --------------------------------------------------- | ----------- | ---------------------------------------------- |
| Auth token storage and `Authorization` header       | Not started | Use login/signup response token.               |
| Business submit uses `BusinessCreateSchema`         | Not started | Keep at least one offer or need.               |
| Hardcoded legal type dropdown replaced              | Not started | Use `/reference/enums`.                        |
| Hardcoded intent dropdown replaced                  | Not started | Use `/reference/intent-types`.                 |
| Hardcoded industry dropdown replaced                | Not started | Use `/reference/industries`, parent-driven L2. |
| Vietnamese labels rendered, backend codes submitted | Not started | Do not submit display labels.                  |
| `/auth/me` drives owner business list               | Not started | Useful after signup/create.                    |
