---
name: agrinewstalent-job-program-boundary
description: Protect the boundary between JobOffer/JobApplication and ProgramOffer/ProgramApplication in the AgriNews Talent API. Use when working on applications, dashboards, program offers, candidate lists, or any endpoint that risks merging or double-counting job and program data.
---

# AgriNews Job/Program Boundary

Use this skill whenever a change touches both normal and program flows.

Repo-specific rules:
- Treat `JobOffer` and `ProgramOffer` as separate API-facing resources.
- Treat `JobApplication` and `ProgramApplication` as separate sources of truth.
- If a response merges both, include `source` and distinct IDs.
- Do not silently fallback from `programOfferId` to `jobOfferId` in public contracts.
- Do not double count job-linked program data in dashboards.

What to check first:
1. Which table is the source of truth for the use case?
2. Is a bridge to the other table actually required?
3. Are IDs explicit enough for the frontend?
4. Is the same real-world event appearing twice in metrics or lists?

Best fit in this repo:
- `src/modules/applications`
- `src/modules/programs`
- `src/modules/students`
- `src/modules/companies`
- merged dashboard responses

When reviewing code:
- Flag duplicate list items.
- Flag double-counted metrics.
- Flag update flows that can hit both application tables.
- Flag endpoints that return job and program records under the same unqualified `offerId`.
