# PHASE 11 — FRONTEND BACKEND INTEGRATION AND MOCK PERSISTENCE MIGRATION

**Project:** Learnova — An Adaptive and Gamified Learning Platform  
**Phase:** 11  
**Status:** PLANNED — NOT IMPLEMENTED  
**Implementation strategy:** Audit → Plan → Owner Approval → Incremental Migration → Regression → Owner Acceptance

---

# 1. PURPOSE

Phase 11 completes the integration of the existing React frontend with the authoritative FastAPI backend.

Learnova already has a substantial frontend with student, teacher and administrator portals. This phase must preserve that work.

The objective is not to redesign or rewrite the application. The objective is to replace mock/local persistence with real API-backed behavior feature by feature.

At the end of this phase:

- FastAPI is the authoritative owner of business data and rules.
- PostgreSQL is the authoritative persistent store.
- React pages consume documented API contracts.
- User workflows survive refresh and a new browser session.
- No critical workflow silently falls back to mock data.
- Student, teacher and administrator journeys are verified end to end.

# 2. AUTHORITATIVE SOURCES

Read:

1. `docs/sources/Learnova_SRS_Final_Aligned_V2 (1).docx`
2. `docs/sources/Learnova_Final_SSDs_V2.xml`
3. `docs/sources/Readme.md`
4. `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md`
5. `API_CONTRACT.md`
6. `IMPLEMENTATION_STATUS.md`
7. `DECISIONS.md`
8. `README_FIRST.md`
9. `UNIVERSAL_ANTIGRAVITY_PROMPT.md`
10. `docs/antigravity-bible/AGENT_OPERATING_RULES.md`
11. Accepted Phase 1–10 evidence records.

The current repository implementation and UI behavior must also be inspected before modifying frontend files.

# 3. ENTRY GATES

Do not begin implementation unless:

1. Phase 10 is explicitly accepted by the project owner.
2. Phase 9 closure issues are resolved or formally dispositioned.
3. The current API contract is updated and verified.
4. Backend endpoint tests pass.
5. Existing frontend tests pass at the recorded baseline.
6. The current branch and working tree have been inspected.
7. The existing frontend route and page inventory is recorded.
8. The current mock/local-storage behavior is documented.
9. The API base URL and development/production proxy behavior are understood.

If Phase 10 is not accepted, stop.

# 4. ARCHITECTURE RULES

Preserve:

- React 19.
- TypeScript.
- Vite.
- Tailwind CSS.
- Existing page and component structure.
- Existing navigation and portal behavior.
- Express/Vite frontend server where it is currently required.
- FastAPI `/api/v1`.
- PostgreSQL persistence.
- Existing Docker Compose topology.

Do not:

- Rewrite the frontend.
- Replace React or Vite.
- Introduce a new state-management framework without approval.
- Rebuild existing UI screens unnecessarily.
- Duplicate backend business logic in the browser.
- Trust client-provided mastery, scores, XP or correct-answer values.
- Use Docker service hostnames from browser-side requests.
- Delete storageService.ts before migration is complete.
- Silently fall back to mock data when API calls fail.

# 5. MIGRATION PRINCIPLE

Migrate by vertical feature slices.

Each slice must contain:

1. Existing page/component inventory.
2. Existing storageService or mock operation inventory.
3. Required backend endpoint mapping.
4. API request/response TypeScript types.
5. API service implementation.
6. Page/component integration.
7. Loading, error, empty and success states.
8. Unit and integration tests.
9. Regression verification.
10. Update to the migration ledger.

Do not migrate every page in one large change.

# 6. STAGE A — FRONTEND AUDIT AND PLAN ONLY

Inspect the complete frontend.

At minimum inspect:

- `frontend/src/services/storageService.ts`
- `frontend/src/services/api/`
- `frontend/src/types/`
- `frontend/src/pages/`
- `frontend/src/components/`
- `frontend/src/hooks/`
- `frontend/server.ts`
- `frontend/vite.config.ts`
- Frontend package scripts.
- Existing Vitest tests.
- Existing authentication/session handling.
- Docker Compose and environment configuration.

Create a route-by-route inventory for:

- Student portal.
- Teacher portal.
- Administrator portal.
- Shared authentication and profile screens.

For every page, identify:

| Item | Required evidence |
|---|---|
| Page | Exact path and component |
| Current data source | API, mock, localStorage or mixed |
| Storage operations | Exact functions used |
| Backend contract | Exact endpoint and method |
| Migration status | Not started, partial or complete |
| Tests | Existing and required |
| Risks | Behavior or data compatibility |

Also identify:

- Pages already using FastAPI.
- Pages still using mock data.
- Pages with mixed API/mock behavior.
- Duplicate API clients.
- Unused services.
- Legacy routes.
- API response shape mismatches.
- Authentication and token handling.
- Environment-specific proxy configuration.

Produce an exact implementation plan and file-change ledger proposal.

STOP and request owner approval.

No application source code changes during Stage A.

# 7. MIGRATION ORDER

Use the following dependency-aware order. Adjust only if the audit proves a different order is necessary, and explain the reason in the plan.

## Slice 1 — Authentication, session and profile

Verify:

- Registration.
- Login.
- Logout.
- Session persistence.
- Token refresh or existing session renewal behavior, if implemented.
- Profile read/update.
- Unauthorized session handling.
- Role-aware navigation.

Requirements:

- Backend authentication is authoritative.
- No hard-coded credentials.
- No tokens in logs.
- No private user data in localStorage unless the existing approved security design explicitly permits the required item.
- Expired or revoked sessions must be handled consistently.

## Slice 2 — Course catalog and enrollment (SSD-01)

Connect:

- Course catalog.
- Course details.
- Enrollment.
- My learning.
- Curriculum hierarchy.

Backend contracts include the existing course and enrollment endpoints.

Acceptance:

- Enrolled course persists after refresh.
- Duplicate enrollment is handled according to the backend contract.
- Unpublished course visibility follows backend authorization.
- Student sees only permitted course data.

## Slice 3 — Learning map, prerequisites and learning path (SSD-02, SSD-03)

Connect:

- Course learning map.
- Topic selection.
- Readiness status.
- Diagnostic entry.
- Personalized learning path.
- Resource activity.
- Lesson completion.

Requirements:

- Do not reproduce prerequisite calculations in React as authoritative logic.
- Backend readiness and learning-path responses are authoritative.
- Preserve the existing visual presentation.
- Show diagnostic and remediation states using real API data.

## Slice 4 — Lessons and resources

Connect:

- Lesson workspace.
- Resource viewer.
- Resource activity.
- Lesson completion.
- Learning history.

Ensure:

- Completion is persisted.
- Duplicate requests are safely handled.
- Resource activity is recorded using the existing API contract.
- The UI does not claim completion before the backend confirms it.

## Slice 5 — Assessment and attempts (SSD-02, SSD-04, SSD-06)

Connect:

- Diagnostic player.
- Adaptive practice player.
- Question renderer.
- Assessment results.
- Final exam player.
- Attempt history.

Requirements:

- The backend owns grading.
- The backend owns authoritative mastery updates.
- The browser never submits a trusted score.
- The browser never receives correct answers before permitted disclosure.
- Preserve attempt lifecycle and server-side deadlines.
- Interim responses must not update persisted mastery.
- A failed submit must not display a false success state.
- Repeated submission must respect backend idempotency behavior.

## Slice 6 — Mastery, progress and gamification

Connect:

- Topic mastery.
- Course mastery summary.
- Learning progress.
- XP.
- Levels.
- Streaks.
- Badges.
- Challenges.
- Leaderboard privacy settings.

Rules:

- Mastery is academic data.
- XP and badges are engagement data.
- Do not merge them into one progress calculation.
- Respect leaderboard opt-in.
- Do not calculate XP or mastery authoritatively in the frontend.

## Slice 7 — Teacher content management (SSD-07)

Connect:

- Courses.
- Course overview.
- Curriculum editor.
- Topic and prerequisite management.
- Resource manager.
- Publishing workflows.

Requirements:

- Backend assignment authorization is authoritative.
- Teachers cannot edit another teacher's unassigned course.
- Preserve draft/published behavior.
- Display validation errors from the API.

## Slice 8 — Teacher question bank and assessment management (SSD-08)

Connect:

- Question bank.
- Question editor.
- Assessment list.
- Assessment editor.
- Assessment publishing.
- AI candidate review.

Requirements:

- AI-generated questions remain candidates until authorized approval.
- Editing, approval and rejection use backend governance endpoints.
- No frontend-only promotion to the official question bank.
- Preserve question types and existing grading semantics.

## Slice 9 — Analytics and administration

Connect Phase 10 APIs:

- Student dashboard and analytics.
- Student attempt history.
- Teacher dashboard.
- Teacher course analytics.
- Teacher student analytics.
- Admin dashboard.
- Admin user directory/detail.
- Audit logs.
- System diagnostics.

Requirements:

- Enforce the backend's role-scoped contracts.
- Handle empty data correctly.
- Use server pagination.
- Do not download entire datasets just to filter them in the browser.
- Do not expose administrator-only data in shared client state.

## Slice 10 — Mock persistence retirement

After all feature slices are accepted:

- Inventory remaining storageService methods.
- Identify unused mock-only operations.
- Remove obsolete mock behavior only when all callers have migrated.
- Keep any explicitly approved development seed/mock mode isolated and clearly configured.
- Remove obsolete API compatibility behavior only after confirming there are no remaining consumers.
- Update imports, tests and documentation.

Do not delete storageService.ts simply because most pages have migrated.

# 8. API CLIENT AND PROXY REQUIREMENTS

Use a consistent same-origin API base.

Preferred browser request style:

`/api/v1/...`

The browser must not call:

`http://backend:8000`

The Docker hostname is internal to the Docker network and is not a browser URL.

Inspect the existing development and production runtime before changing proxy configuration.

Requirements:

- Development proxy forwards API traffic to FastAPI.
- Production Express server forwards API traffic to FastAPI if Express remains the production web server.
- Do not create competing proxy layers.
- Preserve Vite HMR.
- Preserve existing Express static serving behavior.
- Configure backend target using environment configuration.
- Do not hard-code machine-specific URLs.

The exact implementation must be based on the current `frontend/server.ts`, Vite config and Docker Compose files.

# 9. API TYPES AND ERROR HANDLING

Use explicit TypeScript request and response types matching Pydantic schemas.

Avoid:

- `any` for API payloads.
- Duplicated incompatible response interfaces.
- Unvalidated assumptions about nullable fields.
- Treating an empty response as a successful populated result.

Handle at least:

| Status | Expected UI behavior |
|---|---|
| 400 | Show actionable validation/business message |
| 401 | Handle expired/invalid session |
| 403 | Show access denied state |
| 404 | Show unavailable resource state |
| 409 | Show conflict/already-completed state |
| 422 | Show field validation feedback |
| 429 | Show rate-limit feedback |
| 500–599 | Show controlled server/network error |

Each page must support:

- Loading.
- Success.
- Empty.
- Error.
- Retry where safe.

Never show a successful save, submission or completion before receiving backend confirmation.

Never silently substitute mock data when the API fails.

# 10. STORAGE AND SESSION RULES

Treat PostgreSQL as the authoritative source.

Browser storage may be used only for appropriate client-side concerns such as:

- Non-sensitive UI preferences.
- Temporary presentation state.
- Explicitly approved development-only fixtures.

Do not use localStorage as the authoritative store for:

- User roles.
- Course enrollment.
- Assessment scores.
- Topic mastery.
- XP.
- Badge awards.
- Teacher assignments.
- Official questions.
- AI candidate approval.
- Administrator actions.

Inspect the existing authentication implementation before changing token storage or session handling.

Do not introduce a new authentication mechanism in this phase.

# 11. TESTING STRATEGY

## 11.1 Frontend unit tests

Preserve all existing Vitest tests.

Add tests for:

- API client behavior.
- Request/response mapping.
- Loading and error states.
- Empty data.
- Authentication handling.
- Role-based rendering.
- Retry behavior.
- Form validation.
- Pagination.
- Correct rendering of mastery and gamification separately.

## 11.2 Backend contract tests

The frontend migration must not weaken backend tests.

Verify API response compatibility for each integrated slice.

## 11.3 End-to-end journeys

Use Playwright if already present.

If Playwright is not installed:

1. Inspect existing browser test tooling.
2. Propose the required dependency and configuration.
3. Add it to the plan.
4. Obtain approval before introducing a new dependency.

Required E2E journeys:

### Student journey

1. Register or log in.
2. Browse course catalog.
3. Enroll in a course.
4. Open learning map.
5. Complete prerequisite diagnostic where required.
6. Open a lesson.
7. Complete lesson/resource activity.
8. Start practice assessment.
9. Answer questions.
10. Submit assessment.
11. View results.
12. View updated mastery.
13. View gamification rewards.
14. Refresh browser and verify persisted state.
15. Sign in again and verify persisted state.

### Teacher journey

1. Log in as teacher.
2. Open assigned course.
3. Create or edit curriculum content.
4. Define prerequisites.
5. Manage resources.
6. Create questions.
7. Configure and publish an assessment.
8. Generate AI question candidates.
9. Review and approve a candidate.
10. Inspect assigned course analytics.
11. Inspect an enrolled student's progress.
12. Verify that another teacher's course is inaccessible.

### Administrator journey

1. Log in as administrator.
2. Open administrator dashboard.
3. Search and inspect users.
4. Update role/status using existing protected operations.
5. Inspect audit events.
6. Inspect safe system diagnostics.
7. Verify that non-admin accounts cannot access these endpoints.

## 11.4 Responsive and accessibility regression

Verify existing layouts at:

- Desktop.
- Tablet.
- Mobile.

Check:

- Navigation.
- Tables and analytics charts.
- Forms.
- Assessment player.
- Lesson workspace.
- Dialogs and popovers.
- Empty/error states.
- Keyboard interaction.
- Focus visibility.
- Labels and accessible names.

Do not redesign screens in the name of regression testing.

# 12. DATA AND MIGRATION SAFETY

- Do not reset the PostgreSQL database.
- Do not delete the named volume.
- Do not use `docker compose down -v`.
- Do not run destructive migrations against persistent data.
- Do not delete mock fixtures before confirming they are not used by remaining pages or tests.
- Do not overwrite user data with frontend seed data.
- Do not make a production API automatically create mock users.
- Verify persistence across container recreation using a safe environment.

# 13. PERFORMANCE AND QUALITY

Measure representative workflows:

- Course catalog loading.
- Learning map loading.
- Learning path loading.
- Assessment start and submit.
- Student analytics.
- Teacher analytics.
- Admin user listing.

Requirements:

- Avoid unnecessary duplicate requests.
- Avoid N+1 frontend request patterns.
- Use pagination for large lists.
- Use cancellation or stale-response protection where appropriate.
- Do not introduce aggressive caching that displays stale student progress.
- Keep adaptive recommendation latency targets from the SRS.
- Record actual measurements and test setup.

# 14. IMPLEMENTATION STAGES

## Stage A — Audit and plan only

Produce:

- Page/route inventory.
- Mock operation inventory.
- API mapping.
- Migration order.
- Exact proposed files.
- Type compatibility analysis.
- Proxy/runtime analysis.
- Authentication/session analysis.
- E2E plan.
- Dependency proposal if required.
- Rollback strategy.

STOP for owner approval.

## Stage B — Shared API infrastructure and authentication

Implement only approved infrastructure and authentication integration.

STOP and report.

## Stage C — Student learning slices

Implement student catalog, enrollment, learning map, lessons, resources and assessments incrementally.

STOP and report after the approved slice group.

## Stage D — Teacher slices

Implement teacher content management, assessment authoring and AI candidate governance.

STOP and report.

## Stage E — Analytics and administration

Integrate Phase 10 reporting and admin endpoints.

STOP and report.

## Stage F — Mock retirement and full regression

Remove only proven obsolete mock paths.

Run the complete test and E2E suites.

Update documentation.

STOP for owner acceptance.

# 15. REQUIRED DOCUMENTATION UPDATES

Update:

- `API_CONTRACT.md` only if an actual contract correction is required.
- `IMPLEMENTATION_STATUS.md`.
- `DECISIONS.md` where decisions were approved or remain unresolved.
- Frontend integration documentation.
- E2E test documentation.
- Phase 11 evidence records.

Do not mark every frontend page as implemented merely because it renders. Mark it complete only when its data source, behavior and persistence have been verified.

# 16. REQUIRED EVIDENCE

Create:

`docs/antigravity-bible/phase-records/PHASE-11/`

With:

1. `PLAN.md`
2. `EXECUTION_LOG.md`
3. `FILE_CHANGE_LEDGER.md`
4. `TEST_AND_EVALUATION.md`
5. `ISSUES_AND_DECISIONS.md`
6. `PHASE_SUMMARY.md`

Every created, modified, renamed or deleted file must be recorded.

# 17. ACCEPTANCE CRITERIA

Phase 11 is ready for owner acceptance only when:

- All required student journeys use backend persistence.
- All required teacher journeys use backend persistence.
- All required admin journeys use backend persistence.
- All critical SSD-01 through SSD-08 workflows are integrated.
- No critical feature silently falls back to mock data.
- Browser refresh preserves authoritative state.
- A second session sees the persisted state.
- Role restrictions are enforced by FastAPI.
- Assessment grading and mastery remain server-authoritative.
- AI candidate approval remains teacher-governed.
- Gamification remains asynchronous and idempotent.
- Analytics are connected to Phase 10 contracts.
- Existing frontend functionality is not lost.
- Responsive and accessibility regression checks are recorded.
- Backend and frontend test suites pass.
- E2E journeys pass or any environment limitation is explicitly documented.
- storageService mock operations are retired only where safe.
- Full Git diff reconciles with FILE_CHANGE_LEDGER.md.

Only the project owner can mark Phase 11 ACCEPTED.

# 18. EXPLICIT EXCLUSIONS

Phase 11 does not authorize:

- A full UI redesign.
- React/Vite replacement.
- A new backend architecture.
- New business rules.
- A new mastery algorithm.
- A new grading policy.
- A new gamification formula.
- Destructive database operations.
- Unapproved authentication changes.
- Phase 12 deployment/release hardening.

**Final instruction:** Complete Phase 11 only. Present evidence and stop for explicit owner acceptance.