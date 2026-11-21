---
trigger: glob
globs: "**/frontend/**, **/learnova-public-pages/**"
description: Standards and guidelines for React 19, TypeScript, Tailwind CSS, Express proxy, and frontend testing.
---

# Frontend Development Rules

These rules apply when developing or refactoring code within `frontend/` and `learnova-public-pages/`.

---

## 1. Architecture & Portals

The frontend is organized into 5 dedicated view domains under `frontend/src/pages/`:
1. **Student Portal (`src/pages/student/`):** Dashboard, practice sessions, exam attempts, BKT cognitive mastery tree, gamification widget (XP, level, streaks, badges, leaderboard).
2. **Teacher Portal (`src/pages/teacher/`):** Course management, syllabus tree, question bank categorized by Course -> Lesson, AI question candidate review queue (SSD-08 quarantine), student progress drilldown.
3. **Administrator Portal (`src/pages/admin/`):** User directory, RBAC role assignment, system audit logs, service health monitor.
4. **Public & Marketing (`src/pages/public/` & `learnova-public-pages/`):** Landing page featuring the **3D Holographic Particle Cortex (Dala Brain Engine)** built with Three.js WebGL canvas, About Us, Contact Us.
5. **Authentication (`src/pages/auth/`):** Login, registration, role switcher for development.

---

## 2. Component Guidelines

- **Component Hierarchy:**
  - `src/components/ui/`: Atomic design system components (buttons, badges, modals, form inputs, tooltips, tables, search bars).
  - `src/components/common/`: Shared layout headers, sidebars, breadcrumbs, footers.
  - `src/components/{student,teacher,admin,public}/`: Domain-specific components.
- **Pure & Controlled Components:** Form inputs and modals should be controlled with explicit `value` and `onChange` handlers.
- **Clean Props Interfaces:** Define all props interfaces with strict types above the component or in `src/types/index.ts`.

---

## 3. State Management & Resilient Storage

- **API First:** The authoritative state comes from the FastAPI backend through `src/services/api/`.
- **Resilient Fallback (`src/services/storageService.ts`):** `storageService.ts` provides client-side offline persistence and seed state. When modifying data structures, ensure `storageService.ts` remains backward-compatible with stored JSON formats.
- **No Direct LocalStorage Mutations in Components:** All persistent state operations must route through `storageService.ts` or the relevant API client.

---

## 4. API Integration & Express Proxy

- All backend requests should use the relative path `/api/v1/*` or `/api/ai/*`.
- **Express Proxy (`frontend/server.ts`):**
  - Transparently forwards all `/api/v1/*` requests to FastAPI on `http://127.0.0.1:8000`.
  - Forwards `/api/ai/generate-questions` and `/api/ai/simplify-lesson` with header preservation (cookies, auth tokens).
- **Error Propagation:** Always check `response.ok` or inspect error payloads. Display user-friendly error banners or toast messages on API failures. Do NOT fail silently.

---

## 5. Styling & Visual Design

- **Tailwind CSS v4:** Use utility classes adhering to the project's design system:
  - Backgrounds: Dark obsidian (`bg-slate-950`, `bg-slate-900/80`) and clean light card backgrounds (`bg-white`, `border-slate-200`).
  - Accents: Royal cobalt (`blue-600`, `indigo-600`), Emerald (`emerald-500` for mastery & success), Amber (`amber-500` for pending AI candidates), Crimson (`rose-500` for errors).
- **Animations:** Use `motion/react` or CSS transitions for micro-interactions. Keep animations smooth, purposeful, and performant (60 FPS).
- **Responsive Layouts:** Ensure mobile, tablet, and desktop views render cleanly using Tailwind breakpoint prefixes (`sm:`, `md:`, `lg:`, `xl:`).

---

## 6. Frontend Testing Requirements

Always verify changes with the project's established test runners:
```powershell
# Run all frontend tests (Node test runner + TSX runner)
npm test

# Run focused DAG cycle and prerequisite tests
node --experimental-strip-types --test frontend/src/utils/dag.test.ts

# Run E2E and workflow integration tests
npm run test:e2e

# Run TypeScript compiler checks
npm --prefix frontend run lint

# Run production build verification
npm --prefix frontend run build
```

**Testing Rules:**
1. Pure utility functions in `src/utils/` must have accompanying `.test.ts` suites.
2. Never comment out or bypass test assertions to make tests pass.
3. Fix the underlying implementation or update test assertions if requirements have intentionally evolved.
