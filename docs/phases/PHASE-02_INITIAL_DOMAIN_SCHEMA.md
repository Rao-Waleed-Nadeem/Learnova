# Phase 02 — Initial Domain Schema and Migrations

**Project:** Learnova  
**Goal:** Implement the approved foundational PostgreSQL schema for D1 and D2.  
**Depends on:** Phase 0 and Phase 1 backend foundation.  
**Execution mode:** Plan first; wait for project-owner approval before code changes.

## 1. Mandatory sources

Read the current repository versions of:

1. `docs/sources/Learnova_SRS_Final_Aligned_V2 (1).docx`
2. `docs/sources/Learnova_Final_SSDs_V2.xml`
3. `docs/sources/Readme.md`
4. `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md`
5. `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, and `DECISIONS.md`
6. `docs/antigravity-bible/README_FIRST.md` and `AGENT_OPERATING_RULES.md`
7. Current backend models, SQLAlchemy Base, Alembic migrations, tests, Docker Compose, frontend types, and `storageService.ts`.

SRS/SSDs/Readme define requirements. The Blueprint defines the technical roadmap. Repository code defines current behavior. Do not silently replace source requirements with assumptions.

## 2. Objective and scope

Implement only the foundational schema mapped to:

- **D1 — User Accounts & Roles:** identity, password-hash storage, profiles, roles.
- **D2 — Courses, Curriculum & Resources:** courses, topics, prerequisite edges, lessons, learning resources, and teacher/course assignment.

In scope:
- Approved SQLAlchemy models using the existing `Base`.
- Staged Alembic migrations.
- PK/FK, uniqueness, check constraints, and justified indexes.
- Relationship and migration tests.
- Explicit development-only seed command, with no committed real credentials.
- Accurate updates to decisions, implementation status, and API contract.
- Six phase evidence records.

Out of scope:
- Registration/login/JWT/refresh/logout/auth dependencies (Phase 3).
- Course CRUD, enrollment, curriculum CRUD, and resource APIs (Phase 4).
- D3 question bank/assessments; D4 enrollment/activity; D5 mastery/paths; D6 AI cache; D7 gamification; D8 analytics.
- Assessment attempts/grading, file upload/storage implementation, frontend `storageService.ts` migration, Express AI endpoint changes, microservices, Redis, or Kafka.

Do not create all 22 tables from earlier proposals. The Blueprint says to derive the schema from an approved ER model and implement small domain migrations; exact table count is not a requirement.

## 3. Phase 1 foundation to reuse

The latest repository snapshot reviewed contains:
- FastAPI with `/health`, `/ready`, and `/api/v1/health/*`.
- Pydantic Settings configuration.
- Synchronous SQLAlchemy 2.x with `psycopg2-binary`.
- Shared `backend/app/db/base.py`, engine/session in `backend/app/db/session.py`.
- Alembic scaffold using `Base.metadata`.
- PostgreSQL 17 and backend bind mount in Docker Compose.
- Backend tests and existing frontend regression suite.

Inspect the latest branch before editing. Do not recreate or duplicate these components. Preserve the exact `/health` response, readiness behavior, existing database volume/data, React frontend, and Express AI endpoints.

## 4. Required audit before planning

Inspect `git status`, branch, HEAD, complete diff, untracked files, backend package layout, models, Alembic revisions, actual DB schema/revision (read-only), and Docker configuration. Inspect:

- `frontend/src/types/index.ts`
- `frontend/src/utils/adminLogic.ts`
- `frontend/src/services/storageService.ts`
- Teacher course/curriculum/resource screens and admin user management.
- SRS requirements and SSD-01 / SSD-07.
- Readme D1 and D2 descriptions.

Current frontend evidence:
- `UserRole` is `student | teacher | administrator`.
- `UserAccount` has one `role` property.
- `Course` has title, description, `draft | published | archived` status, timestamps, and creator ID.
- `Topic` belongs to a course, has ordering, prerequisite topic IDs, and a numeric mastery threshold.
- `Lesson` belongs to a topic and course and has ordering.
- `LearningResource` belongs to a lesson and course; types are `document | video | markdown | code | link` and it has content/URL plus optional file size.
- Teacher identity and course assignment are currently mock/frontend concepts, not backend persistence.

Treat frontend types as compatibility evidence, not a mandate to persist every mock field. Derived counts such as `assignedCoursesCount` and `enrolledCoursesCount` should not become authoritative user columns.

## 5. Required conceptual model

Produce an ER diagram and exact table/column proposal in `PLAN.md` before coding.

### 5.1 D1 — User Accounts & Roles

**User:** stable primary key (UUID recommended), normalized unique email, full/display name, password hash field (never plaintext), role reference/approved role representation, active status, created/updated timestamps, and only source-supported profile fields.

**Role:** support exactly `student`, `teacher`, and `administrator`; do not allow arbitrary user-created role values. Role changes are controlled and audited in Phase 3.

**Profile/preferences:** separate from identity if it improves ownership/validation. Do not store UI-only avatar initials or derived course counts as authoritative profile fields.

**Sessions:** token/session lifecycle belongs to Phase 3. Do not implement sessions in this phase.

### 5.2 D2 — Courses, Curriculum & Resources

- **Course:** ID, title, description, `draft | published | archived` status, creator/owner user relationship, timestamps.
- **Teacher assignment:** explicit relationship used to enforce assigned-course access. Prefer an assignment/junction entity if supporting multiple teachers per course and multiple courses per teacher.
- **Topic:** course FK, title, description, ordering. Do not hard-code a universal mastery threshold.
- **Topic prerequisite:** explicit edge table with topic FKs; reject self-edges and duplicate edges. DAG cycle validation is a domain rule for Phase 4, not guaranteed by ordinary FK constraints.
- **Lesson:** topic FK, title, description, ordering. Avoid redundant `course_id` unless integrity is enforced if it is retained.
- **Learning resource:** lesson FK, type from source/UI types, title and metadata. Store external URL or provider-neutral uploaded-file reference; do not store file bytes or implement upload infrastructure here.

## 6. Decisions and recommended defaults

Review `DECISIONS.md` and Blueprint Section 15. Preserve existing IDs and record the selected option and owner status.

### DEC-04 — Single or multiple roles

Evidence: frontend `UserAccount` has one `role`; D1 says assigned roles; Blueprint says cardinality must be decided.

**Recommended initial choice:** one active role per user, matching the current UI. A normalized role reference is acceptable. Record the decision; do not implement multi-role arrays or JSON role lists. If multi-role is required later, add a deliberate migration.

### DEC-05 — Teacher/course assignment cardinality

Source requires teachers to be restricted to assigned courses, but does not define exact cardinality.

**Recommended choice:** explicit course-teacher assignment table supporting multiple teachers per course and multiple courses per teacher. Record this as an architecture decision, not as wording directly specified by the SRS.

### DEC-02 — Mastery scale/threshold

Blueprint recommends normalized internal `0.0–1.0` with percentage conversion at API/UI boundaries. Existing frontend threshold values may use percentages. Do not hard-code 70 or 75. If a threshold is stored now, document its unit and compatibility mapping; otherwise defer it until the adaptive-policy phase.

### DEC-11 — Resource storage

Use provider-neutral metadata only. Distinguish external URLs from future uploaded-file references. Do not choose a cloud vendor or build local/cloud file storage in Phase 2.

### Development seed

The Blueprint calls for a controlled development-only seed process:
- Explicit command only; never run at startup or during migrations.
- Read credentials from environment/secret input.
- Never commit real credentials or production defaults.
- Block execution outside development/test.
- Be safe to rerun or fail clearly on duplicates.
- Do not seed named demo accounts into production.

## 7. Migration rules

- Use the existing SQLAlchemy `Base`, engine, and Alembic environment.
- Ensure every approved model is imported exactly once before Alembic reads metadata.
- Use staged migrations; suggested order:
  1. D1 users/roles/profile foundation.
  2. D2 courses and teacher assignments.
  3. D2 topics and prerequisite edges.
  4. D2 lessons and resource metadata.
- Use explicit PK/FK, normalized-email uniqueness, allowed role/status/resource constraints, and justified indexes.
- Use timezone-aware timestamps consistently.
- Choose deletion behavior deliberately; do not cascade-delete records in ways that destroy identity or future academic history.
- Do not call `Base.metadata.create_all()` at startup.
- Do not edit accepted Phase 1 migration history.
- Never run `docker compose down -v`, delete `postgres_data`, drop schemas, or reset the existing database.

### Migration verification

Use a separately created disposable PostgreSQL database/container. Prove isolation before running migrations. Then:
1. Upgrade empty DB to Alembic head.
2. Inspect tables, constraints, indexes, and FKs.
3. Run relationship and invalid-data tests.
4. Downgrade one revision where safe.
5. Upgrade again to head.
6. Confirm repeated upgrade at head is a no-op.
7. Record exact commands, working directory, outputs, exit codes, and proof the persistent DB was not targeted.

Do not substitute SQLite for PostgreSQL migration verification.

## 8. API and frontend boundary

Phase 2 is models and migrations only. Do not add functional login/registration or course CRUD endpoints. API contract entries for future routes must remain labelled `PROPOSED` or `PLANNED`, not verified current. Do not modify frontend files in this phase.

## 9. Suggested file scope

Inspect the actual repository and provide the exact final file list in `PLAN.md`. Potential paths:

```text
backend/app/models/__init__.py
backend/app/models/user.py
backend/app/models/role.py
backend/app/models/profile.py
backend/app/models/course.py
backend/app/models/course_teacher.py
backend/app/models/topic.py
backend/app/models/topic_prerequisite.py
backend/app/models/lesson.py
backend/app/models/resource.py
backend/alembic/versions/<phase_02_revisions>.py
backend/tests/test_models_*.py
backend/tests/test_migrations_*.py
backend/scripts/seed_dev.py
DECISIONS.md
IMPLEMENTATION_STATUS.md
API_CONTRACT.md
docs/antigravity-bible/phase-records/PHASE-02/*
```

Do not create every candidate file automatically. Only create files justified by the approved model.

## 10. Required tests

- All models import and register with the shared `Base.metadata`.
- Alembic autogenerate detects approved models.
- Normalized email uniqueness is enforced.
- Only the three approved roles can be assigned.
- Course creator and teacher assignment FKs are valid.
- Topic/course relationship integrity is enforced.
- Prerequisite self-edge and duplicate-edge are rejected.
- Lesson/topic and resource/lesson relationships are enforced.
- Resource type/reference rules and course/topic ordering/status constraints are validated.
- Deletion behavior is tested.
- Development seed is blocked outside development/test and handles duplicates safely.
- Migration upgrade/downgrade/upgrade succeeds on disposable PostgreSQL.
- Existing backend tests pass.
- Frontend lint, tests, and production build still pass.
- Compose config validates if Docker files are changed.
- Full Git diff reconciles with file ledger.

## 11. Acceptance criteria

| ID | Criterion |
|---|---|
| P2-AC-01 | Approved ER model covers D1/D2 without prematurely creating D3–D8. |
| P2-AC-02 | User identity, profile, role, and teacher/course assignment are explicit. |
| P2-AC-03 | Schema matches recorded decisions and frontend domain semantics where appropriate. |
| P2-AC-04 | Models use the existing SQLAlchemy Base and Alembic setup. |
| P2-AC-05 | PK/FK/unique/check constraints and indexes are implemented and tested. |
| P2-AC-06 | Prerequisite edges reject self-reference and duplicate edges. |
| P2-AC-07 | Migrations upgrade from empty disposable PostgreSQL. |
| P2-AC-08 | Safe downgrade/upgrade checks pass. |
| P2-AC-09 | Existing persistent database and Docker volume remain untouched. |
| P2-AC-10 | Authentication and full course APIs are not implemented prematurely. |
| P2-AC-11 | Development seeding is explicit and never automatic. |
| P2-AC-12 | Backend and frontend regression checks pass. |
| P2-AC-13 | API contract, status, and decisions accurately describe actual behavior. |
| P2-AC-14 | File ledger reconciles with complete Git diff. |
| P2-AC-15 | Six Phase 2 evidence records are complete and truthful. |

## 12. Mandatory phase records

Create `docs/antigravity-bible/phase-records/PHASE-02/` with:

1. `PLAN.md`
2. `EXECUTION_LOG.md`
3. `FILE_CHANGE_LEDGER.md`
4. `TEST_AND_EVALUATION.md`
5. `ISSUES_AND_DECISIONS.md`
6. `PHASE_SUMMARY.md`

Use existing project templates. Record `NOT RUN` until tests are actually executed. Include docs, tests, lockfiles, migrations, generated files, and deletions in the ledger.

## 13. Execution protocol

**Stage A — Plan only:** inspect repository and DB read-only; produce ER model, decisions, exact file list, migration plan, tests, rollback/safety plan, and six records. Do not edit application code or migrations. Stop for owner approval.

**Stage B — Implement after approval:** implement only approved scope. Do not add unrelated schema or endpoints. Record and request approval for material deviations.

**Stage C — Verify and hand off:** run tests on disposable DB, reconcile Git diff and ledger, update project controls, and stop. Do not start Phase 3 automatically.

Final status: `READY_FOR_REVIEW`, `BLOCKED`, or `NOT_ACCEPTED`. Only the project owner may mark `ACCEPTED`.
