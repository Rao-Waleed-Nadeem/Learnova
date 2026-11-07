# Issues and Decisions — Phase 02 (Initial Domain Schema and Migrations)

**Phase:** Phase 2 — Initial Domain Schema and Migrations  
**Stage:** Stage B (Implementation & Verification Completed)  
**Date:** 2026-11-07  
**Status:** **RESOLVED — READY FOR REVIEW**

---

## 1. Architectural Decisions

### DEC-P2-001 (Blueprint DEC-04): Single Active Role per User
- **Context:** The frontend `UserAccount` interface has a single `role: 'student' | 'teacher' | 'administrator'`. The architecture README mentions assigned roles. Blueprint Section 7.2 calls for deciding role cardinality.
- **Decision:** Single active role per user with FK referencing `roles.id` with `ON DELETE RESTRICT`. Matches current UI behavior and avoids unnecessary array/JSON query complexity.
- **Implementation:** `users.role_id` is a non-null UUID referencing `roles(id)` ondelete RESTRICT. Canonical roles (`student`, `teacher`, `administrator`) inserted via migration `20261108_0001`.
- **Status:** **IMPLEMENTED & VERIFIED**.

---

### DEC-P2-002 (Blueprint DEC-05): Teacher-to-Course Cardinality
- **Context:** Source requirements state teachers are restricted to accessing assigned courses, but do not specify whether courses can have multiple teachers.
- **Decision:** Many-to-many teacher-course assignment via explicit junction table `course_teachers`.
- **Implementation:** `course_teachers` table with composite primary key `(course_id, teacher_id)` and CASCADE foreign keys to `courses(id)` and `users(id)`.
- **Status:** **IMPLEMENTED & VERIFIED**.

---

### DEC-P2-003 (Blueprint DEC-02): Topic Mastery Threshold Storage Unit
- **Context:** Blueprint Section 7.3 recommends normalized internal values from `0.0` to `1.0`, converting to percentages (`0–100`) at API/UI boundaries. The frontend mock currently uses integer percentages (e.g., `75`).
- **Decision:** Normalized decimal (`NUMERIC(5,4)` in interval `[0.0000, 1.0000]`). Avoids scale confusion across future Bayesian Knowledge Tracing (BKT) / Elo calculations, while API serializers in Phase 4 convert to percentage for the frontend.
- **Implementation:** `topics.mastery_threshold` column has default `0.7500` and check constraint `mastery_threshold >= 0.0000 AND mastery_threshold <= 1.0000`.
- **Status:** **IMPLEMENTED & VERIFIED**.

---

### DEC-P2-004 (Blueprint DEC-11): Provider-Neutral Resource Storage Metadata
- **Context:** Resources in the frontend mock have types `document`, `video`, `markdown`, `code`, `link` with string content or URL. Phase 2 must not implement file uploads or choose a cloud storage vendor prematurely.
- **Decision:** Provider-neutral metadata cleanly decouples schema design from future object storage decisions.
- **Implementation:** `learning_resources` table stores `type` (with check constraint `ck_learning_resources_type`), `content_or_url`, and optional `file_size_bytes`.
- **Status:** **IMPLEMENTED & VERIFIED**.

---

### DEC-P2-005: Surrogate Primary Key Strategy (UUIDv4)
- **Context:** The system needs stable, non-guessable identifiers across distributed clients and future API calls.
- **Decision:** UUIDv4 surrogate keys across all entities.
- **Implementation:** All domain entities use `Uuid(as_uuid=True)` primary keys defaulting to `uuid.uuid4`.
- **Status:** **IMPLEMENTED & VERIFIED**.

---

### DEC-P2-006: Relational Normalization of Lessons and Resources
- **Context:** In `frontend/src/types/index.ts`, both `Lesson` and `LearningResource` carry redundant `courseId` properties alongside their direct parent (`topicId` and `lessonId`).
- **Decision:** Strict 3NF normalization. Omit redundant `course_id` from `lessons` and `learning_resources` to eliminate dual-parent desynchronization risk.
- **Implementation:** `lessons` reference `topic_id`; `learning_resources` reference `lesson_id`. Serializers synthesize course context in Phase 4.
- **Status:** **IMPLEMENTED & VERIFIED**.

---

## 2. Issues and Defects Log

| Issue ID | Description | Severity | Resolution / Status |
|---|---|:---:|---|
| **ISS-P2-001** | Instruction package placement | Low | `README_FIRST.md` instructions require copying Phase 2/3 instructions and Universal Prompt into `docs/antigravity-bible/phases/` and `docs/antigravity-bible/`. **Resolved:** Files copied to canonical locations. |
| **ISS-P2-002** | PostgreSQL role name in docker container | Low | The root `.env` configured `POSTGRES_USER=learnova_whz` and `POSTGRES_DB=learnova_whz`. CLI `psql` queries must use credentials from `.env` or application engine. **Resolved:** Verified backend engine connection directly. |
| **ISS-P2-003** | Python import shadowing in test fixtures | Medium | In `conftest.py`, `import app.models` shadowed the module-level import `from app.main import app`, causing `TestClient(app)` to receive `<module 'app'>` instead of the FastAPI app instance in `test_health.py`. **Resolved:** Aliased FastAPI instance import to `from app.main import app as fastapi_app`. All 31 backend tests passed. |
