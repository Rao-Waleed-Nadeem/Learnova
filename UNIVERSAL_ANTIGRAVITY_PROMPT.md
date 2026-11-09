# Universal Antigravity Prompt — Phase 7 Stabilization, Phase 8 Reliability, Phase 9 AI

```text
PROJECT: LEARNOVA
REPOSITORY: Rao-Waleed-Nadeem/Learnova
BASELINE COMMIT REVIEWED: 3b3a6d52775ac972026a5f22dd1353e51a0d4783

ROLE
Act as the senior engineer continuing an existing implementation. Preserve architecture, behavior, contracts and visual design unless a specific defect or source requirement requires a narrow correction. Do not redesign the platform.

AUTHORITATIVE SOURCES
1. docs/sources/Learnova_SRS_Final_Aligned_V2 (1).docx
2. docs/sources/Learnova_Final_SSDs_V2.xml
3. docs/sources/Readme.md
4. docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md
5. API_CONTRACT.md, IMPLEMENTATION_STATUS.md, DECISIONS.md
6. Current source, migrations, tests, and phase records.

MANDATORY SEQUENCE
A. Phase 7 corrective stabilization.
B. Stop and present evidence. Wait for owner acceptance.
C. Phase 8 outbox/privacy corrections.
D. Stop and present evidence. Wait for owner acceptance.
E. Phase 9 AI integration.
F. Stop. Do not start Phase 10 or 11.

STAGE A — PLAN ONLY
For each phase, inspect branch/status/diff, current implementation and relevant source docs. Create its PLAN.md, exact file ledger proposal, API/DB impact, test matrix, data safety plan and rollback. Do not edit code until owner approval.

ARCHITECTURE LOCK
- Keep the existing FastAPI modular monolith, PostgreSQL, synchronous SQLAlchemy, Alembic, `/api/v1`, current Docker topology and React frontend.
- No microservices, Kafka, mandatory Redis, wholesale rewrite, replacement ORM, duplicate domain models or database reset.
- Preserve existing routes and payloads unless an approved compatibility change is required.
- Never remove an Express AI handler until FastAPI replacement and frontend cutover are verified.
- Never change mastery formula, scoring, XP values, streak rules or badge criteria as an incidental refactor.

PHASE 7 — CORRECTIVE STABILIZATION
- Preserve the current BKT/hybrid implementation for this narrow correction; record algorithm approval as unresolved if no explicit academic approval is evidenced.
- Mastery recalculation must remain restricted to valid completed/graded attempts. Interim, invalid, aborted and expired-without-valid-submission attempts do not update persisted mastery.
- MasteryService must not mark the gamification outbox event published or otherwise own its delivery state.
- Respect each topic's configured `mastery_threshold` exactly. A status label must not bypass a higher configured numeric threshold. Do not silently change the Phase 2 default 0.75 to 0.70.
- Use Assessment.topic_id when explicitly set. If absent, attribute responses by their own question topic and calculate per topic where valid. Never assign a multi-topic attempt wholesale to the first question topic or first course topic. If reliable topic attribution is unavailable, do not fabricate mastery; record a controlled issue.
- Verify topic/course/enrollment ownership and readiness authorization.
- Record course-completion and remediation-loop termination as explicit decisions if still unresolved. Preserve existing behavior until approved; do not invent a new policy.

PHASE 8 — OUTBOX RELIABILITY AND PRIVACY
- Assessment and lesson-completion request handlers persist outbox events in the same transaction as their academic/completion records.
- Request handlers do not directly award XP or synchronously run gamification as the normal path.
- The pending-event consumer owns event status transitions. A successful consumer marks an event published only after XP/badge/challenge updates commit. A failed event remains retryable and records persistent retry metadata.
- Verify DomainOutboxEvent ORM and migrations. Add an additive Alembic migration for missing retry metadata if required; do not rewrite migration history.
- Use safe row claiming/locking for concurrent workers and bounded retry/dead-letter behavior. Preserve the modular monolith; a small worker command/process is acceptable, not a new distributed platform.
- Keep XP ledger idempotency and badge uniqueness.
- Apply explicit leaderboard opt-in consistent with sources. If current default True lacks affirmative consent evidence, propose a safe migration to default false and explain treatment of existing records; obtain approval before changing production data.
- Emit qualifying resource-review events only if the source workflow and current endpoint semantics support them. Do not invent rewards.
- Do not expose an unauthenticated public worker trigger.

PHASE 9 — AI INTEGRATION AND GOVERNANCE
- Read and preserve current `frontend/server.ts` behavior/contracts and AI-consuming React components before editing.
- Implement `ILLMServiceAdapter` in the existing FastAPI architecture, with Gemini as the first provider; additional providers are out of scope unless required.
- Keep API keys server-side using existing settings/config patterns.
- Implement validated request/response schemas, provider timeout, bounded retry/rate protection, controlled errors and explicit source attribution.
- Add persistent AI candidate/review records and cache only where required by the sources. Prefer existing PostgreSQL; do not add Redis merely for this phase.
- Generated candidates remain pending review and distinct from official Question records until an authorized teacher edits/approves. Approval must use existing QuestionService/Assessment contracts and be idempotent/audited.
- Simplification/explanation caching must have deterministic keys, expiry/versioning and invalidation rules. Avoid storing unnecessary student personal data.
- Keep short-answer grading policy unchanged; never silently invoke an LLM to grade.
- Keep legacy Express routes working until the new FastAPI routes and frontend consumers pass integration tests. Then remove old handlers or leave only a documented thin compatibility proxy—not two independent implementations.
- Deterministic fallback must be labeled as fallback, never represented as successful Gemini output.

TESTING AND EVIDENCE
- Run focused tests, full backend suite, frontend Vitest, frontend build, migration lifecycle on disposable PostgreSQL, and Docker config/runtime checks as relevant.
- Add failure-path tests: gamification handler failure leaves event retryable; retry awards XP once; concurrent workers do not double-process; configured mastery threshold is honored; multi-topic assessment attribution is correct; no answer/secret leakage; AI approval workflow is enforced.
- Record exact commands, workdir, exit code and actual output. Do not claim tests passed if not run.
- Inspect full git diff, reconcile every path with FILE_CHANGE_LEDGER.md, scan secrets, preserve DB volume.
- Update API_CONTRACT.md, IMPLEMENTATION_STATUS.md and DECISIONS.md truthfully.
- Keep the original Phase 7/8 historical records. Add corrective records in new correction folders.
- Only the project owner marks a phase ACCEPTED.

STOP RULE
After each phase, provide the summary, changed files, migration impact, test evidence, known gaps and commit SHA. Stop and wait. Never start the next phase automatically.
```
also read README_FIRST.md, REPO_INTEGRATION_NOTES.md.
