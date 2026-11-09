# Phase 4 — Curriculum, Enrollment, and Learning Resources

**Phase:** 04  
**Depends on:** Accepted Phase 2 domain schema and Phase 3 authentication/RBAC  
**Primary blueprint scope:** Phase 4; Sections 3.2, 7.1–7.2, 8.2, and testing strategy  
**Primary workflows:** SSD-01, SSD-02 prerequisite structure, SSD-03 resource study foundation, SSD-07  
**Status:** Implementation instruction; not evidence that the phase is implemented.

## 1. Objective

Move the existing course, curriculum, enrollment, and resource workflows from frontend mock/localStorage behavior to FastAPI and PostgreSQL while preserving the existing React experience.

Phase 4 creates the persistent learning context consumed by later phases: a student is enrolled in a published course; a course contains ordered topics; topics have prerequisite edges and ordered lessons; lessons contain resources; lesson completion and resource activity are persisted against the student's enrollment.

## 2. Repository baseline and reuse requirements

At baseline commit `eb7fd2d`:

- Existing models: `Course`, `CourseTeacher`, `Topic`, `TopicPrerequisite`, `Lesson`, `LearningResource`, `User`, `Role`, `UserProfile`, `UserSession`, and `SecurityAuditEvent`.
- Existing auth/RBAC includes `get_current_active_user`, `require_role`, and `require_teacher_assigned_to_course` in `backend/app/core/dependencies.py`.
- `backend/app/api/v1/router.py` currently includes health, auth, users, and admin routers.
- There is no verified `Enrollment`, `LessonCompletion`, or `ResourceActivity` model in the Phase 3 model registry.

Antigravity MUST re-check the current branch and actual files before editing. Reuse the existing `Base`, `get_db`, model registry, migration environment, response conventions, error handling, and audit service. Do not create another user, course, topic, lesson, resource, DB session, or authorization model.

## 3. In scope

### 3.1 Course catalog and course management

- List published courses for student discovery; teachers/admins see only courses they are authorized to manage or inspect.
- Course detail includes a syllabus hierarchy (topics, lessons, resources) with stable ordering.
- Teacher/admin create and update courses.
- Draft/published/archived state transitions.
- Publish validation is server-side and transactional.
- Teacher access is enforced by course assignment/creator ownership at the service/query boundary; administrator access follows existing policy.

### 3.2 Curriculum and prerequisite management

- Topic create/update/delete and ordering within a course.
- Lesson create/update/delete and ordering within a topic.
- Replace prerequisite edges as one validated operation.
- Validate referenced topics belong to the same course, reject self-edges and all multi-hop cycles, and return a useful validation error including the detected cycle path where practical.
- Preserve relational normalization: `Lesson` references `Topic`; `LearningResource` references `Lesson`. API serializers may expose derived `course_id` for compatibility, but do not add redundant columns without a database-enforced integrity design.

### 3.3 Enrollment and learning activity

Add the missing persistence needed by SSD-01/03:

- `CourseEnrollment` (or consistent repository naming) with student, course, status, enrolled/completed timestamps, and creation/update timestamps.
- Unique constraint on `(student_id, course_id)`.
- Status at minimum supports active and completed; do not add unsupported lifecycle states without need.
- `LessonCompletion` with enrollment and lesson references, completion timestamp, and unique `(enrollment_id, lesson_id)`.
- `ResourceActivity` (or an equivalent normalized activity record) with enrollment/student, resource, event type, occurred-at timestamp, and optional duration. Validate non-negative duration and prevent cross-enrollment references.
- Idempotent lesson completion and enrollment behavior.

**Progress calculation decision:** Persist the source events (`LessonCompletion`) as authoritative. Calculate progress from the current published lesson denominator and completion records initially. Do not materialize a `progress_percent` field until a measured performance need and invalidation strategy exist; curriculum edits can otherwise make stored percentages stale. Do not automatically mark a course completed solely because all current lessons are completed: formal assessment/course-completion criteria remain an explicit product decision (DEC-09).

### 3.4 Resources

- CRUD resource metadata/content/URLs attached to lessons.
- Support existing types: `document`, `video`, `markdown`, `code`, `link`.
- Enforce allowed URL schemes and validate content/URL according to type.
- Preserve provider-neutral resource metadata from Phase 2.
- Do not implement a production object-storage provider, upload pipeline, virus scanning, or public file-serving strategy in this phase unless the repository already contains an approved implementation. DEC-11 remains the authority for physical file storage.
- Resource activity records study/review interactions; it does not award XP (Phase 8).

### 3.5 Student learning map

Return the course's topic graph, ordering, prerequisite edges, and lesson/resource hierarchy. Do not invent mastery or readiness values: the mastery store and approved adaptive policy belong to Phase 7. If the UI needs a readiness field before Phase 7, return an explicit `not_evaluated`/unknown state rather than treating unassessed as zero mastery or available by default.

## 4. Out of scope

- Question bank, question types, assessment authoring, assessment publication, and assessment attempts (Phases 5–6).
- Diagnostic assessment execution, adaptive mastery calculation, personalized path generation, and remediation policy (Phase 7 / Phase 6 attempt boundary as specified later).
- XP, badges, streaks, leaderboard, and event consumers (Phase 8).
- AI question generation migration, AI candidate persistence/review APIs, LLM adapter (Phase 9). Preserve current Express endpoints.
- Analytics dashboards and full frontend migration (Phases 10–11).
- Broad UI redesign, replacing all of `storageService.ts`, or removing unrelated mock features.

## 5. Proposed API contract

Follow existing `/api/v1` naming, UUID conventions, Pydantic schema style, and response/error patterns. The following are planned Phase 4 routes; verify existing routes before adding them and do not duplicate an existing implementation.

| Method | Route | Purpose / authorization |
|---|---|---|
| GET | `/api/v1/courses` | Published catalog for students; authorized course list for teachers/admins |
| POST | `/api/v1/courses` | Teacher/admin create course |
| GET | `/api/v1/courses/{course_id}` | Course detail and curriculum hierarchy; published/student visibility rules |
| PATCH | `/api/v1/courses/{course_id}` | Assigned teacher/admin update |
| POST | `/api/v1/courses/{course_id}/publish` | Assigned teacher/admin publish after structural validation |
| POST | `/api/v1/courses/{course_id}/topics` | Create topic |
| PATCH/DELETE | `/api/v1/topics/{topic_id}` | Update/delete topic |
| PUT | `/api/v1/topics/{topic_id}/prerequisites` | Replace prerequisite edges after DAG validation |
| POST | `/api/v1/topics/{topic_id}/lessons` | Create lesson |
| GET | `/api/v1/lessons/{lesson_id}` | Authorized lesson detail/resources |
| PATCH/DELETE | `/api/v1/lessons/{lesson_id}` | Update/delete lesson |
| POST | `/api/v1/lessons/{lesson_id}/resources` | Create resource metadata/content |
| PATCH/DELETE | `/api/v1/resources/{resource_id}` | Update/delete resource |
| POST | `/api/v1/courses/{course_id}/enrollments` | Student enroll in published course |
| GET | `/api/v1/students/me/enrollments` | Current student's enrollments/progress |
| GET | `/api/v1/courses/{course_id}/learning-map` | Curriculum graph and prerequisite structure |
| POST | `/api/v1/lessons/{lesson_id}/complete` | Idempotently record current student's completion |
| POST | `/api/v1/resources/{resource_id}/activity` | Record resource interaction/duration |

Do not expose internal IDs or other students' enrollment/activity data to unauthorized callers.

## 6. Data integrity and business rules

1. A student can enroll only in a published course.
2. Repeated active enrollment request returns the existing enrollment (`200 OK`); first creation returns `201 Created`. Database uniqueness is authoritative and concurrent duplicate requests must be handled safely.
3. Students can read only published courses they are allowed to access; a student's private enrollment/progress is always scoped to the authenticated user.
4. Teachers can mutate only courses for which they are assigned or recognized as creator under the existing approved policy. Do not rely only on role checks or frontend guards.
5. Administrators follow existing administrator authorization rules.
6. Publishing requires at least one topic, at least one lesson per topic, valid same-course prerequisite edges, and an acyclic graph. If the SRS/UI implies additional requirements, document them rather than inventing them.
7. A published course's structural edits must not silently break active student learning. Inspect existing UI semantics and choose safe validation/archival behavior; do not silently cascade-delete published learning history.
8. Topic and lesson ordering must be deterministic. Enforce any uniqueness constraint only if the existing UI semantics support it; otherwise use stable ordering with a deterministic tie-breaker.
9. Completion/activity writes must prove that the lesson/resource belongs to the enrolled course and that the caller owns the enrollment.
10. No client-supplied progress percentage, role, course ownership, or completion state is authoritative.
11. Deleting a course/topic/lesson/resource must follow an explicit referential policy and preserve historical activity. Prefer archive/soft-delete where hard deletion would orphan learning history.
12. Every teacher/admin mutation should use the existing audit service where it is security/business significant.

## 7. Decisions and recommendations

The repository's `DECISIONS.md` contains proposed Phase 4 decisions DEC-P4-001 through DEC-P4-005. They are not automatically approved by being written in the file. Antigravity must inspect their current owner status and obtain approval where required.

- **DEC-P4-001 (normalization):** retain normalized `Topic -> Lesson -> Resource` foreign keys; synthesize `course_id` in API responses.
- **DEC-P4-002 (DAG):** use an authoritative domain service with DFS/Kahn validation before persistence; frontend validation is UX only.
- **DEC-P4-003 (publication):** use a server-side publication gate; proposed minimum is one topic and one lesson per topic plus valid acyclic prerequisites.
- **DEC-P4-004 (enrollment):** unique `(student_id, course_id)` plus idempotent active enrollment.
- **DEC-P4-005 (progress):** recommendation in this phase is to derive progress from completion records initially, rather than store a denormalized percentage without invalidation. Record this as a proposed revision and request owner approval if DEC-P4-005 is already approved.
- **DEC-09:** do not equate lesson completion with final course completion until formal course completion criteria are approved.
- **DEC-11:** preserve provider-neutral resource records; physical file storage is not silently decided here.

## 8. Frontend integration boundary

Inspect and map the current pages and storage methods before implementation, especially:

- `CourseCatalogPage.tsx`, `CourseDetailsPage.tsx`, `MyLearningPage.tsx`
- `CourseLearningMapPage.tsx`, `LessonWorkspacePage.tsx`
- Teacher `CoursesPage.tsx`, `CourseOverviewPage.tsx`, `CurriculumEditorPage.tsx`, `PrerequisiteManagerPage.tsx`, `ResourceManagerPage.tsx`
- `frontend/src/services/storageService.ts`, API client/services, `frontend/src/types/index.ts`, `frontend/src/utils/dag.ts`, and relevant tests.

Replace only the Phase 4 data paths. Preserve visual design and existing user flows. Use typed API services and explicit loading/error/empty states. Do not silently fall back to localStorage after a backend failure. Keep unrelated local features intact. Ensure refresh/re-login reads persisted backend data.

## 9. Expected implementation areas (not a blind file list)

Antigravity must inspect the actual repository and submit exact paths before editing. Likely areas:

- `backend/app/models/` — enrollment, lesson completion, resource activity models and relationships; update `__init__.py`.
- `backend/app/schemas/` — course, curriculum, enrollment, resource, activity request/response schemas.
- `backend/app/services/` — course, curriculum, DAG, enrollment, resource/activity services.
- `backend/app/api/v1/endpoints/` — course, topic, lesson, resource, enrollment endpoints; update router.
- `backend/alembic/versions/` — one or more additive migrations, staged if needed.
- `backend/tests/` — service, API, RBAC, DAG, enrollment, migration/integration tests.
- `frontend/src/services/api/`, feature pages/hooks, types, and tests — only the Phase 4 integration slice.
- `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`, phase evidence records.

Do not create one giant `courses.py` service containing every domain rule. Keep routers thin and services cohesive.

## 10. Required tests

### Backend unit/service

- DAG: valid graph, self-edge, two-node cycle, multi-hop cycle, cross-course prerequisite, replacing edges atomically.
- Publication: empty course, topic without lesson, valid course, cycle, invalid cross-course edge.
- Enrollment: first enrollment, repeat enrollment, concurrent duplicate, draft/archived course rejection, non-student rejection.
- Authorization: assigned teacher, unassigned teacher, creator policy, administrator, student denial.
- Completion/activity: owner can record, other student cannot, lesson/resource from another course rejected, duplicate completion idempotent, duration validation.
- Serialization: derived course IDs and ordering stable; no leakage of private enrollment data.

### Database/API integration

- Additive Alembic upgrade on disposable PostgreSQL.
- Constraint behavior and rollback.
- Transaction safety on duplicate enrollment and prerequisite replacement.
- Full route response/error contracts.
- Existing Phase 2/3 migration, auth, RBAC, admin safeguard, and audit tests remain green.

### Frontend regression

- Existing lint, tests, and production build.
- Catalog/detail/enrollment and teacher curriculum/resource workflows.
- Refresh/re-login persistence.
- No unintended visual or navigation regression.
- No silent mock fallback when API is unavailable.

Run only commands actually supported by package scripts; record exact commands and exit codes.

## 11. Acceptance criteria

- [ ] Course catalog/detail is served from PostgreSQL-backed APIs.
- [ ] Teacher course mutations are restricted by backend assignment/ownership checks.
- [ ] Published course visibility is enforced server-side.
- [ ] Course publication validates hierarchy and prerequisite DAG.
- [ ] Duplicate enrollment is safe and idempotent under concurrency.
- [ ] Enrollment and lesson completion survive refresh/re-login.
- [ ] Resource metadata and resource activity persist.
- [ ] No fabricated mastery/readiness/course-completion values are returned.
- [ ] Existing frontend behavior and unrelated features remain intact.
- [ ] Migrations and tests pass on a disposable DB; persistent DB volume is preserved.
- [ ] `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, and `DECISIONS.md` are reconciled.
- [ ] Six phase evidence records are complete; status is `READY_FOR_REVIEW`, not self-accepted.

## 12. Stop conditions

Stop and ask the owner if: course completion criteria are needed to implement an API; resource upload/storage behavior requires a product decision; published-course deletion/editing semantics risk student history; the current schema differs materially from this baseline; or a source conflict changes student-visible behavior. Do not block unrelated work on Phase 7 mastery algorithm or Phase 8 gamification.
