# Phase 6 — Assessment Attempt Lifecycle and Server-Authoritative Grading

**Phase:** 06  
**Depends on:** Accepted Phase 5 question bank and published assessment model  
**Primary blueprint scope:** Phase 6; Sections 3.2, 5.6, 7.2, 8.3–8.4, and testing strategy  
**Primary workflows:** SSD-02 diagnostic attempt lifecycle, SSD-04 adaptive practice and assessment-level mastery boundary, SSD-06 final summative exam/course completion  
**Status:** Implementation instruction; not evidence that the phase is implemented.

## 1. Objective

Implement the secure, persistent student assessment lifecycle. A student starts an authorized published assessment; the server creates an attempt with immutable assessment/question snapshots and a deadline; the student records answers; the server validates and stores responses; final submission/expiry triggers authoritative grading and a single durable completion event.

The browser submits answers only. It never supplies the authoritative score, correctness, mastery, XP, completion timestamp, or attempt status.

## 2. Non-negotiable Learnova academic invariants

1. Interim answers and response times may be stored, but must not update persisted topic mastery.
2. Persisted mastery is recalculated only after a complete valid assessment submission at the approved completion boundary. The mastery policy itself belongs to Phase 7; Phase 6 must call a defined interface or persist a completion signal for Phase 7 without inventing a formula.
3. Aborted, invalid, or otherwise incomplete attempts do not update mastery.
4. Adaptive difficulty selection during a practice attempt may use session-local answers/state. This is not persisted mastery and must not write a mastery record.
5. Grading uses server-held question revisions/answer keys. No answer key is sent to the browser before submission.
6. Assessment grading must not directly award XP. Write one durable qualifying event/outbox record transactionally; Phase 8 owns event consumption and rewards.
7. Duplicate answer writes/submissions/retries must not produce duplicate results, mastery recalculation, or completion events.

## 3. In scope

### 3.1 Attempt state machine

Implement a persisted state machine at minimum supporting:

- `in_progress`
- `submitted` / `completed` (use distinct values only if they represent distinct states in existing product semantics)
- `expired`
- `abandoned` or `invalid` where required to represent non-completing attempts safely
- `pending_manual_review` if approved short-answer grading requires teacher review
- `graded` as a final grading state if distinct from submitted

Define allowed transitions explicitly. A terminal attempt cannot be reopened or submitted again. A request after terminal completion returns the existing result or a conflict according to a documented idempotency contract; it never grades/awards twice.

### 3.2 Start attempt

- Verify authenticated student, active enrollment, assessment publication/availability, course access, attempt limit, and assessment type rules.
- Create attempt number and server-generated `started_at`/`deadline_at` using UTC timestamps.
- Snapshot the published assessment revision, question order, question content, scoring weights, and grading configuration so later author edits cannot change an active attempt.
- Return only student-safe question projections without correct answers/rubrics/answer keys.
- Use a secure attempt identifier; never trust client-supplied user ID or attempt owner.

### 3.3 Record interim responses

- Store response per attempt/question, including answer payload, server receipt timestamp, optional response duration when reliably provided/derived, and revision/snapshot reference.
- Validate that the question belongs to the attempt snapshot, attempt belongs to caller, attempt is in progress, and deadline has not passed.
- Support idempotent upsert or explicit response revision semantics; prevent duplicate response rows from retry/network replay.
- Do not accept `is_correct`, score, points awarded, mastery, XP, or arbitrary completion flags from the client.
- Keep response payload type-specific and validate against the question format.

### 3.4 Adaptive next-question selection

- Support an attempt-scoped endpoint/service for adaptive practice.
- Keep session-local difficulty/selection state within the attempt; derive from server-recorded responses, not untrusted client state.
- Preserve existing frontend adaptive utility behavior where possible by inspecting `studentLogic.ts`/`assessment.ts` and porting the relevant tested policy behind an interface.
- Diagnostic and final exams must follow their configured selection/order rules; do not accidentally make formal exams adaptive.
- Do not implement or claim the full approved mastery algorithm or personalized learning-path engine; those remain Phase 7.
- If the exact adaptive policy is not specified by current sources/UI, record the gap and request owner approval before changing learning outcomes.

### 3.5 Submit, expiry, and grading

- Final submit validates ownership, attempt status, required responses, deadline, and assessment policy.
- Expired timed exams follow DEC-07 and the SRS/SSD-06 auto-submit behavior; the server clock is authoritative.
- Grade all objectively gradable response types on the server using the immutable attempt snapshot.
- Support deterministic normalization rules for fill-in-the-blank and matching based on the approved Phase 5 definitions.
- Short-answer responses follow the approved DEC-06 grading mode. Never call an LLM as an implicit grader. If manual review is required, represent pending review and do not fabricate a final score.
- Persist score/maximum score/percentage, response breakdown, submitted/completed timestamps, grading version, and relevant metadata. Score fields may be null while in progress or pending review.
- Duplicate submission is idempotent and returns the existing result; it does not create a second result/event.

### 3.6 Mastery and event boundary

- Phase 6 must expose a clean completion result/port for the Phase 7 mastery policy. If Phase 7 is not implemented, record the completed valid assessment and the topic-level evidence needed for later recalculation; do not invent a mastery percentage or default formula.
- Where the approved architecture requires a mastery update at this boundary, invoke only an existing approved policy. Never use a hard-coded 70/75 threshold or weighted-score formula without approval.
- Persist a durable assessment-completed domain event/outbox row in the same transaction as the authoritative result. Include unique idempotency key, attempt ID, event type, occurred-at, and minimal payload/reference. Do not process XP in Phase 6.
- A transaction failure must leave no partial result, mastery write, or completion event.

## 4. Out of scope

- Full mastery algorithm, topic mastery state model, learning-path generation, prerequisite remediation/acceleration policy (Phase 7).
- XP calculation, XP ledger, badges, streaks, leaderboard, outbox consumer (Phase 8). Phase 6 only persists the event/outbox record required by the blueprint.
- AI-generated questions and LLM grading (Phase 9; LLM grading is not allowed implicitly).
- Teacher analytics and class reporting (Phase 10).
- Broad frontend migration (Phase 11); integrate only assessment player/results API paths needed for this lifecycle.

## 5. Proposed API contract

Use attempt-scoped routes as recommended in the blueprint. Verify existing routes before adding.

| Method | Route | Purpose / authorization |
|---|---|---|
| POST | `/api/v1/assessments/{assessment_id}/attempts` | Start attempt for current enrolled student |
| GET | `/api/v1/attempts/{attempt_id}` | Resume/read own active attempt, safe projection only |
| PUT | `/api/v1/attempts/{attempt_id}/responses/{question_id}` | Save/update one interim response |
| POST | `/api/v1/attempts/{attempt_id}/next-question` | Select next item for adaptive practice using server session state |
| POST | `/api/v1/attempts/{attempt_id}/submit` | Finalize and grade attempt; idempotent |
| GET | `/api/v1/attempts/{attempt_id}/result` | Retrieve own result/feedback; teacher access only under authorized course scope |

A dedicated expiry/worker endpoint is not required if expiration is safely enforced on request and/or through an internal scheduled process. Never expose an unauthenticated endpoint that lets a caller expire another user's attempt.

## 6. Data model recommendations

Inspect the Phase 5 schema before adding tables. Reuse it rather than duplicating question/assessment definitions. Likely entities:

- `AssessmentAttempt`: student, assessment revision, enrollment, attempt number, status, start/deadline/submitted/completed timestamps, score nullable, max score, percentage nullable, grading version, idempotency metadata.
- `AttemptQuestion` or equivalent immutable snapshot: attempt, question reference/revision, order, student-safe prompt/options snapshot, server-only answer/grading snapshot, points.
- `AttemptResponse`: attempt-question, typed answer payload, server timestamp, optional response duration, grading outcome/points after grading; unique per attempt-question unless explicit revision history is required.
- `AssessmentResult` only if a separate result aggregate is justified; avoid duplicating score state across attempt and result without a clear source of truth.
- `DomainOutboxEvent`/equivalent durable event with unique idempotency key. Reuse an existing event/outbox model if present; do not create a second event system.

Use JSONB only for genuinely type-variable payloads/snapshots, with Pydantic validation at boundaries and relational columns for queryable identity/state/time/score. Add indexes for student history, assessment, status/deadline, and attempt ownership as justified.

## 7. Decisions to resolve

- **DEC-06 short-answer grading:** apply the approved Phase 5 decision. No silent LLM grading.
- **DEC-07 exam timeout:** server-side UTC deadline and auto-submit/expiry policy must be explicitly confirmed against SSD-06; define treatment of unanswered questions and late requests.
- **DEC-03 mastery boundary:** preserve the blueprint/README rule: persisted mastery only after complete valid submission. Confirm any assessment-mode exceptions before implementing.
- **DEC-01/02 mastery algorithm/scale:** Phase 6 must not choose the full algorithm or threshold. Keep the policy replaceable and hand evidence to Phase 7.
- **Adaptive practice selection:** use existing frontend utility behavior as baseline or request approval for a changed algorithm. Keep it session-local.
- **Attempt limit and retake rules:** inspect SRS/UI; if unspecified, do not invent a restrictive default. Make the policy explicit/configurable and request approval where it changes student access.
- **Manual review:** if short-answer manual grading is required, decide who may grade, whether a partially graded attempt has a pending status, and when final result is visible.

## 8. Frontend integration boundary

Inspect and map:

- `DiagnosticIntroPage.tsx`, `DiagnosticPlayerPage.tsx`
- `AdaptivePracticePlayerPage.tsx`, `FinalExamPlayerPage.tsx`, `AssessmentResultsPage.tsx`, `QuestionRenderer.tsx`
- `frontend/src/utils/assessment.ts`, `studentLogic.ts`, `storageService.ts`, API services, types, tests.

Replace only the attempt/player/results storage paths. Preserve question rendering, navigation, timer UX, result layout, and accessibility. Server time/deadline and server responses are authoritative. Handle refresh/reconnect by retrieving the active attempt; do not restart or duplicate it. Never fall back silently to mock grading when the API fails.

## 9. Expected implementation areas (verify before editing)

- `backend/app/models/`: attempt, attempt snapshot/response, outbox event if no existing equivalent; update model registry.
- `backend/app/schemas/`: start/resume/answer/submit/result schemas; no client score fields.
- `backend/app/services/`: attempt lifecycle, response validation, selection policy, grader, result finalization, outbox persistence.
- `backend/app/api/v1/endpoints/`: attempt routes and router registration.
- `backend/alembic/versions/`: additive D4 schema migration(s).
- `backend/tests/`: state machine, grading, timing, ownership, idempotency, transaction rollback, security, migration tests.
- `frontend/src/services/api/`, player/results pages/hooks/types/tests: narrow integration.
- `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`, phase evidence.

## 10. Required tests

### State machine and security

- Start allowed/denied by enrollment, assessment status, role, attempt limit.
- Attempt ID belongs to current user; cross-user access denied.
- Answer only to questions in the attempt snapshot.
- No answers/score/mastery leaked before submit.
- Late answer rejected or routed through approved expiry behavior.
- Terminal attempts cannot be reopened or modified.

### Grading

- Correct/incorrect cases for all five question formats.
- Partial credit only where explicitly configured.
- Fill-blank normalization and matching behavior match approved definitions.
- Short-answer manual/automatic modes follow DEC-06.
- Client-supplied score/correctness/mastery/XP fields are rejected or ignored safely; never trusted.

### Timing and idempotency

- Server-generated UTC start/deadline.
- Expiry and auto-submit policy, unanswered question handling.
- Duplicate response retry does not duplicate records.
- Duplicate submit returns same result and creates one completion event.
- Concurrent submit requests finalize exactly once.

### Academic correctness and transactions

- Interim answers do not update persisted mastery.
- Abandoned/invalid attempts do not update mastery.
- One valid complete submission triggers one completion boundary/policy invocation.
- Result, response grading, and outbox event commit atomically.
- Simulated transaction failure leaves no partial result/event.
- Adaptive session state changes next practice item but does not write mastery.

### Regression

- Phase 2–5 migrations/tests and frontend tests/build remain green.
- Student diagnostic, practice, final exam, result journeys work after refresh/re-login.
- Existing course enrollment and curriculum workflows remain intact.

## 11. Acceptance criteria

- [ ] Start attempt enforces enrollment, publication, role, availability, and approved attempt policy.
- [ ] Attempt deadline and timestamps are server-authoritative.
- [ ] Questions and answer keys are snapshotted; student payload never exposes keys.
- [ ] Individual responses and timestamps persist safely.
- [ ] Adaptive practice uses server-derived session state only; formal exam ordering remains configured.
- [ ] Server grades using approved rules; browser cannot forge score/correctness.
- [ ] Expiry/auto-submit follows approved DEC-07 policy.
- [ ] Duplicate submit/concurrent retries produce one result and one outbox event.
- [ ] Interim/aborted/invalid attempts do not update persisted mastery.
- [ ] One valid completion invokes the approved mastery boundary at most once; no invented formula.
- [ ] Result, responses, and completion event are atomic.
- [ ] No XP processing is added; Phase 8 remains responsible.
- [ ] Existing player/results UI behavior is preserved.
- [ ] Migrations and tests pass; control docs and six phase records are complete.
- [ ] Status is `READY_FOR_REVIEW`; owner alone accepts.

## 12. Stop conditions

Stop if the Phase 5 question/assessment schema cannot provide immutable snapshots, timeout semantics conflict with SSD-06, short-answer grading is unresolved, attempt limits materially change product access, or an implementation would update mastery before valid completion. Do not implement Phase 7 mastery/path logic or Phase 8 rewards as a shortcut.
