# Frontend Module Guide (`frontend/`)

This document is the local instruction contract for AI agents modifying or extending the **Learnova Frontend Application**.

---

## 1. Purpose of the Module
The `frontend/` directory contains the complete client-side application for Learnova, providing a responsive, accessible, and gamified interface across three authenticated portals (Student, Teacher, Administrator), public landing pages, and authentication screens. It also houses the lightweight Express server (`server.ts`) that runs Vite in middleware mode during development, serves the production bundle, and reverse-proxies API calls to the FastAPI backend.

---

## 2. Responsibilities
- Rendering the Student Portal (practice sessions, timed exams, cognitive mastery trees, gamification widgets, AI lesson simplification).
- Rendering the Teacher Portal (course authoring, syllabus trees, lesson-categorized question bank, quarantined AI question candidate review queue).
- Rendering the Administrator Portal (user directory, RBAC role assignment, audit logs, backend health diagnostics).
- Client-side routing and session persistence (`src/services/routerService.ts`, `src/services/storageService.ts`).
- Dual-mode API proxying: forwarding `/api/v1/*` transparently to FastAPI and maintaining backward-compatible `/api/ai/*` routes.
- Executing client-side verification of prerequisite DAG acyclicity (`src/utils/dag.ts`).

---

## 3. Internal Directory Structure
```text
frontend/
â”œâ”€â”€ server.ts                           # Express server: Vite middleware host & FastAPI proxy
â”œâ”€â”€ index.html                          # HTML entry point with Google Fonts (Cinzel, Inter)
â”œâ”€â”€ package.json                        # Dependencies, scripts (dev, build, test, lint)
â”œâ”€â”€ vite.config.ts                      # Vite build configuration with Tailwind v4 plugin
â”œâ”€â”€ tsconfig.json                       # TypeScript compiler options
â””â”€â”€ src/
    â”œâ”€â”€ main.tsx                        # React application DOM root mounter
    â”œâ”€â”€ App.tsx                         # Master portal switcher, route orchestrator, session state
    â”œâ”€â”€ index.css                       # Global styles, Tailwind v4 imports, design tokens
    â”œâ”€â”€ types/
    â”‚   â””â”€â”€ index.ts                    # Shared TypeScript interfaces (User, Course, Question, etc.)
    â”œâ”€â”€ context/                        # React context providers (AuthContext, ThemeContext)
    â”œâ”€â”€ services/
    â”‚   â”œâ”€â”€ storageService.ts           # Resilient storage layer, seed database, local caching
    â”‚   â”œâ”€â”€ routerService.ts            # Browser hash-based and path-based router utilities
    â”‚   â””â”€â”€ api/                        # Typed REST clients for FastAPI backend
    â”‚       â”œâ”€â”€ adminApi.ts             # Admin users, audit logs, diagnostics
    â”‚       â”œâ”€â”€ aiApi.ts                # AI candidate generation, approval, simplification
    â”‚       â”œâ”€â”€ assessmentApi.ts        # Assessments authoring and attempt lifecycle
    â”‚       â”œâ”€â”€ authApi.ts              # Login, register, logout, current user
    â”‚       â”œâ”€â”€ coursesApi.ts           # Courses CRUD, syllabus retrieval
    â”‚       â”œâ”€â”€ curriculumApi.ts        # Topics, lessons, learning resources
    â”‚       â”œâ”€â”€ gamificationApi.ts      # XP, badges, leaderboards, streaks
    â”‚       â”œâ”€â”€ learningPathApi.ts      # Recommended next topics and prerequisites
    â”‚       â”œâ”€â”€ masteryApi.ts           # Bayesian Knowledge Tracing scores
    â”‚       â””â”€â”€ teacherApi.ts           # Teacher-specific course analytics & questions
    â”œâ”€â”€ components/
    â”‚   â”œâ”€â”€ ui/                         # Atomic components (Button, Modal, Badge, Table, Input)
    â”‚   â”œâ”€â”€ common/                     # Common navigation, headers, footers, breadcrumbs
    â”‚   â”œâ”€â”€ student/                    # StudentLayout, GamificationWidget, MasteryGraph
    â”‚   â”œâ”€â”€ teacher/                    # TeacherLayout, CourseCard, AICandidateCard
    â”‚   â”œâ”€â”€ admin/                      # AdminLayout, AuditLogTable, UserManagementModal
    â”‚   â”œâ”€â”€ public/                     # PublicNav, LandingHero, Footer
    â”‚   â””â”€â”€ auth/                       # LoginForm, RegisterForm, RoleSelector
    â”œâ”€â”€ pages/
    â”‚   â”œâ”€â”€ student/                    # 18 Student portal views (Dashboard, Practice, Exam, etc.)
    â”‚   â”œâ”€â”€ teacher/                    # 12 Teacher portal views (AIReviewPage, QuestionBankPage, etc.)
    â”‚   â”œâ”€â”€ admin/                      # 8 Administrator portal views (UserDirectory, SystemHealth)
    â”‚   â”œâ”€â”€ public/                     # LandingHeroPage, AboutPage, ContactPage
    â”‚   â””â”€â”€ auth/                       # LoginPage, RegisterPage
    â””â”€â”€ utils/                          # Pure business logic and testing utilities
        â”œâ”€â”€ dag.ts                      # Client-side DAG cycle prevention (DFS)
        â”œâ”€â”€ assessment.ts               # Assessment timing, scoring, question display formatting
        â”œâ”€â”€ studentLogic.ts             # Student progression, mastery normalization
        â”œâ”€â”€ teacherLogic.ts             # Teacher course scoping, question filtering
        â”œâ”€â”€ adminLogic.ts               # Admin user filtering, audit formatting
        â””â”€â”€ *.test.ts                   # Unit & integration test suites
```

---

## 4. Important Files & Entry Points
- `frontend/server.ts`: Application server entry point (Express 4.21). Handles HTTP server creation, Vite middleware integration, and reverse-proxying.
- `frontend/src/main.tsx`: Client application root mounting `App.tsx` into `#root`.
- `frontend/src/App.tsx`: Central orchestrator managing portal switching (`portal: 'student' | 'teacher' | 'admin' | 'public' | 'auth'`), current view, and authentication state.
- `frontend/src/types/index.ts`: Authoritative TypeScript type definitions for all domain entities, DTOs, and portal props.
- `frontend/src/services/storageService.ts`: Local persistence service holding initial seed data and localStorage state.
- `frontend/src/utils/dag.ts`: Topological validation and prerequisite cycle detection.

---

## 5. Important Classes and Functions
- `storageService`: Object providing CRUD methods (`getCourses()`, `saveCourses()`, `getQuestions()`, `saveQuestions()`, `getStudentProfile()`).
- `validatePrerequisiteAddition(existingPrereqs, newFromId, newToId)`: Validates whether adding a dependency introduces a circular prerequisite graph.
- `calculateStudentTopicMastery(responses)`: Client-side mastery evaluator used for immediate feedback.
- `teacherApi`: Module handling teacher operations (`getTeacherCourses()`, `getAICandidates()`, `approveAICandidate()`, `rejectAICandidate()`).
- `studentApi`: Module handling student practice and attempts (`startAttempt()`, `submitResponse()`, `finishAttempt()`).

---

## 6. Dependencies
- **Runtime:** `react` (v19.0.1), `react-dom`, `express` (v4.21.2), `lucide-react`, `motion` (v12.23.24), `three` (v0.187.0), `gsap` (v3.15.1), `mermaid`.
- **Build & Dev:** `vite` (v8.3.0), `@tailwindcss/vite` (v4.3.3), `tsx` (v4.21.0), `typescript` (v7.0.2).

---

## 7. Communication with Other Modules
- **FastAPI Backend (Port 8000):** Communicates via fetch requests directed to `/api/v1/*`. Express in `server.ts` handles transparent proxying, so the frontend code simply targets relative paths.
- **AI Endpoints:** Legacy and backward-compatible requests go to `/api/ai/generate-questions` and `/api/ai/simplify-lesson`, which Express proxies to `/api/v1/ai/*` on the FastAPI backend.
- **No Direct Database Access:** The frontend never connects directly to PostgreSQL or SQLite.

---

## 8. Existing Architectural Patterns
- **Portal Segregation:** The UI is partitioned into three distinct operational portals with role-based routing.
- **Service Layer Pattern:** UI components never execute raw `fetch()` calls. All backend calls route through typed modules in `src/services/api/`.
- **Optimistic UI with Resilient Fallback:** When the backend is offline in local prototyping, `storageService.ts` provides fallback responses while logging a clear warning.
- **Atomic Design System:** Reusable UI elements are kept in `src/components/ui/` and styled with Tailwind utility classes.

---

## 9. Common Development Operations

### Start Development Server:
```powershell
# From frontend/
npm run dev

# Or from repository root
npm run dev
```
Runs at `http://localhost:3000`.

### Production Build:
```powershell
npm run build
```
Generates production assets into `frontend/dist/`.

### Run Linter & Type Checker:
```powershell
npm run lint
```
Executes `tsc --noEmit`.

---

## 10. Important Restrictions
1. **Never Expose Answer Keys:** Student pages (`src/pages/student/`) must never receive or expect `is_correct` or `answer_key` from assessment APIs.
2. **Teacher Course Scoping:** Teacher views must only render and manage courses assigned to the logged-in teacher (`teacher.assignedCourseIds`).
3. **No Direct LocalStorage Manipulation:** Always use `storageService` methods to ensure data format integrity.
4. **No Direct State Mutation:** Always treat React state as immutable. Use functional updates or cloned structures.

---

## 11. Relevant Testing Procedures
The frontend test suite combines the Node native test runner and the TSX test runner:
```powershell
# Run full frontend test suite
npm test

# Run individual test files
node --experimental-strip-types --test src/utils/dag.test.ts
node --experimental-strip-types --test src/utils/assessment.test.ts
tsx --test src/utils/uiPageRendering.test.ts
tsx --test src/utils/e2eIntegration.test.ts
```

---

## 12. Related Technical Documentation
- [`docs/project-overview.md`](file:///c:/Learnova/docs/project-overview.md): High-level platform capabilities and portals.
- [`docs/api-documentation.md`](file:///c:/Learnova/docs/api-documentation.md): API contract for endpoints consumed by the frontend.
- [`docs/development-workflow.md`](file:///c:/Learnova/docs/development-workflow.md): Complete startup and environment instructions.
- [`AGENTS.md`](file:///c:/Learnova/AGENTS.md): Root repository instructions and invariants.
