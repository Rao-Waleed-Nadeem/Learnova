# Learnova — Phase 7, 8 Corrections and Phase 9 Package

**Repository baseline reviewed:** `3b3a6d52775ac972026a5f22dd1353e51a0d4783`  
**Commit:** `Phase 4, 5, 6, 7, 8 completed`  
**Purpose:** preserve the existing Learnova implementation and repair specific cross-phase defects before proceeding to AI integration.

## Decision

Phases 7 and 8 are substantially implemented, but the repository evidence exposes important integration/policy gaps. Do **not** rewrite the architecture. First run the targeted Phase 7 and Phase 8 correction plans, then proceed to Phase 9 after those corrections are reviewed and accepted.

## Execution order — mandatory

1. `PHASE-07_CORRECTIVE_STABILIZATION.md` — audit and correct mastery policy/attribution and its interaction with the outbox.
2. `PHASE-08_OUTBOX_RELIABILITY_CORRECTIONS.md` — make gamification delivery genuinely retryable and privacy opt-in.
3. `PHASE-09_AI_INTEGRATION_GOVERNANCE.md` — migrate AI capabilities into the existing FastAPI modular monolith.

Do not implement all three at once. For each phase: inspect → plan → owner approval → implement → test → evidence → stop.

## Package contents

- `phases/PHASE-07_CORRECTIVE_STABILIZATION.md`
- `phases/PHASE-08_OUTBOX_RELIABILITY_CORRECTIONS.md`
- `phases/PHASE-09_AI_INTEGRATION_GOVERNANCE.md`
- `UNIVERSAL_ANTIGRAVITY_PROMPT_PHASES_07_09.md`
- `REPO_INTEGRATION_NOTES.md`

## Authority and constraints

The approved SRS, SSDs, architecture README, and Master Backend Implementation Blueprint remain authoritative. The repository proves current implementation, not correctness by itself. Preserve the current FastAPI + synchronous SQLAlchemy + PostgreSQL modular monolith, existing migrations, React UI, Express/Vite frontend server, and PostgreSQL named volume.

No microservices, Kafka, Redis requirement, wholesale frontend rewrite, database reset, or replacement of the existing domain model is authorized by this package.

## Important

The Phase 7/8 reports contain claims of completion and acceptance. This package does not erase those historical records. It asks Antigravity to append a corrective review and evidence record, explicitly distinguishing previously reported tests from newly executed corrective tests.
