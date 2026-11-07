# Issues and Decisions — Phase 01 (Backend Foundation)

## Blockers and Defects Handled

| ID | Type | Description | Source/Evidence | Impact | Handling & Resolution | Status |
|---|---|---|---|---|---|:---:|
| BLK-01 | Missing File | `Learnova_SRS_Final_Aligned_V2.docx` was missing in Phase 0. | `docs/sources/` inspection. | Requirement wordings now verifiable. | Project owner committed `Learnova_SRS_Final_Aligned_V2 (1).docx` in commit `abd879e`. Traceability verified. | **RESOLVED** |
| DEF-02 | Configuration Gap | Backend service in `docker-compose.yml` lacked volume bind mount for live code sync. | `docker-compose.yml` inspection. | Code changes required image rebuilds. | Added `volumes: - ./backend:/app` under `backend` service in `docker-compose.yml`. Verified live container sync. | **RESOLVED** |
| DEF-03 | Missing Dependencies | Backend scaffold lacked SQLAlchemy, Alembic, psycopg2-binary, pydantic-settings, pytest, and httpx. | `backend/requirements.txt` inspection. | Database sessions, migrations, and tests could not run. | Added pinned dependencies to `backend/requirements.txt`, rebuilt image, and verified via `pip list` in container. | **RESOLVED** |
| BUG-P1-01 | Test Precedence | In Docker container, environment variable `DATABASE_URL` overrode kwargs in `Settings(POSTGRES_USER="learner", ...)` during `test_config.py`. | Initial pytest run failure. | 2 config unit tests failed assertion. | Updated `tests/test_config.py` to pass `DATABASE_URL=None` explicitly when testing component URL synthesis. All 13 tests passed. | **RESOLVED** |

---

## Architectural Decisions

### DEC-P1-001: Synchronous SQLAlchemy with `psycopg2-binary` Driver Strategy
- **Context:** Blueprint Sections 5.10 and 16 mandate choosing one deliberate driver strategy without mixing sync and async drivers.
- **Decision:** Selected synchronous SQLAlchemy 2.0+ engine with `psycopg2-binary`.
- **Rationale:**
  1. Alembic natively runs synchronously; sharing the engine eliminates async session wrapper overhead.
  2. Proven high stability on Python 3.12 Debian slim.
  3. FastAPI automatically dispatches synchronous dependency endpoints (`def get_db()`) to threadpool workers, ensuring zero event-loop blocking.
- **Affected Files:** `backend/requirements.txt`, `backend/app/db/session.py`, `backend/alembic/env.py`.
- **Status:** **APPROVED & IMPLEMENTED**.

### DEC-P1-002: Liveness vs Readiness Endpoint Topology & Backwards Compatibility
- **Context:** `PHASE-01_BACKEND_FOUNDATION.md` AC-3 requires distinguishing application process availability from database readiness while preserving existing `/health` compatibility (AC-4).
- **Decision:**
  - Root `GET /health`: Preserved with exact response: `{"status": "ok", "service": "learnova-api"}` (`200 OK`).
  - Root `GET /ready`: Evaluates `check_db_connection()`; returns `200 OK` (`{"database": "connected"}`) or `503 Service Unavailable` (`{"database": "disconnected"}`).
  - API v1 `GET /api/v1/health/liveness` and `GET /api/v1/health/readiness`: Versioned, structured monitoring endpoints.
- **Status:** **APPROVED & IMPLEMENTED**.

---

## Deviations from Approved Plan

| ID | Approved Plan | Actual Deviation | Reason | Files / Impact | Approval Status |
|---|---|---|---|---|:---:|
| DEV-00 | Approved Phase 1 Plan | None | All implemented files, test suites, and control document updates match the approved plan exactly. | None | N/A |
