# Issues and Decisions — Phase 05 (Question Bank & Assessment Authoring)

## Issues Encountered & Resolved

### 1. Disposable Alembic Test Configuration Resolution from Project Root
- **Symptom:** Running `pytest` from `D:\Learnova` resulted in `alembic.util.exc.CommandError: No 'script_location' key found in configuration` or `Path doesn't exist: alembic`.
- **Root Cause:** `test_alembic_disposable.py` initialized `Config("alembic.ini")`, which expects the working directory to be `backend`.
- **Resolution:** Updated `test_alembic_disposable.py` helper `_get_alembic_config` to resolve absolute paths for both `alembic.ini` and `script_location` based on `__file__`. Tests now run seamlessly from both the repository root and `backend` directory.

### 2. Audit Event Logger Parameter Mismatch
- **Symptom:** `TypeError: log_audit_event() got an unexpected keyword argument 'actor'` during question and assessment service execution.
- **Root Cause:** The `log_audit_event` service function defines explicit parameters: `actor_id`, `actor_email`, and `actor_role`.
- **Resolution:** Replaced `actor=actor` with `actor_id=actor.id, actor_email=actor.email, actor_role=actor.role.name if actor.role else None` across `question_service.py` and `assessment_service.py`.

### 3. Role Seeding Dependency in Pytest Fixtures
- **Symptom:** `seed_test_context` threw `AttributeError: 'NoneType' object has no attribute 'id'` when querying the `administrator` role.
- **Root Cause:** Roles are seeded in `conftest.py` inside the `client_with_db` fixture. When a fixture only declares `db_session`, roles have not yet been inserted.
- **Resolution:** Added `client_with_db: TestClient` as a dependency to `seed_test_context` and `seed_assessment_context`, ensuring the in-memory SQLite schema and canonical roles are seeded prior to user creation.

---

## Architectural Decisions Registered

### `DEC-P5-001`: Segregated Deliverable `payload` and Grading `answer_key`
- **Context:** To satisfy `FR-ASM-04` and eliminate any risk of answer leakage to students during exam delivery, assessment taking, or student-facing catalog queries.
- **Decision:** In the PostgreSQL `questions` table, deliverable student content (`options` with ID and text, `left_items`, `right_items`, template) is stored in the `payload` JSONB column. All grading secrets (`correct_option_ids`, `correct_bool`, `accepted_answers`, matching pairs solution mapping, `expected_rubric`) are stored in `answer_key`.
- **Consequences:** Student projection serializers project ONLY `payload` and metadata, making answer leakage structurally impossible at the serialization layer.

### `DEC-P5-002`: Short-Answer Grading Mode Governance (DEC-06 Alignment)
- **Context:** `DEC-06` mandates that automated grading must never implicitly invoke an external or unmonitored LLM.
- **Decision:** Short-answer questions require an explicit `grading_mode`:
  - `"manual_review"`: flags the attempt for teacher evaluation against `expected_rubric`.
  - `"exact_match"`: evaluates normalized student input against explicit, teacher-provided `accepted_answers`.
- **Consequences:** Complete adherence to DEC-06; deterministic grading behavior; audit trail for teacher evaluation.

### `DEC-P5-003`: Assessment Publication Quality Gate & Composition Lock
- **Context:** Students must not take unvalidated or empty assessments; historical assessment validity must be protected from accidental post-publication question modifications.
- **Decision:**
  1. An assessment cannot transition to `published` status unless it contains $\ge 1$ question, all questions belong to the course, and total points $> 0$.
  2. Once published, question composition cannot be modified directly (`400 Bad Request`).
- **Consequences:** Prevents corrupted exams; guarantees grading consistency for all enrolled students.

### `DEC-P5-004`: Monotonic Question Version Pinning
- **Context:** Questions in the question bank evolve over time (e.g. prompt typos fixed, options clarified). Retroactively altering a live or completed exam's question version corrupts historical attempt data.
- **Decision:**
  1. Each question increments `version: int` monotonically on every content update.
  2. The `assessment_questions` junction table records `question_version` at composition time.
- **Consequences:** Composed assessments remain pinned to the exact question snapshot intended by the author, insulating published assessments and historical attempts from future bank revisions.
