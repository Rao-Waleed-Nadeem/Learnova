# Phase 8 Correction Issues and Decisions

**Phase:** Phase 8 Reliability and Privacy Corrections (`PHASE-08-CORRECTION`)  
**Date:** 2026-11-09  
**Authority:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md`, `PHASE-08_OUTBOX_RELIABILITY_CORRECTIONS.md`

---

## 1. Issues Identified and Resolved

### Issue 1: Synchronous Outbox Execution on Request Path (P8-FIX-01)
- **Problem:** `submit_attempt` in `GradingService` and `record_lesson_completion` in `EnrollmentService` directly invoked `GamificationService.process_outbox_event()` on the HTTP request thread. Furthermore, `record_lesson_completion` inserted outbox events directly with `status = "published"`.
- **Impact:** Introduced unwanted latency into grading responses, coupled core academic and enrollment mutations to downstream gamification processing, and bypassed retry mechanisms if post-submission errors occurred.
- **Resolution:** Removed synchronous calls in both services. In `record_lesson_completion`, set initial outbox status to `"pending"`. The outbox event is strictly committed alongside the domain entity within the primary transaction and left pending for background consumption.

### Issue 2: Missing Retry Metadata and Dead-Lettering (P8-FIX-02)
- **Problem:** `DomainOutboxEvent` had no columns for retry tracking, error recording, or scheduled retry timestamps. Failed events were either stuck indefinitely or retried in tight loops.
- **Impact:** Potential poison-pill events could exhaust system resources, block subsequent outbox events, and degrade database performance.
- **Resolution:** Added `retry_count`, `last_error`, and `next_attempt_at` columns via migration `20261109_0011`. Implemented exponential backoff ($2^{\text{retry\_count}} \times 5$ seconds), capped retries at 5 with dead-lettering (`status = "failed"`), and isolated individual event processing using `db.begin_nested()` savepoints.

### Issue 3: Open Worker Dispatcher Endpoint (P8-FIX-02)
- **Problem:** `POST /api/v1/gamification/process-events` was accessible to any authenticated user, including students.
- **Impact:** Allowed unprivileged users to trigger batch processing or flood the dispatcher.
- **Resolution:** Added `current_user: User = Depends(require_role("administrator"))` to protect the endpoint. Created a standalone CLI worker (`python -m app.workers.outbox_worker`) for scheduled background execution.

### Issue 4: Default Public Leaderboard Exposure (P8-FIX-03)
- **Problem:** `GamificationProfile.is_opted_in_leaderboard` defaulted to `True`, automatically revealing student names and badges to peers on leaderboards without explicit consent.
- **Impact:** Violated FERPA-like student data privacy standards and affirmative consent principles.
- **Resolution:** Changed model default and server_default to `False` / `"false"`. Altered column default via migration `20261109_0011`. Students remain anonymized as "Anonymous Scholar" with null avatars until they affirmatively grant consent via `PATCH /api/v1/gamification/profile`.

### Issue 5: SQLite Migration Syntax Compatibility
- **Problem:** Direct `op.alter_column` calls to change column defaults failed in SQLite during `test_alembic_disposable.py` with syntax errors.
- **Impact:** Broke disposable SQLite test database creation.
- **Resolution:** Wrapped column alterations in `with op.batch_alter_table(...) as batch_op:`, ensuring 100% compatibility across both SQLite and PostgreSQL.

---

## 2. Architectural Decisions Recorded

The following formal decisions have been ratified and documented in the root `DECISIONS.md`:

1. **`DEC-P8-005: Outbox Decoupling from Synchronous Request Path (P8-FIX-01)`**
   - Pure domain transactions emit `status = "pending"` outbox events. Synchronous execution on HTTP request threads is strictly forbidden.
2. **`DEC-P8-006: Outbox Retry Metadata, Dead-Lettering, and Concurrent Claiming (P8-FIX-02)`**
   - Durable metadata on outbox events, isolated savepoints per event, exponential backoff, dead-letter threshold at 5 failures, PostgreSQL row-level locking (`FOR UPDATE SKIP LOCKED`), and administrator authorization.
3. **`DEC-P8-007: Affirmative Consent Default for Leaderboard Privacy (P8-FIX-03)`**
   - Schema default `is_opted_in_leaderboard = False`. Student identity is masked as "Anonymous Scholar" until affirmative opt-in is granted.
