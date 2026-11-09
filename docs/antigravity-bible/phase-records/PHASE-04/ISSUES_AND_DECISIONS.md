# Issues and Decisions — Phase 04 (Curriculum, Enrollment, and Resources)

**Phase:** Phase 4 — Curriculum, Enrollment, and Resources  
**Stage:** Stage A (Planning & Audit Only)  
**Date:** 2026-11-09  
**Status:** **SUBMITTED FOR PROJECT OWNER REVIEW**

---

## 1. Architectural Decisions

### DEC-P4-001: Relational Normalization vs. Redundant `course_id`
- **Context:** In the frontend mock model, `Lesson` and `LearningResource` store a redundant `courseId`. In relational normalization (3NF), a lesson belongs strictly to a topic (`topic_id`), and a resource belongs strictly to a lesson (`lesson_id`). Storing redundant `course_id` on lessons and resources introduces update anomaly risks if a lesson is moved between topics.
- **Options Considered:**
  1. Add redundant `course_id` columns with compound foreign keys on `lessons` and `learning_resources`.
  2. Maintain strict 3NF in PostgreSQL (`lessons` references `topics.id`, `learning_resources` references `lessons.id`). Pydantic API response serializers dynamically synthesize `course_id` from the parent relationship.
- **Decision:** Option 2. Guarantees relational database consistency without duplicate foreign keys, while maintaining 100% backward compatibility with the frontend TypeScript interfaces.
- **Impact:** Models remain clean; serializers populate `course_id`.

---

### DEC-P4-002: Prerequisite DAG Cycle Detection Strategy
- **Context:** Database constraint `CHECK (topic_id <> prerequisite_topic_id)` rejects direct self-edges. However, transitive cycles ($A \rightarrow B \rightarrow C \rightarrow A$) cannot be prevented by simple column-level SQL check constraints without complex recursive triggers or stored procedures.
- **Options Considered:**
  1. Rely on frontend cycle detection in `src/utils/dag.ts` only.
  2. Implement database triggers with recursive CTEs.
  3. Implement authoritative domain service cycle detection (`dag_service.py`) using Depth-First Search (DFS) with recursion stack tracking and Kahn's topological sort before persisting edges.
- **Decision:** Option 3. Follows the defense-in-depth architecture: server-side domain logic authoritatively validates the full graph in application memory before executing the update transaction. If a cycle is detected, the API rejects the request with `400 Bad Request` and provides the exact cycle path (`cyclePath: ["Topic A", "Topic B", "Topic A"]`).
- **Impact:** Enforced in `dag_service.py` called by `PUT /api/v1/topics/{topic_id}/prerequisites`.

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
- **Impact:** Enforced in `course_service.py`.

---

### DEC-P4-004: Enrollment Lifecycle & Idempotency
- **Context:** Students enroll in courses via `POST /api/v1/courses/{course_id}/enrollments`. A student might click "Enroll" multiple times or reload the page.
- **Options Considered:**
  1. Return `400 Bad Request` or `409 Conflict` on duplicate enrollment.
  2. Enforce unique database constraint `UNIQUE (student_id, course_id)`, but handle repeat enrollment idempotently in the service layer: if already enrolled with `active` status, return the existing enrollment with `200 OK`.
- **Decision:** Option 2. Provides idempotency and a seamless user experience, while strictly prohibiting enrolling in draft courses or enrolling on behalf of other students.
- **Impact:** Enforced in `enrollment_service.py`.

---

### DEC-P4-005: Lesson Completion Tracking & Enrollment Progress Calculation
- **Context:** As students complete lessons, their course progress percentage must be tracked and displayed in the student dashboard and course learning map.
- **Options Considered:**
  1. Compute progress dynamically on every read query via `COUNT` aggregations.
  2. Store `progress_percent` on the `enrollments` table, recalculated atomically within the lesson completion transaction:
     $$\text{progress\_percent} = \left(\frac{\text{completed lessons}}{\text{total published lessons}}\right) \times 100$$
- **Decision:** Option 2. Materializing `progress_percent` on `enrollments` eliminates expensive multi-table joins on dashboard queries and provides an immediate milestone trigger for course completion (`status = 'completed'` when 100%).
- **Impact:** Handled in `enrollment_service.py`.
