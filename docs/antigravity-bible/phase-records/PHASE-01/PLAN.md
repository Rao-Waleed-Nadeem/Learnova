# Phase 1 Plan — Backend Foundation

- **Phase:** Phase 1 — Backend Foundation
- **Status:** **PLAN_SUBMITTED_FOR_REVIEW** (Awaiting explicit project-owner approval before code edits)
- **Primary Source:** `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md`, Sections 10 (Phase 1), 13, 16, and 17.
- **Related Sources:** `docs/sources/Readme.md`, `docs/phases/PHASE-01_BACKEND_FOUNDATION.md`, `docs/AGENT_OPERATING_RULES.md`, `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`.
- **Branch / Commit Baseline:** `main` / `abd879e69d4a42af087ffaee39073bc397f85cc7` (Working tree clean; Phase 0 verified and committed).

---

## 1. Task Objective

Establish a reliable, production-structured FastAPI configuration and PostgreSQL connectivity layer within Docker without modifying or regressing frontend behavior.
Specifically:
1. Provide validated, environment-driven backend settings via Pydantic (`pydantic-settings`).
2. Implement a single consistent synchronous SQLAlchemy 2.0+ engine and session factory with `psycopg2-binary`.
3. Establish an Alembic migration scaffold configured dynamically from environment settings.
4. Implement distinct liveness and database readiness endpoints while strictly preserving backward compatibility of the existing root `/health` endpoint.
5. Provide structured logging with automated secret masking and safe global exception handling.
6. Establish a versioned `/api/v1` router structure.
7. Write backend unit tests (config, health/readiness) and database connectivity integration tests.
8. Validate Alembic migration capability using a disposable test database without touching existing persistent data.
9. Verify Docker Compose networking between backend and PostgreSQL.
10. Ensure zero regressions across frontend linting, unit tests, and production build.

---

## 2. Explicit Scope Exclusions

As mandated by `PHASE-01_BACKEND_FOUNDATION.md` and Blueprint Section 16:
- **NO** authentication or RBAC logic.
- **NO** user or domain tables, and no full domain schema.
- **NO** frontend UI modifications or API client rewrites.
- **NO** modifications to `storageService.ts`.
- **NO** migration of AI routes from Express to FastAPI (retained in Express until Phase 9).
- **NO** course, assessment, adaptive learning, gamification, analytics, or teacher/admin business logic.
- **NO** hardcoded production or seed user credentials.
- **NO** destructive database resets, `docker compose down -v`, or volume deletions.
- **NO** destructive Alembic migrations against the persistent `postgres_data` volume.

---

## 3. Exact Intended File List & Traceability

Every file to be created or modified is listed below with justification and requirement traceability:

### A. Application Source & Configuration (To Create/Modify)

| Path | Action | Reason & Intended Outcome | Source Traceability |
|---|:---:|---|---|
| `backend/requirements.txt` | MODIFY | Add pinned dependencies: `pydantic-settings>=2.6.0`, `sqlalchemy>=2.0.36`, `alembic>=1.13.3`, `psycopg2-binary>=2.9.9`, `pytest>=8.3.3`, `httpx>=0.27.2`. | Blueprint Sec 16, 17 |
| `backend/app/core/__init__.py` | CREATE | Package marker for core module. | Python package standard |
| `backend/app/core/config.py` | CREATE | Environment-driven `Settings` class using `pydantic_settings.BaseSettings`. Validates database URL, environment flags, and redacts sensitive credentials. | Blueprint Sec 10 (P1), 16 |
| `backend/app/core/logging.py` | CREATE | Structured logging configuration ensuring JSON/formatted logs without credential leakage. | Blueprint Sec 10 (P1), 16 |
| `backend/app/db/__init__.py` | CREATE | Package marker for db module. | Python package standard |
| `backend/app/db/base.py` | CREATE | Declarative base class `Base` for future SQLAlchemy models. | Blueprint Sec 16 |
| `backend/app/db/session.py` | CREATE | Synchronous SQLAlchemy engine (`pool_pre_ping=True`), `SessionLocal` factory, `get_db` FastAPI dependency, and `check_db_connection() -> tuple[bool, Optional[str]]`. | Blueprint Sec 10 (P1), 16 |
| `backend/app/api/__init__.py` | CREATE | Package marker for API module. | Python package standard |
| `backend/app/api/v1/__init__.py` | CREATE | Package marker for API v1 module. | Blueprint Sec 8 |
| `backend/app/api/v1/router.py` | CREATE | APIRouter aggregator mounting versioned sub-routers (`health`, etc.). | Blueprint Sec 8, 10 |
| `backend/app/api/v1/endpoints/__init__.py` | CREATE | Package marker for v1 endpoints. | Python package standard |
| `backend/app/api/v1/endpoints/health.py` | CREATE | Detailed `/api/v1/health/liveness` and `/api/v1/health/readiness` endpoints distinguishing process health from DB connectivity. | Blueprint Sec 10 (P1), 16 |
| `backend/app/main.py` | MODIFY | Wire settings, structured logging, global exception handler, preserve existing `/health` root endpoint, add `/ready` endpoint, and mount `/api/v1` router. | Blueprint Sec 10 (P1), 16 |
| `backend/alembic.ini` | CREATE | Alembic CLI configuration pointing to `alembic/` directory and utilizing application settings. | Blueprint Sec 10 (P1), 16 |
| `backend/alembic/env.py` | CREATE | Alembic environment runner loading database URL dynamically from `app.core.config.settings` and binding `Base.metadata`. | Blueprint Sec 10 (P1), 16 |
| `backend/alembic/script.py.mako` | CREATE | Standard migration template for future revisions. | Alembic standard |
| `backend/alembic/README` | CREATE | Documentation for migration workflows. | Alembic standard |
| `backend/alembic/versions/.gitkeep` | CREATE | Directory marker for migration version files. | Git standard |
| `backend/Dockerfile` | MODIFY | Ensure `alembic.ini`, `alembic/`, and `tests/` are copied to the container image alongside `app/`. | Docker best practice |
| `docker-compose.yml` | MODIFY | Add `./backend:/app` bind mount to `backend` service (matching `frontend`) for live development sync. | Docker best practice |

### B. Test Suites (To Create)

| Path | Action | Reason & Intended Outcome | Source Traceability |
|---|:---:|---|---|
| `backend/tests/__init__.py` | CREATE | Package marker for test suite. | Testing standard |
| `backend/tests/conftest.py` | CREATE | Pytest fixtures providing test settings, test client, and mock/disposable DB engines. | Blueprint Sec 11 |
| `backend/tests/test_config.py` | CREATE | Unit tests verifying settings loading, defaults, validation errors, and secret masking. | AC-7, AC-8 |
| `backend/tests/test_health.py` | CREATE | Unit tests verifying `/health` backward compatibility, `/ready` behavior, and `/api/v1/health/*`. | AC-3, AC-4 |
| `backend/tests/test_db_connection.py` | CREATE | Integration tests verifying database readiness check against live PostgreSQL service and connection error simulation. | AC-2, AC-10 |

### C. Project Control & Phase Records (To Create/Update)

| Path | Action | Reason & Intended Outcome |
|---|:---:|---|
| `docs/antigravity-bible/phase-records/PHASE-01/PLAN.md` | CREATE | This plan document. |
| `docs/antigravity-bible/phase-records/PHASE-01/EXECUTION_LOG.md` | CREATE | Chronological log of all executed commands, exit codes, and outputs. |
| `docs/antigravity-bible/phase-records/PHASE-01/FILE_CHANGE_LEDGER.md` | CREATE | Complete change ledger recording every file created/modified and reconciling git diff. |
| `docs/antigravity-bible/phase-records/PHASE-01/TEST_AND_EVALUATION.md` | CREATE | Evidence from pytest, alembic, docker, curl, and frontend regression runs. |
| `docs/antigravity-bible/phase-records/PHASE-01/ISSUES_AND_DECISIONS.md` | CREATE | Blocker, deviation, and architectural decision records for Phase 1. |
| `docs/antigravity-bible/phase-records/PHASE-01/PHASE_SUMMARY.md` | CREATE | Executive phase outcome and acceptance matrix. |
| `API_CONTRACT.md` | MODIFY | Record new verified health/readiness endpoints. |
| `IMPLEMENTATION_STATUS.md` | MODIFY | Update foundation capability status to verified. |
| `DECISIONS.md` | MODIFY | Record approved driver selection and health/readiness architecture. |

---

## 4. Affected Contracts

### API Contracts:
- `GET /health` — **UNMODIFIED**; preserves exact response: `{"status": "ok", "service": "learnova-api"}` (`200 OK`).
- `GET /ready` — **NEW**; returns `{"status": "ready", "database": "connected", "service": "learnova-api"}` (`200 OK`) when DB is healthy; returns `503 Service Unavailable` with details when DB is down.
- `GET /api/v1/health/liveness` — **NEW**; identical process liveness check (`200 OK`).
- `GET /api/v1/health/readiness` — **NEW**; dependency readiness check (`200 OK` or `503`).

### Database Contracts:
- Database host: `database` (Compose service name).
- Port: `5432`.
- Database name: `learnova` (or `learnova_whz` from `.env`).
- Driver: `postgresql+psycopg2://` (standard sync driver via `psycopg2-binary`).
- Existing `postgres_data` volume is strictly preserved and read-only during health checks (`SELECT 1`).
- Alembic test migration will be run against a disposable database (e.g., SQLite in-memory or a temporary test database) to avoid writing test schema into the persistent database.

---

## 5. Risks, Assumptions, and Rollback

| Risk | Impact | Mitigation |
|---|---|---|
| PostgreSQL credentials exposure in logs/errors | Security breach | Pydantic `SecretStr` / custom `__repr__` and structured logger scrubber to mask passwords. |
| Docker Compose volume corruption | Data loss | Never run `docker compose down -v`. Database container is left running untouched. |
| Frontend breakage | Regression | Frontend code is not modified. Existing health endpoint behavior is strictly preserved. Full frontend lint, test, and build runs must pass. |
| Dependency incompatibility in Python 3.12 | Container build failure | Pin modern, tested dependency versions (`pydantic-settings>=2.6`, `sqlalchemy>=2.0.36`, `psycopg2-binary>=2.9.9`, `alembic>=1.13.3`). |

### Rollback Strategy:
- Git rollback: `git restore backend/ docker-compose.yml` and `git clean -fd backend/`.
- Container rollback: Revert `docker-compose.yml` and rebuild backend container from original commit.

---

## 6. Verification and Acceptance Plan

Once approved, implementation will be validated against the 16 acceptance criteria in `PHASE-01_BACKEND_FOUNDATION.md`:
1. `docker compose config` passes.
2. Backend container builds and starts cleanly.
3. `curl http://localhost:8000/health` returns original `{"status": "ok", "service": "learnova-api"}`.
4. `curl http://localhost:8000/ready` returns `200 OK` with database connected status.
5. Pytest suite passes: config tests, health route tests, DB connectivity tests.
6. Alembic applies and rolls back a test migration against a disposable database.
7. Frontend regressions verified: `npm run lint`, `npm test`, and `npm run build` all pass with 0 errors.
8. Git diff and change ledger reconcile 100%.

---

## 7. Approval Request

In accordance with `AGENT_OPERATING_RULES.md` Rule 2 and `PHASE-01_BACKEND_FOUNDATION.md`:
- **Current Status:** `PLAN_SUBMITTED_FOR_REVIEW`
- **Action Required:** Antigravity requests explicit project-owner approval of this plan and the exact file list above before initiating any code modifications.
