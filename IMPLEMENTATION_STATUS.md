# Learnova Implementation Status & Traceability Matrix

**Document Status:** Baseline Verified for Phase 0  
**Authority:** `Learnova_Master_Backend_Implementation_Blueprint.md`, Section 14.2  
**Last Updated:** Phase 0 Baseline Audit (2026-11-06)

---

## 1. Summary of Capabilities

| Status | Count | Notes |
|---|---|---|
| **IMPLEMENTED** | 3 | Phase 1 Backend Foundation, Phase 2 Initial Domain Schema & Migrations, and Phase 3 Authentication & RBAC (FastAPI auth routes, bcrypt cost 12, JWT 15m, rotating refresh cookies 7d, admin safeguards, teacher course scoping, audit logging, 52 backend tests passing, live frontend student auth integration, 29 frontend tests passing). |
| **IN_PROGRESS** | 1 | Phase 4 Curriculum, Enrollment, and Resources (Stage A Plan submitted for owner review). |
| **PARTIAL** | 2 | Express AI endpoints (`POST /api/ai/generate-questions`, `POST /api/ai/simplify-lesson`) are live with Gemini integration & deterministic fallbacks, but lack FastAPI ownership and persistent database logging. |
| **MOCK_ONLY** | 16 | All UI screens, navigation, assessment players, mastery logic, DAG validation, and admin actions function via in-memory and `localStorage` mock state in `frontend/src/services/storageService.ts`. |
| **NOT_IMPLEMENTED** | 0 | (All domain capabilities exist in mock UI form). |
| **BLOCKED/UNKNOWN** | 0 | All areas inspected and classified with direct code evidence. |

---

## 2. SSD-01 through SSD-08 Workflow Traceability

| SSD | Name | UI Component / Page | Current API Endpoint | Backend Service | Persistence Mechanism | Test Coverage | Current Status |
|:---|:---|:---|:---|:---|:---|:---|:---:|
| **SSD-01** | Course Enrollment & Curriculum Loading | `CourseCatalogPage.tsx`, `CourseDetailsPage.tsx`, `MyLearningPage.tsx` | None (Direct JS) | None (Client storage) | `localStorage` (`learnova_courses_v2`, `learnova_enrollments_v2`) | None | **MOCK_ONLY** |
| **SSD-02** | Topic Selection & Prerequisite Diagnostic | `CourseLearningMapPage.tsx`, `DiagnosticIntroPage.tsx`, `DiagnosticPlayerPage.tsx` | None (Direct JS) | None (Client logic in `src/utils/studentLogic.ts`) | `localStorage` (`learnova_mastery_states_v2`, `learnova_assessment_sessions_v2`) | `src/utils/studentLogic.test.ts` (Topic readiness) | **MOCK_ONLY** |
| **SSD-03** | Personalized Learning Path & Resource Study | `CourseLearningMapPage.tsx`, `LessonWorkspacePage.tsx` | None (Direct JS) | None (Client `getRecommendedNextStep`) | `localStorage` (`learnova_lesson_completions_v2`) | None | **MOCK_ONLY** |
| **SSD-04** | Adaptive Practice & Mastery Recalibration | `AdaptivePracticePlayerPage.tsx`, `AssessmentResultsPage.tsx`, `QuestionRenderer.tsx` | None (Direct JS) | None (Client `getNextAdaptiveQuestion`, `calculateAcademicMastery`) | `localStorage` (`learnova_attempts_v2`, `learnova_mastery_states_v2`) | `src/utils/studentLogic.test.ts`, `src/utils/assessment.test.ts` | **MOCK_ONLY** |
| **SSD-05** | On-Demand AI/LLM Learning Support | `AIHelperPanel.tsx` | `POST /api/ai/simplify-lesson` (Port 3000) | Express (`frontend/server.ts`) | In-memory `lessonAICache` (`Map<string, string>`) | Live HTTP curl tests | **PARTIAL** |
| **SSD-06** | Final Summative Exam & Course Completion | `FinalExamPlayerPage.tsx`, `AssessmentResultsPage.tsx` | None (Direct JS) | None (Client assessment scoring) | `localStorage` (`learnova_attempts_v2`, `learnova_enrollments_v2`) | `src/utils/assessment.test.ts` | **MOCK_ONLY** |
| **SSD-07** | Teacher Course & Content Management | `CoursesPage.tsx`, `CourseOverviewPage.tsx`, `CurriculumEditorPage.tsx`, `PrerequisiteManagerPage.tsx`, `ResourceManagerPage.tsx` | None (Direct JS) | None (Client DAG validator) | `localStorage` (`learnova_courses_v2`, `learnova_topics_v2`, `learnova_lessons_v2`) | `src/utils/dag.test.ts` (Cycle detection) | **MOCK_ONLY** |
| **SSD-08** | Teacher Assessment & AI Question Management | `QuestionBankPage.tsx`, `QuestionEditorPage.tsx`, `AIReviewPage.tsx`, `AssessmentsPage.tsx`, `AssessmentEditorPage.tsx` | `POST /api/ai/generate-questions` (Port 3000) | Express (`frontend/server.ts`) | `localStorage` (`learnova_questions_v2`, `learnova_ai_candidates_v2`, `learnova_assessments_v2`) | `src/utils/assessment.test.ts`, live HTTP curl | **PARTIAL** |

---

## 3. Complete SRS Use Case Traceability (18 Use Cases)

| Use Case ID | Use Case Name | Primary Actors | Frontend Screen / Component | Storage / State | Verified Tests | Status |
|:---|:---|:---|:---|:---|:---|:---:|
| `uc_auth` | Manage Account & Profile | Student, Teacher, Admin | `SignInPage.tsx`, `CreateAccountPage.tsx`, `ProfileSettingsPage.tsx` | Live PostgreSQL (`users`, `roles`, `user_profiles`, `sessions`, `security_audit_events`) | `test_auth_endpoints.py`, `test_rbac_authorization.py`, `test_admin_guardrails.py`, `test_user_profile_security.py` | **IMPLEMENTED** |
| `uc_enroll` | Browse & Enroll in Course | Student | `CourseCatalogPage.tsx`, `CourseDetailsPage.tsx` | `storage.getEnrollments()`, `localStorage` | None | **MOCK_ONLY** |
| `uc_diag` | Take Prerequisite Diagnostic | Student | `DiagnosticIntroPage.tsx`, `DiagnosticPlayerPage.tsx` | `storage.getAssessmentSessions()` | `studentLogic.test.ts` | **MOCK_ONLY** |
| `uc_path` | Receive Personalized Learning Path | Student | `CourseLearningMapPage.tsx` | `storage.getRecommendedNextStep()` | `studentLogic.test.ts` | **MOCK_ONLY** |
| `uc_study` | Study Learning Resources | Student | `LessonWorkspacePage.tsx` | `storage.getLessonCompletions()` | None | **MOCK_ONLY** |
| `uc_practice` | Attempt Adaptive Practice | Student | `AdaptivePracticePlayerPage.tsx` | `storage.getAttempts()` | `studentLogic.test.ts`, `assessment.test.ts` | **MOCK_ONLY** |
| `uc_exam` | Take Final Examination | Student | `FinalExamPlayerPage.tsx` | `storage.getAttempts()` | `assessment.test.ts` | **MOCK_ONLY** |
| `uc_stu_analytics` | View Learning Progress & Analytics | Student | `ProgressAnalyticsPage.tsx` | `storage.getMasteryStates()` | None | **MOCK_ONLY** |
| `uc_update_mastery` | Update Topic Mastery & Student State | System | Triggered on assessment complete | `storage.saveMasteryState()` | `assessment.test.ts` (`calculateAcademicMastery`) | **MOCK_ONLY** |
| `uc_regen_path` | Regenerate Learning Path | System | Triggered on mastery change | `storage.getRecommendedNextStep()` | `studentLogic.test.ts` | **MOCK_ONLY** |
| `uc_gamify` | Earn Gamification Rewards (XP, Badges, Streaks) | Student | `AchievementsBadgesPage.tsx`, `XPActivityHistoryPage.tsx`, `LeaderboardPage.tsx` | `storage.getGamificationProfile()`, `storage.getXPEvents()` | `studentLogic.test.ts` (`calculateLevelFromXP`) | **MOCK_ONLY** |
| `uc_ai_support` | Request AI Learning Support | Student, AI/LLM | `AIHelperPanel.tsx` | Express `/api/ai/simplify-lesson` + `lessonAICache` | Live endpoint test (cached & uncached) | **PARTIAL** |
| `uc_manage_courses` | Manage Courses & Hierarchy | Teacher | `CoursesPage.tsx`, `CourseOverviewPage.tsx`, `CurriculumEditorPage.tsx` | `storage.getCourses()`, `storage.getTopics()` | None | **MOCK_ONLY** |
| `uc_define_prereq` | Define Prerequisite Dependencies | Teacher | `PrerequisiteManagerPage.tsx` | `storage.saveTopic()` | `dag.test.ts` (DAG cycle tests) | **MOCK_ONLY** |
| `uc_manage_content` | Provide Content & Resources | Teacher | `ResourceManagerPage.tsx` | `storage.getResources()` | None | **MOCK_ONLY** |
| `uc_manage_assessments` | Manage Assessments & Questions | Teacher | `QuestionBankPage.tsx`, `QuestionEditorPage.tsx`, `AssessmentsPage.tsx` | `storage.getQuestions()`, `storage.getAssessments()` | `assessment.test.ts` (`validateQuestion`) | **MOCK_ONLY** |
| `uc_review_ai` | Review AI-Generated Questions | Teacher, AI/LLM | `AIReviewPage.tsx` | Express `/api/ai/generate-questions` + `storage.saveCandidates()` | Live endpoint test | **PARTIAL** |
| `uc_monitor_perf` | Monitor Student Performance | Teacher | `AnalyticsPage.tsx` | `storage.getAttempts()`, `storage.getUsers()` | None | **MOCK_ONLY** |

---

## 4. Frontend Screen Inventory (39 Total Pages)

### Teacher Portal (12 Pages + 1 Layout)
1. `DashboardPage.tsx` — Teacher KPI dashboard and quick actions.
2. `CoursesPage.tsx` — Course catalog management for instructor.
3. `CourseOverviewPage.tsx` — Syllabus outline and topic hierarchy.
4. `CurriculumEditorPage.tsx` — Topic tree and lesson sequence editor.
5. `PrerequisiteManagerPage.tsx` — Visual prerequisite graph with DAG cycle prevention.
6. `ResourceManagerPage.tsx` — Media, PDF, slide, and notes attachment manager.
7. `QuestionBankPage.tsx` — Item pool filtering by topic, difficulty, type.
8. `QuestionEditorPage.tsx` — Question authoring interface with real-time validation.
9. `AIReviewPage.tsx` — Gemini question generation, preview, edit, approve, reject flow.
10. `AssessmentsPage.tsx` — Assessment lifecycle management (draft, published, archived).
11. `AssessmentEditorPage.tsx` — Test composition, question picking, timing, passing grade.
12. `AnalyticsPage.tsx` — Class mastery distributions, radar charts, question item discrimination.
- Layout: `TeacherLayout.tsx`

### Student Portal (18 Pages + 1 Layout + 3 Sub-components)
1. `SignInPage.tsx` — Mock authentication entry point.
2. `CreateAccountPage.tsx` — Student registration with interest tags.
3. `StudentDashboardPage.tsx` — Overview of enrolled courses, daily streak, recent achievements.
4. `CourseCatalogPage.tsx` — Public course discovery and search.
5. `CourseDetailsPage.tsx` — Course syllabus, instructor info, enrollment action.
6. `MyLearningPage.tsx` — Enrolled courses with progress indicators.
7. `CourseLearningMapPage.tsx` — Interactive learning map with topic readiness states.
8. `LessonWorkspacePage.tsx` — Lesson reading, markdown viewer, resource launcher.
9. `DiagnosticIntroPage.tsx` — Prerequisite diagnostic briefing and readiness explanation.
10. `DiagnosticPlayerPage.tsx` — Timed prerequisite diagnostic test engine.
11. `AdaptivePracticePlayerPage.tsx` — Formative quiz engine with live difficulty adaptation.
12. `FinalExamPlayerPage.tsx` — Summative examination runner with strict countdown timer.
13. `AssessmentResultsPage.tsx` — Performance breakdown, score, earned XP, updated mastery.
14. `ProgressAnalyticsPage.tsx` — Topic mastery radar charts and score trajectory.
15. `AchievementsBadgesPage.tsx` — Badge showcase and criteria tracker.
16. `XPActivityHistoryPage.tsx` — Chronological ledger of all earned XP events.
17. `LeaderboardPage.tsx` — Ranked student rankings with filtering.
18. `ProfileSettingsPage.tsx` — Student avatar, notification preferences, learning pace.
- Layout: `StudentLayout.tsx`
- Components: `AIHelperPanel.tsx`, `AssessmentPlayerShell.tsx`, `QuestionRenderer.tsx`

### Administrator Portal (9 Pages + 1 Layout + 4 Sub-components)
1. `AdminDashboardPage.tsx` — Platform overview, active users, course count, system status.
2. `UserManagementPage.tsx` — Search, filter, and manage student/teacher accounts.
3. `UserDetailsPage.tsx` — Deep dive into user enrollments, audit history, roles.
4. `RolesAccessPage.tsx` — RBAC matrix and role assignment safeguards.
5. `SecurityAuditLogPage.tsx` — Filterable security audit events with IP masking.
6. `SystemHealthPage.tsx` — Service health indicators (DB, Cache, Storage, AI).
7. `AdminProfileSecurityPage.tsx` — Admin credential management and MFA settings.
8. `CourseOversightPage.tsx` — Cross-institution course monitoring and flags.
9. `AccessDeniedPage.tsx` — Role violation fallback boundary.
- Layout: `AdminLayout.tsx`
- Components: `AuditDetailDrawer.tsx`, `ChangeRoleModal.tsx`, `DeactivateAccountModal.tsx`, `RoleBadge.tsx`

---

## 5. Architectural Overlaps & Integration Gaps

1. **Dual Server Split:**
   - Express on port 3000 currently serves the frontend AND implements the AI endpoints (`generate-questions`, `simplify-lesson`).
   - FastAPI on port 8000 is completely isolated, hosting only `GET /health`.
   - **Target Resolution:** In Phase 1–3, frontend will proxy `/api/v1/*` to FastAPI. In Phase 9, AI endpoints will migrate from Express to FastAPI behind an LLM adapter.

2. **Client-Side Security:**
   - In the current frontend, role enforcement (`validateRoleChange`, `validateAccountStatusChange`) is performed inside React UI components using `frontend/src/utils/adminLogic.ts`.
   - **Target Resolution:** Must be enforced authoritatively on the FastAPI backend with JWT claims and database constraints (Phase 3).

---

## 6. Technical Foundation Services (`LAY-TECH`) — Phase 1 Verified

| Capability | Component / Module | Endpoints | Persistence / Drivers | Verified Tests | Status |
|:---|:---|:---|:---|:---|:---:|
| Environment Settings | `backend/app/core/config.py` | N/A | Pydantic `BaseSettings`, `.env` | `tests/test_config.py` (4 tests) | **IMPLEMENTED** |
| Structured Logging | `backend/app/core/logging.py` | N/A | Secret-scrubbing StreamHandler | Verified in startup logs | **IMPLEMENTED** |
| Database Engine & Session | `backend/app/db/session.py` | N/A | SQLAlchemy 2.0+ & `psycopg2-binary` | `tests/test_db_connection.py` (3 tests) | **IMPLEMENTED** |
| Process Liveness | `backend/app/main.py`, `backend/app/api/v1/endpoints/health.py` | `GET /health`, `GET /api/v1/health/liveness` | In-memory process status | `tests/test_health.py` (2 tests), live `curl` | **IMPLEMENTED** |
| Database Readiness | `backend/app/main.py`, `backend/app/api/v1/endpoints/health.py` | `GET /ready`, `GET /api/v1/health/readiness` | PostgreSQL connection probe (`SELECT 1`) | `tests/test_health.py` (2 tests), live `curl` | **IMPLEMENTED** |
| Alembic Migration Scaffold | `backend/alembic.ini`, `backend/alembic/env.py` | CLI (`alembic upgrade/downgrade`) | Dynamic URL from settings, `Base.metadata` | `tests/test_alembic_disposable.py` (2 tests) | **IMPLEMENTED** |
| Docker Synchronization | `docker-compose.yml`, `backend/Dockerfile` | Ports 8000 & 5432 | Volume bind `./backend:/app` | Docker container build & execution | **IMPLEMENTED** |


---

## 7. Initial Domain Schema (`LAY-DOMAIN`) — Phase 2 Status

| Capability | Component / Module | Scope / Tables | Driver / Migration | Verified Tests | Status |
|:---|:---|:---|:---|:---|:---:|
| D1 User Identity & Roles | `backend/app/models/user.py`, `role.py`, `profile.py` | `roles`, `users`, `user_profiles` | Alembic Migration 1 (`20261108_0001`) | `tests/test_models_d1.py` (6 tests) | **IMPLEMENTED** |
| D2 Courses & Assignments | `backend/app/models/course.py`, `course_teacher.py` | `courses`, `course_teachers` | Alembic Migration 2 (`20261108_0002`) | `tests/test_models_d2.py` (8 tests) | **IMPLEMENTED** |
| D2 Topics & Prerequisite DAG | `backend/app/models/topic.py`, `topic_prerequisite.py` | `topics`, `topic_prerequisites` | Alembic Migration 3 (`20261108_0003`) | `tests/test_models_d2.py` (prereq self-edge & duplicate) | **IMPLEMENTED** |
| D2 Lessons & Resources | `backend/app/models/lesson.py`, `resource.py` | `lessons`, `learning_resources` | Alembic Migration 4 (`20261108_0004`) | `tests/test_models_d2.py` (type constraints & cascades) | **IMPLEMENTED** |
| Migration Lifecycle | `backend/tests/test_migrations_postgres.py` | Full upgrade/downgrade/upgrade on disposable DB | PostgreSQL 17 isolated test DB | `tests/test_migrations_postgres.py` (1 test) | **IMPLEMENTED** |
| Development Seed CLI | `backend/app/cli/seed.py` | Role seed & dev accounts | CLI (`python -m app.cli.seed`) | `tests/test_seed_dev.py` (3 tests) | **IMPLEMENTED** |


---

## 8. Authentication and RBAC (`LAY-TECH` / `LAY-DOMAIN`) — Phase 3 Status

| Capability | Component / Module | Scope / Endpoints | Persistence / Drivers | Verified Tests | Status |
|:---|:---|:---|:---|:---|:---:|
| User Registration | `backend/app/api/v1/endpoints/auth.py` | `POST /api/v1/auth/register` (student only) | `users`, `user_profiles`, `sessions` | `tests/test_auth_endpoints.py` | **IMPLEMENTED** |
| User Login & Sessions | `backend/app/api/v1/endpoints/auth.py` | `POST /api/v1/auth/login` (bcrypt + JWT + cookie) | `sessions` table (SHA-256 hashed) | `tests/test_auth_endpoints.py` | **IMPLEMENTED** |
| Token Refresh Rotation | `backend/app/api/v1/endpoints/auth.py` | `POST /api/v1/auth/refresh` | `sessions` table (hash rotation) | `tests/test_auth_endpoints.py` | **IMPLEMENTED** |
| Logout & Revocation | `backend/app/api/v1/endpoints/auth.py` | `POST /api/v1/auth/logout` | `sessions` table (`is_revoked`) | `tests/test_auth_endpoints.py` | **IMPLEMENTED** |
| Current User & Profile | `backend/app/api/v1/endpoints/auth.py`, `users.py` | `GET /api/v1/auth/me`, `PUT /api/v1/users/me` | `users`, `user_profiles` | `tests/test_user_profile_security.py` | **IMPLEMENTED** |
| Admin Governance & Safeguards | `backend/app/api/v1/endpoints/admin.py` | `PUT /api/v1/admin/users/{id}/role`, `/status` | Row locks on active admin count | `tests/test_admin_guardrails.py` | **IMPLEMENTED** |
| Teacher Course Authorization | `backend/app/core/dependencies.py` | `require_teacher_assigned_to_course` | `course_teachers` junction | `tests/test_rbac_authorization.py` | **IMPLEMENTED** |
| Security Event Auditing | `backend/app/models/security_audit_event.py` | Audit service on auth actions | `security_audit_events` | Live DB inspection & tests | **IMPLEMENTED** |
| Frontend Auth Integration | `frontend/src/services/api/authApi.ts` | `SignInPage.tsx`, `CreateAccountPage.tsx`, `App.tsx` | Cookie credentials & session restore | Vitest (29 tests) & Vite build | **IMPLEMENTED** |


---

## 9. Curriculum, Enrollment & Resources (`LAY-DOMAIN` / `LAY-TECH`) — Phase 4 Status

| Capability | Component / Module | Scope / Endpoints | Persistence / Drivers | Verified Tests | Status |
|:---|:---|:---|:---|:---|:---:|
| Course Catalog & Details | `backend/app/api/v1/endpoints/courses.py` | `GET /courses`, `GET /courses/{id}` | `courses`, `topics`, `lessons` | Planned Phase 4 | **PLAN_SUBMITTED** |
| Teacher Course Management | `backend/app/api/v1/endpoints/courses.py` | `POST /courses`, `PATCH /courses/{id}` | `courses`, `course_teachers` | Planned Phase 4 | **PLAN_SUBMITTED** |
| Course Publication Gate | `backend/app/services/course_service.py` | `POST /courses/{id}/publish` | Validation rules & status change | Planned Phase 4 | **PLAN_SUBMITTED** |
| Curriculum Hierarchy CRUD | `backend/app/api/v1/endpoints/topics.py`, `lessons.py` | Topics, lessons, and resources CRUD | `topics`, `lessons`, `resources` | Planned Phase 4 | **PLAN_SUBMITTED** |
| Prerequisite DAG Validation | `backend/app/services/dag_service.py` | `PUT /topics/{id}/prerequisites` | DFS cycle detection & `topic_prerequisites` | Planned Phase 4 | **PLAN_SUBMITTED** |
| Course Enrollment Lifecycle | `backend/app/api/v1/endpoints/enrollments.py` | `POST /courses/{id}/enrollments` | `enrollments` table (`UNIQUE` constraint) | Planned Phase 4 | **PLAN_SUBMITTED** |
| Lesson Completion Tracking | `backend/app/api/v1/endpoints/lessons.py` | `POST /lessons/{id}/complete` | `lesson_completions` & progress recalculation | Planned Phase 4 | **PLAN_SUBMITTED** |
| Learning Map & Readiness | `backend/app/api/v1/endpoints/enrollments.py` | `GET /courses/{id}/learning-map` | Topic readiness evaluation & DAG | Planned Phase 4 | **PLAN_SUBMITTED** |
