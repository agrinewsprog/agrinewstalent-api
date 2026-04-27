---
name: agrinewstalent-zod-http-standards
description: Standardize Zod DTOs, validation flow, HTTP status codes, and error serialization in the AgriNews Talent API. Use when changing controllers, DTOs, middlewares, uploads, or any endpoint whose errors or payload validation need to stay consistent across modules.
---

# AgriNews Zod and HTTP Standards

Use this skill to normalize request validation and response errors.

Rules for this repo:
- Prefer DTO validation via shared middleware over ad hoc controller parsing.
- Keep one error envelope shape for API errors whenever possible.
- Keep one pagination shape for list endpoints.
- Be explicit about `400` vs `409` vs `422`.
- Do not let the same entity serialize differently across endpoints without a contract reason.

Recommended error split:
- `400`: malformed params/query/body or semantic bad request
- `401`: unauthenticated
- `403`: authenticated but forbidden
- `404`: resource not found
- `409`: duplicate or conflicting state
- `422`: well-formed payload that fails business validation rules, only if used consistently

Required review points:
1. Is validation happening before service logic?
2. Are transformed values written back consistently?
3. Does the controller return the same error envelope used elsewhere?
4. Are nullability and optionality stable for frontend consumers?

Best fit in this repo:
- `src/common/middlewares/validate.middleware.ts`
- `src/common/middlewares/error.middleware.ts`
- all `*.dto.ts`
- uploads/logos and profile update endpoints
