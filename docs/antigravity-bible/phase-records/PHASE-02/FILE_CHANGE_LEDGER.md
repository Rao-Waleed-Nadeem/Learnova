# File Change Ledger — Phase 02 (Initial Domain Schema and Migrations)

> Reconcile this ledger against the complete Git diff. Include every changed path, including docs, tests, lockfiles, generated files, configuration, and deletions.

## Non-Modification Invariant Confirmation

**Explicit Statement:**
- **Zero frontend source code files** (`frontend/src/**/*`, `frontend/package.json`, `frontend/server.ts`) were modified or deleted.
- **Zero persistent database data was deleted or altered** (`postgres_data` volume is completely preserved; migrations were safely applied forward).
- Zero authentication/RBAC routes or curriculum API endpoints were created prematurely (deferred to Phases 3 and 4).
- Only approved D1/D2 models, staged migrations, tests, seed script, project control documents, and Phase 2 records were created or modified.

---

## Complete Change Entries

### CHG-P2-001: `backend/app/models/__init__.py`
- **Action:** CREATE
- **Reason / intended outcome:** Package marker and unified model registry exposing all declarative entities to `Base.metadata` for Alembic autogenerate and application-wide queries.
- **Requirement/source traceability:** Blueprint Section 7.1, 16; `PHASE-02_INITIAL_DOMAIN_SCHEMA.md`.
- **Distinct edits:** Created module importing and exporting `Role`, `User`, `UserProfile`, `Course`, `CourseTeacher`, `Topic`, `TopicPrerequisite`, `Lesson`, `LearningResource`.
- **Impact:** Model namespace.
- **Validation evidence:** Tested via `Base.metadata.tables.keys()` in container.
- **Review status:** Implemented & Verified.

### CHG-P2-002: `backend/app/models/role.py`
- **Action:** CREATE
- **Reason / intended outcome:** Declarative entity for system roles, strictly limited to `student`, `teacher`, `administrator`.
- **Requirement/source traceability:** D1, Blueprint Section 7.2, DEC-P2-001.
- **Distinct edits:** Created `Role` class with UUID PK, unique name, `ck_roles_name` check constraint, and users relationship.
- **Impact:** D1 role persistence.
- **Validation evidence:** `test_models_d1.py::test_role_allowed_names`, `test_role_unique_name`.
- **Review status:** Implemented & Verified.

### CHG-P2-003: `backend/app/models/user.py`
- **Action:** CREATE
- **Reason / intended outcome:** Authoritative user account entity storing normalized unique email, password hash (never plaintext), and role relationship.
- **Requirement/source traceability:** D1, NFR-SEC-01, Blueprint Section 7.2.
- **Distinct edits:** Created `User` class with UUID PK, lowercase indexed email, `hashed_password`, `full_name`, `role_id` FK (RESTRICT), `is_active`, timestamps, and relationships.
- **Impact:** D1 identity persistence.
- **Validation evidence:** `test_models_d1.py::test_user_unique_email`, `test_password_hash_never_plaintext`.
- **Review status:** Implemented & Verified.

### CHG-P2-004: `backend/app/models/profile.py`
- **Action:** CREATE
- **Reason / intended outcome:** Decoupled user profile and preferences entity.
- **Requirement/source traceability:** D1, frontend types (`StudentUser`, `TeacherUser`).
- **Distinct edits:** Created `UserProfile` class with 1:1 user cascade FK, bio, department, avatar_url, and JSON preferences with JSONB PostgreSQL dialect support.
- **Impact:** D1 profile persistence.
- **Validation evidence:** `test_models_d1.py::test_user_creation_and_profile_cascade`.
- **Review status:** Implemented & Verified.

### CHG-P2-005: `backend/app/models/course.py`
- **Action:** CREATE
- **Reason / intended outcome:** Course definition entity model with status lifecycle.
- **Requirement/source traceability:** D2, SSD-07, Blueprint Section 7.2.
- **Distinct edits:** Created `Course` class with UUID PK, title, description, `ck_courses_status` check constraint (`draft`, `published`, `archived`), creator FK (SET NULL), timestamps, and relationships.
- **Impact:** D2 curriculum persistence.
- **Validation evidence:** `test_models_d2.py::test_course_status_constraint`, `test_course_creator_set_null`.
- **Review status:** Implemented & Verified.

### CHG-P2-006: `backend/app/models/course_teacher.py`
- **Action:** CREATE
- **Reason / intended outcome:** Explicit many-to-many junction entity for assigning teachers to courses (DEC-P2-002).
- **Requirement/source traceability:** D2, DEC-P2-002, Blueprint Section 7.2, DEC-05.
- **Distinct edits:** Created `CourseTeacher` class with composite PK `(course_id, teacher_id)` and CASCADE FKs.
- **Impact:** Teacher-course data scoping.
- **Validation evidence:** `test_models_d2.py::test_course_teacher_junction`.
- **Review status:** Implemented & Verified.

### CHG-P2-007: `backend/app/models/topic.py`
- **Action:** CREATE
- **Reason / intended outcome:** Topic syllabus node entity with order and normalized mastery threshold.
- **Requirement/source traceability:** D2, DEC-P2-003, Blueprint Section 7.3.
- **Distinct edits:** Created `Topic` class with course FK (CASCADE), title, `ck_topics_order` (`order >= 0`), `ck_topics_mastery_threshold` (`0.0 <= threshold <= 1.0`), and DAG relationships.
- **Impact:** D2 syllabus persistence.
- **Validation evidence:** `test_models_d2.py::test_topic_order_and_mastery_bounds`.
- **Review status:** Implemented & Verified.

### CHG-P2-008: `backend/app/models/topic_prerequisite.py`
- **Action:** CREATE
- **Reason / intended outcome:** Directed edge table for the prerequisite DAG rejecting self-loops and duplicate edges.
- **Requirement/source traceability:** D2, SSD-02, Blueprint Section 7.2.
- **Distinct edits:** Created `TopicPrerequisite` class with composite PK `(topic_id, prerequisite_topic_id)` and `ck_topic_prerequisites_no_self_edge` (`topic_id <> prerequisite_topic_id`).
- **Impact:** DAG edge persistence.
- **Validation evidence:** `test_models_d2.py::test_topic_prerequisite_no_self_edge`, `test_topic_prerequisite_duplicate_edge`.
- **Review status:** Implemented & Verified.

### CHG-P2-009: `backend/app/models/lesson.py`
- **Action:** CREATE
- **Reason / intended outcome:** Instructional unit within topics, normalized without redundant `course_id`.
- **Requirement/source traceability:** D2, Blueprint Section 7.2 (avoid redundant foreign keys).
- **Distinct edits:** Created `Lesson` class with topic FK (CASCADE), title, `ck_lessons_order` (`order >= 0`), timestamps, and resource relationships.
- **Impact:** Lesson persistence.
- **Validation evidence:** `test_models_d2.py::test_curriculum_hierarchy_cascades`.
- **Review status:** Implemented & Verified.

### CHG-P2-010: `backend/app/models/resource.py`
- **Action:** CREATE
- **Reason / intended outcome:** Provider-neutral learning resource metadata entity (DEC-P2-004).
- **Requirement/source traceability:** D2, DEC-P2-004, Blueprint Section 7.2, DEC-11.
- **Distinct edits:** Created `LearningResource` class with lesson FK (CASCADE), title, `ck_learning_resources_type` check constraint (`document`, `video`, `markdown`, `code`, `link`), content_or_url, and file_size_bytes.
- **Impact:** Resource metadata persistence.
- **Validation evidence:** `test_models_d2.py::test_learning_resource_type_constraint`.
- **Review status:** Implemented & Verified.

### CHG-P2-011: `backend/alembic/env.py`
- **Action:** MODIFY
- **Reason / intended outcome:** Import `app.models` so Alembic binds all D1/D2 entity metadata to `Base.metadata`.
- **Requirement/source traceability:** Blueprint Section 16; `PHASE-02_INITIAL_DOMAIN_SCHEMA.md`.
- **Distinct edits:** Added `import app.models  # noqa: F401`.
- **Impact:** Alembic autogenerate and migration runner.
- **Validation evidence:** Tested with `alembic heads` and migration runs.
- **Review status:** Implemented & Verified.

### CHG-P2-012: `backend/alembic/versions/20261108_0001_d1_users_and_roles.py`
- **Action:** CREATE
- **Reason / intended outcome:** Migration creating `roles`, `users`, `user_profiles` tables with constraints and canonical role insert.
- **Requirement/source traceability:** D1, P2-AC-01, P2-AC-02.
- **Distinct edits:** Authored staged upgrade and downgrade functions.
- **Impact:** D1 database schema.
- **Validation evidence:** Disposable PostgreSQL test and live upgrade.
- **Review status:** Implemented & Verified.

### CHG-P2-013: `backend/alembic/versions/20261108_0002_d2_courses_and_teachers.py`
- **Action:** CREATE
- **Reason / intended outcome:** Migration creating `courses`, `course_teachers` tables.
- **Requirement/source traceability:** D2, P2-AC-01, P2-AC-02.
- **Distinct edits:** Authored staged upgrade and downgrade functions.
- **Impact:** D2 database schema.
- **Validation evidence:** Disposable PostgreSQL test and live upgrade.
- **Review status:** Implemented & Verified.

### CHG-P2-014: `backend/alembic/versions/20261108_0003_d2_topics_and_prerequisites.py`
- **Action:** CREATE
- **Reason / intended outcome:** Migration creating `topics`, `topic_prerequisites` tables with self-edge check constraint.
- **Requirement/source traceability:** D2, P2-AC-05, P2-AC-06.
- **Distinct edits:** Authored staged upgrade and downgrade functions.
- **Impact:** D2 database schema.
- **Validation evidence:** Disposable PostgreSQL test and live upgrade.
- **Review status:** Implemented & Verified.

### CHG-P2-015: `backend/alembic/versions/20261108_0004_d2_lessons_and_resources.py`
- **Action:** CREATE
- **Reason / intended outcome:** Migration creating `lessons`, `learning_resources` tables with type check constraint.
- **Requirement/source traceability:** D2, P2-AC-05.
- **Distinct edits:** Authored staged upgrade and downgrade functions.
- **Impact:** D2 database schema.
- **Validation evidence:** Disposable PostgreSQL test and live upgrade.
- **Review status:** Implemented & Verified.

### CHG-P2-016: `backend/app/cli/__init__.py`
- **Action:** CREATE
- **Reason / intended outcome:** Package marker for CLI commands.
- **Requirement/source traceability:** Python packaging standard.
- **Distinct edits:** Created module.
- **Impact:** None.
- **Validation evidence:** Import verified.
- **Review status:** Implemented & Verified.

### CHG-P2-017: `backend/app/cli/seed.py`
- **Action:** CREATE
- **Reason / intended outcome:** Development-only database seed CLI command (`python -m app.cli.seed`) enforcing `ENVIRONMENT=development`, initializing canonical roles, and safely handling reruns.
- **Requirement/source traceability:** Blueprint Section 10, DEC-004, P2-AC-11.
- **Distinct edits:** Authored `seed_database()` and CLI entrypoint.
- **Impact:** Controlled dev seeding.
- **Validation evidence:** `test_seed_dev.py` (3 passed) and live execution.
- **Review status:** Implemented & Verified.

### CHG-P2-018: `backend/tests/conftest.py`
- **Action:** MODIFY
- **Reason / intended outcome:** Added `db_session` fixture for SQLite with foreign keys enabled, fixed `app` name shadowing in `client` fixture.
- **Requirement/source traceability:** Testing infrastructure.
- **Distinct edits:** Added `db_session` fixture with `PRAGMA foreign_keys=ON`, alias `app as fastapi_app`.
- **Impact:** Pytest test harness.
- **Validation evidence:** All 31 backend tests pass.
- **Review status:** Implemented & Verified.

### CHG-P2-019: `backend/tests/test_models_d1.py`
- **Action:** CREATE
- **Reason / intended outcome:** Unit tests for D1: Role constraints, unique email, password hash storage, profile cascade, role delete restrict.
- **Requirement/source traceability:** P2-AC-02, P2-AC-05.
- **Distinct edits:** Authored 6 test functions.
- **Impact:** Test suite.
- **Validation evidence:** 6 passed.
- **Review status:** Implemented & Verified.

### CHG-P2-020: `backend/tests/test_models_d2.py`
- **Action:** CREATE
- **Reason / intended outcome:** Unit tests for D2: Course status checks, CourseTeacher composite key, Topic ordering and mastery bounds, TopicPrerequisite self-edge rejection, duplicate edge rejection, Lesson cascade, Resource type checks.
- **Requirement/source traceability:** P2-AC-05, P2-AC-06.
- **Distinct edits:** Authored 8 test functions.
- **Impact:** Test suite.
- **Validation evidence:** 8 passed.
- **Review status:** Implemented & Verified.

### CHG-P2-021: `backend/tests/test_migrations_postgres.py`
- **Action:** CREATE
- **Reason / intended outcome:** Integration test verifying Alembic upgrade/downgrade/upgrade lifecycle on an isolated disposable PostgreSQL database.
- **Requirement/source traceability:** P2-AC-07, P2-AC-08, P2-AC-09.
- **Distinct edits:** Authored fixture creating/dropping isolated PostgreSQL database and test executing Alembic commands.
- **Impact:** Test suite.
- **Validation evidence:** 1 passed (full PostgreSQL lifecycle verified).
- **Review status:** Implemented & Verified.

### CHG-P2-022: `backend/tests/test_seed_dev.py`
- **Action:** CREATE
- **Reason / intended outcome:** Unit tests for development seed CLI verifying production blocking, canonical role seeding, and idempotency.
- **Requirement/source traceability:** P2-AC-11.
- **Distinct edits:** Authored 3 test functions.
- **Impact:** Test suite.
- **Validation evidence:** 3 passed.
- **Review status:** Implemented & Verified.

### CHG-P2-023: `DECISIONS.md`
- **Action:** MODIFY
- **Reason / intended outcome:** Appended Phase 2 architectural decisions `DEC-P2-001` through `DEC-P2-005`.
- **Requirement/source traceability:** `docs/phases/PHASE-02_INITIAL_DOMAIN_SCHEMA.md` Section 6; Blueprint Section 15.
- **Distinct edits:** Documented role cardinality, teacher assignment junction, mastery threshold unit, provider-neutral resource metadata, UUIDv4 primary keys.
- **Impact:** Project architectural record.
- **Validation evidence:** Document updated.
- **Review status:** Implemented & Verified.

### CHG-P2-024: `IMPLEMENTATION_STATUS.md`
- **Action:** MODIFY
- **Reason / intended outcome:** Updated project traceability matrix to mark Phase 2 as IMPLEMENTED and detailed D1/D2 schema in Section 7.
- **Requirement/source traceability:** `agent-prompt.md` Section 9.
- **Distinct edits:** Updated summary table and Section 7.
- **Impact:** Project control document.
- **Validation evidence:** Document updated.
- **Review status:** Implemented & Verified.

### CHG-P2-025: `API_CONTRACT.md`
- **Action:** MODIFY
- **Reason / intended outcome:** Clarified Phase 2 database schema boundary versus Phase 3/4 REST endpoints.
- **Requirement/source traceability:** `docs/phases/PHASE-02_INITIAL_DOMAIN_SCHEMA.md` Section 8.
- **Distinct edits:** Added boundary note to Section 3.
- **Impact:** API specification.
- **Validation evidence:** Document updated.
- **Review status:** Implemented & Verified.

### CHG-P2-026: `docs/antigravity-bible/phases/PHASE-02_INITIAL_DOMAIN_SCHEMA.md`
- **Action:** CREATE
- **Reason / intended outcome:** Placed Phase 2 instruction file into Bible hierarchy per `README_FIRST.md`.
- **Requirement/source traceability:** `README_FIRST.md`.
- **Distinct edits:** Placed file at canonical path.
- **Impact:** Documentation.
- **Validation evidence:** Verified on disk.
- **Review status:** Implemented & Verified.

### CHG-P2-027: `docs/antigravity-bible/phases/PHASE-03_AUTHENTICATION_RBAC.md`
- **Action:** CREATE
- **Reason / intended outcome:** Placed Phase 3 instruction file into Bible hierarchy per `README_FIRST.md`.
- **Requirement/source traceability:** `README_FIRST.md`.
- **Distinct edits:** Placed file at canonical path.
- **Impact:** Documentation.
- **Validation evidence:** Verified on disk.
- **Review status:** Implemented & Verified.

### CHG-P2-028: `docs/antigravity-bible/UNIVERSAL_ANTIGRAVITY_PROMPT_PHASES_02_03.md`
- **Action:** CREATE
- **Reason / intended outcome:** Placed universal prompt into Bible hierarchy per `README_FIRST.md`.
- **Requirement/source traceability:** `README_FIRST.md`.
- **Distinct edits:** Placed file at canonical path.
- **Impact:** Documentation.
- **Validation evidence:** Verified on disk.
- **Review status:** Implemented & Verified.

### CHG-P2-029: `docs/antigravity-bible/phase-records/PHASE-02/*` (6 files)
- **Action:** CREATE / MODIFY
- **Reason / intended outcome:** Complete Phase 2 evidence records (`PLAN.md`, `EXECUTION_LOG.md`, `FILE_CHANGE_LEDGER.md`, `TEST_AND_EVALUATION.md`, `ISSUES_AND_DECISIONS.md`, `PHASE_SUMMARY.md`).
- **Requirement/source traceability:** `agent-prompt.md` Section 6, 7, 8, 10; `PHASE-02_INITIAL_DOMAIN_SCHEMA.md` Section 12.
- **Distinct edits:** Authored full Phase 2 records with test evidence, ledger, and decisions.
- **Impact:** Engineering records.
- **Validation evidence:** Verified on disk and reconciled with Git diff.
- **Review status:** Implemented & Verified.
