# File Change Ledger — Phase 03 (Authentication and Role-Based Access Control)

> Reconcile this ledger against the complete Git diff. Include every changed path, including docs, tests, lockfiles, generated files, configuration, and deletions.

## Non-Modification Invariant Confirmation (Stage A: Planning Stage)

**Explicit Statement:**
- **Zero frontend source code files** (`frontend/src/**/*`, `frontend/package.json`, `frontend/server.ts`) were modified or deleted during this planning stage.
- **Zero application backend source files** were created or modified during this planning stage.
- **Zero database migrations** were generated or executed.
- **Zero persistent database data or schemas** were deleted, reset, or altered (`postgres_data` volume remains completely untouched).
- Only the Phase 3 planning and phase record documentation files were created under `docs/antigravity-bible/phase-records/PHASE-03/`.

---

## Stage A Change Entries (Executed in Planning Stage)

### CHG-P3-001: `docs/antigravity-bible/phase-records/PHASE-03/PLAN.md`
- **Action:** CREATE
- **Reason / intended outcome:** Complete 10-point Phase 3 Plan adhering strictly to `agent-prompt.md` Section 4, detailing authentication architecture, token lifecycle, admin safeguards, file change list, test strategy, and threat model.
- **Requirement/source traceability:** `agent-prompt.md` Section 4; `UNIVERSAL_ANTIGRAVITY_PROMPT_PHASES_02_03.md` Sections 2, 3, 6; `docs/phases/PHASE-03_AUTHENTICATION_RBAC.md`.
- **Distinct edits:** Created full plan document.
- **Impact:** Documentation only.
- **Validation evidence:** File written and inspected.
- **Review status:** SUBMITTED_FOR_REVIEW.

### CHG-P3-002: `docs/antigravity-bible/phase-records/PHASE-03/EXECUTION_LOG.md`
- **Action:** CREATE
- **Reason / intended outcome:** Chronological execution log documenting every inspection command, working directory, exit code, and side effects.
- **Requirement/source traceability:** `agent-prompt.md` Section 7; `docs/phases/PHASE-03_AUTHENTICATION_RBAC.md` Section 12.
- **Distinct edits:** Created full execution log.
- **Impact:** Documentation only.
- **Validation evidence:** File written and inspected.
- **Review status:** SUBMITTED_FOR_REVIEW.

### CHG-P3-003: `docs/antigravity-bible/phase-records/PHASE-03/FILE_CHANGE_LEDGER.md`
- **Action:** CREATE
- **Reason / intended outcome:** Traceable file-by-file ledger accounting for every created, modified, or planned path.
- **Requirement/source traceability:** `agent-prompt.md` Section 6; `docs/phases/PHASE-03_AUTHENTICATION_RBAC.md` Section 12.
- **Distinct edits:** Created full change ledger.
- **Impact:** Documentation only.
- **Validation evidence:** File written and inspected.
- **Review status:** SUBMITTED_FOR_REVIEW.

### CHG-P3-004: `docs/antigravity-bible/phase-records/PHASE-03/TEST_AND_EVALUATION.md`
- **Action:** CREATE
- **Reason / intended outcome:** Test record and acceptance criteria assessment for Phase 3.
- **Requirement/source traceability:** `agent-prompt.md` Section 8; `docs/phases/PHASE-03_AUTHENTICATION_RBAC.md` Section 10, 11.
- **Distinct edits:** Created test record document.
- **Impact:** Documentation only.
- **Validation evidence:** File written and inspected.
- **Review status:** SUBMITTED_FOR_REVIEW.

### CHG-P3-005: `docs/antigravity-bible/phase-records/PHASE-03/ISSUES_AND_DECISIONS.md`
- **Action:** CREATE
- **Reason / intended outcome:** Documenting architectural issues, decisions, and options for Phase 3.
- **Requirement/source traceability:** `agent-prompt.md` Section 6, 9; `docs/phases/PHASE-03_AUTHENTICATION_RBAC.md` Section 5, 6.
- **Distinct edits:** Created issues and decisions record.
- **Impact:** Documentation only.
- **Validation evidence:** File written and inspected.
- **Review status:** SUBMITTED_FOR_REVIEW.

### CHG-P3-006: `docs/antigravity-bible/phase-records/PHASE-03/PHASE_SUMMARY.md`
- **Action:** CREATE
- **Reason / intended outcome:** Phase 3 summary document summarizing Stage A planning completion, acceptance status, and hand-off for owner review.
- **Requirement/source traceability:** `agent-prompt.md` Section 10; `docs/phases/PHASE-03_AUTHENTICATION_RBAC.md` Section 12.
- **Distinct edits:** Created summary document.
- **Impact:** Documentation only.
- **Validation evidence:** File written and inspected.
- **Review status:** SUBMITTED_FOR_REVIEW.

### CHG-P3-007: `DECISIONS.md`
- **Action:** MODIFY
- **Reason / intended outcome:** Appended Phase 3 decisions `DEC-P3-001` through `DEC-P3-005` (token lifecycle, cookie transport, public registration student constraint, admin safeguards, teacher course scoping).
- **Requirement/source traceability:** `docs/phases/PHASE-03_AUTHENTICATION_RBAC.md` Section 5, 6; Blueprint Section 15.
- **Distinct edits:** Appended Phase 3 ADRs.
- **Impact:** Project architectural record.
- **Validation evidence:** Document updated.
- **Review status:** SUBMITTED_FOR_REVIEW.

### CHG-P3-008: `IMPLEMENTATION_STATUS.md`
- **Action:** MODIFY
- **Reason / intended outcome:** Updated project traceability matrix to mark Phase 3 as IN_PROGRESS (Stage A completed; Stage B planned) and added Section 8.
- **Requirement/source traceability:** `agent-prompt.md` Section 9.
- **Distinct edits:** Updated summary table and appended Section 8.
- **Impact:** Project control document.
- **Validation evidence:** Document updated.
- **Review status:** SUBMITTED_FOR_REVIEW.

### CHG-P3-009: `API_CONTRACT.md`
- **Action:** MODIFY
- **Reason / intended outcome:** Detailed Section 3.1 with exact endpoint contracts for `/api/v1/auth/*`, `/api/v1/users/*`, and `/api/v1/admin/*`.
- **Requirement/source traceability:** `docs/phases/PHASE-03_AUTHENTICATION_RBAC.md` Section 4.
- **Distinct edits:** Detailed Section 3.1 endpoint list.
- **Impact:** API specification.
- **Validation evidence:** Document updated.
- **Review status:** SUBMITTED_FOR_REVIEW.

---

## Planned Stage B Change Entries (Pending Explicit Owner Approval)

| Planned Change ID | Target File Path | Planned Action | Planned Purpose |
|---|---|:---:|---|
| PLN-P3-001 | `backend/requirements.txt` | MODIFY | Add pinned dependencies `pyjwt>=2.9.0` and `bcrypt>=4.2.0`. |
| PLN-P3-002 | `backend/app/core/config.py` | MODIFY | Add JWT settings (`SECRET_KEY`, `ALGORITHM`, expiration, CORS origins). |
| PLN-P3-003 | `backend/app/core/security.py` | CREATE | Bcrypt hashing, token creation and decoding functions. |
| PLN-P3-004 | `backend/app/core/dependencies.py` | CREATE | Reusable FastAPI auth dependencies (`get_current_user`, `require_role`, etc.). |
| PLN-P3-005 | `backend/app/models/session.py` | CREATE | `UserSession` declarative model (`sessions` table). |
| PLN-P3-006 | `backend/app/models/security_audit_event.py` | CREATE | `SecurityAuditEvent` declarative model (`security_audit_events` table). |
| PLN-P3-007 | `backend/app/models/__init__.py` | MODIFY | Register `UserSession` and `SecurityAuditEvent` with `Base.metadata`. |
| PLN-P3-008 | `backend/app/schemas/auth.py` | CREATE | Pydantic request/response schemas for authentication. |
| PLN-P3-009 | `backend/app/schemas/user.py` | CREATE | Pydantic request/response schemas for user profiles and roles. |
| PLN-P3-010 | `backend/app/services/auth_service.py` | CREATE | Authentication business logic (registration, login, refresh, logout). |
| PLN-P3-011 | `backend/app/services/admin_service.py` | CREATE | Admin user governance with transactional lockout safeguards. |
| PLN-P3-012 | `backend/app/api/v1/endpoints/auth.py` | CREATE | Router endpoints for `/register`, `/login`, `/refresh`, `/logout`, `/me`. |
| PLN-P3-013 | `backend/app/api/v1/endpoints/users.py` | CREATE | Router endpoints for profile update and password change. |
| PLN-P3-014 | `backend/app/api/v1/endpoints/admin.py` | CREATE | Router endpoints for admin role and status modifications. |
| PLN-P3-015 | `backend/app/api/v1/router.py` | MODIFY | Mount `auth`, `users`, and `admin` sub-routers under `/api/v1`. |
| PLN-P3-016 | `backend/app/main.py` | MODIFY | Add `CORSMiddleware` with credentials support. |
| PLN-P3-017 | `backend/alembic/versions/20261108_0005_d1_sessions_and_audit.py` | CREATE | Staged migration creating `sessions` and `security_audit_events`. |
| PLN-P3-018 | `backend/tests/test_auth_endpoints.py` | CREATE | Route tests for registration, login, refresh rotation, and logout. |
| PLN-P3-019 | `backend/tests/test_rbac_authorization.py` | CREATE | Tests for RBAC role gating and teacher assignment enforcement. |
| PLN-P3-020 | `backend/tests/test_admin_guardrails.py` | CREATE | Tests for self-demotion, self-deactivation, and last-admin lockout. |
| PLN-P3-021 | `backend/tests/test_user_profile_security.py` | CREATE | Tests for profile and password rotation. |
| PLN-P3-022 | `frontend/src/services/api/authApi.ts` | CREATE | Typed frontend auth API client. |
| PLN-P3-023 | `frontend/src/pages/student/SignInPage.tsx` | MODIFY | Wire live `authApi.login()`, remove hardcoded credentials. |
| PLN-P3-024 | `frontend/src/pages/student/CreateAccountPage.tsx` | MODIFY | Wire live `authApi.register()`. |
| PLN-P3-025 | `frontend/src/App.tsx` | MODIFY | Restore authenticated user via `authApi.getMe()` and wire logout. |
| PLN-P3-026 | `API_CONTRACT.md` | MODIFY | Update `/api/v1/auth/*` and `/api/v1/users/*` endpoint specifications. |
| PLN-P3-027 | `DECISIONS.md` | MODIFY | Append Phase 3 architectural decisions (`DEC-P3-001` to `DEC-P3-005`). |
| PLN-P3-028 | `IMPLEMENTATION_STATUS.md` | MODIFY | Update Phase 3 status to IMPLEMENTED upon completion. |
## Stage B Change Entries (Executed in Implementation Stage)

### CHG-P3-010: `backend/app/models/session.py`
- **Action:** CREATE
- **Reason / intended outcome:** Implements `UserSession` model for `sessions` table storing SHA-256 hashed refresh tokens, revocation state, expiration timestamp, and client metadata.
- **Requirement/source traceability:** SRS `FR-AUTH-03`, `NFR-SEC-02`; Blueprint Section 4; `PHASE-03_AUTHENTICATION_RBAC.md` Section 3.
- **Distinct edits:** Created `UserSession` mapped class with foreign key to `users.id` (CASCADE).
- **Impact:** Backend data model.
- **Validation evidence:** Tested in `tests/test_auth_endpoints.py`.
- **Review status:** IMPLEMENTED.

### CHG-P3-011: `backend/app/models/security_audit_event.py`
- **Action:** CREATE
- **Reason / intended outcome:** Implements `SecurityAuditEvent` model for `security_audit_events` table storing structured security logs with JSON/JSONB details.
- **Requirement/source traceability:** SRS `FR-SEC-01`, `NFR-SEC-05`; Blueprint Section 14; `PHASE-03_AUTHENTICATION_RBAC.md` Section 7.
- **Distinct edits:** Created `SecurityAuditEvent` mapped class with foreign key to `users.id` (SET NULL).
- **Impact:** Backend data model.
- **Validation evidence:** Tested and verified via live DB inspection.
- **Review status:** IMPLEMENTED.

### CHG-P3-012: `backend/app/models/user.py`
- **Action:** MODIFY
- **Reason / intended outcome:** Added `sessions` and `audit_events` relationships to `User` model.
- **Requirement/source traceability:** Blueprint Section 4.
- **Distinct edits:** Added relationship definitions for `UserSession` and `SecurityAuditEvent`.
- **Impact:** Backend data model.
- **Validation evidence:** Tested in `test_models_d1.py` and `test_auth_endpoints.py`.
- **Review status:** IMPLEMENTED.

### CHG-P3-013: `backend/app/models/__init__.py`
- **Action:** MODIFY
- **Reason / intended outcome:** Registered `UserSession` and `SecurityAuditEvent` in central models registry.
- **Requirement/source traceability:** Architectural standard.
- **Distinct edits:** Exported both new models in `__all__`.
- **Impact:** Model metadata registration.
- **Validation evidence:** Registered in SQLAlchemy Base metadata.
- **Review status:** IMPLEMENTED.

### CHG-P3-014: `backend/alembic/versions/20261108_0005_d1_sessions_and_audit.py`
- **Action:** CREATE
- **Reason / intended outcome:** Alembic migration creating `sessions` and `security_audit_events` tables with constraints and indexes.
- **Requirement/source traceability:** `PHASE-03_AUTHENTICATION_RBAC.md` Section 3, 7.
- **Distinct edits:** Staged migration with reversible `upgrade()` and `downgrade()`.
- **Impact:** Database schema versioning.
- **Validation evidence:** Applied to development DB and verified via `test_migrations_postgres.py`.
- **Review status:** IMPLEMENTED.

### CHG-P3-015: `backend/requirements.txt`
- **Action:** MODIFY
- **Reason / intended outcome:** Added `pyjwt>=2.9.0`, `bcrypt>=4.2.0`, and `email-validator>=2.2.0`.
- **Requirement/source traceability:** SRS `NFR-SEC-01`, `NFR-SEC-02`.
- **Distinct edits:** Appended dependency specifications.
- **Impact:** Backend package dependencies.
- **Validation evidence:** Installed in container and verified via pytest.
- **Review status:** IMPLEMENTED.

### CHG-P3-016: `backend/app/core/config.py`
- **Action:** MODIFY
- **Reason / intended outcome:** Added JWT signing configuration (`SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`) and `CORS_ORIGINS`.
- **Requirement/source traceability:** `PHASE-03_AUTHENTICATION_RBAC.md` Section 3.
- **Distinct edits:** Added settings fields.
- **Impact:** Application configuration.
- **Validation evidence:** Tested in `tests/test_config.py`.
- **Review status:** IMPLEMENTED.

### CHG-P3-017: `backend/app/core/security.py`
- **Action:** CREATE
- **Reason / intended outcome:** Cryptographic security functions: `hash_password`, `verify_password` (with sha256 seed fallback), `create_access_token`, `decode_access_token`, `hash_refresh_token`, `generate_refresh_token`.
- **Requirement/source traceability:** SRS `NFR-SEC-01`, `NFR-SEC-02`.
- **Distinct edits:** Implemented bcrypt cost factor 12 hashing and JWT encode/decode.
- **Impact:** Core security utilities.
- **Validation evidence:** Tested in `tests/test_auth_endpoints.py`.
- **Review status:** IMPLEMENTED.

### CHG-P3-018: `backend/app/core/dependencies.py`
- **Action:** CREATE
- **Reason / intended outcome:** Reusable FastAPI request dependencies: `get_current_user`, `get_current_active_user`, `require_role`, `require_teacher_assigned_to_course`.
- **Requirement/source traceability:** SRS `FR-AUTH-04`, `FR-AUTH-05`; `DEC-P3-005`.
- **Distinct edits:** Token extraction, payload validation, role checking, course teacher scoping.
- **Impact:** Route-level authorization guards.
- **Validation evidence:** Tested in `tests/test_rbac_authorization.py`.
- **Review status:** IMPLEMENTED.

### CHG-P3-019: `backend/app/schemas/__init__.py`, `backend/app/schemas/user.py`, `backend/app/schemas/auth.py`
- **Action:** CREATE
- **Reason / intended outcome:** Pydantic request and response schemas for authentication, token exchange, user profiles, preferences, and admin role/status changes.
- **Requirement/source traceability:** SRS `FR-AUTH-01`, `FR-AUTH-02`, `FR-AUTH-06`.
- **Distinct edits:** Created validated schemas with `from_attributes=True` and `extract_role_name` field validator.
- **Impact:** API contracts and input validation.
- **Validation evidence:** Tested in endpoint tests.
- **Review status:** IMPLEMENTED.

### CHG-P3-020: `backend/app/services/audit_service.py`
- **Action:** CREATE
- **Reason / intended outcome:** Helper service to construct and persist `SecurityAuditEvent` records.
- **Requirement/source traceability:** SRS `FR-SEC-01`.
- **Distinct edits:** Created `log_audit_event` helper.
- **Impact:** Security logging service.
- **Validation evidence:** Verified via live DB inspection.
- **Review status:** IMPLEMENTED.

### CHG-P3-021: `backend/app/services/auth_service.py`
- **Action:** CREATE
- **Reason / intended outcome:** Core authentication business logic: student registration, login, token refresh rotation, logout session revocation, password update.
- **Requirement/source traceability:** SRS `FR-AUTH-01` to `FR-AUTH-04`; `DEC-P3-001` to `DEC-P3-003`.
- **Distinct edits:** Cookie management, session issuance, and credential verification.
- **Impact:** Authentication service layer.
- **Validation evidence:** Tested in `tests/test_auth_endpoints.py` and live E2E test.
- **Review status:** IMPLEMENTED.

### CHG-P3-022: `backend/app/services/admin_service.py`
- **Action:** CREATE
- **Reason / intended outcome:** Privileged administrator operations with anti-lockout safeguards and `with_for_update()` transactional concurrency locks.
- **Requirement/source traceability:** SRS `FR-AUTH-05`, `NFR-SEC-04`; `DEC-P3-004`.
- **Distinct edits:** Implemented `update_user_role` and `update_user_status` with self-demotion, self-deactivation, and last-admin demotion blocks.
- **Impact:** Administrator service layer.
- **Validation evidence:** Tested in `tests/test_admin_guardrails.py`.
- **Review status:** IMPLEMENTED.

### CHG-P3-023: `backend/app/api/v1/endpoints/auth.py`, `users.py`, `admin.py`
- **Action:** CREATE
- **Reason / intended outcome:** Versioned API endpoints for authentication (`/auth/*`), profile and password management (`/users/*`), and admin user operations (`/admin/*`).
- **Requirement/source traceability:** `API_CONTRACT.md` Section 3.1.
- **Distinct edits:** Created route handlers with dependency injection.
- **Impact:** Public API v1 surface.
- **Validation evidence:** Tested in endpoint test suites.
- **Review status:** IMPLEMENTED.

### CHG-P3-024: `backend/app/api/v1/router.py`
- **Action:** MODIFY
- **Reason / intended outcome:** Mounted `auth`, `users`, and `admin` sub-routers under `/api/v1`.
- **Requirement/source traceability:** API routing architecture.
- **Distinct edits:** Added includes for all 3 sub-routers.
- **Impact:** API routing.
- **Validation evidence:** Tested via TestClient and live curl/python requests.
- **Review status:** IMPLEMENTED.

### CHG-P3-025: `backend/app/main.py`
- **Action:** MODIFY
- **Reason / intended outcome:** Added `CORSMiddleware` with `allow_credentials=True` and `settings.CORS_ORIGINS`.
- **Requirement/source traceability:** Web security standards for cross-origin cookie authentication.
- **Distinct edits:** Configured `CORSMiddleware`.
- **Impact:** Cross-origin request processing.
- **Validation evidence:** Verified via live requests.
- **Review status:** IMPLEMENTED.

### CHG-P3-026: `backend/tests/conftest.py`
- **Action:** MODIFY
- **Reason / intended outcome:** Configured thread-safe in-memory SQLite engine with `StaticPool` and `check_same_thread=False` to support concurrent requests from FastAPI `TestClient`.
- **Requirement/source traceability:** Testing harness reliability.
- **Distinct edits:** Updated `test_engine`, `db_session`, and `client_with_db` fixtures.
- **Impact:** Pytest test harness.
- **Validation evidence:** All 52 backend tests pass cleanly.
- **Review status:** IMPLEMENTED.

### CHG-P3-027: `backend/tests/test_auth_endpoints.py`, `test_rbac_authorization.py`, `test_admin_guardrails.py`, `test_user_profile_security.py`, `test_migrations_postgres.py`
- **Action:** CREATE / MODIFY
- **Reason / intended outcome:** Complete test coverage for Phase 3 authentication, RBAC, admin safeguards, and PostgreSQL migration lifecycle.
- **Requirement/source traceability:** SRS Acceptance Criteria.
- **Distinct edits:** 21 new tests added; total 52 tests passing.
- **Impact:** Automated verification suite.
- **Validation evidence:** `52 passed in 17.66s`.
- **Review status:** IMPLEMENTED.

### CHG-P3-028: `frontend/src/services/api/authApi.ts`
- **Action:** CREATE
- **Reason / intended outcome:** Frontend typed API client for `/api/v1/auth/*` and `/api/v1/users/*` with automatic `credentials: 'include'` and silent token refresh.
- **Requirement/source traceability:** `PHASE-03_AUTHENTICATION_RBAC.md` Section 9.
- **Distinct edits:** Implemented `authApi` client class and `mapUserResponseToStudentUser` adapter.
- **Impact:** Frontend API layer.
- **Validation evidence:** Frontend builds and tests pass cleanly.
- **Review status:** IMPLEMENTED.

### CHG-P3-029: `frontend/src/pages/student/SignInPage.tsx`, `CreateAccountPage.tsx`
- **Action:** MODIFY
- **Reason / intended outcome:** Replaced mock `setTimeout` authentication and pre-filled inputs with live backend API calls.
- **Requirement/source traceability:** SRS `FR-AUTH-01`, `FR-AUTH-02`.
- **Distinct edits:** Wired `authApi.login` and `authApi.register`, empty initial input state, error handling.
- **Impact:** Student portal authentication UI.
- **Validation evidence:** Frontend tests (29/29) and Vite build passed in 2.34s.
- **Review status:** IMPLEMENTED.

### CHG-P3-030: `frontend/src/App.tsx`
- **Action:** MODIFY
- **Reason / intended outcome:** Restored active session on mount via `authApi.getMe()` and wired live logout to `authApi.logout()`. Preserved all non-auth mock workflows intact.
- **Requirement/source traceability:** `PHASE-03_AUTHENTICATION_RBAC.md` Section 9.
- **Distinct edits:** Added mount `useEffect` and async logout handler.
- **Impact:** Root application component.
- **Validation evidence:** Frontend tests (29/29) and Vite build passed.
- **Review status:** IMPLEMENTED.

### CHG-P3-031: `frontend/vite.config.ts`
- **Action:** MODIFY
- **Reason / intended outcome:** Added proxy configuration forwarding `/api` to `BACKEND_URL` (`http://backend:8000`).
- **Requirement/source traceability:** Development networking.
- **Distinct edits:** Configured `server.proxy` for `/api`.
- **Impact:** Vite dev server proxying.
- **Validation evidence:** Proxied live request returned 200 OK.
- **Review status:** IMPLEMENTED.
