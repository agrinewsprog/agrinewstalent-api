---
name: agrinewstalent-role-profile-resolution
description: Normalize role-based access and profile ID resolution in the AgriNews Talent API. Use when touching auth, me endpoints, company/student/university profile lookups, ownership checks, or any code that maps userId to business profile IDs.
---

# AgriNews Role and Profile Resolution

Use this skill to keep auth identity separate from business identity.

Core rules:
- `userId` is auth identity.
- `studentId` is `StudentProfile.id`.
- `companyId` is `CompanyProfile.id`.
- `universityId` is `UniversityProfile.id`.
- Do not expose `userId` as the primary resource ID for student/company/university APIs.
- Do not accept both `userId` and profile ID for the same public endpoint unless it is explicitly legacy behavior.

Ownership guidance:
- Company-owned resources should resolve `companyId` from the authenticated user.
- Student-owned resources should resolve `studentId` from the authenticated user.
- University-owned resources should resolve `universityId` from the authenticated user.

Best fit in this repo:
- `src/modules/auth`
- `src/modules/companies`
- `src/modules/students`
- `src/modules/universities`
- `src/common/middlewares/auth.middleware.ts`
- `src/common/middlewares/role.middleware.ts`

When reviewing:
1. Identify the actor role.
2. Identify the business profile ID.
3. Check ownership enforcement.
4. Check whether the response leaks the wrong ID as canonical.
