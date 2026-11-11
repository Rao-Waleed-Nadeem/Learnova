# Phase 10 Implementation Plan — Analytics, Teacher Reporting & Administration

**Phase:** Phase 10 — Analytics, Teacher Reporting and Administration (`PHASE-10`)  
**Stage:** Stage G — Completed & Verified (READY FOR OWNER ACCEPTANCE)  
**Governing Standard:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md` Section 6, `docs/phases/PHASE-10_ANALYTICS_TEACHER_ADMINISTRATION.md`, `Learnova_Master_Backend_Implementation_Blueprint.md` Section 3.5, `Learnova_SRS_Final_Aligned_V2 (1).docx` §3.2.8 & §3.2.9  
**Baseline Commit:** `f2f80eb` (`Phase 9 refactored, graphify installed and configured`)  
**Date:** 2026-11-11  
**Status:** **PHASE 10 COMPLETE — READY FOR OWNER ACCEPTANCE**

---

## 1. Executive Summary & Purpose

Phase 10 completes the backend analytics, reporting, and administration capabilities for Learnova. It establishes server-authoritative, role-specific analytical reporting across three distinct stakeholder domains:
1. **Students:** Personal learning progress, topic-level Bayesian Knowledge Tracing (BKT) mastery, syllabus completions, recent graded attempts, and weak topic identification.
2. **Teachers:** Course-scoped class participation, topic mastery distributions (heatmaps), assessment score distributions, weak-concept identification, and individual enrolled student drill-downs.
3. **Administrators:** Platform-wide KPI dashboards, paginated user directory/detail inspection, immutable security audit event querying, and safe operational system health telemetry.

### Key Architectural Invariants & Guarantees
- **Reuse Existing Schema:** Zero new database tables and zero new Alembic migrations. All metrics derive via bounded SQL aggregations on existing models (`users`, `enrollments`, `courses`, `course_teachers`, `topics`, `lessons`, `lesson_completions`, `resource_activities`, `assessments`, `assessment_attempts`, `attempt_responses`, `student_topic_mastery`, `security_audit_events`, `gamification_profiles`).
- **No XP Contamination:** Academic mastery is calculated strictly from Bayesian/empirical assessment data, never contaminated by gamification XP.
- **Configured Topic Thresholds:** Weak topics are identified by evaluating persisted mastery against each topic's individual `Topic.mastery_threshold`, strictly distinguishing `not_assessed` from low mastery.
- **Strict Role Scoping:** Teachers can only access assigned courses (`CourseTeacher`). Students can only access their own records.
- **Zero Secret Exposure:** Diagnostics, audit logs, and user directories redact password hashes, API keys, JWT secrets, and connection strings.
- **Strictly No Phase 11 Scope:** Frontend integration remains in Phase 11. Phase 10 delivers authoritative FastAPI endpoints, domain services, Pydantic schemas, and exhaustive test coverage.

---

## 2. Existing vs. Missing Capabilities Matrix

| Requirement | Scope / Capability | Current Status in Codebase | Phase 10 Implementation Target |
|:---|:---|:---:|:---|
| **Student Dashboard** | Summary of enrolled courses, completion counts, mastery overview, recent attempts, gamification | **MISSING** (UI uses mock `storageService`) | `GET /api/v1/students/me/dashboard` via `AnalyticsService.get_student_dashboard()` |
| **Student Analytics** | Detailed course topic mastery, weak topics, score trends, study activity | **MISSING** (UI uses mock `storageService`) | `GET /api/v1/students/me/analytics` via `AnalyticsService.get_student_analytics()` |
| **Student Attempt History** | Paginated list of student's completed assessment attempts | **PARTIAL** (Single attempt fetch `GET /attempts/{id}` exists; list is missing) | `GET /api/v1/students/me/attempts` via `AnalyticsService.get_student_attempts()` |
| **Teacher Dashboard** | Assigned courses overview, enrolled learners reach, active assessments | **MISSING** (UI uses mock `storageService`) | `GET /api/v1/teacher/dashboard` via `AnalyticsService.get_teacher_dashboard()` |
| **Course Analytics** | Course participation, class mastery heatmap, score distribution, weak concepts | **MISSING** (UI uses mock `storageService`) | `GET /api/v1/teacher/courses/{course_id}/analytics` via `AnalyticsService.get_course_analytics()` |
| **Student Course Drilldown** | Teacher inspection of specific enrolled student's progress in assigned course | **MISSING** (UI uses mock `storageService`) | `GET /api/v1/teacher/courses/{course_id}/students/{student_id}/analytics` |
| **Student Course Attempts** | Teacher inspection of specific enrolled student's attempts in assigned course | **MISSING** (UI uses mock `storageService`) | `GET /api/v1/teacher/courses/{course_id}/students/{student_id}/attempts` |
| **Admin Dashboard** | System aggregates: users by role, active/inactive, courses, enrollments, audit KPI | **MISSING** (UI uses mock `storageService`) | `GET /api/v1/admin/dashboard` via `AdminService.get_admin_dashboard()` |
| **Admin User Directory** | Paginated user list with role, status, search filtering, and safe profile data | **MISSING** (Only role/status mutation endpoints exist) | `GET /api/v1/admin/users` via `AdminService.list_users()` |
| **Admin User Detail** | Detailed single user inspection (profile, enrollments, teaching assignments) | **MISSING** | `GET /api/v1/admin/users/{user_id}` via `AdminService.get_user_detail()` |
| **Admin Audit Query** | Paginated query on `SecurityAuditEvent` with action, outcome, date filtering | **MISSING** (Only event creation exists in `audit_service`) | `GET /api/v1/admin/audit-logs` via `AdminService.get_audit_logs()` |
| **Safe Diagnostics** | Operational telemetry (DB latency, pool, migrations, outbox backlog, AI status) | **PARTIAL** (Basic `/health` and `/ready` exist; telemetry is missing) | `GET /api/v1/admin/system/health` via `AdminService.get_system_health()` |

---

## 3. Data Source Mapping

| Metric / Requirement | Persisted Database Source | Query Strategy | Edge Cases Handled |
|:---|:---|:---|:---|
| **Course Progress** | `lessons`, `lesson_completions` | `COUNT(lesson_completions.id) / COUNT(lessons.id)` grouped by course | Zero lessons in course -> 0% progress; completed lessons > total clamped to 100%. |
| **Student Topic Mastery** | `student_topic_mastery`, `topics` | Join `topics` on `course_id` and left join `student_topic_mastery` on `student_id` | Unassessed topics explicitly reported as `status: not_assessed`, `mastery_score: null`. |
| **Weak Topics / Concepts** | `student_topic_mastery`, `topics` | Compare `student_topic_mastery.mastery_score * 100` with `topics.mastery_threshold` | Only topics with `status != 'not_assessed'` are evaluated. `not_assessed` is NEVER marked weak. |
| **Recent Graded Attempts** | `assessment_attempts`, `assessments` | Filter `student_id == actor.id`, `status.in_(['graded', 'submitted'])`, order by `submitted_at DESC` | In-progress or abandoned attempts strictly excluded from score statistics. |
| **Gamification Summary** | `gamification_profiles` | Query `GamificationProfile` for `student_id` | Defaults cleanly if profile record does not yet exist. Explicitly separated from academic mastery. |
| **Class Mastery Heatmap** | `student_topic_mastery`, `enrollments` | Aggregate average mastery per topic across active enrollments in assigned course | If zero students assessed, `average_mastery_percent: null`. Counts per status band: `mastered`, `competent`, `developing`, `not_assessed`. |
| **Score Distribution Bands** | `assessment_attempts`, `assessments` | Bin completed attempts in course into 0-49%, 50-69%, 70-84%, 85-100% | Empty course returns all bins with 0 count. |
| **Admin Counts** | `users`, `courses`, `enrollments`, `assessment_attempts` | SQL `func.count()` queries | Fast aggregate queries; no full table in-memory fetches. |
| **Audit Logs** | `security_audit_events` | Bounded pagination on `created_at DESC` with optional indexed filters (`action`, `actor_id`, `outcome`) | Max limit enforced (100). Sensitive payload fields excluded. |
| **System Diagnostics** | PostgreSQL probe, `domain_outbox_events`, Alembic context | `SELECT 1` with execution timer; count outbox events by status (`pending`, `failed`, `processed`) | Strictly no credentials or database connection strings returned. |

---

## 4. Role Authorization Matrix

| Endpoint | HTTP Method | Student | Teacher | Administrator | Authorization Enforcement Rule |
|:---|:---:|:---:|:---:|:---:|:---|
| `/api/v1/students/me/dashboard` | GET | **ALLOW** | DENY (403) | DENY (403) | `require_role("student")` / resolves `actor.id` |
| `/api/v1/students/me/analytics` | GET | **ALLOW** | DENY (403) | DENY (403) | `require_role("student")` / resolves `actor.id` |
| `/api/v1/students/me/attempts` | GET | **ALLOW** | DENY (403) | DENY (403) | `require_role("student")` / resolves `actor.id` |
| `/api/v1/teacher/dashboard` | GET | DENY (403) | **ALLOW** | **ALLOW** | `require_role("teacher", "administrator")` |
| `/api/v1/teacher/courses/{id}/analytics` | GET | DENY (403) | **ALLOW** (Assigned) | **ALLOW** | Teacher must be assigned to course via `CourseTeacher` (403 if unassigned) |
| `/api/v1/teacher/courses/{c_id}/students/{s_id}/analytics` | GET | DENY (403) | **ALLOW** (Assigned & Enrolled) | **ALLOW** | Teacher assigned to `c_id` AND student actively enrolled in `c_id` (403/404) |
| `/api/v1/teacher/courses/{c_id}/students/{s_id}/attempts` | GET | DENY (403) | **ALLOW** (Assigned & Enrolled) | **ALLOW** | Teacher assigned to `c_id` AND student actively enrolled in `c_id` (403/404) |
| `/api/v1/admin/dashboard` | GET | DENY (403) | DENY (403) | **ALLOW** | `require_role("administrator")` |
| `/api/v1/admin/users` | GET | DENY (403) | DENY (403) | **ALLOW** | `require_role("administrator")` |
| `/api/v1/admin/users/{user_id}` | GET | DENY (403) | DENY (403) | **ALLOW** | `require_role("administrator")` |
| `/api/v1/admin/audit-logs` | GET | DENY (403) | DENY (403) | **ALLOW** | `require_role("administrator")` |
| `/api/v1/admin/system/health` | GET | DENY (403) | DENY (403) | **ALLOW** | `require_role("administrator")` |

---

## 5. Proposed File Change Ledger

### A. New Files to Create
1. **`backend/app/schemas/analytics.py`**
   - Pydantic models for Student Dashboard, Student Analytics, Teacher Dashboard, Course Analytics, Topic Heatmap, Weak Concepts, Score Distribution, At-Risk Students.
2. **`backend/app/schemas/admin.py`**
   - Pydantic models for Admin Dashboard, Paginated Users, User Detail, Paginated Audit Logs, and Safe System Diagnostics.
3. **`backend/app/services/analytics_service.py`**
   - Authoritative domain service implementing SQL aggregations for student and teacher analytics.
4. **`backend/app/api/v1/endpoints/student_analytics.py`**
   - Router for `/api/v1/students/me/*` endpoints.
5. **`backend/app/api/v1/endpoints/teacher_analytics.py`**
   - Router for `/api/v1/teacher/*` analytics endpoints.
6. **`backend/tests/test_student_analytics.py`**
   - Pytest suite verifying student personal dashboard, progress calculation, weak topic identification, attempts history, and student isolation.
7. **`backend/tests/test_teacher_analytics.py`**
   - Pytest suite verifying teacher dashboard, course analytics, class mastery heatmap, threshold-based weak concepts, score distribution, and strict course assignment authorization.
8. **`backend/tests/test_admin_analytics_and_diagnostics.py`**
   - Pytest suite verifying admin dashboard KPIs, paginated user directory/detail (no secret leaks), audit log queries and filters, and safe system diagnostics.

### B. Existing Files to Modify
1. **`backend/app/services/admin_service.py`**
   - Add `get_admin_dashboard(db, actor)`, `list_users(db, actor, ...)`, `get_user_detail(db, user_id, actor)`, `get_audit_logs(db, actor, ...)`, and `get_system_health(db, actor)` while preserving existing `update_user_role` and `update_user_status`.
2. **`backend/app/api/v1/endpoints/admin.py`**
   - Add routes: `GET /dashboard`, `GET /users`, `GET /users/{user_id}`, `GET /audit-logs`, `GET /system/health`.
3. **`backend/app/api/v1/router.py`**
   - Mount `student_analytics.router` under prefix `/students` (tags `["student-analytics"]`) and `teacher_analytics.router` under prefix `/teacher` (tags `["teacher-analytics"]`).
4. **`API_CONTRACT.md`**
   - Document all 12 Phase 10 endpoints in Section 3.8.
5. **`IMPLEMENTATION_STATUS.md`**
   - Update Phase 10 status to `IN_PROGRESS` during implementation and `READY_FOR_OWNER_ACCEPTANCE` upon completion.
6. **`DECISIONS.md`**
   - Document Phase 10 architectural decisions.

---

## 6. Database & Migration Impact Assessment
- **New Tables Required:** 0.
- **New Columns Required:** 0.
- **Alembic Migrations Required:** None.
- **Justification:** Existing schema (`users`, `enrollments`, `courses`, `course_teachers`, `topics`, `lessons`, `lesson_completions`, `resource_activities`, `assessments`, `assessment_attempts`, `attempt_responses`, `student_topic_mastery`, `security_audit_events`, `gamification_profiles`) completely models all relationships and entities required for Phase 10 analytics. Existing indexes support all planned aggregation filters.

---

## 7. Query Performance & Aggregation Strategy
1. **Avoid N+1 Queries:** Use SQL `func.count()`, `func.avg()`, `func.coalesce()`, and `GROUP BY` rather than loading entity trees into Python memory.
2. **Bounded Pagination:** All listing endpoints (`/students/me/attempts`, `/teacher/courses/{id}/students/{id}/attempts`, `/admin/users`, `/admin/audit-logs`) enforce `max_limit = 100` with default `limit = 20` and `offset = 0`.
3. **Excluded Answers & Secrets:** Attempt listings explicitly exclude grading answer keys, test rubrics, and system secrets.
4. **Clean Null Handling:** Averages over empty sets return `None` (`null` in JSON), never fabricated 0 scores.

---

## 8. Test Matrix

| Test Suite | Test Area | Verification Criteria |
|:---|:---|:---|
| `test_student_analytics.py` | Student Dashboard | Returns enrolled courses with progress %, mastery summary, recent 5 graded attempts, gamification profile separated from mastery. |
| `test_student_analytics.py` | Student Isolation | Unenrolled student cannot view course analytics; student cannot query another student's analytics; anonymous requests return 401. |
| `test_student_analytics.py` | Weak Topics | Evaluates persisted mastery against `topic.mastery_threshold`; excludes `not_assessed` from weak topic classification. |
| `test_student_analytics.py` | In-Progress Isolation | In-progress or abandoned attempts do not contaminate completed score averages or attempt history. |
| `test_student_analytics.py` | Empty States | Enrolled student with zero attempts receives clean nulls/empty arrays, not fabricated zeros. |
| `test_teacher_analytics.py` | Teacher Dashboard | Returns assigned courses and total reached learners for authenticated teacher. |
| `test_teacher_analytics.py` | Course Assignment Auth | Unassigned teacher receives 403 when requesting analytics for a course they do not teach. |
| `test_teacher_analytics.py` | Class Mastery Heatmap | Calculates distribution across mastered, competent, developing, and not_assessed per topic. |
| `test_teacher_analytics.py` | Weak Concept Identification | Accurately identifies topics where class average is below the topic's configured threshold. |
| `test_teacher_analytics.py` | Score Distribution | Correctly bins completed assessment attempts into the 4 standard percentile bands (0-49, 50-69, 70-84, 85-100). |
| `test_teacher_analytics.py` | Student Drilldown Auth | Teacher can inspect enrolled student's course analytics; receives 403/404 if student is not enrolled in the course. |
| `test_admin_analytics_and_diagnostics.py` | Admin Dashboard | Authenticated admin receives accurate real counts for users, courses, enrollments, assessments, and recent security events. Non-admin receives 403. |
| `test_admin_analytics_and_diagnostics.py` | User Directory & Detail | Paginated user directory supports search and role filters; strictly omits password hashes, salts, and session tokens. |
| `test_admin_analytics_and_diagnostics.py` | Audit Log Querying | Filterable by action, outcome, actor_id; sorted newest first; includes safe IP masking. Non-admin receives 403. |
| `test_admin_analytics_and_diagnostics.py` | Safe System Diagnostics | Verifies DB connectivity, latency measurement, migration state, outbox counts; zero credentials or DB URLs exposed. |

---

## 9. Implementation Sequence & Gates
- **Stage A — Audit & Plan:** Produce 6 phase records in `docs/antigravity-bible/phase-records/PHASE-10/`. STOP and wait for owner approval. No application source code modified.
- **Stage B — Student Analytics:** Implement `StudentAnalyticsService`, schemas, endpoints, and `test_student_analytics.py`. Verify tests pass.
- **Stage C — Teacher Analytics:** Implement Teacher analytics queries, schemas, endpoints, and `test_teacher_analytics.py`. Verify tests pass.
- **Stage D — Administration:** Implement Admin dashboard, user directory, audit queries, safe diagnostics, and `test_admin_analytics_and_diagnostics.py`. Verify tests pass.
- **Stage E — Full Regression & Documentation:** Run focused tests, full backend pytest suite, frontend tests, lint, and build. Update `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`, and phase records.
- **Stage F — Audit:** Audit complete Git diff.
- **Stage G — Report & Stop:** Submit final Phase 10 report and pause for owner acceptance.

---

## 10. Mandatory Stop

Execution is paused at **Stage A**. No application source files have been modified. Antigravity will wait for explicit project owner approval before proceeding to Stage B.
