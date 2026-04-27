---
name: agrinewstalent-dashboard-contracts
description: Stabilize dashboard response contracts for company, student, and university views in the AgriNews Talent API. Use when working on summary metrics, recent activity lists, candidate widgets, or any dashboard payload that mixes normal and program flows.
---

# AgriNews Dashboard Contracts

Use this skill for dashboard payloads only.

Dashboard rules for this repo:
- Use predictable top-level blocks:
  - `summary`
  - `recentApplications`
  - `activeJobOffers`
  - `activeProgramOffers`
  - `pagination` only when the dashboard really paginates
- Avoid flat metric dumping when metrics belong to distinct sections.
- Never double count program-related data because it appears in both job and program tables.
- Any application item shown in a dashboard must carry:
  - `applicationId`
  - `source`
  - `status`
  - `appliedAt`
  - `offer.jobOfferId`
  - `offer.programOfferId`

Best fit in this repo:
- `src/modules/companies/companies.service.ts`
- `src/modules/students/students.service.ts`
- `src/modules/universities/universities.service.ts`
- supporting repository metrics

When reviewing:
1. Validate metric definitions.
2. Validate de-duplication.
3. Validate recent-item shapes.
4. Validate whether the frontend can render without guessing IDs.
