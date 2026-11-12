# Learnova Implementation Status & Traceability Matrix

**Document Status:** Baseline Verified for Phase 0  
**Authority:** `Learnova_Master_Backend_Implementation_Blueprint.md`, Section 14.2  
**Last Updated:** Phase 0 Baseline Audit (2026-11-06)

---

## 1. Summary of Capabilities

| Status | Count | Notes |
|---|---|---|
| **IMPLEMENTED** | 10 | Phase 1 Backend Foundation, Phase 2 Initial Domain Schema & Migrations, Phase 3 Authentication & RBAC, Phase 4 Curriculum, Enrollment, and Resources, Phase 5 Question Bank & Assessment Authoring, Phase 6 Assessment Attempts & Server-Authoritative Grading, Phase 7 Knowledge Tracing & Dynamic Mastery Engine (Stabilized), Phase 8 Gamification & Outbox Reliability Corrections (Stabilized), Phase 9 AI Integration, Durable Caching & Teacher Governance (Committed at f2f80eb), Option B Durable Outbox Lifespan Processor (FastAPI Lifespan Integration, Multi-Worker Safety, Live Docker Runtime Verified). |
| **READY_FOR_OWNER_ACCEPTANCE** | 1 | Phase 10 Analytics, Teacher Reporting and Administration (Verified: 227 backend tests passing [2 skipped, 0 failed], 39 frontend tests passing 100%, clean TypeScript compile, clean production Vite build, validated Docker Compose config). Awaiting explicit project owner acceptance. |
| **IN_PROGRESS** | 0 | None. |
| **PARTIAL** | 0 | (All AI capabilities transitioned to FastAPI with durable PostgreSQL persistence and teacher governance). |
| **MOCK_ONLY** | 9 | UI screens, navigation, assessment players, and teacher/student views transition progressively to FastAPI; teacher analytics and advanced AI review remain on mock state until Phases 9 & 10. |
| **NOT_IMPLEMENTED** | 0 | (All domain capabilities exist in mock UI form). |
| **BLOCKED/UNKNOWN** | 0 | All areas inspected and classified with direct code evidence. |

---

## 2. SSD-01 through SSD-08 Workflow Traceability

| SSD | Name | UI Component / Page | Current API Endpoint | Backend Service | Persistence Mechanism | Test Coverage | Current Status |
|:---|:---|:---|:---|:---|:---|:---|:---:|
| **SSD-01** | Course Enrollment & Curriculum Loading | `CourseCatalogPage.tsx`, `CourseDetailsPage.tsx`, `MyLearningPage.tsx` | `GET /courses`, `POST /courses/{id}/enrollments`, `GET /courses/{id}` | `CourseService`, `EnrollmentService` | Live PostgreSQL (`courses`, `enrollments`, `topics`, `lessons`) | `test_curriculum_endpoints.py`, `test_enrollment_lifecycle.py` | **IMPLEMENTED** |
| **SSD-02** | Topic Selection & Prerequisite Diagnostic | `CourseLearningMapPage.tsx`, `DiagnosticIntroPage.tsx`, `DiagnosticPlayerPage.tsx` | `GET /courses/{id}/learning-map`, `GET /topics/{id}/readiness`, `POST /assessments/{id}/attempts`, `PUT /attempts/{id}/responses/{qid}`, `POST /attempts/{id}/submit` | `EnrollmentService`, `DAGService`, `AttemptService`, `GradingService`, `MasteryService` | Live PostgreSQL (`topics`, `topic_prerequisites`, `lesson_completions`, `assessment_attempts`, `attempt_responses`, `student_topic_mastery`, `mastery_audit_ledger`) | `test_enrollment_lifecycle.py`, `test_prerequisite_dag.py`, `test_attempt_lifecycle.py`, `test_topic_readiness.py` | **IMPLEMENTED** |
| **SSD-03** | Personalized Learning Path & Resource Study | `CourseLearningMapPage.tsx`, `LessonWorkspacePage.tsx` | `GET /courses/{id}/learning-path`, `POST /lessons/{id}/complete`, `POST /resources/{id}/activity` | `LearningPathService`, `EnrollmentService`, `CurriculumService`, `MasteryService` | Live PostgreSQL (`lesson_completions`, `resource_activities`, `student_topic_mastery`, `mastery_audit_ledger`) | `test_enrollment_lifecycle.py`, `test_learning_path_planner.py` | **IMPLEMENTED** |
| **SSD-04** | Adaptive Practice & Mastery Recalibration | `AdaptivePracticePlayerPage.tsx`, `AssessmentResultsPage.tsx`, `QuestionRenderer.tsx` | `POST /assessments/{id}/attempts`, `POST /attempts/{id}/next-question`, `PUT /attempts/{id}/responses/{qid}`, `POST /attempts/{id}/submit`, `POST /mastery/recalculate/{id}` | `AttemptService`, `GradingService`, `MasteryService` | Live PostgreSQL (`assessment_attempts`, `attempt_responses`, `domain_outbox_events`, `student_topic_mastery`, `mastery_audit_ledger`) | `test_attempt_concurrency_and_outbox.py`, `test_server_grading.py`, `test_mastery_bkt.py`, `test_mastery_outbox_integration.py` | **IMPLEMENTED** |
| **SSD-05** | On-Demand AI/LLM Learning Support | `AIHelperPanel.tsx` | `POST /api/v1/ai/simplify-lesson` (FastAPI) & `/api/ai/simplify-lesson` (Proxy) | `AIService` | Live PostgreSQL (`ai_content_cache`) | `test_ai_cache.py`, `test_ai_authorization.py` | **IMPLEMENTED** |
| **SSD-06** | Final Summative Exam & Course Completion | `FinalExamPlayerPage.tsx`, `AssessmentResultsPage.tsx` | `POST /assessments/{id}/attempts`, `PUT /attempts/{id}/responses/{qid}`, `POST /attempts/{id}/submit`, `GET /attempts/{id}/result` | `AttemptService`, `GradingService` | Live PostgreSQL (`assessment_attempts`, `attempt_responses`, `domain_outbox_events`) | `test_attempt_lifecycle.py`, `test_server_grading.py` | **IMPLEMENTED** |
| **SSD-07** | Teacher Course & Content Management | `CoursesPage.tsx`, `CourseOverviewPage.tsx`, `CurriculumEditorPage.tsx`, `PrerequisiteManagerPage.tsx`, `ResourceManagerPage.tsx` | `POST /courses`, `PATCH /courses/{id}`, `POST /courses/{id}/publish`, `PUT /topics/{id}/prerequisites` | `CourseService`, `CurriculumService`, `DAGService` | Live PostgreSQL (`courses`, `course_teachers`, `topics`, `topic_prerequisites`, `lessons`, `learning_resources`) | `test_curriculum_endpoints.py`, `test_prerequisite_dag.py`, `dag.test.ts` | **IMPLEMENTED** |
| **SSD-08** | Teacher Assessment & AI Question Management | `QuestionBankPage.tsx`, `QuestionEditorPage.tsx`, `AIReviewPage.tsx`, `AssessmentsPage.tsx`, `AssessmentEditorPage.tsx` | `POST /questions`, `GET /questions`, `POST /assessments`, `POST /assessments/{id}/publish`, `POST /ai/generate-questions`, `GET /ai/candidates`, `POST /ai/candidates/{id}/approve` | `QuestionService`, `AssessmentService`, `AICandidateService` | Live PostgreSQL (`questions`, `assessments`, `assessment_questions`, `ai_question_candidates`) | `test_question_bank.py`, `test_assessment_authoring.py`, `src/utils/assessment.test.ts`, `test_ai_candidate_governance.py` | **IMPLEMENTED** |

---

## 3. Complete SRS Use Case Traceability (18 Use Cases)

| Use Case ID | Use Case Name | Primary Actors | Frontend Screen / Component | Storage / State | Verified Tests | Status |
|:---|:---|:---|:---|:---|:---|:---:|
| `uc_auth` | Manage Account & Profile | Student, Teacher, Admin | `SignInPage.tsx`, `CreateAccountPage.tsx`, `ProfileSettingsPage.tsx` | Live PostgreSQL (`users`, `roles`, `user_profiles`, `sessions`, `security_audit_events`) | `test_auth_endpoints.py`, `test_rbac_authorization.py`, `test_admin_guardrails.py`, `test_user_profile_security.py` | **IMPLEMENTED** |
| `uc_enroll` | Browse & Enroll in Course | Student | `CourseCatalogPage.tsx`, `CourseDetailsPage.tsx` | Live PostgreSQL (`courses`, `enrollments`) | `test_curriculum_endpoints.py`, `test_enrollment_lifecycle.py` | **IMPLEMENTED** |
| `uc_diag` | Take Prerequisite Diagnostic | Student | `DiagnosticIntroPage.tsx`, `DiagnosticPlayerPage.tsx` | Live PostgreSQL (`assessment_attempts`, `attempt_responses`, `domain_outbox_events`) | `test_attempt_lifecycle.py`, `studentLogic.test.ts` | **IMPLEMENTED** |
| `uc_path` | Receive Personalized Learning Path | Student | `CourseLearningMapPage.tsx` | Live PostgreSQL (`student_topic_mastery`, `lesson_completions`, `topics`) | `test_learning_path_planner.py`, `studentLogic.test.ts` | **IMPLEMENTED** |
| `uc_study` | Study Learning Resources | Student | `LessonWorkspacePage.tsx` | Live PostgreSQL (`lessons`, `learning_resources`, `lesson_completions`, `resource_activities`) | `test_enrollment_lifecycle.py` | **IMPLEMENTED** |
| `uc_practice` | Attempt Adaptive Practice | Student | `AdaptivePracticePlayerPage.tsx` | Live PostgreSQL (`assessment_attempts`, `attempt_responses`, `domain_outbox_events`, `student_topic_mastery`) | `test_attempt_concurrency_and_outbox.py`, `test_mastery_bkt.py`, `studentLogic.test.ts` | **IMPLEMENTED** |
| `uc_exam` | Take Final Examination | Student | `FinalExamPlayerPage.tsx` | Live PostgreSQL (`assessment_attempts`, `attempt_responses`, `domain_outbox_events`, `student_topic_mastery`) | `test_attempt_lifecycle.py`, `test_server_grading.py`, `test_mastery_bkt.py` | **IMPLEMENTED** |
| `uc_stu_analytics` | View Learning Progress & Analytics | Student | `ProgressAnalyticsPage.tsx` | Live PostgreSQL (`student_topic_mastery`, `mastery_audit_ledger`) | `test_student_analytics.py`, `test_mastery_bkt.py` | **IMPLEMENTED** |
| `uc_update_mastery` | Update Topic Mastery & Student State | System | Triggered on assessment complete | Live PostgreSQL (`student_topic_mastery`, `mastery_audit_ledger`) | `test_mastery_bkt.py`, `test_mastery_outbox_integration.py` | **IMPLEMENTED** |
| `uc_regen_path` | Regenerate Learning Path | System | Triggered on mastery change | Live PostgreSQL (`student_topic_mastery`, `lesson_completions`) | `test_learning_path_planner.py` | **IMPLEMENTED** |
| `uc_gamify` | Earn Gamification Rewards (XP, Badges, Streaks) | Student | `AchievementsBadgesPage.tsx`, `XPActivityHistoryPage.tsx`, `LeaderboardPage.tsx` | Live PostgreSQL (`gamification_profiles`, `xp_ledger`, `badges`, `user_badges`, `challenges`, `user_challenges`, `domain_outbox_events`) | `test_gamification_profile_and_level.py`, `test_xp_ledger_idempotency.py`, `test_badge_rules.py`, `test_leaderboard_privacy.py`, `test_gamification_outbox_worker.py` | **IMPLEMENTED** |
| `uc_ai_support` | Request AI Learning Support | Student, AI/LLM | `AIHelperPanel.tsx` | Live PostgreSQL (`ai_content_cache`) | `test_ai_cache.py`, `test_ai_authorization.py` | **IMPLEMENTED** |
| `uc_manage_courses` | Manage Courses & Hierarchy | Teacher | `CoursesPage.tsx`, `CourseOverviewPage.tsx`, `CurriculumEditorPage.tsx` | Live PostgreSQL (`courses`, `course_teachers`, `topics`, `lessons`) | `test_curriculum_endpoints.py` | **IMPLEMENTED** |
| `uc_define_prereq` | Define Prerequisite Dependencies | Teacher | `PrerequisiteManagerPage.tsx` | Live PostgreSQL (`topic_prerequisites`, DFS validation) | `test_prerequisite_dag.py`, `dag.test.ts` | **IMPLEMENTED** |
| `uc_manage_content` | Provide Content & Resources | Teacher | `ResourceManagerPage.tsx` | Live PostgreSQL (`learning_resources`) | `test_curriculum_endpoints.py` | **IMPLEMENTED** |
| `uc_manage_assessments` | Manage Assessments & Questions | Teacher | `QuestionBankPage.tsx`, `QuestionEditorPage.tsx`, `AssessmentsPage.tsx` | Live PostgreSQL (`questions`, `assessments`, `assessment_questions`) | `test_question_bank.py`, `test_assessment_authoring.py`, `assessment.test.ts` | **IMPLEMENTED** |
| `uc_review_ai` | Review AI-Generated Questions | Teacher, AI/LLM | `AIReviewPage.tsx` | Live PostgreSQL (`ai_question_candidates`, `questions`) | `test_ai_candidate_governance.py`, `test_ai_authorization.py` | **IMPLEMENTED** |
| `uc_monitor_perf` | Monitor Student Performance | Teacher | `AnalyticsPage.tsx` | Live PostgreSQL (`course_teachers`, `student_topic_mastery`, `assessment_attempts`) | `test_teacher_analytics.py` | **IMPLEMENTED** |

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

---

## 10. AI Integration, Durable Caching & Corrective Stabilization (`LAY-DOMAIN` / `LAY-AI`) — Phase 9 Status

| Capability / Fix | Component / Module | Scope / Endpoints | Persistence / Drivers | Verified Tests | Status |
|:---|:---|:---|:---|:---|:---:|
| Pure Express AI Proxy (No Fallback) | `frontend/server.ts` | `/api/ai/*` | Node/Express reverse proxy forwarding to FastAPI | `frontend/src/utils/aiProxy.test.ts` (10 tests) | **READY_FOR_OWNER_ACCEPTANCE** |
| Persisted Lesson Tutoring Auth | `backend/app/services/ai_service.py`, `backend/app/schemas/ai.py` | `POST /api/v1/ai/simplify-lesson` | `lessons`, `courses`, `enrollments` table checks | `backend/tests/test_ai_authorization.py` (10 tests) | **READY_FOR_OWNER_ACCEPTANCE** |
| Content-Aware Cache Identity (v2) | `backend/app/services/ai_service.py` | `POST /api/v1/ai/simplify-lesson` | `ai_content_cache` table (SHA-256 fingerprinting) | `backend/tests/test_ai_cache.py` (5 tests) | **READY_FOR_OWNER_ACCEPTANCE** |
| Atomic Candidate Approval & Locks | `backend/app/services/ai_candidate_service.py`, `question_service.py` | `POST /api/v1/ai/candidates/{id}/approve` | `ai_question_candidates`, `questions` (row locking) | `test_ai_candidate_governance.py` (5 tests), `test_ai_concurrency.py` (7 tests) | **READY_FOR_OWNER_ACCEPTANCE** |
| PII Minimization & Prompt Boundaries | `backend/app/core/sanitizer.py`, `backend/app/ai/adapter.py` | `ILLMServiceAdapter` input preparation | Pure Python regex + XML `<student_query>` tags | `backend/tests/test_ai_privacy.py` (8 tests) | **READY_FOR_OWNER_ACCEPTANCE** |
| Teacher Candidate Review CRUD | `backend/app/api/v1/endpoints/ai.py` | `/api/v1/ai/candidates` CRUD | `ai_question_candidates` table | `test_ai_candidate_governance.py` | **READY_FOR_OWNER_ACCEPTANCE** |
| Frontend AI Client Integration | `frontend/src/components/student/AIHelperPanel.tsx`, `aiApi.ts` | Student AI Panel & Workspace | Passes `lessonId` authoritatively | Vitest (39 tests) & Vite build | **READY_FOR_OWNER_ACCEPTANCE** |

---

## 11. Analytics, Teacher Reporting & Platform Administration (`LAY-DOMAIN` / `LAY-TECH`) — Phase 10 Status

| Capability / Fix | Component / Module | Scope / Endpoints | Persistence / Drivers | Verified Tests | Status |
|:---|:---|:---|:---|:---|:---:|
| Student Personal Dashboard & KPIs | `backend/app/api/v1/endpoints/student_analytics.py`, `analytics_service.py` | `GET /api/v1/students/me/dashboard` | Live PostgreSQL (`enrollments`, `courses`, `attempts`, `gamification_profiles`) | `backend/tests/test_student_analytics.py` (7 tests) | **READY_FOR_OWNER_ACCEPTANCE** |
| Dynamic Weak Topics Evaluation | `backend/app/services/analytics_service.py`, `schemas/analytics.py` | `GET /api/v1/students/me/analytics` | Evaluated against `Topic.mastery_threshold`; excludes `not_assessed` | `backend/tests/test_student_analytics.py` | **READY_FOR_OWNER_ACCEPTANCE** |
| Student Attempts History | `backend/app/api/v1/endpoints/student_analytics.py` | `GET /api/v1/students/me/attempts` | Paginated `assessment_attempts` filtered to student | `backend/tests/test_student_analytics.py` | **READY_FOR_OWNER_ACCEPTANCE** |
| Teacher Multi-Course Dashboard | `backend/app/api/v1/endpoints/teacher_analytics.py`, `analytics_service.py` | `GET /api/v1/teacher/dashboard` | Scoped via `course_teachers` junction | `backend/tests/test_teacher_analytics.py` (10 tests) | **READY_FOR_OWNER_ACCEPTANCE** |
| Class Heatmap & Score Bands | `backend/app/services/analytics_service.py` | `GET /api/v1/teacher/courses/{id}/analytics` | Topic mastery heatmap, dynamic weak concepts, score bands (0-49, 50-69, 70-84, 85-100) | `backend/tests/test_teacher_analytics.py` | **READY_FOR_OWNER_ACCEPTANCE** |
| Teacher Student Drilldown Isolation | `backend/app/api/v1/endpoints/teacher_analytics.py` | `GET /courses/{id}/students/{sid}/*` | Strictly enforces active enrollment; 404 on isolation boundary | `backend/tests/test_teacher_analytics.py` | **READY_FOR_OWNER_ACCEPTANCE** |
| Admin Platform Overview & KPIs | `backend/app/api/v1/endpoints/admin.py`, `admin_service.py` | `GET /api/v1/admin/dashboard` | Platform aggregations: users by role, courses, enrollments, attempts, audit counts | `backend/tests/test_admin_analytics_and_diagnostics.py` (8 tests) | **READY_FOR_OWNER_ACCEPTANCE** |
| Admin User Directory & Redaction | `backend/app/services/admin_service.py`, `schemas/admin.py` | `GET /api/v1/admin/users`, `GET /users/{id}` | Filterable directory; strict redaction of password hashes & tokens | `backend/tests/test_admin_analytics_and_diagnostics.py` | **READY_FOR_OWNER_ACCEPTANCE** |
| Admin Security Audit Log Viewer | `backend/app/api/v1/endpoints/admin.py` | `GET /api/v1/admin/audit-logs` | Paginated `security_audit_events` with multi-attribute filtering | `backend/tests/test_admin_analytics_and_diagnostics.py` | **READY_FOR_OWNER_ACCEPTANCE** |
| Safe Diagnostics & Zero Leaks | `backend/app/services/admin_service.py` | `GET /api/v1/admin/system/health` | DB latency ms, pool size, Alembic head, zero secret/URL leakage | `backend/tests/test_admin_analytics_and_diagnostics.py` | **READY_FOR_OWNER_ACCEPTANCE** |

