# FE Integration Guide - `@linko/contracts` (Issue #16)

> Audience: frontend implementers integrating the business onboarding flow.
> Goal: show exactly how to consume the new shared contracts and how to report FE integration progress.

---

## 1. Current Status

This PR completes the contract package only. It does not implement frontend hooks or form wiring.

What is available now:

- `@linko/contracts` workspace dependency is added to `apps/web-app/package.json`.
- Public TS types and Zod schemas are exported from `@linko/contracts`.
- The first supported endpoint is `POST /api/v1/businesses`.
- Problem Detail error schemas are available for API error parsing.

## 2. Recommended Import Surface

Use the package root:

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

Avoid importing directly from:

```text
@linko/contracts/dist/generated/*
@linko/contracts/src/generated/*
```

Generated files are implementation details. Public wrappers in `src/businesses.ts` and `src/common.ts` are the stable contract surface.

## 3. Endpoint Contract

| API                       | Request          | Success response   | Error response  |
| ------------------------- | ---------------- | ------------------ | --------------- |
| `POST /api/v1/businesses` | `BusinessCreate` | `BusinessResponse` | `ProblemDetail` |

Required request fields:

- `name`
- `industry_l1`
- `province`
- at least one item in `offers[]` or `needs[]`

Required offer/need fields:

- `intent_type`
- `title`

## 4. Minimal Fetch Integration

```ts
import {
  BusinessCreateSchema,
  BusinessResponseSchema,
  ProblemDetailSchema,
  type BusinessCreate,
  type BusinessResponse,
  type ProblemDetail,
} from '@linko/contracts';

export async function createBusiness(input: BusinessCreate): Promise<BusinessResponse> {
  const body = BusinessCreateSchema.parse(input);

  const response = await fetch('/api/v1/businesses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const json: unknown = await response.json();

  if (!response.ok) {
    const problem: ProblemDetail = ProblemDetailSchema.parse(json);
    throw problem;
  }

  return BusinessResponseSchema.parse(json);
}
```

## 5. Form Validation Integration

If the FE stack adopts React Hook Form and `@hookform/resolvers`, use the shared schema as the form resolver source:

```ts
import { zodResolver } from '@hookform/resolvers/zod';
import { BusinessCreateSchema, type BusinessCreate } from '@linko/contracts';

const form = useForm<BusinessCreate>({
  resolver: zodResolver(BusinessCreateSchema),
});
```

Until React Hook Form is adopted, validate at submit boundary:

```ts
const parsed = BusinessCreateSchema.safeParse(draftPayload);

if (!parsed.success) {
  // Map parsed.error.issues to the FE field error state.
  return;
}

await createBusiness(parsed.data);
```

## 6. TanStack Query Integration Path

When the FE stack adopts TanStack Query:

```ts
import { useMutation } from '@tanstack/react-query';
import { type BusinessCreate } from '@linko/contracts';

export function useCreateBusiness() {
  return useMutation({
    mutationFn: (input: BusinessCreate) => createBusiness(input),
  });
}
```

Recommended UI states:

| State                          | FE behavior                                                  |
| ------------------------------ | ------------------------------------------------------------ |
| `isPending`                    | Disable submit button to prevent double submit.              |
| success                        | Route to confirmation/profile page using `BusinessResponse`. |
| `ProblemDetail.status === 422` | Render field-level validation errors from `errors[]`.        |
| `ProblemDetail.status === 409` | Render duplicate/conflict message and allow user correction. |
| parse failure                  | Log contract mismatch and show generic retry message.        |

## 7. Error Rendering Guide

`ProblemDetailSchema` supports two item shapes:

```ts
type BusinessErrorItem = {
  code: string;
  field: string;
  value?: unknown | null;
  message: string;
};

type ValidationErrorItem = {
  field: string;
  message: string;
  type: string;
  context?: Record<string, string>;
};
```

Recommended mapping:

- Use `field` to attach errors to form fields when possible.
- Use `message` as the user-visible field message.
- Use `code` for business-specific branching when present.
- Fall back to `ProblemDetail.detail` for a page-level error.

## 8. Idempotency and Double Submit

Current team direction: FE can prevent normal duplicate submits by disabling the submit button while the mutation is pending.

Server-side idempotency still exists as a safety layer. If FE later sends an `Idempotency-Key`, generate one per logical submit attempt and reuse it only for retries of the same payload.

## 9. Response Guard Policy

Recommended default:

- Always validate request payloads before submit.
- Validate response payloads in development, test, and CI.
- In production, either keep validation enabled or log parse failures through the FE telemetry path.

If production response validation is disabled for performance, keep the TypeScript types and test coverage in place.

## 10. FE Progress Report Checklist

Use this section when reporting frontend integration progress for Issue #16 follow-up work.

| Item                                                     | Status      | Notes                                        |
| -------------------------------------------------------- | ----------- | -------------------------------------------- |
| `@linko/contracts` imported from package root            | Not started | Replace local guessed API types.             |
| Business onboarding submit uses `BusinessCreate`         | Not started | Request shape should come from contract.     |
| Submit boundary validates with `BusinessCreateSchema`    | Not started | Use `parse` or `safeParse`.                  |
| Success response validates with `BusinessResponseSchema` | Not started | Guard API boundary.                          |
| API errors parse with `ProblemDetailSchema`              | Not started | Render field and page errors.                |
| Duplicate submit is blocked while pending                | Not started | Disable submit button.                       |
| Tests cover one valid submit payload                     | Not started | Can be unit or component-level.              |
| Tests cover one invalid payload                          | Not started | Missing `offers` and `needs` is a good case. |

## 11. FE Integration Risks

| Risk                                       | Mitigation                                                       |
| ------------------------------------------ | ---------------------------------------------------------------- |
| FE imports generated internals             | Import only from `@linko/contracts`.                             |
| Local FE types drift from backend          | Delete local duplicates and use exported types.                  |
| Runtime API response differs from contract | Use `BusinessResponseSchema.parse` at the boundary.              |
| Problem responses rendered inconsistently  | Centralize `ProblemDetail` parsing in the API wrapper.           |
| Onboarding UI package location mismatch    | Align the UI branch with `apps/web-app` before deep integration. |
