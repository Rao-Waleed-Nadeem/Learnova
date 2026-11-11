# Phase 11 Issues and Decisions — Frontend Backend Integration & Mock Persistence Migration

**Phase:** Phase 11 — Frontend Backend Integration & Mock Persistence Migration (`PHASE-11`)  
**Date:** 2026-11-11  
**Authority:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md` Section 6, `docs/phases/PHASE-11_FRONTEND_MIGRATION_REGRESSION.md`

---

## 1. Architectural Decisions (Stage A Formulation)

### DEC-P11-001: Transparent Full-Duplex Express Proxy for `/api/v1/*`
- **Context:** In both development mode and containerized production, browser-side requests are dispatched to `/api/v1/...`. Currently, `frontend/server.ts` only proxies two specific `/api/ai/*` endpoints. Any browser request to `/api/v1/*` either fails or is routed to the SPA catch-all serving `index.html`. Calling internal Docker network hostnames (such as `http://backend:8000`) directly from browser code is invalid because the browser runs outside the container network.
- **Options:**
  1. Have browser code use an absolute URL configured via an environment variable pointing to the host machine's port 8000.
  2. Implement a transparent full-duplex proxy in `frontend/server.ts` matching `/api/v1/*` that forwards all HTTP methods, headers (including authorization tokens and cookies), and request payloads to `BACKEND_URL` (`http://localhost:8000` locally, `http://backend:8000` in Docker), streaming responses back and returning 503 if FastAPI is unreachable.
- **Decision:** Option 2. Enforces same-origin relative URLs (`/api/v1/...`) throughout the React frontend, preserves cookie credentials across CORS boundaries, and guarantees uniform behavior between local development and Docker production.
- **Affected Files:** `frontend/server.ts`, `frontend/src/utils/aiProxy.test.ts`.
- **Status:** PROPOSED (Stage A).

---

### DEC-P11-002: Modular Typed API Clients Architecture
- **Context:** The frontend currently has only `authApi.ts` and `aiApi.ts`. All other pages rely on `storageService.ts` for mock data. Components should not make ad-hoc `fetch` calls or duplicate authentication token handling and error parsing.
- **Options:**
  1. Add raw `fetch` calls directly inside React components.
  2. Author modular typed API client modules under `frontend/src/services/api/` (`coursesApi.ts`, `learningPathApi.ts`, `curriculumApi.ts`, `assessmentApi.ts`, `gamificationApi.ts`, `teacherApi.ts`, `adminApi.ts`) that reuse the base HTTP request pipeline, token injection, and error formatting established in `authApi.ts`.
- **Decision:** Option 2. Provides strict TypeScript type safety, centralizes error handling, eliminates duplicate boilerplate, and makes API contracts easy to verify and maintain.
- **Affected Files:** `frontend/src/services/api/*`.
- **Status:** PROPOSED (Stage A).

---

### DEC-P11-003: Centralized Asynchronous State Hydration in `App.tsx`
- **Context:** Learnova's frontend architecture concentrates top-level state and action dispatch in `App.tsx`. All 39 pages receive their data records and action handlers as props from `App.tsx`.
- **Options:**
  1. Refactor the entire application to use an external state-management library (Redux, Zustand, React Query) or push data fetching into each individual page component.
  2. Preserve `App.tsx` as the single authoritative state hub. Replace synchronous `storage.get...()` initializers with asynchronous data fetching triggered upon user authentication and portal switching. Action handlers call the typed API clients and update React state upon verified backend success.
- **Decision:** Option 2. Complies with the non-negotiable Phase 11 rule: "Do not rewrite the frontend. Do not introduce a new state-management framework without approval." Preserves existing component structures and interfaces while smoothly switching the underlying data source to FastAPI.
- **Affected Files:** `frontend/src/App.tsx`.
- **Status:** PROPOSED (Stage A).

---

### DEC-P11-004: Conservative Phased Deprecation of `storageService.ts`
- **Context:** Prematurely removing `storageService.ts` before all 39 pages have migrated would cause runtime crashes and break existing tests.
- **Options:**
  1. Delete `storageService.ts` in Slice 1.
  2. Retain `storageService.ts` intact during Slices 1–9 as a safe fallback and test fixture. In Slice 10, audit all callers, retire obsolete mock data stores, and verify that 100% of workflows persist live to PostgreSQL.
- **Decision:** Option 2. Follows the explicit instruction in Section 4 and Section 7 of the Phase 11 specification: "Do not delete storageService.ts before migration is complete."
- **Affected Files:** `frontend/src/services/storageService.ts`.
- **Status:** PROPOSED (Stage A).

---

## 2. Policy & Operational Issues

| Issue ID | Domain | Context | Current Conservative Strategy | Owner Direction Required |
|:---|:---|:---|:---|:---|
| `ISSUE-P11-01` | Browser E2E Testing Tooling | Playwright is not installed in `package.json`. Phase 11 specification permits installing it if approved, or using existing node/browser test tooling. | Node native test runner (`node --test`) and Vitest currently test logic, DAG, assessment calculations, and Express proxy behavior. | Owner guidance on whether to install `@playwright/test` for headless browser tests or execute automated API/integration tests + documented browser walkthrough. |
| `ISSUE-P11-02` | Seed Accounts in Frontend Sign-In | The `SignInPage.tsx` currently displays quick-fill demo buttons for Student, Teacher, and Administrator. | The development seed CLI (`python -m app.cli.seed`) pre-seeds matching accounts in the backend database. | Keep demo quick-fill buttons connected to real seeded credentials for convenient development testing. |
