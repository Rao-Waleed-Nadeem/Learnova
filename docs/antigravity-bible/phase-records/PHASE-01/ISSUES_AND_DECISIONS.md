# Issues and Decisions — Phase 01 (Backend Foundation)

## Blockers and Defects

| ID | Type | Description | Source/Evidence | Impact | Proposed Handling | Owner Decision/Status |
|---|---|---|---|---|---|---|
| BLK-01 (RESOLVED) | Missing File | `Learnova_SRS_Final_Aligned_V2.docx` was missing in Phase 0. | Present in commit `abd879e` as `Learnova_SRS_Final_Aligned_V2 (1).docx`. | None (resolved). | Reference supplied docx for requirements. | RESOLVED by Owner |
| DEF-02 | Docker Bind Mount Gap | `docker-compose.yml` does not mount `./backend:/app` for the backend service. | `docker-compose.yml` inspection. | Backend code modifications require container rebuild unless bind mount is added. | Add `volumes: - ./backend:/app` in Phase 1 plan. | Submitted in Phase 1 Plan |
| DEF-03 | Missing Dependencies | Backend scaffold lacks SQLAlchemy, Alembic, psycopg2-binary, pydantic-settings, and pytest. | Backend container `pip list`. | Cannot establish DB session, migrations, or tests. | Add pinned dependencies in `backend/requirements.txt`. | Submitted in Phase 1 Plan |

---

## Decisions for Phase 1

### DEC-P1-001: Synchronous SQLAlchemy with `psycopg2-binary`
- **Context:** Blueprint Section 5.10 and 16 recommend selecting one deliberate driver strategy.
- **Options:**
  1. Synchronous SQLAlchemy 2.0+ with `psycopg2-binary`.
  2. Asynchronous SQLAlchemy 2.0+ with `asyncpg`.
- **Recommendation:** Option 1. Simplifies Alembic migrations (native sync execution), provides high stability in Python 3.12, eliminates async session bridge complexity, and performs excellently with FastAPI's threadpool execution for synchronous dependencies.
- **Affected Files:** `backend/requirements.txt`, `backend/app/db/session.py`, `backend/alembic/env.py`.
- **Status:** Recommended in Plan; awaiting owner approval.

### DEC-P1-002: Liveness vs Readiness Endpoint Topology
- **Context:** `PHASE-01_BACKEND_FOUNDATION.md` AC-3 requires distinguishing application availability from database readiness while preserving `/health` compatibility (AC-4).
- **Options:**
  1. Root `/health` remains backward-compatible returning `{"status": "ok", "service": "learnova-api"}`; Root `/ready` checks DB connectivity returning `200` (ready) or `503` (not ready). Additionally, `/api/v1/health/liveness` and `/api/v1/health/readiness` provide structured monitoring.
  2. Change `/health` to fail if database is disconnected.
- **Recommendation:** Option 1. Guarantees 100% backward compatibility with existing Docker Compose and external probes while providing precise readiness diagnostics.
- **Affected Files:** `backend/app/main.py`, `backend/app/api/v1/endpoints/health.py`.
- **Status:** Recommended in Plan; awaiting owner approval.

---

## Deviations from Approved Plan

| ID | Approved Plan | Actual Deviation | Reason | Files/Impact | Approval Requested/Granted |
|---|---|---|---|---|---|
| DEV-00 | Phase 1 Plan | None | Strict adherence to Phase 1 plan-first rules. Zero application code edited before owner approval. | None | N/A |
