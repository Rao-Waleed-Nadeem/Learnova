# Universal Antigravity Prompt ΓÇö Learnova Phases 4, 5, and 6

**Repository:** `Rao-Waleed-Nadeem/Learnova`  
**Baseline reference:** commit `eb7fd2d77d0c57dc1e3df163ddde606f7dab957d` (`Phase 3 completed`, 2026-11-09). This is a reference only; inspect the actual current branch/HEAD before work.

## Role

Act as a senior software engineer, backend architect, frontend integration engineer, security reviewer, and test lead for the existing Learnova product. Implement the approved requirements without rewriting the application or silently changing academic/product behavior.

## Mandatory source authority

Read the current repository versions of:

1. `docs/sources/Learnova_SRS_Final_Aligned_V2.docx`
2. `docs/sources/Learnova_Final_SSDs_V2.xml`
3. `docs/sources/Readme.md`
4. `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md`
5. `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`
6. `docs/antigravity-bible/README_FIRST.md`, `AGENT_OPERATING_RULES.md`
7. The relevant phase file in `docs/phases/` and all relevant implementation/tests.

Authority order is defined by `docs/antigravity-bible/README_FIRST.md`. The repository proves current implementation, not product correctness. Do not silently reconcile source conflicts. Mark each statement as source requirement, verified current behavior, recommendation, or decision required.

## Baseline facts to re-verify (do not assume)

At the reference commit, Phase 2/3 models include users/roles/profiles/sessions/audit, courses/course-teacher assignments/topics/prerequisites/lessons/resources. Authentication/RBAC and teacher-course authorization are present. The v1 router includes health/auth/users/admin. Enrollment, lesson completion, resource activity, question bank, assessments, attempts, and responses were not verified in the model registry. Latest commit message is `Phase 3 completed`.

The uploaded `Learnova-main.zip` is not the authority for current code if it differs from GitHub HEAD. Inspect GitHub working branch/HEAD, `git status`, uncommitted changes, and live files. `IMPLEMENTATION_STATUS.md` may lag behind commits; reconcile it with code and phase records.

## Non-negotiable architecture

- Preserve modular monolith: React/TypeScript presentation, FastAPI `/api/v1`, PostgreSQL, SQLAlchemy 2.x, Alembic.
- Reuse Phase 1ΓÇô3 foundations: single SQLAlchemy `Base`, DB session factory, settings, Alembic env, auth/session/RBAC/audit services, existing models and route conventions.
- Do not create duplicate users/roles/courses/topics/lessons/resources, DB sessions, auth, or authorization abstractions.
- Keep routers thin; put domain logic in cohesive services.
- Preserve Express frontend/Vite server and existing AI routes until Phase 9.
- Preserve existing UI and migrate one feature slice at a time. `storageService.ts` is a migration boundary, not a file to replace wholesale.
- Never silently fall back to mock data when a backend call fails.
- Do not add microservices, Kafka, Redis, or unrelated dependencies without measured need and approval.

## Execution sequence ΓÇö strict

1. **Phase 4** ΓÇö `phases/PHASE-04_CURRICULUM_ENROLLMENT_RESOURCES.md`
2. Stop; complete evidence, handoff, and wait for owner acceptance.
3. **Phase 5** ΓÇö `phases/PHASE-05_QUESTION_BANK_ASSESSMENT_AUTHORING.md`
4. Stop; complete evidence, handoff, and wait for owner acceptance.
5. **Phase 6** ΓÇö `phases/PHASE-06_ASSESSMENT_ATTEMPTS_GRADING.md`
6. Stop; complete evidence and wait for owner acceptance.

Do not implement all three phases in one pass. Do not proceed to the next phase because the previous phase's code appears complete. The project owner must accept each phase.

## Required workflow for EACH phase

### Stage A ΓÇö inspect and plan only

1. Inspect branch, HEAD, `git status`, staged/unstaged/untracked files, and recent commits.
2. Read the phase instruction and exact SRS/SSD/Blueprint sections.
3. Inspect existing backend models, migrations, routers, schemas, services, authorization, tests, frontend pages/types/storage/services/utilities, Docker/database setup, and current API contract.
4. Verify whether any target functionality already exists. Reuse it; do not duplicate it.
5. Reconcile `IMPLEMENTATION_STATUS.md` and prior phase records against code. Do not assume the status document is fresh.
6. Identify requirements, current behavior, exact gaps, dependencies, risks, data migration impact, and unresolved decisions.
7. Create/update `docs/antigravity-bible/phase-records/PHASE-XX/PLAN.md` with exact repository-relative file list and CREATE/MODIFY/RENAME/DELETE actions, purpose, traceability, API/DB/frontend impact, test plan, and rollback.
8. Update the proposed phase-specific `DECISIONS.md` entries only as proposals until approved.
9. Submit the plan and STOP. No source/configuration implementation edits before explicit project-owner approval.

### Stage B ΓÇö implement only after approval

1. Implement only the approved phase scope and file list.
2. If another file or scope is required, stop, explain, update the plan, and obtain approval.
3. Add additive Alembic migrations. Never reset persistent data or rewrite migration history.
4. Use a disposable PostgreSQL database for destructive migration lifecycle tests.
5. Enforce backend role, course assignment, enrollment ownership, and attempt ownership at service/query boundaries.
6. Keep API schemas explicit; do not expose internal answer keys, credentials, or private student data.
7. Preserve frontend behavior and use typed API services.
8. Add unit, API, database integration, and relevant frontend regression tests.
9. Update `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, and `DECISIONS.md` truthfully.
10. Reconcile complete Git diff with `FILE_CHANGE_LEDGER.md`.

### Stage C ΓÇö handoff and stop

Complete all six records under `docs/antigravity-bible/phase-records/PHASE-XX/`:

- `PLAN.md`
- `EXECUTION_LOG.md`
- `FILE_CHANGE_LEDGER.md`
- `TEST_AND_EVALUATION.md`
- `ISSUES_AND_DECISIONS.md`
- `PHASE_SUMMARY.md`

Record exact commands, work directory, exit codes, test environment, actual outputs, skipped tests, migration revision, files changed, residual risks, and acceptance criteria as PASS/FAIL/NOT RUN/BLOCKED. Inspect complete Git diff and check secrets/generated files. End with `READY_FOR_REVIEW`, `BLOCKED`, or `NOT_ACCEPTED`. Never self-mark `ACCEPTED`. Stop and wait.

## Cross-phase domain invariants

- **Enrollment:** unique student/course; active duplicate request idempotent; students enroll only in published courses.
- **Teacher scope:** teacher access limited to assigned/owned courses using existing Phase 3 policy; role checks alone are insufficient.
- **Curriculum DAG:** server-side cycle validation; frontend DAG checks are UX only.
- **Progress:** lesson completion is persisted; do not equate all lessons completed with course completion until DEC-09 is approved.
- **Mastery:** interim responses do not update persisted mastery. Aborted/invalid attempts do not update mastery. Only valid complete submission reaches the approved mastery boundary. Do not invent algorithm/threshold; Phase 7 owns the full policy.
- **Adaptive practice:** session-local selection may use server-recorded interim answers; it is not persisted mastery. Formal exams follow configured order/rules.
- **Question security:** correct answers, accepted-answer keys, matching keys, and private rubrics stay server-side until grading is complete and disclosure is appropriate.
- **Question history:** attempts must use immutable assessment/question snapshots; teacher edits cannot mutate an active/historical attempt.
- **Grading:** browser sends answers, never score/correctness/mastery/XP. Server grades from stored answer configuration.
- **Short answer:** follow approved DEC-06; never implicitly use an LLM to grade.
- **Timeout:** server clock/deadline authoritative; follow approved DEC-07/SSD-06 auto-submit policy.
- **Idempotency:** duplicate enrollment/response/submit and concurrent retries cannot duplicate results or completion events.
- **Transactions:** attempt result/response grading/completion outbox event must commit atomically.
- **Gamification:** Phase 6 may persist a durable qualifying event; Phase 8 owns processing and XP.
- **AI:** Express AI routes remain untouched until Phase 9; AI-generated questions cannot bypass teacher review.

## Phase-specific scope locks

### Phase 4

Implement course catalog/detail and teacher course CRUD; topics/lessons/resources; enrollment; prerequisite DAG persistence/validation; lesson completion and resource activity; student learning-map structure. Do not implement assessment authoring/attempts, mastery/path generation, XP, AI migration, or analytics. Keep resource file storage provider-neutral unless DEC-11 is approved.

### Phase 5

Implement all five question formats (MCQ, True/False, Fill Blank, Matching, Short Answer), question bank, assessment composition/order/configuration, draft/publish validation, teacher authorization/audit, and safe student projections. Do not implement attempts/grading. Preserve current Express AI generation/review; persistent AI governance remains Phase 9.

### Phase 6

Implement attempt state machine, server deadlines, immutable attempt snapshots, response persistence, session-local adaptive selection, server grading, results, expiry/duplicate-submit safety, and one durable completion outbox event. Do not implement the full mastery/path algorithm (Phase 7) or XP processing (Phase 8).

## Data and security safety

- Never run `docker compose down -v`, delete volumes, drop/truncate persistent tables, or reset production-like data.
- Never run destructive migrations on a non-disposable DB.
- Never commit `.env`, passwords, raw tokens, API keys, answer keys in logs, or production credentials.
- Preserve existing `/health` behavior and Docker topology unless approved.
- Validate Compose changes with `docker compose config`.
- Do not claim tests pass unless run and inspected.
- Do not claim zero bugs or zero regressions.

## Required final response from Antigravity

Provide: phase and baseline commit; summary of verified existing functionality; exact files changed; migrations; API contracts; tests with commands/results; frontend regression; security/authorization checks; data safety; decisions resolved/unresolved; known issues; evidence file paths; acceptance checklist; Git commit/hash; and explicit status. Then STOP.
