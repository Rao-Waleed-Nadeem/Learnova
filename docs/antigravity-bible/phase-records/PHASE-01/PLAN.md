# Phase 1 Plan — Backend Foundation

- **Phase:** Phase 1 — Backend Foundation
- **Status:** **PLAN_SUBMITTED_FOR_REVIEW** (Awaiting explicit project-owner approval before code edits)
- **Governing Standard:** `agent-prompt.md` Section 4 (Mandatory planning before implementation)
- **Primary Source:** `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md`, Sections 10 (Phase 1), 13, 16, and 17.
- **Related Sources:** `docs/sources/Readme.md`, `docs/sources/Learnova_SRS_Final_Aligned_V2 (1).docx`, `docs/sources/Learnova_Final_SSDs_V2.xml`, `docs/antigravity-bible/phases/PHASE-01_BACKEND_FOUNDATION.md`, `docs/antigravity-bible/AGENT_OPERATING_RULES.md`, `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`.
- **Branch / Commit Baseline:** `main` / `abd879e69d4a42af087ffaee39073bc397f85cc7` (Working tree clean; Phase 0 accepted and committed).

---

## 1. Task Objective

Establish a reliable, production-structured FastAPI configuration and PostgreSQL connectivity layer within Docker without modifying or regressing frontend behavior. Add the minimum technical foundation required for subsequent domain implementation (Phases 2–10).

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

## 2. SRS and SSD Requirements Traceability

- **Architectural Foundation:** All 8 System Sequence Diagrams (`SSD-01` through `SSD-08`) require a functioning backend API server and PostgreSQL persistence store.
- **Non-Functional Requirements Traceability:**
  - `NFR-REL-01` (Service Reliability & Monitoring): Distinct liveness and readiness probes to monitor application process status versus database dependency health.
  - `NFR-DATA-01` (Data Persistence & Schema Evolution): Version-controlled migrations via Alembic linked to PostgreSQL 17.
  - `NFR-SEC-01` (Credential Security): Environment-driven configuration without committed or logged secrets; automated secret scrubbing in logs and error responses.
- **Scope Exclusions Traceability:**
  - Domain use cases (`uc_auth`, `uc_enroll`, `uc_diag`, `uc_path`, `uc_practice`, `uc_exam`, `uc_gamify`, `uc_manage_courses`, etc.) are deferred to Phases 2–10. Phase 1 provides exclusively technical services (`LAY-TECH`).

---

## 3. Relevant Architecture and Business Rules

- **Three-Layer Separation:** `LAY-TECH` (Technical Services) provides settings, database sessions, and migrations without embedding domain or presentation rules.
- **Single Driver Strategy:** Consistent synchronous SQLAlchemy 2.0+ session with `psycopg2-binary`. Prohibits mixing async and sync drivers without approved justification.
- **Data Invariant:** Persistent Docker volume `postgres_data` must not be dropped, reset, or altered with destructive migrations.
- **Health Compatibility Invariant:** Existing `/health` endpoint contract (`{"status": "ok", "service": "learnova-api"}`) must remain 100% backward-compatible.
- **AI Route Invariant:** AI endpoints remain in Express on port 3000 until Phase 9.

---

## 4. Code Inspection Baseline Before Proposing Replacements

The repository code and runtime were inspected directly:
- `backend/app/main.py`: 12-line stub with only `@app.get("/health")`.
- `backend/app/__init__.py`: 1-line docstring.
- `backend/requirements.txt`: Contains only `fastapi` and `uvicorn[standard]`.
- `backend/Dockerfile`: Copies `requirements.txt` and `app/`. Does not copy `alembic.ini`, `alembic/`, or `tests/`.
- `docker-compose.yml`: Services `frontend`, `backend`, `database`. Backend lacks `./backend:/app` bind mount.
- Docker runtime: Backend runs Python `3.12.15` in container `learnova-backend-1`. Database is healthy on port 5432 with 0 relations.

---

## 5 & 6. Files to Create, Modify, Rename, or Delete with Reasons

### A. Application Source & Configuration

| Path | Action | Reason & Intended Outcome | Requirement / Source |
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

### B. Test Suites

| Path | Action | Reason & Intended Outcome | Requirement / Source |
|---|:---:|---|---|
| `backend/tests/__init__.py` | CREATE | Package marker for test suite. | Testing standard |
| `backend/tests/conftest.py` | CREATE | Pytest fixtures providing test settings, test client, and mock/disposable DB engines. | Blueprint Sec 11 |
| `backend/tests/test_config.py` | CREATE | Unit tests verifying settings loading, defaults, validation errors, and secret masking. | AC-7, AC-8 |
| `backend/tests/test_health.py` | CREATE | Unit tests verifying `/health` backward compatibility, `/ready` behavior, and `/api/v1/health/*`. | AC-3, AC-4 |
| `backend/tests/test_db_connection.py` | CREATE | Integration tests verifying database readiness check against live PostgreSQL service and connection error simulation. | AC-2, AC-10 |

### C. Project Control Documents (Root)

| Path | Action | Reason & Intended Outcome |
|---|:---:|---|
| `API_CONTRACT.md` | MODIFY | Update verified endpoints with `/ready` and `/api/v1/health/*`. |
| `IMPLEMENTATION_STATUS.md` | MODIFY | Update foundation capability status to verified. |
| `DECISIONS.md` | MODIFY | Record approved driver selection and health/readiness architecture. |

---

## 7. Affected Contracts

- **API Contracts:**
  - `GET /health` (`200 OK`) — UNCHANGED: `{"status": "ok", "service": "learnova-api"}`.
  - `GET /ready` (`200 OK` or `503 Service Unavailable`) — NEW: reports database connectivity status.
  - `GET /api/v1/health/liveness` (`200 OK`) — NEW: process health check.
  - `GET /api/v1/health/readiness` (`200 OK` or `503 Service Unavailable`) — NEW: dependency readiness check.
- **Database Contracts:**
  - Connection string: `postgresql+psycopg2://${POSTGRES_USER}:${POSTGRES_PASSWORD}@database:5432/${POSTGRES_DB}`.
  - Persistent volume `postgres_data` is strictly preserved.
  - Test migration executed exclusively against a disposable test database.
- **Docker Contracts:**
  - Compose services `frontend`, `backend`, `database` continue on ports 3000, 8000, 5432.
  - Backend volume mount `./backend:/app` added for local dev reflection.

---

## 8. Dependencies and Compatibility Risks

- **Python 3.12 Compatibility:** `psycopg2-binary>=2.9.9`, `sqlalchemy>=2.0.36`, `pydantic-settings>=2.6.0`, `alembic>=1.13.3` are fully compatible with Python 3.12.
- **Frontend Compatibility:** Zero changes to frontend files; existing `/health` response preserved; full regression test execution mandated.
- **Security:** Pydantic `SecretStr` and custom `__repr__` ensure passwords in `DATABASE_URL` cannot leak into logs, exceptions, or reports.

---

## 9. Acceptance Criteria

1. Backend starts successfully in the existing Docker setup.
2. Backend connects to configured PostgreSQL using the Compose service hostname (`database:5432`).
3. Liveness and readiness distinguish application availability from database readiness.
4. Existing `/health` behavior remains compatible.
5. Alembic is configured from validated environment settings.
6. Alembic can apply a small initial/test migration to a disposable database.
7. Configuration is environment-driven and validates required settings.
8. Structured logging and exception handling do not expose secrets.
9. `/api/v1` router structure is established without breaking existing behavior.
10. Backend unit tests and DB connectivity integration test pass.
11. Existing frontend lint, tests, and production build still pass.
12. `docker compose config` succeeds and Docker networking is verified safely.
13. No frontend behavior has been removed or replaced with mocks.
14. Existing database volume/data remain untouched.
15. Every changed path and distinct edit is recorded; Git diff and ledger reconcile.
16. No unrelated modifications or secrets are present.

---

## 10. Testing and Rollback Strategy

### Testing Strategy:
1. `docker compose config` validation.
2. Container build: `docker compose build backend`.
3. Container startup: `docker compose up -d backend`.
4. HTTP health test: `curl http://localhost:8000/health`.
5. HTTP readiness test: `curl http://localhost:8000/ready`.
6. Pytest execution inside container: `docker compose exec backend pytest tests/ -v`.
7. Alembic test on disposable database: run migration upgrade and downgrade against a temporary SQLite or test DB.
8. Frontend regression checks: `npm run lint`, `npm test`, `npm run build`.
9. Git diff audit vs `FILE_CHANGE_LEDGER.md`.

### Rollback Strategy:
- Revert code edits: `git restore backend/ docker-compose.yml API_CONTRACT.md IMPLEMENTATION_STATUS.md DECISIONS.md`
- Remove untracked new files: `git clean -fd backend/`
- Rebuild backend container from clean commit `abd879e`.

---

## Approval Checkpoint

In accordance with `agent-prompt.md` Section 4 and `AGENT_OPERATING_RULES.md` Rule 2:
> **"Do not implement anything until explicit approval is received."**

This plan is submitted for project-owner review. Antigravity will pause and wait for your explicit approval before modifying any application source or configuration code.
