# Phase 11 File Change Ledger — Frontend Backend Integration & Mock Persistence Migration

**Phase:** Phase 11 — Frontend Backend Integration & Mock Persistence Migration (`PHASE-11`)  
**Date:** 2026-11-11  
**Authority:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md` Section 6, `docs/phases/PHASE-11_FRONTEND_MIGRATION_REGRESSION.md`

---

## 1. Proposed File Changes (Stage A Baseline)

| Change ID | File Path | Action | Reason | Previous Behavior | Proposed Behavior | Impact | Verification | Status |
|:---|:---|:---:|:---|:---|:---|:---|:---|:---:|
| `CHG-P11-01` | `frontend/server.ts` | MODIFY | Transparent `/api/v1/*` proxying. | Only proxied `/api/ai/*`; other `/api/v1` routes fell through. | Transparently proxies all `/api/v1/*` requests to `BACKEND_URL`, forwarding headers and cookies. | Server Infrastructure | Integration tests | APPLIED |
| `CHG-P11-02` | `frontend/src/services/api/authApi.ts` | MODIFY | Extend auth client if needed. | Handles login, register, refresh, me, logout. | Ensures token propagation and event callbacks for session change. | API Client | Unit tests | VERIFIED_READY |
| `CHG-P11-03` | `frontend/src/services/api/coursesApi.ts` | CREATE | Client for courses and enrollments. | None existed; pages used mock storage. | Implements `getCourses`, `getCourseDetail`, `enrollCourse`, `getMyEnrollments`. | API Client | Unit tests | APPLIED |
| `CHG-P11-04` | `frontend/src/services/api/learningPathApi.ts` | CREATE | Client for learning map, learning path, and topic readiness. | None existed; pages used mock storage. | Implements `getLearningMap`, `getLearningPath`, `getTopicReadiness`. | API Client | Unit tests | APPLIED |
| `CHG-P11-05` | `frontend/src/services/api/curriculumApi.ts` | CREATE | Client for lesson completions and resource activities. | None existed; pages used mock storage. | Implements `completeLesson`, `recordResourceActivity`. | API Client | Unit tests | APPLIED |
| `CHG-P11-06` | `frontend/src/services/api/assessmentApi.ts` | CREATE | Client for assessment attempts and grading. | None existed; pages used mock storage. | Implements `startAttempt`, `getNextQuestion`, `submitAnswer`, `submitAttempt`, `getAttemptResult`. | API Client | Unit tests | APPLIED |
| `CHG-P11-07` | `frontend/src/services/api/gamificationApi.ts` | CREATE | Client for gamification profiles, XP ledger, badges, and leaderboard. | None existed; pages used mock storage. | Implements `getProfile`, `updateProfile`, `getXPHistory`, `getBadges`, `getLeaderboard`. | API Client | Unit tests | APPLIED |
| `CHG-P11-08` | `frontend/src/services/api/teacherApi.ts` | CREATE | Client for teacher courses, assessments, and curriculum editing. | None existed; pages used mock storage. | Implements teacher course management, topic/lesson CRUD, prerequisite DAG management, and assessment authoring. | API Client | Unit tests | APPLIED |
| `CHG-P11-09` | `frontend/src/services/api/adminApi.ts` | CREATE | Client for admin dashboard, user directory, audit logs, and diagnostics. | None existed; pages used mock storage. | Implements `getAdminDashboard`, `listUsers`, `getUserDetail`, `changeUserRole`, `toggleUserStatus`, `getAuditLogs`, `getSystemHealth`. | API Client | Unit tests | APPLIED |
| `CHG-P11-10` | `frontend/src/App.tsx` | MODIFY | State hydration and action handler migration across slices. | Synchronous state from `storage.get...()`. | Asynchronous state hydration via typed API clients upon login and portal switch; async action handlers. | App Core | Integration tests | APPLIED |
| `CHG-P11-11` | `frontend/src/pages/student/ProfileSettingsPage.tsx` | MODIFY | Connect profile saving to backend. | Mock `setTimeout`. | Calls `authApi.updateProfile`, `authApi.changePassword`, `authApi.updatePreferences`. | Student Page | Manual & automated test | APPLIED |
| `CHG-P11-12` | `frontend/src/pages/student/CourseCatalogPage.tsx` | MODIFY | Wire live catalog loading. | Mock `storage.getCourses()`. | Consumes `coursesApi.getCourses()`, supporting loading/empty states. | Student Page | Manual & automated test | VERIFIED_INTEGRATED |
| `CHG-P11-13` | `frontend/src/pages/student/CourseDetailsPage.tsx` | MODIFY | Wire live course details and enrollment. | Mock `storage.getCourse()`. | Consumes `coursesApi.getCourse()` and `coursesApi.enrollCourse()`. | Student Page | Manual & automated test | APPLIED |
| `CHG-P11-14` | `frontend/src/pages/student/CourseLearningMapPage.tsx` | MODIFY | Wire live DAG map and readiness. | Mock `storage.getTopics()`. | Consumes `learningPathApi.getLearningMap()`. | Student Page | Manual & automated test | APPLIED |
| `CHG-P11-15` | `frontend/src/pages/student/LessonWorkspacePage.tsx` | MODIFY | Wire live lesson completion and resources. | Mock completions. | Consumes `curriculumApi.completeLesson()`. | Student Page | Manual & automated test | APPLIED |
| `CHG-P11-16` | `frontend/src/pages/student/DiagnosticPlayerPage.tsx` | MODIFY | Wire live assessment attempt and grading. | Mock scores. | Consumes `assessmentApi.startAttempt()`, `submitAttempt()`. | Student Page | Manual & automated test | APPLIED |
| `CHG-P11-17` | `frontend/src/pages/student/AdaptivePracticePlayerPage.tsx` | MODIFY | Wire live adaptive question fetching. | Mock session. | Consumes `assessmentApi.getNextQuestion()`. | Student Page | Manual & automated test | APPLIED |
| `CHG-P11-18` | `frontend/src/pages/student/LeaderboardPage.tsx` | MODIFY | Wire live leaderboard and opt-in toggle. | Mock leaderboard. | Consumes `gamificationApi.getLeaderboard()`, `updateProfileOptIn()`. | Student Page | Manual & automated test | APPLIED |
| `CHG-P11-19` | `frontend/src/pages/teacher/DashboardPage.tsx` | MODIFY | Wire Phase 10 teacher dashboard API. | Mock storage. | Consumes `GET /api/v1/teacher/dashboard`. | Teacher Page | Manual & automated test | APPLIED |
| `CHG-P11-20` | `frontend/src/pages/teacher/AnalyticsPage.tsx` | MODIFY | Wire Phase 10 course analytics and heatmap API. | Mock storage. | Consumes `GET /api/v1/teacher/courses/{id}/analytics`. | Teacher Page | Manual & automated test | APPLIED |
| `CHG-P11-21` | `frontend/src/pages/admin/AdminDashboardPage.tsx` | MODIFY | Wire Phase 10 admin dashboard API. | Mock storage. | Consumes `GET /api/v1/admin/dashboard`. | Admin Page | Manual & automated test | APPLIED |
| `CHG-P11-22` | `frontend/src/pages/admin/UserManagementPage.tsx` | MODIFY | Wire Phase 10 user directory API. | Mock storage. | Consumes `GET /api/v1/admin/users`, `PUT /users/{id}/role`, `PUT /users/{id}/status`. | Admin Page | Manual & automated test | APPLIED |
| `CHG-P11-23` | `frontend/src/pages/admin/SecurityAuditLogPage.tsx` | MODIFY | Wire Phase 10 audit log API. | Mock storage. | Consumes `GET /api/v1/admin/audit-logs`. | Admin Page | Manual & automated test | APPLIED |
| `CHG-P11-24` | `frontend/src/pages/admin/SystemHealthPage.tsx` | MODIFY | Wire Phase 10 system diagnostics API. | Mock storage. | Consumes `GET /api/v1/admin/system/health`. | Admin Page | Manual & automated test | APPLIED |
| `CHG-P11-25` | `frontend/src/services/storageService.ts` | MODIFY | Retire obsolete mock methods in Slice 10. | Full mock database in localStorage. | Obsolete mock persistence methods safely deprecated. | Service | Unit & E2E tests | APPLIED |
| `CHG-P11-26` | `frontend/src/pages/admin/AdminProfileSecurityPage.tsx` | MODIFY | Connect admin password update. | Local only. | Passes both current and new password to handler calling `authApi.changePassword`. | Admin Page | Manual & automated test | APPLIED |
| `CHG-P11-27` | `frontend/src/utils/aiProxy.test.ts` | MODIFY | Test coverage for `/api/v1/*` proxy. | Only tested `/api/ai/*`. | Verifies GET `/auth/me`, POST `/auth/login`, and 503 fallback. | Test Suite | Unit tests | APPLIED |

---

## 2. Pre-Existing User Modifications (Preserved)
- `.gitignore`: User-modified to ignore `frontend/.env`.
- `UNIVERSAL_ANTIGRAVITY_PROMPT.md`: User instruction rules.
- `docs/phases/PHASE-11_FRONTEND_MIGRATION_REGRESSION.md`: Master phase guide.
