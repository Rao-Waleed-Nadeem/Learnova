# File Change Ledger — Phase 04 (Curriculum, Enrollment, and Resources)

> Reconcile this ledger against the complete Git diff. Include every changed path, including docs, tests, lockfiles, generated files, configuration, and deletions.

## Stage B Implementation Ledger (Reconciled with Git Working Tree)

| Entry ID | File Path | Action | Description / Traceability | Validation Status |
|---|---|---|---|---|
| **CHG-P4-001** | `backend/app/models/enrollment.py` | CREATE | `Enrollment` model (`enrollments` table with `UNIQUE(student_id, course_id)`, check constraints, relationships). (FR-CRS-02, SSD-01) | VERIFIED PASS |
| **CHG-P4-002** | `backend/app/models/lesson_completion.py` | CREATE | `LessonCompletion` (`lesson_completions` table) and `ResourceActivity` (`resource_activities` table) models with unique constraints and duration checks. (FR-CRS-06, SSD-03) | VERIFIED PASS |
| **CHG-P4-003** | `backend/app/models/course.py` | MODIFY | Added `enrollments` and `lesson_completions` relationships with cascade options. | VERIFIED PASS |
| **CHG-P4-004** | `backend/app/models/user.py` | MODIFY | Added `enrollments` and `lesson_completions` relationships. | VERIFIED PASS |
| **CHG-P4-005** | `backend/app/models/__init__.py` | MODIFY | Exported `Enrollment`, `LessonCompletion`, and `ResourceActivity` in model registry. | VERIFIED PASS |
| **CHG-P4-006** | `backend/alembic/versions/20261109_0006_d4_enrollments_and_completions.py` | CREATE | Additive Alembic migration 6 creating `enrollments`, `lesson_completions`, and `resource_activities` tables and indexes. | VERIFIED PASS |
| **CHG-P4-007** | `backend/tests/test_migrations_postgres.py` | MODIFY | Updated disposable PG migration test to include Phase 4 tables and verified downgrade `-1` (0006 -> 0005). Added graceful connection handling. | VERIFIED PASS |
| **CHG-P4-008** | `backend/app/schemas/curriculum.py` | CREATE | Pydantic schemas for Course, Topic, Lesson, and Resource request/responses, synthesizing `course_id` dynamically (DEC-P4-001). | VERIFIED PASS |
| **CHG-P4-009** | `backend/app/schemas/enrollment.py` | CREATE | Pydantic schemas for Enrollment, LessonCompletion, ResourceActivity, and LearningMap. | VERIFIED PASS |
| **CHG-P4-010** | `backend/app/services/dag_service.py` | CREATE | Authoritative DFS cycle validation, self-edge check, and atomic prerequisite edge replacement (FR-CRS-04, DEC-P4-002). | VERIFIED PASS |
| **CHG-P4-011** | `backend/app/services/course_service.py` | CREATE | Course catalog listing with role-based visibility, course CRUD, and publication quality gate (FR-CRS-01, FR-CRS-03, DEC-P4-003). | VERIFIED PASS |
| **CHG-P4-012** | `backend/app/services/curriculum_service.py` | CREATE | Topic, Lesson, and Resource CRUD, ordering, and cascade operations (FR-CRS-03, SSD-07). | VERIFIED PASS |
| **CHG-P4-013** | `backend/app/services/enrollment_service.py` | CREATE | Idempotent student enrollment (DEC-P4-004), dynamic progress calculation from completions (DEC-P4-005), and learning map readiness (SSD-01, SSD-02). | VERIFIED PASS |
| **CHG-P4-014** | `backend/app/core/dependencies.py` | MODIFY | Added `get_optional_current_user` dependency for public/authenticated catalog and detail browsing. | VERIFIED PASS |
| **CHG-P4-015** | `backend/app/api/v1/endpoints/courses.py` | CREATE | Course endpoints: `GET /courses`, `POST /courses`, `GET /courses/{id}`, `PATCH /courses/{id}`, `POST /courses/{id}/publish`. | VERIFIED PASS |
| **CHG-P4-016** | `backend/app/api/v1/endpoints/topics.py` | CREATE | Topic endpoints: `POST /courses/{id}/topics`, `PATCH /topics/{id}`, `DELETE /topics/{id}`, `PUT /topics/{id}/prerequisites`. | VERIFIED PASS |
| **CHG-P4-017** | `backend/app/api/v1/endpoints/lessons.py` | CREATE | Lesson, resource, completion, and activity endpoints. | VERIFIED PASS |
| **CHG-P4-018** | `backend/app/api/v1/endpoints/enrollments.py` | CREATE | Enrollment and learning map endpoints: `POST /courses/{id}/enrollments`, `GET /students/me/enrollments`, `GET /courses/{id}/learning-map`. | VERIFIED PASS |
| **CHG-P4-019** | `backend/app/api/v1/router.py` | MODIFY | Mounted `courses`, `topics`, `lessons`, and `enrollments` routers under `/api/v1`. | VERIFIED PASS |
| **CHG-P4-020** | `backend/requirements.txt` | MODIFY | Added `tzdata>=2024.1` for Windows standard zoneinfo UTC support. | VERIFIED PASS |
| **CHG-P4-021** | `backend/tests/test_curriculum_endpoints.py` | CREATE | 9 automated tests for catalog filtering, hierarchy retrieval, teacher authorization scoping, and course publication gates (AC-P4-01 to AC-P4-07). | VERIFIED PASS |
| **CHG-P4-022** | `backend/tests/test_prerequisite_dag.py` | CREATE | 5 automated tests for self-edges, direct cycles, transitive multi-hop cycles, and atomic edge replacement (AC-P4-08 to AC-P4-10). | VERIFIED PASS |
| **CHG-P4-023** | `backend/tests/test_enrollment_lifecycle.py` | CREATE | 8 automated tests for student enrollment, duplicate idempotency, lesson completions, progress derivation, and learning map readiness (AC-P4-11 to AC-P4-14). | VERIFIED PASS |
| **CHG-P4-024** | `docs/antigravity-bible/phase-records/PHASE-04/PLAN.md` | MODIFY | Updated plan status to Stage C Handoff (`READY_FOR_REVIEW`). | VERIFIED PASS |
| **CHG-P4-025** | `docs/antigravity-bible/phase-records/PHASE-04/EXECUTION_LOG.md` | MODIFY | Recorded all 44 execution steps from Stage A planning through Stage B implementation and testing. | VERIFIED PASS |
| **CHG-P4-026** | `docs/antigravity-bible/phase-records/PHASE-04/TEST_AND_EVALUATION.md` | MODIFY | Documented test run evidence for all 74 backend tests and 29 frontend tests with exact commands and outputs. | VERIFIED PASS |
| **CHG-P4-027** | `docs/antigravity-bible/phase-records/PHASE-04/ISSUES_AND_DECISIONS.md` | MODIFY | Reconciled `DEC-P4-001` through `DEC-P4-005` and documented technical resolutions. | VERIFIED PASS |
| **CHG-P4-028** | `docs/antigravity-bible/phase-records/PHASE-04/PHASE_SUMMARY.md` | MODIFY | Completed formal Stage C Phase Summary and Acceptance Gates evaluation. | VERIFIED PASS |
| **CHG-P4-029** | `API_CONTRACT.md` | MODIFY | Synchronized Section 3.2 with exact Phase 4 endpoints, request/response models, and status codes. | VERIFIED PASS |
| **CHG-P4-030** | `IMPLEMENTATION_STATUS.md` | MODIFY | Updated traceability matrix for Phase 4 capabilities to `IMPLEMENTED`. | VERIFIED PASS |
| **CHG-P4-031** | `DECISIONS.md` | MODIFY | Recorded `DEC-P4-001` through `DEC-P4-005` as accepted decisions for Phase 4. | VERIFIED PASS |
