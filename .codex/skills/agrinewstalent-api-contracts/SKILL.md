---
name: agrinewstalent-api-contracts
description: Define, review, and enforce canonical API contracts for the AgriNews Talent backend. Use when working on Express/Prisma endpoints in this repo that expose offers, applications, dashboards, profiles, or cross-role list views, especially when there is risk around ambiguous IDs, duplicate endpoints, or inconsistent response shapes.
---

# AgriNews Talent API Contracts

Use this skill to stabilize public API contracts before changing implementation details.

Core contract rules:
- Use `jobOfferId` for normal offers.
- Use `programOfferId` for program offers.
- Use `applicationId` only together with `source`.
- Use `studentId`, `companyId`, and `universityId` as business IDs.
- Keep `userId` for auth identity only.
- Avoid ambiguous top-level `offerId` in new public contracts.

Canonical response guidance:
- Prefer nested blocks over overloaded flat fields:
  - `offer`
  - `program`
  - `company`
  - `candidate`
  - `summary`
  - `pagination`
- For mixed application lists, always include:
  - `applicationId`
  - `source`
  - `status`
  - `appliedAt`
  - `offer.jobOfferId`
  - `offer.programOfferId`

Canonical endpoint guidance:
- Pick one source-of-truth endpoint per use case.
- Treat alternatives as legacy-compatible, not equal.
- If a path parameter is named `:offerId` but semantically means `jobOfferId`, call that out and keep the contract explicit.

When reviewing or designing a contract, answer in this order:
1. Canonical endpoint
2. Canonical ID
3. Required fields
4. Optional/context fields
5. Legacy noise to deprecate

Best fit in this repo:
- `companies/me/dashboard`
- `offers/companies/me`
- `companies/me/offers/:offerId/applications`
- `companies/me/programs/:programId/offers/:programOfferId/applications`
- `applications/students/me`
- `students/me/programs/*`
- `universities/me/programs/:programId`
