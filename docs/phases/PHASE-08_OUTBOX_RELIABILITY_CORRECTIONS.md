# Phase 8 — Outbox Reliability and Privacy Corrections

**Type:** Narrow corrective phase; preserve the existing gamification domain  
**Baseline:** `3b3a6d52775ac972026a5f22dd1353e51a0d4783`  
**Depends on:** Phase 7 corrective stabilization

## 1. Objective

Keep the current gamification models, XP rules, level formula, streak logic, badge catalog, challenges, leaderboard endpoint and idempotent XP ledger. Correct delivery reliability and privacy defaults without replacing the subsystem.

## 2. Confirmed cross-phase problem

The architecture requires an outbox event to survive gamification failure and be retried independently. Current grading flow:
1. `GradingService.submit_attempt()` writes `assessment.completed`.
2. It calls `MasteryService.recalculate_from_attempt()`.
3. Mastery currently marks the event `published`.
4. Grading then directly calls `GamificationService.process_outbox_event()`.

If step 4 fails, the event can already be `published`, so `process_pending_outbox_events()` will not select it. This defeats retryability. Lesson completion also directly calls the gamification handler in the request path.

Phase 7 correction removes mastery ownership of event status. This phase completes the outbox ownership correction.

## 3. Required corrections

### P8-FIX-01 — Request handlers only write durable events

- `GradingService.submit_attempt()` must atomically persist the graded attempt and `assessment.completed` outbox event.
- `EnrollmentService.complete_lesson()` must atomically persist the completion and `lesson.completed` event.
- Do not synchronously award XP or run the gamification consumer as the normal request-path behavior.
- Preserve current API response behavior; do not make students wait for gamification to finish.
- If the existing event is inserted after a commit, verify transaction boundaries and make the event atomic with the domain change.

### P8-FIX-02 — One owner for outbox delivery state

- The gamification consumer is the owner of `pending → published` or `pending → failed`.
- A successful event is marked published only after its XP, streak, badge and challenge changes commit.
- Failed events remain retryable until the bounded retry limit.
- Never let the mastery service mark a gamification event as published.

### P8-FIX-03 — Persist retry metadata

The fetched ORM model `DomainOutboxEvent` does not map `retry_count` or `last_error`, while the worker exception handler references them.

Inspect the actual migration history and database schema. If missing:
- Add an additive Alembic migration; do not edit old migrations.
- Add ORM mappings and server defaults for retry count and last error.
- Add `next_attempt_at` only if needed for a real backoff policy.
- Add an index supporting pending-event scans if justified.
- Keep status values compatible with existing `pending`, `published`, and `failed`.

Implement bounded retry/backoff and dead-letter behavior. Never silently drop an event. Record safe error summaries; do not log secrets or full sensitive payloads.

### P8-FIX-04 — Worker execution and concurrency

- Verify the existing `/api/v1/gamification/process-events` endpoint is protected from public/student invocation. Prefer an internal worker credential or administrator-only operational access consistent with existing security design.
- Provide a real repeatable worker execution mechanism: a one-shot CLI worker plus documented scheduler/worker invocation is acceptable. A small worker process using the same FastAPI application/package is acceptable.
- Do not add Kafka, RabbitMQ, Redis, or microservices.
- Use transaction-safe claiming/locking so two workers do not process the same pending event concurrently. Use PostgreSQL `FOR UPDATE SKIP LOCKED` where appropriate, with SQLite-compatible tests where needed.
- Ensure each event is processed in a transaction. Roll back failed work before persisting retry metadata.
- Keep XP idempotency keys and unique badge constraints as final duplicate protection.

### P8-FIX-05 — Explicit leaderboard opt-in

The current model/migration default is `True`, while the documented requirement calls this an opt-in privacy setting.

- Compare the exact SRS/Blueprint language and current UI consent behavior.
- If no affirmative opt-in is recorded, propose `False` as the default for new profiles.
- For existing rows, do not assume `True` means the student consented. Propose a safe data migration to `False` unless a trustworthy consent record exists.
- Obtain owner approval before changing existing data/default behavior.
- Keep a student's own profile visible to themselves while masking opted-out users to peers.
- Do not change unrelated profile fields or redesign the leaderboard.

### P8-FIX-06 — Qualifying event coverage

Verify event production for:
- `assessment.completed`
- `lesson.completed`
- resource review/activity only where the source defines a qualifying event and the current endpoint records that action.

Do not award XP for arbitrary resource opens unless the SRS says it qualifies. Ensure challenges progress only from qualifying persisted events and cannot be completed by client-supplied counters.

## 4. Likely file scope — inspect before editing

```text
backend/app/models/outbox.py
backend/app/services/grading_service.py
backend/app/services/enrollment_service.py
backend/app/services/gamification_service.py
backend/app/api/v1/endpoints/gamification.py
backend/app/workers/*                       # only if worker entrypoint needed
backend/alembic/versions/<new_additive_revision>.py
backend/tests/test_attempt_concurrency_and_outbox.py
backend/tests/test_gamification_outbox_worker.py
backend/tests/test_xp_ledger_idempotency.py
backend/tests/test_leaderboard_privacy.py
backend/tests/test_badge_rules.py
backend/tests/test_migrations_postgres.py
DECISIONS.md
API_CONTRACT.md
IMPLEMENTATION_STATUS.md
docs/antigravity-bible/phase-records/PHASE-08-CORRECTION/*
```

Do not rewrite migration `20261109_0008` or `20261109_0010`. New schema changes must be additive.

## 5. Required tests

| ID | Scenario | Expected result |
|---|---|---|
| P8-C01 | Assessment grading | Attempt and outbox event commit atomically |
| P8-C02 | Lesson completion | Completion and outbox event commit atomically |
| P8-C03 | Gamification handler fails | Event remains pending/retryable |
| P8-C04 | Retry after transient failure | Event eventually publishes |
| P8-C05 | Duplicate worker delivery | XP awarded exactly once |
| P8-C06 | Two workers claim same event | No duplicate processing |
| P8-C07 | Retry limit reached | Event marked failed/dead-lettered with persisted reason |
| P8-C08 | Missing retry metadata migration | Upgrade/downgrade tested on disposable PostgreSQL |
| P8-C09 | Student invokes worker endpoint | Denied |
| P8-C10 | Leaderboard opt-out | Anonymous to peers, visible to self |
| P8-C11 | New profile without consent | Not listed publicly by default, if opt-in policy confirmed |
| P8-C12 | Resource activity | XP only for source-approved qualifying event |
| P8-C13 | Existing XP idempotency tests | No duplicate XP or badge rewards |

## 6. Acceptance criteria

- Gamification failures cannot affect grading or lesson completion.
- Every event remains recoverable after process restart.
- Retry state is actually persisted.
- Outbox event is published only after successful consumer commit.
- Worker concurrency is safe.
- XP and badge idempotency remain intact.
- Leaderboard privacy matches source-approved consent semantics.
- Existing routes and response payloads remain compatible.
- Migrations are additive and tested against disposable PostgreSQL.
- Original Phase 8 records remain intact; corrective records are appended.

## 7. Execution protocol

**Stage A — Plan only:** inspect event lifecycle, ORM/migrations, worker endpoint security, scheduler/worker topology, privacy requirements and existing tests. Stop for owner approval.

**Stage B — Implement after approval:** narrowly correct the existing code.

**Stage C — Verify:** test failure/retry/concurrency, migration lifecycle, full backend and frontend regression, inspect full diff and update control documents. Create `PHASE-08-CORRECTION` records and stop.

Do not start Phase 9 automatically.
