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
