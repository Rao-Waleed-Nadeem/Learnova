---
name: implement-feature
description: >-
  A complete, disciplined workflow for implementing a new feature in the Learnova platform,
  covering requirements analysis, module identification, architectural compliance, implementation,
  testing, and documentation synchronization.
---

# Feature Implementation Workflow

Use this skill whenever tasked with developing, adding, or significantly extending a feature in the Learnova codebase. Follow these 8 sequential phases:

---

## Phase 1: Requirements & Scope Analysis
1. Analyze the user request thoroughly.
2. Determine whether the feature affects:
   - Backend API endpoints and business services (`backend/app/`).
   - Frontend client UI and portals (`frontend/src/`).
   - Database schema, models, or migrations (`backend/app/models/`, `backend/alembic/`).
   - Public pages showcase (`learnova-public-pages/`).
3. Identify potential cross-cutting impacts:
   - Does this touch teacher AI question generation? (Observe SSD-08 quarantine invariant).
   - Does this touch assessment grading? (Maintain server-authoritative answer key segregation).
   - Does this emit asynchronous events? (Use in-process `domain_outbox_events`).
   - Does this modify topic relationships? (Enforce DAG cycle detection).

---

## Phase 2: Architectural & Codebase Inspection
1. Read the root [`AGENTS.md`](file:///c:/Learnova/AGENTS.md).
2. Read the nearest applicable module instructions:
   - Backend: [`backend/AGENTS.md`](file:///c:/Learnova/backend/AGENTS.md).
   - Frontend: [`frontend/AGENTS.md`](file:///c:/Learnova/frontend/AGENTS.md).
   - Database: [`backend/alembic/AGENTS.md`](file:///c:/Learnova/backend/alembic/AGENTS.md).
3. Inspect existing implementations in `backend/app/services/` and `frontend/src/services/api/` to prevent duplicate implementations.
4. Check [`docs/api-documentation.md`](file:///c:/Learnova/docs/api-documentation.md) and [`API_CONTRACT.md`](file:///c:/Learnova/API_CONTRACT.md) for existing endpoint patterns.

---

## Phase 3: Implementation Planning
For any non-trivial change:
1. Outline the exact files to be created or modified.
2. Specify request/response Pydantic DTOs or TypeScript interfaces.
3. Define the database schema changes (if any) and migration plan.
4. Document the planned tests.

---

## Phase 4: Implementation
1. **Database Layer (if applicable):**
   - Add/update models in `backend/app/models/`.
   - Create a sequential migration in `backend/alembic/versions/` implementing both `upgrade()` and `downgrade()`.
2. **Backend Service & API Layer:**
   - Implement business logic in `backend/app/services/`.
   - Create request/response schemas in `backend/app/schemas/`.
   - Implement route handlers in `backend/app/api/v1/endpoints/`.
   - Register route in `backend/app/api/v1/router.py`.
3. **Frontend Layer (if applicable):**
   - Add typed API methods in `frontend/src/services/api/`.
   - Build or update reusable UI components in `frontend/src/components/`.
   - Update portal pages in `frontend/src/pages/`.

---

## Phase 5: Automated Testing
1. **Backend Tests:**
   - Create unit or integration tests in `backend/tests/test_<feature>.py`.
   - Run tests:
     ```powershell
     python -m pytest backend/tests/test_<feature>.py -v
     ```
2. **Frontend Tests:**
   - Add tests in `frontend/src/utils/` or run existing suites:
     ```powershell
     npm test
     npm --prefix frontend run lint
     npm --prefix frontend run build
     ```

---

## Phase 6: Documentation Synchronization
When code modifications affect contracts or architecture:
1. Update [`docs/api-documentation.md`](file:///c:/Learnova/docs/api-documentation.md) or [`API_CONTRACT.md`](file:///c:/Learnova/API_CONTRACT.md).
2. Update [`docs/database-schema.md`](file:///c:/Learnova/docs/database-schema.md) if schema changed.
3. Update [`docs/architecture.md`](file:///c:/Learnova/docs/architecture.md) if workflows changed.

---

## Phase 7: Final Verification & Delivery Report
Report final task outcomes:
- Summary of what was implemented.
- List of modified and created files with clickable links.
- Verification test output and status.
- Any remaining questions or follow-ups.
