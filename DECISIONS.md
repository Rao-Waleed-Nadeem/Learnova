# Learnova Architecture Decisions Record (ADR)

**Document Status:** Baseline Approved for Phase 0  
**Authority:** `Learnova_Master_Backend_Implementation_Blueprint.md`, Sections 14.3 & 15  
**Last Updated:** Phase 0 Baseline Audit (2026-11-06)

---

## Decision Entries

### DEC-001: Normalized Topic Mastery Scale & Algorithm
- **Context:** `frontend/src/utils/studentLogic.ts` and `storageService.ts` currently compute mastery on an integer scale from `0` to `100` (`MasteryStatus: 'novice' | 'developing' | 'proficient' | 'mastered'`). Blueprint Section 5.5 and 7.3 note that persistence standards often utilize a normalized `0.0000` to `1.0000` float or decimal.
- **Options:**
  1. Store `0.0` to `1.0` as `DECIMAL(5,4)` in PostgreSQL and serialize as integer percentage `0–100` for the frontend.
  2. Store `0` to `100` as `INTEGER` across both database and frontend API.
- **Recommendation:** Option 1. Stores mathematically precise normalized decimals in PostgreSQL while preserving 100% compatibility with existing frontend display logic.
- **Affected Phases:** Phase 2, Phase 6, Phase 7.
- **Owner Status:** PENDING OWNER APPROVAL.

---

### DEC-002: Modular Monolith vs Distributed Architecture
- **Context:** The repository blueprint recommends building Learnova as a modular monolith within FastAPI and PostgreSQL, deferring Redis or distributed brokers (Kafka/RabbitMQ) until measured demand requires them.
- **Options:**
  1. Modular monolith: single FastAPI service, shared connection pool, schema-isolated domain models, database-backed outbox for events.
  2. Distributed services: separate auth, assessment, and gamification microservices.
- **Recommendation:** Option 1 (Modular monolith), as specified in Blueprint Section 2.2. Maximizes developmental velocity, transactional consistency, and deployment simplicity.
- **Affected Phases:** Phases 1 through 12.
- **Owner Status:** APPROVED IN BLUEPRINT (Awaiting explicit formal sign-off).

---

### DEC-003: Staged AI Endpoint Migration Timing
- **Context:** Express on port 3000 currently serves `POST /api/ai/generate-questions` and `POST /api/ai/simplify-lesson`. Moving them immediately to FastAPI in Phase 1 would break frontend functionality before FastAPI proxying is established.
- **Options:**
  1. Retain Express AI routes on port 3000 during early backend phases (Phases 1–8); migrate to FastAPI behind a standardized LLM adapter in Phase 9.
  2. Immediately port AI routes to FastAPI in Phase 1.
- **Recommendation:** Option 1. Preserves existing working frontend AI capabilities while focusing initial phases on core backend foundations, auth, curriculum, and assessments.
- **Affected Phases:** Phase 1, Phase 9, Phase 11.
- **Owner Status:** PENDING OWNER APPROVAL.

---

### DEC-004: Development Seed Strategy & Credential Handling
- **Context:** Frontend `storageService.ts` contains hardcoded mock accounts (`adm-sarah`, `teacher-101`, `student-1`). Operating rules strictly forbid committing default production accounts or plain credentials.
- **Options:**
  1. Implement a dedicated CLI seed script (`python -m app.cli.seed`) that executes only when `ENVIRONMENT=development` and reads seed credentials from `.env`.
  2. Auto-seed default accounts on Alembic migration run.
- **Recommendation:** Option 1. Explicit, guarded, and prevents accidental credential seeding in non-development environments.
- **Affected Phases:** Phase 2, Phase 3.
- **Owner Status:** PENDING OWNER APPROVAL.

---

### DEC-005: Question Scoring & Partial Credit Model
- **Context:** Question types include `multiple_choice`, `true_false`, `fill_blank`, `matching`, and `short_answer`.
- **Options:**
  1. Binary scoring (full or zero points) for objective types; partial credit permitted for matching pairs and rubric-based short answers.
  2. Strict all-or-nothing scoring for all question types.
- **Recommendation:** Option 1. Matches educational expectations and the existing frontend `matchingPairs` structure.
- **Affected Phases:** Phase 5, Phase 6.
- **Owner Status:** PENDING OWNER APPROVAL.

---

### DEC-006: Asynchronous Gamification Event Processing
- **Context:** Source requirements demand that gamification (XP, leveling, badges, streaks) be decoupled from academic evaluation and mastery recalibration.
- **Options:**
  1. Transactional Outbox pattern: Assessment completion writes a domain event (`gamification_events` table) within the same database transaction; an asynchronous worker processes events idempotently.
  2. Direct synchronous function call in the assessment route.
- **Recommendation:** Option 1 (Transactional Outbox). Guarantees zero academic rollbacks due to gamification errors, ensures idempotency, and eliminates race conditions.
- **Affected Phases:** Phase 8.
- **Owner Status:** PENDING OWNER APPROVAL.

---

### DEC-007: Reference Documentation Baseline Authority
- **Context:** In Phase 0, `Learnova_SRS_Final_Aligned_V2.docx` was missing. In commit `abd879e`, the project owner provided `Learnova_SRS_Final_Aligned_V2 (1).docx` in `docs/sources/`.
- **Resolution:** Requirements traceability is now verified directly against `Learnova_SRS_Final_Aligned_V2 (1).docx`, `Learnova_Final_SSDs_V2.xml`, `Readme.md`, and the Master Blueprint.
- **Affected Phases:** All phases.
- **Owner Status:** RESOLVED.

---

### DEC-P1-001: Synchronous SQLAlchemy with psycopg2-binary Driver Strategy
- **Context:** Blueprint Section 5.10 and 16 recommend selecting one deliberate driver strategy without mixing async and sync drivers.
- **Options:**
  1. Synchronous SQLAlchemy 2.0+ with `psycopg2-binary`.
  2. Asynchronous SQLAlchemy 2.0+ with `asyncpg`.
- **Decision:** Option 1. Simplifies Alembic migrations (native sync execution), provides high stability in Python 3.12, eliminates async session bridge complexity, and performs with high throughput via FastAPI's threadpool execution for synchronous dependencies.
- **Affected Files:** `backend/requirements.txt`, `backend/app/db/session.py`, `backend/alembic/env.py`.
- **Owner Status:** APPROVED.

---

### DEC-P1-002: Liveness vs Readiness Endpoint Topology & Backwards Compatibility
- **Context:** `PHASE-01_BACKEND_FOUNDATION.md` AC-3 requires distinguishing application availability from database readiness while preserving `/health` compatibility (AC-4).
- **Options:**
  1. Root `/health` remains backward-compatible returning `{"status": "ok", "service": "learnova-api"}`; Root `/ready` checks DB connectivity returning `200` (ready) or `503` (not ready). Additionally, `/api/v1/health/liveness` and `/api/v1/health/readiness` provide structured monitoring.
  2. Change `/health` to fail if database is disconnected.
- **Decision:** Option 1. Guarantees 100% backward compatibility with existing Docker Compose and external probes while providing precise readiness diagnostics.
- **Affected Files:** `backend/app/main.py`, `backend/app/api/v1/endpoints/health.py`.
- **Owner Status:** APPROVED.


---

### DEC-P2-001 (Blueprint DEC-04): Single Active Role per User
- **Context:** `frontend/src/types/index.ts` models `UserAccount` with a single `role: UserRole` (`student | teacher | administrator`). D1 mentions assigned roles; Blueprint Section 7.2 requires confirming role cardinality.
- **Options:**
  1. Single active role per user, referencing a normalized `roles` lookup table (`student`, `teacher`, `administrator`).
  2. Multi-role array/JSON per user.
- **Decision:** Option 1. Preserves 100% alignment with current UI capabilities and admin guardrails while maintaining strict referential integrity.
- **Affected Files:** `backend/app/models/user.py`, `backend/app/models/role.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).

---

### DEC-P2-002 (Blueprint DEC-05): Teacher-to-Course Many-to-Many Assignment Junction
- **Context:** Teachers must be restricted to assigned courses. Source requirements do not limit courses to a single instructor.
- **Options:**
  1. Single teacher foreign key on `courses` table.
  2. Many-to-many junction entity `course_teachers`.
- **Decision:** Option 2. Supports multi-instructor courses, co-teaching, and granular course scoping.
- **Affected Files:** `backend/app/models/course_teacher.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).

---

### DEC-P2-003 (Blueprint DEC-02): Topic Mastery Threshold Normalized Unit
- **Context:** Blueprint Section 7.3 recommends internal normalized range `[0.0, 1.0]` with percentage conversion at API boundaries.
- **Options:**
  1. Store integer percentage (`75`).
  2. Store normalized float/decimal (`0.7500`) with check constraint `[0.0000, 1.0000]`.
- **Decision:** Option 2. Guarantees mathematical consistency across adaptive algorithms without hardcoding threshold logic into the schema.
- **Affected Files:** `backend/app/models/topic.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).

---

### DEC-P2-004 (Blueprint DEC-11): Provider-Neutral Learning Resource Metadata
- **Context:** Resources have types `document`, `video`, `markdown`, `code`, `link`. File upload infrastructure and cloud vendor selection are out of scope for Phase 2.
- **Options:**
  1. Store file blobs in PostgreSQL (`BYTEA`).
  2. Prematurely bind schema to AWS S3 / Google Cloud Storage SDKs.
  3. Store provider-neutral metadata (`type`, `content_or_url`, `file_size_bytes`).
- **Decision:** Option 3. Fully supports current frontend content requirements while remaining storage-agnostic.
- **Affected Files:** `backend/app/models/resource.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).

---

### DEC-P2-005: Surrogate UUIDv4 Primary Keys
- **Context:** System requires stable, collision-free identifiers compatible with frontend string IDs (`id: string`).
- **Options:**
  1. Sequential integers (`BIGSERIAL`).
  2. UUIDv4 primary keys.
- **Decision:** Option 2. Standardizes identifiers across all domain models without exposing table counts or sequential enumeration vulnerabilities.
- **Affected Files:** All models in `backend/app/models/`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).


---

### DEC-P3-001 (Blueprint DEC-08): Token Lifecycle & Server-Side Revocable Session Model
- **Context:** Stateless JWT access tokens cannot be revoked individually before expiration. Logout, account deactivation, and session invalidation after password changes require revocable state.
- **Options:**
  1. Stateless JWT access tokens without server revocation.
  2. Redis-backed token blacklist.
  3. Server-side session table in PostgreSQL tracking hashed refresh tokens and revocation state.
- **Decision:** Option 3. Short-lived access tokens (15 minutes) minimize the exposure window, while rotating refresh tokens tracked in `sessions` provide authoritative revocation on logout or security events.
- **Affected Files:** `backend/app/models/session.py`, `backend/app/services/auth_service.py`.
- **Owner Status:** PROPOSED IN PHASE 3 PLAN (Awaiting owner sign-off).

---

### DEC-P3-002 (Blueprint DEC-09): Browser Credential Transport & Cookie Protection
- **Context:** Storing long-lived tokens in browser `localStorage` exposes them to XSS exfiltration.
- **Options:**
  1. Store access and refresh tokens in browser `localStorage`.
  2. Store refresh token in `HttpOnly, SameSite=Lax, Secure` cookie; keep short-lived access token in frontend memory.
- **Decision:** Option 2. Protects refresh tokens from XSS theft while keeping access tokens short-lived and ephemeral.
- **Affected Files:** `backend/app/api/v1/endpoints/auth.py`, `frontend/src/services/api/authApi.ts`.
- **Owner Status:** PROPOSED IN PHASE 3 PLAN (Awaiting owner sign-off).

---

### DEC-P3-003 (Blueprint DEC-10): Public Registration & Bootstrap Policy
- **Context:** Frontend `CreateAccountPage.tsx` registers student accounts. Blueprint Section 10 requires defining registration permissions and bootstrap procedures.
- **Options:**
  1. Public registration accepts arbitrary client-supplied role flags.
  2. Public registration provisions `student` accounts ONLY. Teachers are provisioned/invited by administrators. Initial administrator is created via secure bootstrap CLI.
- **Decision:** Option 2. Eliminates privilege escalation vulnerabilities.
- **Affected Files:** `backend/app/services/auth_service.py`.
- **Owner Status:** PROPOSED IN PHASE 3 PLAN (Awaiting owner sign-off).

---

### DEC-P3-004: Transactional Admin Lockout Safeguards
- **Context:** Frontend checks in `adminLogic.ts` prevent self-demotion, self-deactivation, and demoting the last active administrator, but can be bypassed via direct API calls or raced by concurrent requests.
- **Options:**
  1. Rely on frontend checks only.
  2. Backend non-locking count check.
  3. Transactional backend check with database row lock (`SELECT count(*) FROM users WHERE role_id = :admin_role_id AND is_active = true FOR UPDATE`).
- **Decision:** Option 3. Guarantees that concurrent requests cannot demote or deactivate the last active administrator.
- **Affected Files:** `backend/app/services/admin_service.py`.
- **Owner Status:** PROPOSED IN PHASE 3 PLAN (Awaiting owner sign-off).

---

### DEC-P3-005: Teacher-to-Course Access Enforcement at Service/Query Boundary
- **Context:** In SSD-07 and SSD-08, teachers manage curriculum and questions for specific courses. Role checking alone does not prevent access to unassigned courses.
- **Options:**
  1. Global teacher access to all courses.
  2. Service and query boundary checking `course_teachers` junction table on all course-specific teacher operations.
- **Decision:** Option 2. Enforces multi-tenant course data isolation authoritatively in backend queries.
- **Affected Files:** `backend/app/core/dependencies.py`.
- **Owner Status:** PROPOSED IN PHASE 3 PLAN (Awaiting owner sign-off).
