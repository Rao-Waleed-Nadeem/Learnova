# Issues and Decisions — Phase 03 (Authentication and Role-Based Access Control)

**Phase:** Phase 3 — Authentication and Role-Based Access Control (RBAC)  
**Stage:** Stage A (Planning & Audit Only)  
**Date:** 2026-11-08  
**Status:** **SUBMITTED FOR PROJECT OWNER REVIEW**

---

## 1. Architectural Decisions

### DEC-P3-001 (Blueprint DEC-08): Token Lifecycle & Server-Side Revocable Session Model
- **Context:** Stateless JWT access tokens cannot be revoked individually before expiration. Individual user logout, account deactivation, and session invalidation after password changes require revocable state.
- **Options Considered:**
  1. Pure stateless JWTs without revocation (logout is client-side only).
  2. Redis-backed token blacklist.
  3. Server-side session table in PostgreSQL tracking hashed refresh tokens and revocation flags.
- **Decision:** Option 3. Matches the modular monolith architecture without introducing Redis prematurely. Short-lived access tokens (15 minutes) minimize the exposure window, while rotating refresh tokens tracked in `sessions` provide authoritative revocation on logout or security events.
- **Impact:** New `sessions` table storing `user_id`, `refresh_token_hash` (SHA-256), `is_revoked`, `expires_at`, `last_used_at`.

---

### DEC-P3-002 (Blueprint DEC-09): Browser Credential Transport & Cookie Protection
- **Context:** Storing long-lived tokens in browser `localStorage` exposes them to XSS exfiltration. Storing access tokens in cookies introduces CSRF complexity on standard API requests.
- **Options Considered:**
  1. Store access and refresh tokens in browser `localStorage`.
  2. Store refresh token in `HttpOnly, SameSite=Lax, Secure` cookie; keep short-lived access token in frontend memory (React state / closure).
  3. Store both tokens in `HttpOnly` cookies with custom CSRF header validation.
- **Decision:** Option 2. Provides the optimal defense-in-depth posture: XSS scripts cannot read the `HttpOnly` refresh cookie; the in-memory access token expires in 15 minutes; and same-origin / CORS credential policies prevent cross-origin abuse.
- **Impact:** `POST /api/v1/auth/login` and `/refresh` set `learnova_refresh_token` cookie and return `access_token` in response body.

---

### DEC-P3-003 (Blueprint DEC-10): Public Registration & Bootstrap Policy
- **Context:** Frontend `CreateAccountPage.tsx` currently registers student accounts. Blueprint Section 10 requires defining registration permissions and bootstrap procedures.
- **Options Considered:**
  1. Public registration accepts arbitrary client-supplied role flags (`student`, `teacher`, `administrator`).
  2. Public registration provisions `student` accounts ONLY. Teachers are provisioned/invited by administrators. Initial administrator is created via secure bootstrap CLI.
- **Decision:** Option 2. Eliminates privilege escalation vulnerabilities. Any role parameter passed to `POST /api/v1/auth/register` is rejected or sanitized to `student`.
- **Impact:** `auth_service.py` forces `role_id` to student role.

---

### DEC-P3-004: Transactional Admin Lockout Safeguards
- **Context:** `frontend/src/utils/adminLogic.ts` contains client-side checks preventing self-demotion, self-deactivation, and demoting the last active administrator. Client checks can be bypassed by direct API calls or raced by concurrent requests.
- **Options Considered:**
  1. Rely on frontend checks only.
  2. Non-locking backend check (`SELECT count(*)` before update).
  3. Transactional backend check with database row/table lock (`SELECT count(*) FROM users WHERE role_id = :admin_role_id AND is_active = true FOR UPDATE`).
- **Decision:** Option 3. Guarantees that concurrent requests cannot demote or deactivate the last active administrator, preventing permanent platform administrative lockout.
- **Impact:** Enforced in `admin_service.py` inside database transactions.

---

### DEC-P3-005: Teacher-to-Course Access Enforcement at Service/Query Boundary
- **Context:** In SSD-07 and SSD-08, teachers manage curriculum and questions for specific courses. Role checking alone (`is_teacher`) does not prevent a teacher from accessing courses assigned to another teacher.
- **Options Considered:**
  1. Global teacher access to all courses.
  2. Service and query boundary checking `course_teachers` junction table on all course-specific teacher operations.
- **Decision:** Option 2. Enforces multi-tenant course data isolation authoritatively in backend SQL queries.
- **Impact:** Reusable dependency `require_teacher_assigned_to_course(course_id)` queries `course_teachers`.

---

### DEC-P3-006: Password Hashing Library Strategy (`bcrypt`)
- **Context:** SRS `NFR-SEC-01` mandates bcrypt password hashing. `passlib` has known deprecation warnings under Python 3.12.
- **Options Considered:**
  1. Use `passlib[bcrypt]`.
  2. Use `bcrypt` library directly (`bcrypt>=4.2.0`).
- **Decision:** Option 2. Direct `bcrypt` library is actively maintained, modern, fast, and has zero deprecation warnings on Python 3.12.
- **Impact:** `backend/requirements.txt` adds `bcrypt>=4.2.0`.

---

## 2. Issues and Blockers Log

| Issue ID | Description | Severity | Resolution / Status |
|---|---|:---:|---|
| **ISS-P3-001** | Python 3.12 import shadowing in `conftest.py` | Medium | Identified and resolved during Phase 2 Stage B verification: aliased `from app.main import app as fastapi_app` to prevent module shadowing. Verified clean for Phase 3. |
| **ISS-P3-002** | Local development HTTP cookie support | Low | Browser `Secure` cookie flag requires HTTPS. In local development (`ENVIRONMENT=development`), `secure=False` is set on the cookie so localhost HTTP functions smoothly; production configuration enforces `secure=True`. |
---

## 2. Implementation Issues Encountered & Resolved (Stage B)

### ISS-P3-001: Pydantic EmailStr Requires email-validator Package
- **Symptom:** Pydantic schema validation raised `ImportError: email-validator is not installed, run pip install 'pydantic[email]'` during schema evaluation.
- **Root Cause:** In Pydantic v2, `EmailStr` requires the optional `email-validator` dependency for RFC-compliant email parsing.
- **Resolution:** Added `email-validator>=2.2.0` to `backend/requirements.txt` and installed in backend container.

### ISS-P3-002: UserResponse Role Relationship Serialization
- **Symptom:** Pydantic `UserResponse.model_validate(user)` failed with `Input should be a valid string, input_value=<Role ...>`.
- **Root Cause:** In SQLAlchemy `User`, `user.role` is a relationship pointing to a `Role` object (`Role.name`), while the API schema declares `role: str`.
- **Resolution:** Added `@field_validator("role", mode="before")` to `UserResponse` extracting `v.name` if present.

### ISS-P3-003: SQLite In-Memory Cross-Thread Access in TestClient
- **Symptom:** `sqlite3.ProgrammingError: SQLite objects created in a thread can only be used in that same thread.`
- **Root Cause:** FastAPI `TestClient` runs requests inside worker threads. Default in-memory SQLite disallows sharing connection objects across threads.
- **Resolution:** Updated `test_engine` in `conftest.py` with `connect_args={"check_same_thread": False}` and `poolclass=StaticPool`.

### ISS-P3-004: Postgres Disposable Migration Test Revision Update
- **Symptom:** `AssertionError: assert 'learning_resources' not in tables_after_downgrade` during downgrade `-1`.
- **Root Cause:** `test_migrations_postgres.py` previously assumed `20261108_0004` was head. With `20261108_0005`, `-1` downgrades from 0005 to 0004, removing `sessions` and `security_audit_events` while retaining `learning_resources`.
- **Resolution:** Updated assertion to verify `sessions` and `security_audit_events` are removed on `-1` downgrade.
