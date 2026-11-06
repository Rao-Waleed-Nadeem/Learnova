# Issues and Decisions — Phase 00 (Baseline Audit)

## Blockers and Defects

| ID | Type | Description | Source/Evidence | Impact | Proposed Handling | Owner Decision/Status |
|---|---|---|---|---|---|---|
| BLK-01 | Missing File | `Learnova_SRS_Final_Aligned_V2.docx` referenced in `README_FIRST.md` is absent from `docs/sources/`. | `Get-ChildItem -Filter *.docx` returns 0 files. | Cannot audit exact wordings of the original docx; must rely on `docs/sources/Readme.md` and blueprint. | Request project owner provide the docx or designate `docs/sources/Readme.md` as the textual requirements baseline. | Pending Owner Decision |
| DEF-01 | Configuration Defect | `frontend/requirements.txt` contains npm package names formatted like Python requirements (e.g. `react==19.0.1`). | `frontend/requirements.txt` inspection. | Harmless to npm, but confusing and non-standard. | Clean up or remove in a later phase with owner approval; do not touch in Phase 0. | Pending Owner Approval |
| DEF-02 | Architecture Gap | Backend container has no volume bind mount in `docker-compose.yml`, unlike frontend (`./frontend:/app`). | `docker-compose.yml` inspection. | Changes to backend Python files will not auto-reload inside container without container rebuild or adding mount. | Add volume mount `./backend:/app` in Phase 1 Docker verification step. | Pending Phase 1 Plan |
| DEF-03 | Missing Dependencies | `backend/requirements.txt` lacks SQLAlchemy, Alembic, psycopg/asyncpg, pydantic-settings, and pytest. | `backend/requirements.txt` inspection. | Cannot connect to PostgreSQL or run migrations in current backend scaffold. | Plan and add required dependencies during Phase 1 under strict approval. | Pending Phase 1 Plan |
| DEF-04 | Dual Server / Proxy Gap | Express on port 3000 handles AI endpoints; FastAPI on port 8000 handles health. Frontend does not proxy `/api/*` to FastAPI. | `frontend/server.ts`, `frontend/vite.config.ts`. | Future `/api/v1/*` endpoints cannot be called by frontend without proxy configuration or CORS setup. | Configure Vite/Express reverse proxy to route `/api/v1/*` to `http://backend:8000` (or `localhost:8000`). | Pending Phase 1 Plan |

---

## Source Conflicts / Ambiguities

| ID | Source A | Source B | Conflict or Missing Rule | Why It Matters | Question Requiring Owner Decision |
|---|---|---|---|---|---|
| AMB-01 | Blueprint Section 5.5 (Mastery Scale) | Frontend `storageService.ts` & `studentLogic.ts` | Blueprint recommends standardizing on a 0.0–1.0 float scale or 0–100 integer. Frontend uses 0–100 percentage integer (`masteryScore: number` up to 100). | Inconsistent scale will corrupt mastery calculations and DAG unlock thresholds. | Should the persistent backend store mastery as an integer percentage (0–100) or normalized float (0.000–1.000)? *(Recommendation: store normalized DECIMAL(5,4) in DB and expose 0–100 to frontend for backwards compatibility).* |
| AMB-02 | Readme.md (SSD-05 & AI Architecture) | `frontend/server.ts` | SSD-05 specifies backend AI Tutoring service with caching. Currently, Express owns this logic with in-memory `Map` caching. Blueprint specifies FastAPI adapter in Phase 9. | If moved prematurely to FastAPI, frontend will break unless proxy is configured. | Should Express retain AI endpoints until Phase 9, or should FastAPI take over AI endpoints earlier? *(Recommendation: retain Express until Phase 9 as planned).* |
| AMB-03 | Blueprint Section 5.9 (Seed Accounts) | `frontend/src/services/storageService.ts` | Frontend has hardcoded default users: `adm-sarah`, `teacher-101`, `student-1`. Blueprint strictly forbids hardcoding credentials in production or migrations. | Need secure development seed script without compromising production security. | Confirm development seed strategy: seed accounts only when `ENVIRONMENT=development` and provide credentials via `.env`. |
| AMB-04 | Blueprint Section 5.6 (Grading Rule) | Frontend `studentLogic.ts` | Assessment attempts: should partial credit be supported for short answer / matching, or binary scoring only? | Affects assessment submission schema and grading service logic. | Confirm question types supporting partial credit in backend assessment engine. |

---

## Deviations from Approved Plan

| ID | Approved Plan | Actual Deviation | Reason | Files/Impact | Approval Requested/Granted |
|---|---|---|---|---|---|
| DEV-00 | Phase 0 Audit Plan | None | Strict adherence to Phase 0 audit instructions. Zero application files modified. | None | N/A |

---

## Open Decisions from Blueprint Section 15

1. **Database Schema Strategy (Modular Monolith):**
   - *Recommendation:* Single PostgreSQL database with shared connection pool and modular table schemas (`auth_*`, `curriculum_*`, `assessment_*`, `gamification_*`, `audit_*`).
   - *Status:* Recommended; awaiting owner confirmation.

2. **Alembic Migration Sequence:**
   - *Recommendation:* Staged migrations: foundational settings & base in Phase 1, auth & user tables in Phase 2/3, curriculum & assessments in Phase 4/5.
   - *Status:* Recommended; awaiting owner confirmation.

3. **Mastery Calculation Recalibration Boundary:**
   - *Requirement:* Interim question responses logged without updating mastery; mastery recalculation occurs strictly upon complete assessment submission (SSD-04/SSD-06).
   - *Status:* Confirmed invariant.
