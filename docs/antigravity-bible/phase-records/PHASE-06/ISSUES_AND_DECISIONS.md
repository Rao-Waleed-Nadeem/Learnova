# Phase 06 — Issues, Trade-offs, and Architectural Decisions

**Phase:** Phase 6 — Assessment Attempts & Server-Authoritative Grading  
**Date:** 2026-11-09  

---

## 1. Architectural Decisions

### `DEC-P6-001`: Immutable Attempt Question Snapshotting
- **Context:** If a teacher updates a question's prompt, options, or answer key in the Question Bank while a student has an active assessment attempt, live mutation of the exam can lead to inconsistent state, leaked answers, or unfair scoring.
- **Decision:** When `POST /api/v1/assessments/{assessment_id}/attempts` is called, the system snapshots the assessment questions, options, max points, and server answer keys into `AssessmentAttempt.snapshot_data`. The student's view of questions is served from this snapshot (with answer keys sanitized out).
- **Consequence:** Future edits in the question bank will never invalidate an in-flight attempt or distort historical scoring records.

### `DEC-P6-002`: Authoritative Server UTC Deadlines and Auto-Submit on Expiry (`DEC-07`)
- **Context:** Client device clocks can drift or be tampered with. Timed assessments must enforce fair, uniform time limits.
- **Decision:** The server clock in UTC is the single authoritative source of truth. At attempt start, `deadline_at = started_at + timedelta(minutes=time_limit_minutes)`. Any attempt to record answers or submit past `deadline_at` is rejected or triggers auto-submit. In auto-submit, unanswered questions receive zero points.
- **Consequence:** Guarantees absolute exam integrity regardless of client time manipulation.

### `DEC-P6-003`: Transactional Outbox Pattern for Assessment Completion
- **Context:** Completion of an assessment produces downstream side effects: topic mastery updates (Phase 7) and gamification rewards/streaks (Phase 8). Coupling grading to those downstream domains directly in the grading endpoint introduces brittle synchronous failure points and cross-phase circular dependencies.
- **Decision:** A new table `domain_outbox_events` is introduced. When an assessment attempt is graded or auto-submitted, an event of type `assessment.completed` is atomically inserted in the same database transaction. A unique idempotency key (`assessment.completed:{attempt_id}`) guarantees at-most-once/at-least-once processing without duplication.
- **Consequence:** Phase 6 cleanly delivers verified grading artifacts while remaining decoupled from Phase 7 (BKT/Elo calculation) and Phase 8 (XP ledger).

### `DEC-P6-004`: Idempotent Response Upsert and Submission
- **Context:** Flaky network connections or rapid button clicks can result in duplicate requests for response saving or attempt submission.
- **Decision:** Responses are upserted against `UniqueConstraint("attempt_id", "question_id")`. Submission requests against an already-submitted or graded attempt return the existing `AssessmentResultResponse` immediately without re-calculating scores or duplicating outbox events.
- **Consequence:** Eliminates duplicate grading anomalies and race conditions.

---

## 2. Issues Encountered & Resolved

### Issue 1: Audit Service Actor Signature Mismatch
- **Problem:** `log_audit_event()` was called with `actor=current_user`, causing `TypeError: log_audit_event() got an unexpected keyword argument 'actor'`.
- **Root Cause:** `log_audit_event()` expects explicit kwargs: `actor_id`, `actor_email`, `actor_role`.
- **Fix:** Refactored calls to `actor_id=actor.id, actor_email=actor.email, actor_role=actor.role.name if actor.role else None`.

### Issue 2: Offset-Naive vs Offset-Aware Datetime Comparison
- **Problem:** In SQLite memory tests, stored timestamps are deserialized as offset-naive datetimes, raising `TypeError: can't compare offset-naive and offset-aware datetimes` against `datetime.now(timezone.utc)`.
- **Root Cause:** SQLite dialect lacks native timezone preservation and stores ISO strings.
- **Fix:** Added an `ensure_utc(dt)` helper in `AttemptService` and `GradingService` that attaches `timezone.utc` if `dt.tzinfo is None`.

### Issue 3: Check Constraint Violation in Deadline Simulation Test
- **Problem:** `test_server_authoritative_deadline_and_expiry` encountered `IntegrityError: CHECK constraint failed: ck_assessment_attempts_deadline_valid`.
- **Root Cause:** The database check constraint requires `deadline_at IS NULL OR deadline_at >= started_at`. Setting `deadline_at = now - 5m` while `started_at` was `now` violated this constraint.
- **Fix:** Simulated a realistic 30-minute exam started 35 minutes ago: `att.started_at = now - timedelta(minutes=35)` and `att.deadline_at = now - timedelta(minutes=5)`, satisfying `deadline_at >= started_at` while placing the deadline 5 minutes in the past.
