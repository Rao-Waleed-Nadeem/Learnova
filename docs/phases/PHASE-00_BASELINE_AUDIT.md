# Phase 0 — Baseline and Contract Preparation (Audit Only)

**Phase status before start:** NOT STARTED  
**Implementation permission:** NONE — this phase is strictly audit-only.  
**Primary source:** `Learnova_Master_Backend_Implementation_Blueprint.md`, Section 10, Phase 0.  
**Related rules:** `AGENT_OPERATING_RULES.md`.

## Objective

Establish an evidence-based snapshot of what currently works in the Learnova repository before backend implementation. Identify actual frontend behavior, current backend/Express responsibilities, Docker/PostgreSQL behavior, routes, storage, types, and requirement-to-implementation coverage.

## Mandatory source reading

Read:
- `docs/sources/Learnova_SRS_Final_Aligned_V2.docx`
- `docs/sources/Learnova_Final_SSDs_V2.xml`
- `docs/sources/Readme.md`
- `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md`
- Current repository `agent-prompt.md`, frontend README, Docker repair guide, Compose files, backend and frontend source.

Use source terminology. Do not silently reconcile contradictions. Record them as questions.

## Strict prohibition

Do not modify, create, rename, or delete application source/configuration files in this phase. Do not install dependencies, run formatters that write files, run migrations, seed data, reset databases, or alter Docker volumes. You may create only the Phase 0 evidence/report files under `docs/antigravity-bible/phase-records/PHASE-00/` and the three project control documents explicitly required below (`API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`) after listing the intended report files in the audit plan. If a control document already exists, inspect and update only with owner approval.

## Audit work

### A. Repository and environment baseline
- Record branch, commit, working-tree status, repository tree relevant to frontend/backend/Docker.
- Record installed/runtime versions and available scripts.
- Do not overwrite or clean existing user changes.
- Record exact commands, exit codes, and relevant outputs.

### B. Frontend baseline
- Identify frontend framework/build tooling and versions from actual package manifests/lockfiles.
- Identify lint, unit test, and production build scripts.
- Run the existing lint, unit tests, and production build where available.
- If a script is absent, report `NOT AVAILABLE`; do not invent one.
- Inventory screens/routes, API calls, TypeScript types, storage service methods, localStorage/sessionStorage usage, seeded/demo/mock data, and existing tests.
- Identify which user workflows are currently functional, partial, mock-only, or not implemented, based on code evidence.

### C. Backend and AI baseline
- Inspect FastAPI app, Express/server entry point, routers, middleware, requirements, and current endpoint behavior.
- Record all current API endpoints and request/response shapes from code.
- Specifically verify ownership and contracts of:
  - `POST /api/ai/generate-questions`
  - `POST /api/ai/simplify-lesson`
- Do not assume blueprint statements are current until verified against repository code.

### D. Docker and database baseline
- Run `docker compose config` (or the repository's actual Compose command).
- Inspect Dockerfiles, service names, ports, environment wiring, health checks, named volumes, and dependency ordering.
- Record container startup/health behavior only if it can be checked safely.
- Record PostgreSQL image/version and volume mapping from configuration.
- Do not run destructive commands or migrations.
- If Docker is unavailable, report the exact limitation.

### E. Requirement and workflow traceability
- Map all SRS use cases and SSD-01 through SSD-08 to current UI, API, backend service, persistence, and tests.
- For each capability use exactly one status:
  - IMPLEMENTED — verified working with evidence.
  - PARTIAL — some behavior exists but the complete workflow is not verified.
  - MOCK_ONLY — UI/demo/local mock behavior, no verified backend persistence/logic.
  - NOT_IMPLEMENTED — no implementation found.
  - BLOCKED/UNKNOWN — cannot verify; explain why.
- Do not mark a capability implemented merely because a component, route, or function exists.
- Identify frontend-to-backend integration gaps and duplicate/overlapping responsibilities.

### F. Contracts and defects
- Create/update `API_CONTRACT.md` with existing endpoints only; distinguish CURRENT from PROPOSED.
- Create `IMPLEMENTATION_STATUS.md` covering SRS/SSD traceability, evidence, files, tests, and status.
- Record known defects, technical risks, source conflicts, missing decisions, and proposed next steps.
- Do not invent API schemas or business rules where source/code evidence is absent.

## Required phase records

Create:
- `PLAN.md`
- `EXECUTION_LOG.md`
- `FILE_CHANGE_LEDGER.md`
- `TEST_AND_EVALUATION.md`
- `ISSUES_AND_DECISIONS.md`
- `PHASE_SUMMARY.md`

The file ledger must explicitly state that no application source files were changed. Record any report/control documents created as CREATE/MODIFY entries.

## Acceptance criteria

1. Baseline report contains actual command output, versions, and exit codes.
2. Existing UI workflows are inventoried with evidence.
3. Existing routes and AI endpoint contracts are recorded accurately.
4. Docker/Compose/database topology and health behavior are documented from actual configuration/runtime evidence.
5. SRS use cases and all eight SSD workflows are mapped to current implementation status.
6. Every capability is classified IMPLEMENTED, PARTIAL, MOCK_ONLY, NOT_IMPLEMENTED, or BLOCKED/UNKNOWN.
7. Known defects, gaps, and source ambiguities are recorded.
8. `API_CONTRACT.md` and `IMPLEMENTATION_STATUS.md` are created/updated accurately.
9. No application source/configuration code was changed.
10. Git diff and file-change ledger reconcile completely.

## Required final response from Antigravity

Report:
- Executive baseline summary.
- Exact repository branch/commit and pre-existing changes.
- Exact commands, exit codes, and actual results.
- Frontend route/screen/storage/API inventory.
- Backend endpoint inventory, including AI routes.
- Docker/PostgreSQL topology and verified health status.
- SRS/SSD coverage matrix.
- Complete list of defects, risks, ambiguities, and decisions required.
- All files created/modified (including audit docs), with reasons.
- Explicit confirmation that no application source/configuration files were changed.
- Acceptance matrix: PASS / FAIL / NOT RUN / BLOCKED.
- Recommendation whether Phase 1 is safe to plan.

**STOP after submitting Phase 0. Do not begin Phase 1. Wait for the project owner to review and explicitly accept Phase 0.**
