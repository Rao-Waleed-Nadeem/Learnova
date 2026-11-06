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
- **Context:** `Learnova_SRS_Final_Aligned_V2.docx` is not present in `docs/sources/`. However, `docs/sources/Readme.md` contains the exhaustive system diagram specification, all 18 use cases, 8 SSDs, DFDs, and business rules, and `Learnova_Master_Backend_Implementation_Blueprint.md` contains the verified architectural analysis.
- **Options:**
  1. Formally designate `docs/sources/Readme.md` and `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md` as the authoritative requirements baseline for backend implementation.
  2. Halt work until `Learnova_SRS_Final_Aligned_V2.docx` is supplied by the project owner.
- **Recommendation:** Option 1, subject to project owner confirmation.
- **Affected Phases:** All phases.
- **Owner Status:** PENDING OWNER APPROVAL.
