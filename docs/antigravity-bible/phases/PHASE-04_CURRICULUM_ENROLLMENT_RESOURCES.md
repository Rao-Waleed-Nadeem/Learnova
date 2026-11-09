# Phase 04 — Curriculum, Enrollment, and Resources

## 1. Phase Charter & Objective
Implement the domain and application services for course discovery, course details, student enrollment, curriculum hierarchy management (courses, topics, lessons, resources), prerequisite DAG validation, and learning activity tracking (lesson completions), fulfilling workflows **SSD-01**, **SSD-02**, and **SSD-07**.

---

## 2. Source Documents & Governance
- **SRS Requirements:** `FR-CRS-01` (Catalog Browsing), `FR-CRS-02` (Enrollment), `FR-CRS-03` (Curriculum Management), `FR-CRS-04` (Prerequisite DAG), `FR-CRS-05` (Learning Map & Readiness), `FR-CRS-06` (Lesson Completion Tracking), `FR-AUTH-05` (Teacher Course Scoping).
- **System Sequence Diagrams:**
  - `SSD-01`: Course Enrollment & Curriculum Loading.
  - `SSD-02`: Topic Selection & Prerequisite Diagnostic (Learning Map & Readiness).
  - `SSD-07`: Teacher Course & Content Management.
- **Master Blueprint:** Section 8.2 (Courses, Enrollment, Curriculum & Resources) & Section 13 (Phase 4 Acceptance Gates).

---

## 3. Data Architecture (D2 & D4 Domains)
1. **Existing Tables (Phase 2):**
   - `courses`: `id`, `title`, `description`, `status` ('draft', 'published', 'archived'), `creator_id`, timestamps.
   - `course_teachers`: `course_id`, `teacher_id`, `assigned_at`.
   - `topics`: `id`, `course_id`, `title`, `description`, `order`, `mastery_threshold`, timestamps.
   - `topic_prerequisites`: `topic_id`, `prerequisite_topic_id`, `created_at`.
   - `lessons`: `id`, `topic_id`, `title`, `description`, `order`, timestamps.
   - `learning_resources`: `id`, `lesson_id`, `title`, `type`, `content_or_url`, `file_size`, `order`, timestamps.
2. **New Tables (Phase 4):**
   - `enrollments`: `id`, `student_id`, `course_id`, `status` ('active', 'completed', 'dropped'), `enrolled_at`, `completed_at`, `progress_percent`. Unique constraint `(student_id, course_id)`.
   - `lesson_completions`: `id`, `student_id`, `course_id`, `topic_id`, `lesson_id`, `completed_at`. Unique constraint `(student_id, lesson_id)`.
   - `resource_activities`: `id`, `student_id`, `resource_id`, `activity_type`, `duration_seconds`, `created_at`.

---

## 4. API Endpoints Catalog
1. **Courses & Catalog:**
   - `GET /api/v1/courses` — Public / student view returns published courses. Teachers see assigned/created courses + published courses. Admins see all.
   - `POST /api/v1/courses` — Teacher/Admin creates course. Automatically assigns creator in `course_teachers`.
   - `GET /api/v1/courses/{course_id}` — Course details with topic and lesson summary.
   - `PATCH /api/v1/courses/{course_id}` — Update course title, description, status.
   - `POST /api/v1/courses/{course_id}/publish` — Validates course integrity (>= 1 topic, acyclic DAG, topics have lessons) and sets `status = 'published'`.
2. **Curriculum Hierarchy:**
   - `POST /api/v1/courses/{course_id}/topics` — Create topic in course.
   - `PATCH /api/v1/topics/{topic_id}` — Update topic metadata and mastery threshold.
   - `DELETE /api/v1/topics/{topic_id}` — Delete topic and cascade lessons/prerequisites.
   - `PUT /api/v1/topics/{topic_id}/prerequisites` — Update topic prerequisites with DAG cycle validation.
   - `POST /api/v1/topics/{topic_id}/lessons` — Create lesson in topic.
   - `PATCH /api/v1/lessons/{lesson_id}` — Update lesson details and order.
   - `DELETE /api/v1/lessons/{lesson_id}` — Delete lesson.
   - `POST /api/v1/lessons/{lesson_id}/resources` — Add resource to lesson.
   - `PATCH /api/v1/resources/{resource_id}` — Update resource.
   - `DELETE /api/v1/resources/{resource_id}` — Delete resource.
3. **Enrollments & Learning Map:**
   - `POST /api/v1/courses/{course_id}/enrollments` — Student enrolls in published course.
   - `GET /api/v1/students/me/enrollments` — Current student's active and completed enrollments.
   - `GET /api/v1/courses/{course_id}/learning-map` — Curriculum DAG with topic readiness for current student.
   - `POST /api/v1/lessons/{lesson_id}/complete` — Record lesson completion and update enrollment progress.
   - `POST /api/v1/resources/{resource_id}/activity` — Log resource study activity.

---

## 5. Security & Authorization Gates
1. **Role Scoping:** Only authenticated teachers and administrators can create or mutate courses, topics, lessons, or resources.
2. **Teacher Course Boundary:** Teachers can modify only courses where `creator_id == current_user.id` or a record exists in `course_teachers`.
3. **Student Privacy:** Students can view their own enrollments and completions only.
4. **DAG Cycle Prevention:** All prerequisite modifications undergo graph cycle detection; circular graphs are rejected with `400 Bad Request`.
5. **Publishing Validation:** Courses cannot be published if empty or cyclic.

---

## 6. Acceptance Criteria
1. Duplicate student enrollment is rejected or handled idempotently.
2. Students see only published courses in catalog; draft courses are hidden.
3. Teachers can modify only assigned courses; unauthorized attempts return `403 Forbidden`.
4. Topic prerequisite updates with cyclic dependencies are rejected.
5. Topic prerequisite self-edges are rejected.
6. Lesson completion records are persisted in PostgreSQL.
7. Enrollment progress percentage is recalculated upon lesson completion.
8. Learning map accurately reflects topic readiness based on completed prerequisites.
9. All 52 existing backend tests continue to pass (zero regressions).
10. All 29 frontend Vitest tests continue to pass.
