# Issues and Decisions — Phase 04 (Curriculum, Enrollment, and Resources)

**Phase:** Phase 4 — Curriculum, Enrollment, and Resources  
**Stage:** Stage C Handoff (Issues & Decisions Reconciled)  
**Date:** 2026-11-09  
**Status:** **READY_FOR_REVIEW**

---

## 1. Architectural Decisions

### DEC-P4-001: Relational Normalization vs. Redundant `course_id`
- **Context:** In the frontend mock model, `Lesson` and `LearningResource` store a redundant `courseId`. In relational normalization (3NF), a lesson belongs strictly to a topic (`topic_id`), and a resource belongs strictly to a lesson (`lesson_id`). Storing redundant `course_id` on lessons and resources introduces update anomaly risks if a lesson is moved between topics.
- **Options Considered:**
  1. Add redundant `course_id` columns with compound foreign keys on `lessons` and `learning_resources`.
  2. Maintain strict 3NF in PostgreSQL (`lessons` references `topics.id`, `learning_resources` references `lessons.id`). Pydantic API response serializers dynamically synthesize `course_id` from the parent relationship.
- **Decision:** Option 2. Guarantees relational database consistency without duplicate foreign keys, while maintaining 100% backward compatibility with the frontend TypeScript interfaces.
- **Status:** **ACCEPTED & IMPLEMENTED**

---

### DEC-P4-002: Prerequisite DAG Cycle Detection Strategy
- **Context:** Database constraint `CHECK (topic_id <> prerequisite_topic_id)` rejects direct self-edges. However, transitive cycles ($A \rightarrow B \rightarrow C \rightarrow A$) cannot be prevented by simple column-level SQL check constraints without complex recursive triggers or stored procedures.
- **Options Considered:**
  1. Rely on frontend cycle detection in `src/utils/dag.ts` only.
  2. Implement database triggers with recursive CTEs.
  3. Implement authoritative domain service cycle detection (`dag_service.py`) using Depth-First Search (DFS) with recursion stack tracking and Kahn's topological sort before persisting edges.
- **Decision:** Option 3. Follows the defense-in-depth architecture: server-side domain logic authoritatively validates the full graph in application memory before executing the update transaction. If a cycle is detected, the API rejects the request with `400 Bad Request` and provides the exact cycle path (`cyclePath: ["Topic A", "Topic B", "Topic A"]`).
- **Status:** **ACCEPTED & IMPLEMENTED**

---

### DEC-P4-003: Course Publication Gate & Quality Invariants
- **Context:** When a teacher publishes a course (`POST /api/v1/courses/{id}/publish`), it becomes publicly visible in the student catalog. Publishing an empty or malformed course breaks the student learning experience.
- **Options Considered:**
  1. Allow publishing any course unconditionally.
  2. Enforce a strict server-side validation gate verifying course readiness before allowing publication.
- **Decision:** Option 2. A course can only transition to `status = 'published'` if:
  1. The course contains at least one topic.
  2. Every topic in the course contains at least one lesson.
  3. The topic prerequisite graph is completely acyclic.
  4. The caller is an assigned teacher or administrator.
  If validation fails, the API returns `422 Unprocessable Entity` detailing the missing prerequisites.
- **Status:** **ACCEPTED & IMPLEMENTED**

---

### DEC-P4-004: Enrollment Lifecycle & Idempotency
- **Context:** Students enroll in courses via `POST /api/v1/courses/{course_id}/enrollments`. A student might click "Enroll" multiple times or reload the page.
- **Options Considered:**
  1. Return `400 Bad Request` or `409 Conflict` on duplicate enrollment.
  2. Enforce unique database constraint `UNIQUE (student_id, course_id)`, but handle repeat enrollment idempotently in the service layer: if already enrolled with `active` status, return the existing enrollment with `200 OK`.
- **Decision:** Option 2. Provides idempotency and a seamless user experience, while strictly prohibiting enrolling in draft courses or enrolling on behalf of other students.
- **Status:** **ACCEPTED & IMPLEMENTED**

---

### DEC-P4-005: Lesson Completion Tracking & Dynamic Progress Derivation
- **Context:** The Phase 4 specification mandates: *"Persist the source events (`LessonCompletion`) as authoritative. Calculate progress from the current published lesson denominator and completion records initially. Do not materialize a progress_percent field until a measured performance need and invalidation strategy exist; curriculum edits can otherwise make stored percentages stale. Do not automatically mark a course completed solely because all current lessons are completed: formal assessment/course-completion criteria remain an explicit product decision (DEC-09)."*
- **Decision:** Store `LessonCompletion` records authoritatively. Compute `progress_percent` dynamically on read as:
  $$\text{progress\_percent} = \left(\frac{\text{completed lessons in course}}{\text{total published lessons in course}}\right) \times 100$$
  Do not set course status to completed solely based on lesson completions, strictly honoring DEC-09.
- **Status:** **ACCEPTED & IMPLEMENTED**

---

## 2. Technical Issues Encountered and Resolved (Stage B)

| Issue ID | Problem Description | Root Cause | Resolution | Verification |
|---|---|---|---|---|
| **ERR-P4-01** | `TypeError: 'target_resource' is an invalid keyword argument for SecurityAuditEvent` | Manual instantiation in `course_service.py` used `target_resource` instead of `target_type`. | Switched to using `log_audit_event(db, ...)` helper from `app.services.audit_service` which cleanly sets `target_type="course"`. | `test_publish_valid_course_success` passed. |
| **ERR-P4-02** | `alembic.util.exc.CommandError: Can't locate timezone: UTC` on Windows | Python's standard `zoneinfo` requires the IANA `tzdata` package on Windows when parsing `timezone = UTC`. | Installed `tzdata` and added `tzdata>=2024.1` to `backend/requirements.txt`. | `test_alembic_disposable.py` passed 100%. |
| **ERR-P4-03** | `ModuleNotFoundError: No module named 'app.models.learning_resource'` | The existing Phase 2 module is named `app.models.resource.py` (class `LearningResource`). | Corrected imports to `from app.models.resource import LearningResource`. | All test modules imported and passed cleanly. |
| **ERR-P4-04** | `TypeError: create_access_token() got an unexpected keyword argument 'data'` | Test helper passed `data={...}` instead of `subject=..., role=...`. | Corrected test helper call to `create_access_token(subject=str(user.id), role=user.role.name)`. | Test authentication passed across all 9 tests. |
