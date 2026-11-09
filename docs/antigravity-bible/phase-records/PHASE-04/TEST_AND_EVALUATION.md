# Test and Evaluation — Phase 04 (Curriculum, Enrollment, and Resources)

**Phase:** Phase 4 — Curriculum, Enrollment, and Resources  
**Stage:** Stage A (Planning & Audit Only)  
**Evaluation Date:** 2026-11-09  
**Status:** **STAGE_A_COMPLETED — PENDING STAGE B APPROVAL**

---

## 1. Baseline Test State (End of Phase 3)

| Component | Test Suite | Tests Run | Result | Evidence |
|---|---|:---:|:---:|---|
| Backend Services & Schema | Pytest (Models, migrations, auth, RBAC, admin) | 52 | **PASS (100%)** | `52 passed in 17.66s` |
| Frontend Core Logic | Vitest (DAG cycle detection, student, admin logic) | 29 | **PASS (100%)** | `29 passed in 1.49s` |
| Frontend Type Integrity | `npm run lint` (`tsc --noEmit`) | Full codebase | **PASS** | 0 errors |
| Frontend Bundle | `npm run build` (`vite build`) | Client assets | **PASS** | Built in 2.34s |

---

## 2. Planned Test Matrix for Stage B Implementation

| Test ID | Scenario Description | Target Test File | Security / Domain Invariant |
|---|---|---|---|
| **P4-TST-01** | Public course catalog filtering | `tests/test_curriculum_endpoints.py` | Unauthenticated & student callers receive only published courses. |
| **P4-TST-02** | Teacher course visibility | `tests/test_curriculum_endpoints.py` | Teachers receive their own draft/published courses in list. |
| **P4-TST-03** | Course details hierarchy retrieval | `tests/test_curriculum_endpoints.py` | Full topic, lesson, resource structure returned. |
| **P4-TST-04** | Teacher authorized course update | `tests/test_curriculum_endpoints.py` | Assigned teacher can update course metadata. |
| **P4-TST-05** | Teacher unauthorized course update blocked | `tests/test_curriculum_endpoints.py` | Unassigned teacher receives `403 Forbidden`. |
| **P4-TST-06** | Student curriculum mutation blocked | `tests/test_curriculum_endpoints.py` | Student caller receives `403 Forbidden` on course/topic/lesson CRUD. |
| **P4-TST-07** | Course publish gate: empty course | `tests/test_curriculum_endpoints.py` | Course with 0 topics rejected with `422 Unprocessable Entity`. |
| **P4-TST-08** | Course publish gate: empty topic | `tests/test_curriculum_endpoints.py` | Course with a topic having 0 lessons rejected with `422`. |
| **P4-TST-09** | Valid topic prerequisite definition | `tests/test_prerequisite_dag.py` | Valid acyclic edges persisted successfully. |
| **P4-TST-10** | Prerequisite self-edge rejection | `tests/test_prerequisite_dag.py` | $A \rightarrow A$ edge rejected by domain service and database constraint. |
| **P4-TST-11** | Direct cycle rejection ($A \leftrightarrow B$) | `tests/test_prerequisite_dag.py` | Cycle detected; rejected with `400 Bad Request` and cycle path. |
| **P4-TST-12** | Transitive cycle rejection ($A \rightarrow B \rightarrow C \rightarrow A$) | `tests/test_prerequisite_dag.py` | Multi-hop cycle detected and rejected. |
| **P4-TST-13** | Student enrollment in published course | `tests/test_enrollment_lifecycle.py` | Enrollment record created with `active` status and 0% progress. |
| **P4-TST-14** | Duplicate enrollment idempotency | `tests/test_enrollment_lifecycle.py` | Re-enrolling in same course returns existing enrollment (200 OK). |
| **P4-TST-15** | Enrollment in draft course blocked | `tests/test_enrollment_lifecycle.py` | Students cannot enroll in draft courses (`403 Forbidden`). |
| **P4-TST-16** | Lesson completion tracking | `tests/test_enrollment_lifecycle.py` | Completing lesson creates unique record and updates enrollment progress. |
| **P4-TST-17** | Full course completion transition | `tests/test_enrollment_lifecycle.py` | Completing all lessons transitions enrollment to `completed` with timestamp. |
| **P4-TST-18** | Learning map readiness calculation | `tests/test_enrollment_lifecycle.py` | Topics with unmet prerequisites marked unready; topics with met prerequisites marked ready. |
| **P4-TST-19** | Disposable PostgreSQL migration lifecycle | `tests/test_migrations_postgres.py` | Upgrade to 0006, table verification, downgrade to 0005, restore to 0006. |
| **P4-TST-20** | Full backend regression suite | All pytest files | All 52 existing tests + new Phase 4 tests pass (100%). |
| **P4-TST-21** | Frontend non-regression suite | `npm test` & build | All 29 Vitest tests pass; production build succeeds. |

---

## 3. Phase 4 Acceptance Criteria Evaluation Matrix

| ID | Criterion | Stage A Status | Stage B Verification Method |
|---|---|:---:|---|
| **AC-P4-01** | Public/student catalog shows only published courses. | **PLANNED** | `test_curriculum_endpoints.py::test_catalog_filters_draft_courses` |
| **AC-P4-02** | Teachers can view draft courses they created or are assigned to. | **PLANNED** | `test_curriculum_endpoints.py::test_teacher_views_own_draft_courses` |
| **AC-P4-03** | Course details returns full hierarchy (topics, lessons, resources). | **PLANNED** | `test_curriculum_endpoints.py::test_get_course_hierarchy` |
| **AC-P4-04** | Teachers cannot modify unassigned courses (`403 Forbidden`). | **PLANNED** | `test_curriculum_endpoints.py::test_teacher_cannot_edit_unassigned_course` |
| **AC-P4-05** | Students cannot create or modify courses or curriculum items. | **PLANNED** | `test_curriculum_endpoints.py::test_student_forbidden_from_curriculum_crud` |
| **AC-P4-06** | Course publish gate blocks empty course (0 topics). | **PLANNED** | `test_curriculum_endpoints.py::test_publish_empty_course_rejected` |
| **AC-P4-07** | Course publish gate blocks course with empty topics (0 lessons). | **PLANNED** | `test_curriculum_endpoints.py::test_publish_course_with_empty_topic_rejected` |
| **AC-P4-08** | Prerequisite self-edge ($A \rightarrow A$) is rejected. | **PLANNED** | `test_prerequisite_dag.py::test_self_prerequisite_rejected` |
| **AC-P4-09** | Direct circular dependency ($A \rightarrow B$ and $B \rightarrow A$) is rejected. | **PLANNED** | `test_prerequisite_dag.py::test_direct_cycle_rejected` |
| **AC-P4-10** | Transitive circular dependency ($A \rightarrow B \rightarrow C \rightarrow A$) is rejected. | **PLANNED** | `test_prerequisite_dag.py::test_transitive_cycle_rejected` |
| **AC-P4-11** | Student enrollment creates record in `enrollments` table. | **PLANNED** | `test_enrollment_lifecycle.py::test_student_enrollment_success` |
| **AC-P4-12** | Duplicate student enrollment is handled idempotently. | **PLANNED** | `test_enrollment_lifecycle.py::test_duplicate_enrollment_idempotent` |
| **AC-P4-13** | Lesson completion persists and recalculates course progress. | **PLANNED** | `test_enrollment_lifecycle.py::test_lesson_completion_progress_update` |
| **AC-P4-14** | Learning map evaluates topic readiness correctly. | **PLANNED** | `test_enrollment_lifecycle.py::test_learning_map_readiness` |
| **AC-P4-15** | Zero regression: all 52 backend tests and 29 frontend tests pass. | **PLANNED** | Pytest and Vitest test suites |
