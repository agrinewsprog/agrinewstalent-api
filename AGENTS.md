# AgriNews Talent API Agents

This repository uses a small set of specialized Codex agents and repo-local skills.

Core API rules:
- Treat `jobOfferId` as the canonical ID for normal offers.
- Treat `programOfferId` as the canonical ID for program offers.
- Treat `applicationId` as canonical only when paired with `source: "job" | "program"`.
- Treat `studentId`, `companyId`, and `universityId` as profile/business IDs.
- Treat `userId` as identity/auth only, never as the main API resource ID.
- Do not introduce new public contracts that expose ambiguous top-level `offerId`.
- Do not merge `JobApplication` and `ProgramApplication` in a response unless the response carries `source` and separate `jobOfferId` / `programOfferId`.
- Prefer one canonical endpoint per use case; mark alternates as legacy-compatible, not co-equal.
- Keep error shapes and pagination shapes consistent across modules.
- Do not break i18n-facing response keys, user-facing labels, or route/link conventions without checking the existing contract first.
- Do not build fragile manual links or route strings when a canonical route or shared helper already exists.

Recommended agents for this repo:
- `api-contract-guardian`: protect canonical endpoints, IDs, and response shapes.
- `job-program-boundary-agent`: protect the boundary between job and program flows.
- `rbac-profile-agent`: protect auth, ownership, and `userId -> profileId` resolution.
- `validation-serialization-agent`: protect DTOs, validation, error shapes, and serializers.

Default operating policy:
- Use repo skills implicitly whenever a task clearly matches a skill's purpose. Do not wait for an explicit user invocation.
- Prefer the minimum relevant set of skills. Combine multiple skills only when the task is clearly cross-cutting.
- Use specialized agents for complex, cross-module, or architecture-sensitive work.
- Do not use subagents for simple single-file or low-risk tasks.
- Use subagents only when delegation adds real value through specialization or parallel work, then integrate the result back into one coherent change.
- For complex tasks, briefly state which skills and agents are being applied.

Areas that should trigger skills and agents by default:
- Canonical data contracts, endpoint shapes, serializers, and pagination.
- ID normalization: `jobOfferId`, `programOfferId`, `applicationId`, `studentId`, `companyId`, `universityId`, and `userId`.
- Dashboards for company, student, and university.
- Offers, program offers, applications, and program applications.
- Profile flows, role resolution, and ownership checks.
- Uploads, logos, avatars, CV/files, and public asset URLs.
- Routes, links, and frontend-facing path conventions.
- i18n-sensitive payloads or labels that may affect the frontend contract.

How to choose repo help by area:
- Use `agrinewstalent-api-contracts` for canonical endpoint and response-shape work.
- Use `agrinewstalent-job-program-boundary` when a task may mix normal offers/applications with program offers/applications.
- Use `agrinewstalent-role-profile-resolution` for auth, profile ownership, and `userId -> profileId` resolution.
- Use `agrinewstalent-zod-http-standards` for DTOs, validation, and HTTP/error consistency.
- Use `agrinewstalent-dashboard-contracts` for dashboard payloads, summary blocks, and aggregate metrics.
- Escalate to `api-contract-guardian` when a task changes public contracts, IDs, or source-of-truth endpoints.
- Escalate to `job-program-boundary-agent` when a task affects both the job and program domains or risks mixing their data.
- Escalate to `rbac-profile-agent` when role boundaries or ownership checks are non-trivial.
- Escalate to `validation-serialization-agent` when the main risk is schema drift, serializer drift, or inconsistent API errors.

Agent files live in [.codex/agents](/C:/Users/agriNews%202025-2/Desktop/proyectotalent/agrinewstalent-api/.codex/agents).
Repo-local skills live in [.codex/skills](/C:/Users/agriNews%202025-2/Desktop/proyectotalent/agrinewstalent-api/.codex/skills).
