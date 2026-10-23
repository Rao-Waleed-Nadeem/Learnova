# LEARNOVA FRONTEND REFACTORING MASTER PROMPT
## Organize the Teacher Module into Dedicated Folders Without Changing Existing Functionality

### 1. Your Role

Act as a Senior Software Engineer, React and TypeScript Architect, Frontend Refactoring Specialist, QA Engineer, and Technical Lead.

You are working on the existing Learnova educational platform. Your task is to correct the frontend folder organization by moving the teacher module into dedicated folders, following the organizational pattern already used for the student and administrator modules.

This is an **existing-project refactoring task, not a redesign, rewrite, or new feature development task**.

You must inspect the actual repository, understand dependencies, create a safe migration plan, execute the changes, and verify that the application continues to work.

Do not merely explain what needs to be done. Perform the refactoring in the available project workspace.

---

### 2. Project Context

Learnova is an adaptive and gamified learning platform built with:

- React 19
- TypeScript
- Vite 8
- Tailwind CSS v4
- Express
- Lucide React
- Motion
- Google GenAI SDK with Gemini 2.5 Flash
- Node.js native test runner

The application contains three main role-based portals:

1. Teacher
2. Student
3. Administrator

All three modules have already been designed and implemented through an AI-assisted frontend development workflow.

The student and administrator modules were organized into dedicated directories when they were developed. The teacher module was implemented first, and its pages were placed directly inside the shared `src/pages/` directory.

As a result, the project has inconsistent module organization.

**Your objective is to fix this inconsistency while preserving the existing application exactly as it behaves today.**

### 3. Primary Objective

Refactor the teacher module so that:

- Teacher pages are inside `src/pages/teacher/`.
- Teacher-specific layout and components are inside `src/components/teacher/`.
- Existing student files remain inside their current student directories.
- Existing administrator files remain inside their current administrator directories.
- Shared UI components remain in the shared UI directory.
- Shared services, contexts, types, and utilities remain shared unless repository evidence establishes that a file is exclusively teacher-specific and should be moved.
- All imports, exports, routes, navigation, and references are updated correctly.
- The application compiles, runs, and passes the relevant tests after the refactor.

Do not change the visual design, page contents, business logic, or functionality merely to achieve a cleaner folder structure.

---

### 4. Mandatory Repository Inspection Before Editing

Before modifying any file, inspect the actual project.

Do not rely exclusively on this prompt's proposed directory structure or the README. The current source code is the source of truth for what exists.

Inspect at least:

- `package.json`
- `src/App.tsx`
- `src/main.tsx`
- `src/index.css`
- The complete `src/pages/` directory
- The complete `src/components/` directory
- `src/services/`
- `src/context/`
- `src/types/`
- `src/utils/`
- TypeScript and Vite configuration files
- Existing tests and test scripts
- Any route definitions, barrel exports, lazy imports, dynamic imports, or module registries

Search the entire repository for references to teacher pages and teacher-specific components.

Determine:

1. Which pages belong exclusively to the teacher module.
2. Which components belong exclusively to the teacher module.
3. Which files are shared between two or more portals.
4. Which files import or dynamically load teacher files.
5. Which paths are referenced by tests, scripts, configuration, or documentation.
6. Whether the current project has additional files not listed in the README.
7. Whether any naming conflicts exist with student or admin files.

Produce a concise internal migration inventory before making changes. Do not stop after producing the inventory; continue with the refactoring.

Do not delete files or change their ownership based on filenames alone. Inspect their imports and responsibilities.

---

### 5. Required Target Folder Structure

Use the following as the target structure, adapting it to the actual repository when necessary.

```text
src/
├── App.tsx
├── main.tsx
├── index.css
│
├── components/
│   ├── teacher/
│   │   └── TeacherLayout.tsx
│   │
│   ├── student/
│   │   ├── StudentLayout.tsx
│   │   ├── AIHelperPanel.tsx
│   │   ├── AssessmentPlayerShell.tsx
│   │   └── QuestionRenderer.tsx
│   │
│   ├── admin/
│   │   ├── AdminLayout.tsx
│   │   ├── AuditDetailDrawer.tsx
│   │   ├── ChangeRoleModal.tsx
│   │   ├── DeactivateAccountModal.tsx
│   │   └── RoleBadge.tsx
│   │
│   └── ui/
│       └── Existing shared UI components
│
├── pages/
│   ├── teacher/
│   │   ├── DashboardPage.tsx
│   │   ├── CoursesPage.tsx
│   │   ├── CourseOverviewPage.tsx
│   │   ├── CurriculumEditorPage.tsx
│   │   ├── PrerequisiteManagerPage.tsx
│   │   ├── ResourceManagerPage.tsx
│   │   ├── QuestionBankPage.tsx
│   │   ├── QuestionEditorPage.tsx
│   │   ├── AIReviewPage.tsx
│   │   ├── AssessmentsPage.tsx
│   │   ├── AssessmentEditorPage.tsx
│   │   └── AnalyticsPage.tsx
│   │
│   ├── student/
│   │   └── All existing student pages
│   │
│   └── admin/
│       └── All existing administrator pages
│
├── services/
│   └── Existing shared services
│
├── context/
│   └── Existing shared contexts
│
├── types/
│   └── Existing shared domain types
│
└── utils/
    └── Existing shared utilities and tests
```

This example illustrates the expected organizational pattern. It is not an exhaustive file inventory.

If the repository contains additional teacher-only files, organize them appropriately. If the teacher module uses a dedicated hook, module-specific service, or module-specific type file, consider placing it in a suitable teacher-specific subdirectory only when that improves cohesion and does not introduce unnecessary architectural changes.

Do not create empty folders or empty placeholder files simply to match the diagram.

Do not relocate shared `Button`, `PageHeader`, `Breadcrumbs`, `ConfirmDialog`, `ThemeToggle`, or other shared UI components into the teacher directory.

---

### 6. Teacher Pages to Organize

According to the existing project documentation, the teacher module contains the following pages:

| Existing page | Required destination |
|---|---|
| `DashboardPage.tsx` | `src/pages/teacher/DashboardPage.tsx` |
| `CoursesPage.tsx` | `src/pages/teacher/CoursesPage.tsx` |
| `CourseOverviewPage.tsx` | `src/pages/teacher/CourseOverviewPage.tsx` |
| `CurriculumEditorPage.tsx` | `src/pages/teacher/CurriculumEditorPage.tsx` |
| `PrerequisiteManagerPage.tsx` | `src/pages/teacher/PrerequisiteManagerPage.tsx` |
| `ResourceManagerPage.tsx` | `src/pages/teacher/ResourceManagerPage.tsx` |
| `QuestionBankPage.tsx` | `src/pages/teacher/QuestionBankPage.tsx` |
| `QuestionEditorPage.tsx` | `src/pages/teacher/QuestionEditorPage.tsx` |
| `AIReviewPage.tsx` | `src/pages/teacher/AIReviewPage.tsx` |
| `AssessmentsPage.tsx` | `src/pages/teacher/AssessmentsPage.tsx` |
| `AssessmentEditorPage.tsx` | `src/pages/teacher/AssessmentEditorPage.tsx` |
| `AnalyticsPage.tsx` | `src/pages/teacher/AnalyticsPage.tsx` |

Verify every file exists before moving it.

If a listed file is already in the correct directory, do not move it unnecessarily.

If an additional teacher page exists, include it in the migration.

If a listed file is missing, do not fabricate a replacement. Report the discrepancy and continue safely with the files that actually exist.

---

### 7. Teacher-Specific Components and Layout

The existing documentation places `TeacherLayout.tsx` inside:

`src/components/layout/TeacherLayout.tsx`

Move it to:

`src/components/teacher/TeacherLayout.tsx`

However, first inspect its actual responsibilities and dependencies.

The teacher layout may contain:

- Teacher sidebar or navigation
- Header and page content shell
- Course selector
- Navigation tabs
- Breadcrumb integration
- Toast notifications
- Theme controls
- Module-specific responsive behavior

Preserve all of these behaviors exactly.

Inspect the repository for other teacher-only components currently located in generic directories. Move them to `src/components/teacher/` when they are genuinely teacher-specific.

Do not move shared components into `components/teacher/` just because teacher pages use them.

If a generic component directory contains only the teacher layout after migration, remove the empty directory only if doing so is safe and supported by the actual repository structure.

Do not rename `TeacherLayout` or change its public component API unless absolutely necessary to resolve a verified issue.

---

### 8. Import and Export Migration

This is one of the most important parts of the task.

Moving files without updating all references can break the application even when the new directory structure looks correct.

Search the entire project for references to every moved file.

Update all relevant imports and references, including:

- Imports inside `src/App.tsx`
- Imports inside other teacher pages
- Imports inside student or admin modules, if any
- Imports inside layouts and shared components
- Relative imports between teacher pages
- Imports of teacher-specific components
- Type imports and utility imports where paths change
- Barrel exports such as `index.ts`, if present
- Dynamic imports and lazy-loaded routes
- Route registries or page registries
- Test files and test fixtures
- Scripts and configuration files
- Documentation paths when relevant

Examples:

Old:

```tsx
import DashboardPage from './pages/DashboardPage';
import CoursesPage from './pages/CoursesPage';
import TeacherLayout from './components/layout/TeacherLayout';
```

New:

```tsx
import DashboardPage from './pages/teacher/DashboardPage';
import CoursesPage from './pages/teacher/CoursesPage';
import TeacherLayout from './components/teacher/TeacherLayout';
```

These examples are illustrative. Use the actual import style and existing component exports in the repository.

If relative imports inside a moved file now resolve differently, update them based on the new file location.

For example, an import that previously used `../utils/dag` may need a different relative path after moving the page. Verify the actual target before updating the path.

Do not blindly replace strings across the repository. Use syntax-aware or carefully targeted changes and inspect the resulting diffs.

If the project uses path aliases, preserve the existing alias conventions.

Do not introduce a new path-alias system just for this refactor.

Do not create duplicate page components or temporary compatibility files unless a real compatibility requirement exists.

After migration, there should be one authoritative implementation of each teacher page and layout.

---

### 9. Application Routing and Portal Switching

The application has a shared entry point and supports switching between the student, teacher, and administrator portals.

Inspect how `src/App.tsx` currently handles:

- Active portal state
- Teacher page selection
- Teacher layout rendering
- Page navigation
- Portal switching
- Any route or state-based navigation
- Any authentication or role-based access checks
- Toast handling and shared providers

Update only the import paths and the minimum wiring required by the new locations.

**Do not redesign the routing architecture.**

Preserve:

- Existing teacher page identifiers
- Existing route paths, if present
- Existing navigation labels
- Existing active navigation states
- Existing portal switcher behavior
- Existing page transition behavior
- Existing state management
- Existing authentication and authorization behavior
- Existing theme and context providers
- Existing browser navigation behavior, if supported

Do not change page identifiers to match folder names unless the application genuinely requires it.

Do not introduce React Router or another routing library if the project does not already use it.

Do not change the way teacher pages receive props, state, callbacks, or shared data.

---

### 10. Strictly Prohibited Changes

This task is strictly about code organization and safe dependency updates.

Do not:

1. Redesign any page.
2. Change colors, typography, spacing, layout, or responsive behavior.
3. Modify the teacher sidebar or header design.
4. Rewrite existing pages from scratch.
5. Replace existing state management.
6. Modify business rules or domain logic.
7. Change question generation or review behavior.
8. Change assessment creation or scheduling behavior.
9. Change course, topic, lesson, or resource management.
10. Change prerequisite DAG validation.
11. Change student-facing or admin-facing features.
12. Change shared domain models or database schemas.
13. Change API endpoints, Express middleware, or server behavior.
14. Change environment variables or dependency versions.
15. Remove existing tests.
16. Suppress TypeScript errors or lint errors.
17. Disable strict checks to make the build pass.
18. Delete code merely because it appears unused without verifying references.
19. Replace working implementations with placeholder pages.
20. Introduce new dependencies without a demonstrated need.

Do not make unrelated improvements during this task. If you discover unrelated problems, document them separately instead of expanding the refactor scope.

---

### 11. Preserve Shared Architecture

Learnova has shared UI components and domain logic used across the three modules.

Examples include:

- `src/components/ui/`
- `src/context/ThemeContext.tsx`
- `src/services/storageService.ts`
- `src/types/index.ts`
- Shared assessment utilities
- Shared authentication or role logic, if present
- Shared domain models and enums

Keep these shared files in their current locations unless a verified architectural reason requires a move.

The purpose of module folders is to improve organization, discoverability, and ownership—not to duplicate shared functionality.

Do not create separate teacher versions of shared components when the existing shared implementation already serves the teacher module.

Do not split shared types into multiple conflicting definitions.

Preserve the existing distinction between module-specific UI and shared infrastructure.

---

### 12. File Naming and Code Style

Keep existing file names, exported component names, and coding conventions.

Use the same capitalization and naming style already used in the project.

Avoid unrelated formatting changes.

Do not rename files simply to introduce a new naming convention.

Do not convert default exports to named exports or vice versa unless required by the existing code.

The objective is a minimal, reviewable diff that makes the folder structure consistent.

---

### 13. Safe Execution Plan

Follow these steps in order.

#### Phase A — Inspect and establish a baseline

1. Inspect the project directory tree.
2. Read the application entry point and routing logic.
3. Inspect all teacher pages and components.
4. Search all references to the files that will move.
5. Inspect the package scripts and existing tests.
6. Identify the commands available for type checking, building, linting, and testing.
7. Run the relevant baseline checks before editing when the environment permits.
8. Record any existing failures so they are not incorrectly attributed to this refactor.

Do not assume commands exist. Read `package.json` first.

#### Phase B — Prepare the migration

1. Create the teacher directories if they do not exist.
2. Create a complete mapping of old paths to new paths.
3. Identify import changes required by each move.
4. Identify any naming conflicts.
5. Confirm that no student or admin file will be overwritten.
6. Keep the migration scope limited to teacher-specific files and necessary references.

#### Phase C — Move the files

1. Move the verified teacher pages to `src/pages/teacher/`.
2. Move the teacher layout to `src/components/teacher/`.
3. Move other confirmed teacher-specific components to the same module-specific component directory.
4. Preserve file contents except for necessary import-path updates.
5. Do not create duplicate implementations.

#### Phase D — Update dependencies

1. Update imports in `src/App.tsx`.
2. Update all affected internal imports.
3. Update dynamic imports and lazy-loading references.
4. Update barrel exports if they exist.
5. Update tests or scripts that reference the old paths.
6. Update relevant documentation if it describes the old structure.
7. Search again for stale references to the old locations.

#### Phase E — Validate the refactor

1. Run TypeScript checks using the project's existing configuration and available scripts.
2. Run the production build.
3. Run the existing automated test suite.
4. Run linting if the project provides a lint script.
5. Confirm all moved files resolve correctly.
6. Confirm no duplicate teacher pages remain in `src/pages/`.
7. Confirm no duplicate teacher layout remains at the old path.
8. Inspect the final diff for unintended changes.
9. Fix errors introduced by the refactor.
10. Repeat relevant checks after fixes.

If a command fails because of a pre-existing problem or unavailable dependency, investigate and report the exact reason. Do not claim that a check passed if it was not executed successfully.

Do not modify unrelated code simply to make an existing failing test pass.

#### Phase F — Functional smoke test

When the environment supports running the application, verify the following:

- The application starts successfully.
- The teacher portal can be opened.
- The teacher dashboard renders.
- Teacher navigation still works.
- Course pages open.
- Course and curriculum editing pages render.
- The prerequisite manager renders and its existing interactions remain available.
- Resource management works.
- The question bank and question editor render.
- The AI review page renders and retains its existing actions.
- Assessment pages and the assessment editor render.
- Analytics renders.
- Portal switching between teacher, student, and administrator still works.
- Theme switching and shared UI remain functional.
- Browser console and development server show no new errors caused by the refactor.

Do not claim manual browser verification if you only ran a build.

If browser interaction is unavailable, perform the strongest available static and automated verification and clearly identify what remains unverified.

---

### 14. Final Expected Folder Structure

After the refactor, the teacher module should follow the same organizational principle as the student and administrator modules.

Expected:

```text
src/
├── components/
│   ├── teacher/
│   │   └── TeacherLayout.tsx
│   ├── student/
│   ├── admin/
│   └── ui/
│
├── pages/
│   ├── teacher/
│   │   ├── DashboardPage.tsx
│   │   ├── CoursesPage.tsx
│   │   ├── CourseOverviewPage.tsx
│   │   ├── CurriculumEditorPage.tsx
│   │   ├── PrerequisiteManagerPage.tsx
│   │   ├── ResourceManagerPage.tsx
│   │   ├── QuestionBankPage.tsx
│   │   ├── QuestionEditorPage.tsx
│   │   ├── AIReviewPage.tsx
│   │   ├── AssessmentsPage.tsx
│   │   ├── AssessmentEditorPage.tsx
│   │   └── AnalyticsPage.tsx
│   ├── student/
│   └── admin/
│
├── services/
├── context/
├── types/
└── utils/
```

This is a representative target. Preserve any other existing project files and organize additional teacher-specific files appropriately.

No teacher page should remain directly under `src/pages/` after successful migration unless repository inspection proves it is intentionally shared or not actually part of the teacher module.

No teacher-specific layout should remain in a generic layout directory after successful migration unless a documented dependency or architectural reason justifies that placement.

---

### 15. Final Deliverables

After completing the work, provide a concise but complete engineering report containing the following sections.

#### A. Summary

Explain what was changed and confirm that the task was limited to structural refactoring.

#### B. Before and After Structure

Show the relevant old and new folder structure.

#### C. Files Moved

Provide a table containing:

- Original path
- New path
- File responsibility

Include every file actually moved.

#### D. References Updated

List the major files where imports, routing references, lazy imports, exports, tests, or documentation were updated.

#### E. Validation Results

Provide the actual outcome of each check:

| Check | Result |
|---|---|
| TypeScript check | Passed / Failed / Not run |
| Production build | Passed / Failed / Not run |
| Automated tests | Passed / Failed / Not run |
| Lint | Passed / Failed / Not configured |
| Teacher portal smoke test | Verified / Partially verified / Not run |
| Student portal regression check | Verified / Partially verified / Not run |
| Admin portal regression check | Verified / Partially verified / Not run |

Only mark checks as passed when they were actually executed successfully.

Include relevant error summaries and distinguish pre-existing issues from regressions introduced by this work.

#### F. Preserved Functionality

Confirm which existing behaviors were preserved and disclose any behavior that could not be verified.

#### G. Remaining Issues

List any unresolved issues, missing files, stale references, or environmental limitations.

If no issues remain, explicitly state that none were identified during the checks performed.

#### H. Final Recommendation

State whether the refactor is safe to continue developing on and whether any manual verification is still needed.

---

### 16. Final Working Rules

- Work against the actual existing repository.
- Inspect before editing.
- Preserve the current implementation.
- Move only files that are verified to be teacher-specific.
- Update all references affected by the moves.
- Keep shared code shared.
- Avoid unrelated changes.
- Run available checks and report actual results.
- Do not stop after generating a plan; execute the refactor.
- Do not claim success without verification.
- If a destructive or ambiguous change is required, avoid guessing and choose the safest reversible option.
- Make the smallest set of changes that achieves the required folder organization.

**Final instruction: Refactor the teacher module into dedicated `src/pages/teacher/` and `src/components/teacher/` directories, make all necessary reference updates, preserve the existing student and admin modules, and validate the application before reporting completion.**