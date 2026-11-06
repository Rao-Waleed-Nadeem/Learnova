# Learnova — Antigravity Engineering Bible

**Purpose:** This folder governs how Antigravity analyzes, plans, implements, tests, evaluates, and documents Learnova changes. It is an operating system for controlled implementation—not a replacement for the approved SRS, SSDs, architecture specification, or master backend blueprint.

## Placement in the repository

Copy this entire folder into the repository at:

`docs/antigravity-bible/`

Keep the source documents at their existing locations unless the project owner explicitly approves moving them.

## Authority order

When sources appear inconsistent, do not silently choose one. Record the conflict and request a decision.

1. `docs/sources/Learnova_SRS_Final_Aligned_V2.docx` — approved requirements baseline.
2. `docs/sources/Learnova_Final_SSDs_V2.xml` — approved system sequence workflows.
3. `docs/sources/Readme.md` — system diagram specification and architecture/workflow description.
4. `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md` — implementation assessment, target architecture, roadmap, constraints, and acceptance gates.
5. Current repository — evidence of what is actually implemented, not proof that it is correct or approved.
6. Approved `DECISIONS.md` entries — decisions made to resolve documented ambiguities.

The repository's existing `agent-prompt.md`, Docker repair guide, and frontend README are supporting material. They do not override the sources above.

## Mandatory reading before any task

Read this file, `AGENT_OPERATING_RULES.md`, the relevant phase file, and the relevant source sections. Inspect the actual repository before proposing changes.

## Phase order

- Phase 0: Baseline and contract preparation (audit only; no source-code edits).
- Phase 1: Backend foundation (FastAPI configuration, PostgreSQL connectivity, migrations scaffold, readiness, tests, Docker verification).
- Phase 2: Initial domain schema and migrations.
- Phase 3: Authentication and RBAC.
- Phase 4: Curriculum, enrollment, and resources.
- Phase 5: Question bank and assessment authoring.
- Phase 6: Assessment attempt lifecycle and grading.
- Phase 7: Adaptive engine and learning paths.
- Phase 8: Gamification and event processing.
- Phase 9: AI adapter and governance.
- Phase 10: Analytics, teacher portal, and administration.
- Phase 11: Complete frontend migration and regression.
- Phase 12: Release hardening and deployment verification.

Do not skip or combine phases unless the project owner explicitly approves it. Phase 1 must not begin until Phase 0 has been reviewed and accepted.

## Required control files

Maintain these at repository root (not inside this Bible folder):

- `API_CONTRACT.md`
- `IMPLEMENTATION_STATUS.md`
- `DECISIONS.md`

Maintain phase evidence under:

`docs/antigravity-bible/phase-records/PHASE-XX/`

Every phase must contain:
- `PLAN.md` — approved scope and intended file changes.
- `EXECUTION_LOG.md` — chronological activity and commands.
- `FILE_CHANGE_LEDGER.md` — every created, modified, renamed, or deleted file.
- `TEST_AND_EVALUATION.md` — actual test output/evidence and evaluation against acceptance criteria.
- `ISSUES_AND_DECISIONS.md` — blockers, ambiguities, deviations, decisions, and approvals.
- `PHASE_SUMMARY.md` — final outcome and explicit acceptance status.

Antigravity must create and maintain these records. It must not invent evidence or mark a phase accepted without owner approval.

## Important meaning of "every change"

Record every file-level change and every distinct logical edit, including small edits, configuration changes, dependency changes, formatting-only changes, generated files, and deletions. Do not log every keystroke or transient editor state. The Git diff is the authoritative change evidence; the ledger explains each changed hunk/file and its reason.

## How to use

1. Copy this folder into `docs/antigravity-bible/`.
2. Give Antigravity `phases/PHASE-00_BASELINE_AUDIT.md` first.
3. Antigravity must only inspect and report in Phase 0; it must not edit source code.
4. Review its report and correct/approve it.
5. Only then give it `phases/PHASE-01_BACKEND_FOUNDATION.md`.
6. For every phase, review the plan before authorizing implementation and review the evidence before accepting the phase.
