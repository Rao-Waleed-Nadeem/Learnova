# Phase 0 Audit Plan — Baseline and Contract Preparation

- **Phase:** Phase 0 — Baseline and Contract Preparation (Audit Only)
- **Status:** READY_FOR_REVIEW
- **Branch:** `main`
- **Commit:** `1d008b81185d71cf62869cfe29b32b82f84ffac3`
- **Implementation Permission:** NONE (strictly audit-only; zero application code changes)

---

## 1. Task Objective

Establish an evidence-based, verifiable snapshot of the current Learnova repository before beginning backend implementation.
This includes:
1. Environment and repository runtime baseline (Git status, Node, npm, Python, Docker, PostgreSQL).
2. Frontend verification (lint, unit tests, production build, screens, navigation, state, types, API calls).
3. Backend and AI baseline (FastAPI app, Express server, AI endpoints, contracts, response shapes).
4. Docker Compose and database baseline (Compose topology, networking, volumes, running container health, database relations).
5. Requirement and workflow traceability (mapping SRS use cases and SSD-01 through SSD-08 to current code).
6. Establishing foundational control documents (`API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`).

---

## 2. Source Traceability

- `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md` (Section 10, Phase 0; Sections 2, 4, 5, 8, 14, 15, 16)
- `docs/sources/Learnova_Final_SSDs_V2.xml` (SSD-01 through SSD-08)
- `docs/sources/Readme.md` (System diagram specification, 18 use cases, DFDs, layered architecture)
- `docs/README_FIRST.md` & `docs/AGENT_OPERATING_RULES.md`
- `docs/phases/PHASE-00_BASELINE_AUDIT.md`

---

## 3. Approved Scope & Intended File List

### Strictly Prohibited
- No modifications to frontend source code (`frontend/src/**/*`).
- No modifications to backend source code (`backend/app/**/*`).
- No modifications to Docker configuration or Compose files (`docker-compose.yml`, `*/Dockerfile`).
- No package installations or dependency updates.
- No database migrations, data seeding, or resets.

### Intended File Creation List
Only the Phase 0 audit records and repository control documents are created:

1. `docs/antigravity-bible/phase-records/PHASE-00/PLAN.md` (This document)
2. `docs/antigravity-bible/phase-records/PHASE-00/EXECUTION_LOG.md` (Complete chronological record of all executed commands and outputs)
3. `docs/antigravity-bible/phase-records/PHASE-00/FILE_CHANGE_LEDGER.md` (Ledger of created audit documents and git reconciliation)
4. `docs/antigravity-bible/phase-records/PHASE-00/TEST_AND_EVALUATION.md` (Detailed results of lint, unit tests, build, docker, and endpoint checks)
5. `docs/antigravity-bible/phase-records/PHASE-00/ISSUES_AND_DECISIONS.md` (Blockers, defects, ambiguities, open decisions)
6. `docs/antigravity-bible/phase-records/PHASE-00/PHASE_SUMMARY.md` (Executive baseline summary and acceptance matrix)
7. `API_CONTRACT.md` (Root control document: current vs proposed contracts)
8. `IMPLEMENTATION_STATUS.md` (Root control document: SRS/SSD traceability matrix)
9. `DECISIONS.md` (Root control document: open decisions needing owner approval)

---

## 4. Contracts Affected

- **Current API Contracts Recorded:**
  - `GET /health` on FastAPI (`http://localhost:8000/health`)
  - `POST /api/ai/generate-questions` on Express (`http://localhost:3000/api/ai/generate-questions`)
  - `POST /api/ai/simplify-lesson` on Express (`http://localhost:3000/api/ai/simplify-lesson`)
- **Data Contracts Recorded:**
  - PostgreSQL 17 instance verified; 0 relations currently exist.
  - Frontend `storageService.ts` in-memory and `localStorage` schema contracts cataloged.

---

## 5. Risks and Assumptions

- **Risk:** Uncommitted pre-existing change to `agent-prompt.md` exists in the working directory.
  - *Mitigation:* Preserve `agent-prompt.md` untouched; do not overwrite or stage it.
- **Risk:** Database container is currently running with persistent volume `postgres_data`.
  - *Mitigation:* Perform only non-destructive inspection (`\dt`); no reset or teardown.
- **Risk:** Frontend AI endpoints depend on Express port 3000, while future architecture places them in FastAPI port 8000.
  - *Mitigation:* Explicitly document current Express ownership in `API_CONTRACT.md` and `IMPLEMENTATION_STATUS.md`.

---

## 6. Rollback Approach

Because Phase 0 creates only new markdown documentation files and modifies zero application or configuration code, rollback is simply deleting the created documentation files (`docs/antigravity-bible/phase-records/PHASE-00/`, `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`).

---

## 7. Approval Status

- Plan Status: **SUBMITTED FOR AUDIT REVIEW**
- Implementation Status: **AUDIT ONLY — NO SOURCE EDITS**
