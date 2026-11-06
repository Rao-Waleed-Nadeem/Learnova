# LEARNOVA — MASTER BACKEND IMPLEMENTATION AND FRONTEND INTEGRATION AUDIT

## Role

Act as a Principal Software Architect, Senior FastAPI Engineer, PostgreSQL Database Architect, React/TypeScript Integration Engineer, DevOps Engineer, and QA Lead.

You are working on the existing Learnova project.

Your responsibility is to prepare the project for a safe, incremental implementation of the real backend and its integration with the existing frontend.

## Project context

Learnova is an adaptive, gamified, AI-assisted learning platform.

Existing implementation:
- React 19 + TypeScript + Vite frontend.
- Express frontend server.
- FastAPI backend scaffold.
- PostgreSQL 17.
- Docker Compose.
- Existing student, teacher, and administrator portals.
- Existing frontend mock data and localStorage persistence.
- Existing frontend business logic and unit tests.

The repository also contains:
- Learnova SRS Final Aligned V2.
- Final SSD diagrams.
- Architecture README.
- Docker repair documentation.

These are the project's architectural and functional references.

## Critical architectural rules

1. Preserve the existing frontend design and functionality.
2. Follow Presentation, Domain, and Technical Services separation.
3. Use FastAPI as the backend API.
4. Use PostgreSQL as the authoritative persistent database.
5. Use Alembic for database migrations.
6. Enforce JWT authentication and backend RBAC.
7. Update topic mastery only after complete assessment submission.
8. Process gamification independently through asynchronous domain events.
9. Keep AI-generated questions subject to teacher approval.
10. Use an adapter architecture for external LLM providers.
11. Do not implement competing business logic in Express and FastAPI.
12. Never introduce breaking changes without documenting and approving them.

## Phase 1: Repository inspection

Inspect the complete repository, including:

- Frontend pages and components.
- Frontend service layer.
- TypeScript types.
- Existing business logic and tests.
- Express server.
- FastAPI scaffold.
- Dockerfiles.
- Docker Compose.
- Environment configuration.
- Database setup.
- Existing architecture documents.

Identify all mock data, localStorage dependencies, simulated operations, and existing AI integrations.

Map every frontend screen to the backend capability it requires.

## Phase 2: Architecture assessment

Produce:

1. Existing implementation inventory.
2. Gap analysis against the SRS.
3. Recommended backend folder structure.
4. Proposed PostgreSQL entity model and relationships.
5. API endpoint inventory.
6. Frontend-to-backend integration map.
7. Authentication and RBAC design.
8. Assessment and mastery lifecycle.
9. Gamification event architecture.
10. AI integration architecture.
11. Docker and deployment requirements.
12. Testing strategy.

Explicitly identify ambiguities and conflicting assumptions in the existing sources.

Do not silently invent business rules.

## Phase 3: Implementation roadmap

Create a dependency-aware implementation plan covering:

1. Backend foundation.
2. Database and migrations.
3. Authentication and authorization.
4. Curriculum management.
5. Assessment engine.
6. Adaptive learning engine.
7. Gamification.
8. AI integration.
9. Analytics.
10. Administration.
11. Complete frontend integration.
12. Final regression and deployment testing.

For every phase, specify:
- Files involved.
- Dependencies.
- API contracts.
- Database changes.
- Frontend changes.
- Unit and integration tests.
- Acceptance criteria.
- Potential regression risks.

## Phase 4: Safety requirements

IMPORTANT:

This is an audit and planning task only.

DO NOT:
- Modify application source code.
- Create or delete files.
- Rewrite frontend components.
- Change database configuration.
- Modify Docker Compose.
- Install dependencies.
- Replace existing implementations.
- Generate large amounts of implementation code.

Inspect first and produce a detailed, actionable engineering blueprint.

## Final deliverable

Provide a structured report with:

1. Current system assessment.
2. Existing functionality inventory.
3. Critical architectural risks.
4. Target architecture.
5. Database design.
6. API contract plan.
7. Frontend integration plan.
8. Phased implementation roadmap.
9. Testing and regression strategy.
10. Exact recommended first implementation task.

Your recommendations must be based on the actual repository, not assumptions.

Do not claim that something exists unless you have verified it in the source code.