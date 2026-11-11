# Phase 11 Implementation Plan — Frontend Backend Integration & Mock Persistence Migration

**Phase:** Phase 11 — Frontend Backend Integration & Mock Persistence Migration (`PHASE-11`)  
**Stage:** Stage A — Frontend Audit & Plan Formulation (PAUSED FOR OWNER APPROVAL)  
**Governing Authority:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md` Section 6, `docs/phases/PHASE-11_FRONTEND_MIGRATION_REGRESSION.md`, `Learnova_Master_Backend_Implementation_Blueprint.md`  
**Baseline Git Commit:** `f2f80eb`  
**Date:** 2026-11-11  
**Status:** **STAGE A AUDIT COMPLETE — PAUSED FOR OWNER APPROVAL**

---

## 1. Executive Summary & Purpose

Phase 11 integrates the existing React frontend with the authoritative FastAPI backend and PostgreSQL persistent store. Learnova possesses a comprehensive 39-page user interface across Student, Teacher, and Administrator portals. The objective is **not** to redesign, re-theme, or rewrite frontend screens, but to systematically replace mock and local storage persistence with typed, server-authoritative API calls feature by feature.

### Core Architectural Guarantees & Non-Negotiable Invariants
1. **Zero UI Redesign:** Preserve React 19, Vite, Tailwind CSS, component layouts, and user interactions.
2. **Authoritative Backend:** FastAPI and PostgreSQL are the sole owners of business rules, grading, Bayesian Knowledge Tracing (BKT) mastery, role authorization, and XP distribution. The browser never computes or submits authoritative scores or mastery percentages.
3. **No Silent Mock Fallback:** When API requests fail, the UI displays controlled error, retry, or unauthorized states; it never silently substitutes mock or demo data.
4. **Session Durability:** Student enrollments, lesson completions, diagnostic attempts, teacher courses, questions, and administrative role updates persist across browser refresh and new login sessions.
5. **Zero Data Loss:** `docker compose down -v` and destructive database resets remain strictly prohibited.
6. **Conservative Mock Retirement:** `storageService.ts` is preserved during active migration and only pruned in Slice 10 once all callers have migrated and verified live backend persistence.

---

## 2. Frontend Inventory & Data Source Mapping (39 Pages)

### 2.1 Student Portal (18 Pages)

| Page Component | Route / View | Current Data Source | StorageService Methods Used | Target FastAPI Endpoint | Proposed Slice |
|:---|:---|:---:|:---|:---|:---:|
| `SignInPage.tsx` | `/signin` | Hybrid (`authApi.login` + mock demo accounts) | `storage.getUsers()` | `POST /api/v1/auth/login`, `GET /api/v1/auth/me` | **Slice 1** |
| `CreateAccountPage.tsx` | `/create-account` | API (`authApi.register`) | None | `POST /api/v1/auth/register` | **Slice 1** |
| `ProfileSettingsPage.tsx` | `/profile` | Mock / LocalStorage | `storage.getStudentUser()`, `saveStudentUser()` | `GET /api/v1/auth/me`, `PUT /api/v1/users/me`, `PUT /api/v1/users/me/password` | **Slice 1** |
| `CourseCatalogPage.tsx` | `/courses` | Mock (`storage.getCourses`) | `storage.getCourses()` | `GET /api/v1/courses` (published courses) | **Slice 2** |
| `CourseDetailsPage.tsx` | `/courses/:id` | Mock (`storage.getCourse`) | `storage.getCourse()`, `storage.getEnrollment()`, `storage.enrollCourse()` | `GET /api/v1/courses/{id}`, `POST /api/v1/courses/{id}/enrollments` | **Slice 2** |
| `MyLearningPage.tsx` | `/my-learning` | Mock | `storage.getEnrollments()`, `storage.getCourses()` | `GET /api/v1/enrollments/me` | **Slice 2** |
| `CourseLearningMapPage.tsx` | `/courses/:id/map` | Mock | `storage.getTopics()`, `storage.getEnrollment()`, `storage.getMasteryStates()` | `GET /api/v1/courses/{id}/learning-map`, `GET /api/v1/courses/{id}/learning-path` | **Slice 3** |
| `DiagnosticIntroPage.tsx` | `/diagnostic/:id/intro`| Mock | `storage.getAssessment()`, `storage.getTopic()` | `GET /api/v1/topics/{id}/readiness`, `GET /api/v1/assessments/{id}` | **Slice 3** |
| `LessonWorkspacePage.tsx` | `/lessons/:id` | Hybrid (API for AI tutoring, mock for content) | `storage.getLesson()`, `storage.getResources()`, `storage.completeLesson()` | `POST /api/v1/lessons/{id}/complete`, `POST /api/v1/resources/{id}/activity` | **Slice 4** |
| `DiagnosticPlayerPage.tsx` | `/diagnostic/:id/play` | Mock | `storage.getAssessment()`, `storage.saveAssessmentResult()`, `awardXP()` | `POST /api/v1/assessments/{id}/attempts`, `PUT /attempts/{id}/responses/{qid}`, `POST /attempts/{id}/submit` | **Slice 5** |
| `AdaptivePracticePlayerPage.tsx` | `/practice/:id` | Mock | `storage.getAssessmentSession()`, `saveAssessmentSession()`, `saveAssessmentResult()` | `POST /api/v1/assessments/{id}/attempts`, `POST /attempts/{id}/next-question`, `POST /attempts/{id}/submit` | **Slice 5** |
| `FinalExamPlayerPage.tsx` | `/exam/:id` | Mock | `storage.getAssessment()`, `saveAssessmentResult()` | `POST /api/v1/assessments/{id}/attempts`, `PUT /attempts/{id}/responses/{qid}`, `POST /attempts/{id}/submit` | **Slice 5** |
| `AssessmentResultsPage.tsx` | `/assessment/:id/result`| Mock | `storage.getAssessmentResult()` | `GET /api/v1/attempts/{id}/result` | **Slice 5** |
| `ProgressAnalyticsPage.tsx` | `/progress` | Mock | `storage.getMasteryStates()`, `storage.getAttempts()` | `GET /api/v1/students/me/analytics`, `GET /api/v1/courses/{id}/mastery` | **Slice 6** |
| `AchievementsBadgesPage.tsx` | `/achievements` | Mock | `storage.getBadges()`, `storage.getGamificationProfile()` | `GET /api/v1/gamification/badges`, `GET /api/v1/gamification/profile` | **Slice 6** |
| `XPActivityHistoryPage.tsx` | `/xp-history` | Mock | `storage.getXPEvents()` | `GET /api/v1/gamification/xp-history` | **Slice 6** |
| `LeaderboardPage.tsx` | `/leaderboard` | Mock | `storage.getLeaderboard()` | `GET /api/v1/gamification/leaderboard`, `PATCH /api/v1/gamification/profile` (opt-in toggle) | **Slice 6** |
| `StudentDashboardPage.tsx` | `/dashboard` | Mock | `storage.getEnrollments()`, `storage.getGamificationProfile()`, `storage.getAttempts()` | `GET /api/v1/students/me/dashboard` (Phase 10 API) | **Slice 9** |

### 2.2 Teacher Portal (12 Pages)

| Page Component | Route / View | Current Data Source | StorageService Methods Used | Target FastAPI Endpoint | Proposed Slice |
|:---|:---|:---:|:---|:---|:---:|
| `CoursesPage.tsx` | `/teacher/courses` | Mock | `storage.getCourses()`, `storage.saveCourse()`, `deleteCourse()` | `GET /api/v1/courses`, `POST /api/v1/courses`, `PATCH /api/v1/courses/{id}` | **Slice 7** |
| `CourseOverviewPage.tsx` | `/teacher/courses/:id` | Mock | `storage.getCourse()`, `storage.getTopics()` | `GET /api/v1/courses/{id}`, `POST /api/v1/courses/{id}/publish` | **Slice 7** |
| `CurriculumEditorPage.tsx` | `/teacher/curriculum/:id` | Mock | `storage.getTopics()`, `saveTopic()`, `saveLesson()`, `deleteLesson()` | `POST /api/v1/topics`, `POST /api/v1/lessons`, `PATCH /topics/{id}`, `PATCH /lessons/{id}` | **Slice 7** |
| `PrerequisiteManagerPage.tsx` | `/teacher/prerequisites` | Mock | `storage.getTopics()`, `saveTopic()` | `PUT /api/v1/topics/{id}/prerequisites` (DFS cycle prevention) | **Slice 7** |
| `ResourceManagerPage.tsx` | `/teacher/resources` | Mock | `storage.getResources()`, `saveResource()`, `deleteResource()` | `POST /api/v1/resources`, `DELETE /api/v1/resources/{id}` | **Slice 7** |
| `QuestionBankPage.tsx` | `/teacher/questions` | Mock | `storage.getQuestions()`, `deleteQuestion()` | `GET /api/v1/questions` | **Slice 8** |
| `QuestionEditorPage.tsx` | `/teacher/questions/:id` | Mock | `storage.saveQuestion()` | `POST /api/v1/questions`, `PUT /api/v1/questions/{id}` | **Slice 8** |
| `AssessmentsPage.tsx` | `/teacher/assessments` | Mock | `storage.getAssessments()`, `deleteAssessment()` | `GET /api/v1/assessments` | **Slice 8** |
| `AssessmentEditorPage.tsx` | `/teacher/assessments/:id` | Mock | `storage.saveAssessment()` | `POST /api/v1/assessments`, `POST /api/v1/assessments/{id}/publish` | **Slice 8** |
| `AIReviewPage.tsx` | `/teacher/ai-review` | Hybrid (`aiApi` candidates + mock storage) | `storage.getCandidates()`, `storage.updateCandidateStatus()` | `POST /api/v1/ai/generate-questions`, `GET /api/v1/ai/candidates`, `POST /api/v1/ai/candidates/{id}/approve`, `POST /candidates/{id}/reject` | **Slice 8** |
| `DashboardPage.tsx` | `/teacher/dashboard` | Mock | `storage.getCourses()`, `storage.getAttempts()` | `GET /api/v1/teacher/dashboard` (Phase 10 API) | **Slice 9** |
| `AnalyticsPage.tsx` | `/teacher/analytics` | Mock | `storage.getAttempts()`, `storage.getUsers()` | `GET /api/v1/teacher/courses/{id}/analytics`, `GET /teacher/courses/{id}/students/{sid}/analytics` (Phase 10 API) | **Slice 9** |

### 2.3 Administrator Portal (9 Pages)

| Page Component | Route / View | Current Data Source | StorageService Methods Used | Target FastAPI Endpoint | Proposed Slice |
|:---|:---|:---:|:---|:---|:---:|
| `AdminProfileSecurityPage.tsx` | `/admin/profile` | Mock | `storage.getAdminUser()`, `storage.saveAdminUser()` | `GET /api/v1/auth/me`, `PUT /api/v1/users/me/password` | **Slice 1** |
| `RolesAccessPage.tsx` | `/admin/roles` | Mock / Static | `storage.getUsers()` | `GET /api/v1/admin/users?limit=100` (Phase 10 API) | **Slice 9** |
| `AdminDashboardPage.tsx` | `/admin/dashboard` | Mock | `storage.getUsers()`, `storage.getCourses()`, `storage.getAuditEvents()` | `GET /api/v1/admin/dashboard` (Phase 10 API) | **Slice 9** |
| `UserManagementPage.tsx` | `/admin/users` | Mock | `storage.getUsers()`, `storage.changeUserRole()`, `storage.toggleUserStatus()` | `GET /api/v1/admin/users`, `PUT /api/v1/admin/users/{id}/role`, `PUT /api/v1/admin/users/{id}/status` | **Slice 9** |
| `UserDetailsPage.tsx` | `/admin/users/:id` | Mock | `storage.getUser(id)` | `GET /api/v1/admin/users/{user_id}` (Phase 10 API) | **Slice 9** |
| `SecurityAuditLogPage.tsx` | `/admin/audit` | Mock | `storage.getAuditEvents()` | `GET /api/v1/admin/audit-logs` (Phase 10 API) | **Slice 9** |
| `SystemHealthPage.tsx` | `/admin/health` | Mock | `storage.getServiceHealth()`, `storage.refreshHealthChecks()` | `GET /api/v1/admin/system/health` (Phase 10 API) | **Slice 9** |
| `CourseOversightPage.tsx` | `/admin/oversight` | Mock (`storage.getCourses`) | `storage.getCourses()`, `storage.getAttempts()` | `GET /api/v1/courses?all=true` | **Slice 9** |
| `AccessDeniedPage.tsx` | `/admin/denied` | Presentation | None | Displayed on 403 Forbidden | **Slice 1** |

---

## 3. Migration Slices Execution Plan

The migration is partitioned into 10 cohesive vertical slices executed in dependency order:

### Slice 1: Authentication, Session & Profile
- **Files Modified/Created:** `frontend/server.ts`, `frontend/src/services/api/authApi.ts`, `frontend/src/App.tsx`, `frontend/src/pages/student/ProfileSettingsPage.tsx`, `frontend/src/pages/admin/AdminProfileSecurityPage.tsx`.
- **Scope:**
  - Add transparent `/api/v1/*` proxying in `frontend/server.ts` forwarding headers, cookies, and tokens to `BACKEND_URL`.
  - Wire session restoration on application load via `authApi.getMe()` (with silent refresh on 401).
  - Connect student and admin profile updates and password changes to `PUT /api/v1/users/me` and `PUT /api/v1/users/me/password`.
  - Ensure clean logout (`POST /api/v1/auth/logout`) and session teardown without stale localStorage residues.

### Slice 2: Course Catalog & Enrollment (SSD-01)
- **Files Modified/Created:** `frontend/src/services/api/coursesApi.ts`, `frontend/src/pages/student/CourseCatalogPage.tsx`, `frontend/src/pages/student/CourseDetailsPage.tsx`, `frontend/src/pages/student/MyLearningPage.tsx`, `frontend/src/App.tsx`.
- **Scope:**
  - Connect catalog browsing to `GET /api/v1/courses`.
  - Connect course details and syllabus outline to `GET /api/v1/courses/{id}`.
  - Connect enrollment action to `POST /api/v1/courses/{id}/enrollments`.
  - Connect "My Learning" to `GET /api/v1/enrollments/me`.

### Slice 3: Learning Map, Prerequisites & Personalized Path (SSD-02, SSD-03)
- **Files Modified/Created:** `frontend/src/services/api/learningPathApi.ts`, `frontend/src/pages/student/CourseLearningMapPage.tsx`, `frontend/src/pages/student/DiagnosticIntroPage.tsx`, `frontend/src/App.tsx`.
- **Scope:**
  - Fetch authoritative DAG learning map from `GET /api/v1/courses/{id}/learning-map`.
  - Fetch dynamic personalized next step recommendations from `GET /api/v1/courses/{id}/learning-path`.
  - Fetch topic readiness status and prerequisite diagnostic requirements from `GET /api/v1/topics/{id}/readiness`.

### Slice 4: Lessons & Learning Resources (SSD-03)
- **Files Modified/Created:** `frontend/src/services/api/curriculumApi.ts`, `frontend/src/pages/student/LessonWorkspacePage.tsx`, `frontend/src/App.tsx`.
- **Scope:**
  - Record lesson completions authoritatively via `POST /api/v1/lessons/{id}/complete`.
  - Record resource interaction telemetry via `POST /api/v1/resources/{id}/activity`.
  - Display server-confirmed progress indicators.

### Slice 5: Assessment Lifecycle & Server-Authoritative Grading (SSD-02, SSD-04, SSD-06)
- **Files Modified/Created:** `frontend/src/services/api/assessmentApi.ts`, `frontend/src/pages/student/DiagnosticPlayerPage.tsx`, `frontend/src/pages/student/AdaptivePracticePlayerPage.tsx`, `frontend/src/pages/student/FinalExamPlayerPage.tsx`, `frontend/src/pages/student/AssessmentResultsPage.tsx`, `frontend/src/App.tsx`.
- **Scope:**
  - Start attempt via `POST /api/v1/assessments/{id}/attempts`.
  - Fetch adaptive practice questions dynamically via `POST /api/v1/attempts/{id}/next-question`.
  - Record interim answers via `PUT /api/v1/attempts/{id}/responses/{qid}` (without premature mastery calculation).
  - Submit assessment for authoritative server evaluation via `POST /api/v1/attempts/{id}/submit`.
  - Render graded results and question feedback from `GET /api/v1/attempts/{id}/result`.

### Slice 6: Knowledge Tracing, Mastery & Gamification (SSD-04)
- **Files Modified/Created:** `frontend/src/services/api/gamificationApi.ts`, `frontend/src/pages/student/ProgressAnalyticsPage.tsx`, `frontend/src/pages/student/AchievementsBadgesPage.tsx`, `frontend/src/pages/student/XPActivityHistoryPage.tsx`, `frontend/src/pages/student/LeaderboardPage.tsx`, `frontend/src/App.tsx`.
- **Scope:**
  - Fetch topic mastery matrices from `GET /api/v1/courses/{id}/mastery`.
  - Fetch gamification profiles (XP, level, streak) from `GET /api/v1/gamification/profile`.
  - Connect affirmative privacy consent for leaderboard opt-in to `PATCH /api/v1/gamification/profile`.
  - Fetch XP audit history from `GET /api/v1/gamification/xp-history`.
  - Fetch badge showcases from `GET /api/v1/gamification/badges`.
  - Fetch leaderboard rankings from `GET /api/v1/gamification/leaderboard`.

### Slice 7: Teacher Content & Curriculum Management (SSD-07)
- **Files Modified/Created:** `frontend/src/services/api/teacherApi.ts`, `frontend/src/pages/teacher/CoursesPage.tsx`, `frontend/src/pages/teacher/CourseOverviewPage.tsx`, `frontend/src/pages/teacher/CurriculumEditorPage.tsx`, `frontend/src/pages/teacher/PrerequisiteManagerPage.tsx`, `frontend/src/pages/teacher/ResourceManagerPage.tsx`, `frontend/src/App.tsx`.
- **Scope:**
  - Teacher course authoring via `POST /api/v1/courses`, `PATCH /api/v1/courses/{id}`, and `POST /api/v1/courses/{id}/publish`.
  - Hierarchy management (topics and lessons) via `POST /api/v1/topics` and `POST /api/v1/lessons`.
  - Prerequisite DAG management via `PUT /api/v1/topics/{id}/prerequisites`.
  - Resource attachments via `POST /api/v1/resources`.

### Slice 8: Teacher Question Bank, Assessments & AI Review (SSD-08)
- **Files Modified/Created:** `frontend/src/pages/teacher/QuestionBankPage.tsx`, `frontend/src/pages/teacher/QuestionEditorPage.tsx`, `frontend/src/pages/teacher/AssessmentsPage.tsx`, `frontend/src/pages/teacher/AssessmentEditorPage.tsx`, `frontend/src/pages/teacher/AIReviewPage.tsx`, `frontend/src/App.tsx`.
- **Scope:**
  - Item authoring and question bank pool management via `POST /api/v1/questions` and `GET /api/v1/questions`.
  - Assessment lifecycle management via `POST /api/v1/assessments` and `POST /assessments/{id}/publish`.
  - Candidate question generation and teacher approval promotion via `/api/v1/ai/candidates/*`.

### Slice 9: Analytics, Teacher Reporting & Platform Administration (Phase 10 Integration)
- **Files Modified/Created:** `frontend/src/services/api/adminApi.ts`, `frontend/src/pages/student/StudentDashboardPage.tsx`, `frontend/src/pages/teacher/DashboardPage.tsx`, `frontend/src/pages/teacher/AnalyticsPage.tsx`, `frontend/src/pages/admin/AdminDashboardPage.tsx`, `frontend/src/pages/admin/UserManagementPage.tsx`, `frontend/src/pages/admin/UserDetailsPage.tsx`, `frontend/src/pages/admin/RolesAccessPage.tsx`, `frontend/src/pages/admin/SecurityAuditLogPage.tsx`, `frontend/src/pages/admin/SystemHealthPage.tsx`, `frontend/src/pages/admin/CourseOversightPage.tsx`, `frontend/src/App.tsx`.
- **Scope:**
  - Student overview dashboard connected to `GET /api/v1/students/me/dashboard`.
  - Teacher course analytics (class heatmaps, score bands, weak concepts, at-risk learners) connected to `GET /api/v1/teacher/courses/{id}/analytics`.
  - Administrator dashboard connected to `GET /api/v1/admin/dashboard`.
  - User directory and user details connected to `GET /api/v1/admin/users` and `GET /api/v1/admin/users/{user_id}`.
  - Role and status mutations connected to `PUT /api/v1/admin/users/{id}/role` and `PUT /users/{id}/status`.
  - Security audit log table connected to `GET /api/v1/admin/audit-logs`.
  - Operational health diagnostics connected to `GET /api/v1/admin/system/health`.

### Slice 10: Mock Persistence Retirement & Full System Verification
- **Files Modified:** `frontend/src/services/storageService.ts`, `frontend/src/App.tsx`.
- **Scope:**
  - Audit all remaining references to `storageService.ts`.
  - Remove deprecated mock data stores and dead methods once 100% of pages are verified against live FastAPI.
  - Run full regression suites (backend, frontend, E2E journeys).

---

## 4. Architectural Decisions (Proposed for Stage A)

### DEC-P11-001: Full-Duplex Transparent Express Proxy for `/api/v1/*`
- **Context:** In development and Docker Compose production, the React browser application issues requests to `/api/v1/*`. Currently, `server.ts` only proxies two specific `/api/ai/*` routes. Unproxied `/api/v1/*` requests either fail or hit SPA HTML catch-alls.
- **Decision:** Mount a transparent proxy in `frontend/server.ts` matching `/api/v1/*` forwarding HTTP methods, headers (including authorization tokens and cookies), and request bodies to `getBackendUrl()`, returning 503 Service Unavailable if FastAPI is unreachable. This eliminates competing proxy configurations and ensures browser requests use same-origin relative URLs without hardcoded Docker service hostnames.

### DEC-P11-002: Modular Typed API Clients Architecture
- **Context:** Rather than allowing components to execute raw `fetch` calls or maintaining duplicated request logic, the frontend requires a clean, modular API client layer.
- **Decision:** Create modular API client modules under `frontend/src/services/api/` (`coursesApi.ts`, `curriculumApi.ts`, `assessmentApi.ts`, `learningPathApi.ts`, `gamificationApi.ts`, `teacherApi.ts`, `adminApi.ts`) that share the base authentication token and error-handling mechanisms established in `authApi.ts`.

### DEC-P11-003: Centralized Asynchronous State Hydration in `App.tsx`
- **Context:** Learnova's frontend architecture concentrates top-level state and action dispatch in `App.tsx`.
- **Decision:** Preserve `App.tsx` as the single authoritative state hub. Replace synchronous `storage.get...()` initializers with asynchronous data fetching triggered upon user authentication and portal switching. Action handlers call the typed API clients and update React state upon verified backend success.

### DEC-P11-004: Phased Safe Deprecation of `storageService.ts`
- **Context:** Completely deleting `storageService.ts` before all 39 pages are verified risks runtime errors and breaks existing unit tests.
- **Decision:** Retain `storageService.ts` during Slices 1–9 as a safe reference. Only in Slice 10, after all portal journeys have been verified against FastAPI, will obsolete mock persistence methods be decommissioned.

---

## 5. Mandatory Stage A Pause Gate

In strict adherence to Section 6 of `docs/phases/PHASE-11_FRONTEND_MIGRATION_REGRESSION.md` and `UNIVERSAL_ANTIGRAVITY_PROMPT.md`:
- **Execution is halted at Stage A.**
- **Zero application source code files have been modified.**
- The complete frontend audit, route inventory, and 10-slice implementation plan are presented for project owner review and explicit authorization.
