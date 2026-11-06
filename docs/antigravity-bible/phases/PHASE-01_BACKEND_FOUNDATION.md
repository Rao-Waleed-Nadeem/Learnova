# Phase 1 — Backend Foundation

**Phase status before start:** BLOCKED until Phase 0 is reviewed and explicitly accepted.  
**Implementation permission:** PLAN FIRST; implementation only after project-owner approval.  
**Primary source:** `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md`, Sections 10 (Phase 1), 13, 16, and 17.  
**Related source:** `Readme.md`, SRS, SSDs, current Phase 0 baseline report.

## Objective

Establish reliable FastAPI configuration and PostgreSQL connectivity without changing frontend behavior. Add the minimum technical foundation required for later domain implementation.

## Entry gates

Before planning:
- Phase 0 `PHASE_SUMMARY.md` must be marked accepted by the project owner.
- Phase 0 acceptance criteria must pass or have explicitly approved exceptions.
- Current Git branch/working tree and Phase 0 baseline must be rechecked.
- The project owner must provide explicit authorization to plan Phase 1.

Before implementation:
- Antigravity must submit `PLAN.md` with exact file paths and reasons.
- Project owner must approve the plan and file list.
- Any additional file outside the approved list requires a pause and approval.

## Scope from the master blueprint

- Validated, environment-driven backend settings.
- SQLAlchemy engine and session setup.
- Database health/readiness check.
- Alembic scaffold and environment-driven database URL.
- Structured logging and safe exception handling.
- `/api/v1` router structure while preserving existing `/health` compatibility.
- Backend unit tests and database connectivity integration test.
- Docker networking and Compose environment verification.
- Dependency declarations and Docker compatibility as required.

Use the existing repository structure where sensible. Do not force proposed file names if a consistent existing structure is better. Avoid duplicate database/session abstractions.

## Explicit exclusions

Do not implement:
- Authentication or RBAC.
- User/domain tables or the full domain schema.
- Frontend API integration or UI changes.
- Rewriting `storageService.ts`.
- AI route migration.
- Course, assessment, adaptive-learning, gamification, analytics, or teacher/admin business logic.
- Production seed accounts.
- Destructive database reset, volume deletion, or data wipe.
- Unrelated refactoring or redesign.

## Technical and safety requirements

- Verify the existing PostgreSQL Compose service name and use the configured service hostname from inside Docker.
- Use one deliberate SQLAlchemy sync/async strategy and one compatible PostgreSQL driver strategy; document the choice.
- Keep secrets out of source, logs, reports, and commits.
- Preserve existing `/health` behavior while adding readiness semantics.
- Liveness must indicate whether the application process is running; readiness must accurately reflect required dependency availability.
- Alembic must use validated environment configuration, not a hard-coded credential-bearing URL.
- Test migrations only against a disposable test database. Do not target the persistent development database for destructive experiments.
- Do not add speculative abstractions.
- Do not claim zero regressions; demonstrate checks.

## Required workflow

1. Re-read this phase file, Phase 0 evidence, and relevant blueprint sections.
2. Inspect Git state and existing backend/Compose configuration.
3. Create/update Phase 1 `PLAN.md`.
4. List every intended CREATE/MODIFY/RENAME/DELETE path and why.
5. Identify compatibility, security, database, Docker, and rollback risks.
6. Submit plan and wait for explicit owner approval.
7. Implement only approved scope.
8. Record every file-level change and every distinct logical edit in `FILE_CHANGE_LEDGER.md`.
9. Record every command, exit code, output summary, and side effect in `EXECUTION_LOG.md`.
10. Run backend tests, disposable-DB migration test, frontend lint/tests/build, and safe Compose checks.
11. Inspect full Git diff and reconcile it against the ledger.
12. Complete evaluation and summary records.
13. Stop and wait for owner acceptance.

## Acceptance criteria

1. Backend starts successfully in the existing Docker setup.
2. Backend connects to configured PostgreSQL using the Compose service hostname.
3. Liveness and readiness distinguish application availability from database readiness.
4. Existing `/health` behavior remains compatible.
5. Alembic is configured from validated environment settings.
6. Alembic can apply a small initial/test migration to a disposable database.
7. Configuration is environment-driven and validates required settings.
8. Structured logging and exception handling do not expose secrets.
9. `/api/v1` router structure is established without breaking existing behavior.
10. Backend unit tests and DB connectivity integration test pass, or failures are clearly reported.
11. Existing frontend lint, tests, and production build still pass.
12. `docker compose config` succeeds and Docker networking is verified safely.
13. No frontend behavior has been removed or replaced with mocks.
14. Existing database volume/data remain untouched.
15. Every changed path and distinct edit is recorded; Git diff and ledger reconcile.
16. No unrelated modifications or secrets are present.

## Required final evidence

- Environment and dependency versions.
- Backend startup and health/readiness evidence.
- PostgreSQL connection evidence from the backend container.
- Alembic configuration and disposable database migration evidence.
- Exact test commands, exit codes, and actual results.
- Frontend regression command results.
- Compose configuration/networking results.
- Full changed-file list and per-file change ledger.
- Full diff review summary.
- Known issues and residual risks.
- Acceptance matrix with PASS / FAIL / NOT RUN / BLOCKED.

**STOP after Phase 1 evidence is submitted. Do not begin Phase 2. Phase 1 is not accepted until the project owner explicitly accepts it.**
