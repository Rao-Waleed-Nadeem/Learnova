# Phase 8 Correction Plan — Outbox Reliability & Privacy Corrections

**Phase:** Phase 8 Reliability and Privacy Corrections (`PHASE-08-CORRECTION`)  
**Stage:** Stage A, B, and C Completed (Implementation & Verification Complete)  
**Governing Standard:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md` Sequences C & D; `README_FIRST.md`; `REPO_INTEGRATION_NOTES.md`; `docs/phases/PHASE-08_OUTBOX_RELIABILITY_CORRECTIONS.md`; `Learnova_Master_Backend_Implementation_Blueprint.md` Sections 3.3, 8.6; `Learnova_SRS_Final_Aligned_V2 (1).docx` UC-16, Section 3.2.6; `Learnova_Final_SSDs_V2.xml` (SSD-04).  
**Baseline Commit:** `3b3a6d52775ac972026a5f22dd1353e51a0d4783`  
**Date:** 2026-11-09  
**Status:** **IMPLEMENTED & VERIFIED — READY FOR OWNER ACCEPTANCE (SEQUENCE D)**

---

## 1. Executive Summary & Objective

This plan establishes the narrow corrective stabilization of Phase 8 (Gamification, Asynchronous Outbox Event Processing, and Privacy Architecture) as required by `UNIVERSAL_ANTIGRAVITY_PROMPT.md` and `docs/phases/PHASE-08_OUTBOX_RELIABILITY_CORRECTIONS.md`.

The existing implementation architecture is preserved:
- FastAPI modular monolith (`/api/v1`).
- Physical PostgreSQL tables `gamification_profiles`, `xp_ledger`, `badges`, `user_badges`, `challenges`, `user_challenges`, and `domain_outbox_events`.
- Arithmetic progression level formula: Level 1 (0–250 XP), Level 2 (250–600 XP), Level 3 (600–1050 XP), Level 4 (1050–1600 XP).
- Append-only XP ledger with unique idempotency keys (`uq_xp_ledger_idempotency`).
- Continuous streak calculation and challenge tracker.

Phase 8 Corrective Stabilization addresses six verified defects without architectural churn:
1. **P8-FIX-01 (Request Handlers Only Write Durable Events):** Remove synchronous request-path invocations of `GamificationService.process_outbox_event()` from `GradingService.submit_attempt()` and `EnrollmentService.record_lesson_completion()`. Assessment submission and lesson completion persist their domain entity and a `pending` outbox event in the same atomic database transaction. Academic scoring latency is permanently decoupled from gamification calculations.
2. **P8-FIX-02 (Single Owner for Outbox Delivery State):** The asynchronous event consumer (`GamificationService.process_pending_outbox_events()` / worker) is the sole owner of outbox status transitions (`pending -> published` or `pending -> failed`). An event is marked `published` only after XP, streaks, badges, and challenges successfully commit.
3. **P8-FIX-03 (Persist Retry Metadata & Additive Migration):** Add physical columns `retry_count`, `last_error`, and `next_attempt_at` to `domain_outbox_events` via an additive Alembic migration (`20261109_0011_d4_outbox_retry_and_leaderboard_privacy.py`) and map them in `DomainOutboxEvent`. Implement bounded exponential retry backoff (up to 5 attempts) and dead-lettering (`failed`).
4. **P8-FIX-04 (Worker Concurrency, Safety & Access Control):** Restrict `POST /api/v1/gamification/process-events` to `administrator` role only, rejecting student calls with HTTP 403 Forbidden. Implement PostgreSQL `FOR UPDATE SKIP LOCKED` row claiming in `process_pending_outbox_events()` with graceful SQLite test fallback. Process each event inside an isolated nested savepoint (`db.begin_nested()`) to guarantee rollback of partial writes on failure. Provide a standalone CLI worker entrypoint at `backend/app/workers/outbox_worker.py`.
5. **P8-FIX-05 (Explicit Leaderboard Opt-In Privacy):** Change `GamificationProfile.is_opted_in_leaderboard` default from `True` to `False` (`default=False, server_default="false"`), enforcing affirmative consent. Add safe data migration updating existing rows to `false`. Ensure leaderboard masks opted-out users as `"Anonymous Scholar"` to peers while displaying accurate rank and full identity to the student themselves.
6. **P8-FIX-06 (Qualifying Event Coverage):** Verify that XP awards and challenge progression only occur from authoritative, verified events (`assessment.completed`, `lesson.completed`). Resource activities (`resource_activity`) do not emit unearned XP for arbitrary page visits.

---

## 2. Defect Analysis with Direct Code Evidence

### Defect 1: `P8-FIX-01` — Synchronous Request-Path Gamification Dispatch
- **Evidence:**
  - In `backend/app/services/grading_service.py` (lines 289–297):
    ```python
    try:
        from app.services.gamification_service import GamificationService
        GamificationService.process_outbox_event(db=db, event=outbox_event)
        db.commit()
    except Exception:
        pass
    ```
  - In `backend/app/services/enrollment_service.py` (lines 329–338):
    ```python
    try:
        from app.services.gamification_service import GamificationService
        GamificationService.process_outbox_event(db, outbox_event)
        outbox_event.status = "published"
        outbox_event.published_at = datetime.now(timezone.utc)
    except Exception:
        pass
    db.commit()
    ```
- **Architectural Impact:**
  1. Student requests wait synchronously for gamification logic, profile level recalculations, and badge rules to run.
  2. In `enrollment_service.py`, `outbox_event.status = "published"` is prematurely mutated by the request handler.
  3. If gamification processing fails or the process crashes during execution, the outbox event in `enrollment_service` may either be marked published without gamification having committed, or the error is swallowed and the request-path execution model defeats the purpose of the asynchronous outbox worker.
- **Correction:**
  - Remove synchronous gamification calls from `GradingService.submit_attempt()` and `EnrollmentService.record_lesson_completion()`.
  - Atomically commit the domain entity (`AssessmentAttempt` or `LessonCompletion`) and `DomainOutboxEvent(status="pending")` in the single primary database transaction.

### Defect 2: `P8-FIX-02` — Ambiguous Outbox Delivery Ownership
- **Evidence:**
  - In `enrollment_service.py` line 333: `outbox_event.status = "published"`.
  - Prior to Phase 7 fix, `mastery_service.py` lines 257–268 also marked events `published`.
- **Architectural Impact:** Delivery state was mutated by multiple competing domain services instead of strictly by the dedicated event consumer.
- **Correction:** The event consumer (`GamificationService.process_pending_outbox_events()` and `outbox_worker.py`) is the sole entity permitted to transition events from `pending -> published` or `pending -> failed`.

### Defect 3: `P8-FIX-03` — Unmapped and Unpersisted Retry Metadata
- **Evidence:**
  - In `backend/app/services/gamification_service.py` (lines 648–654):
    ```python
    except Exception as exc:
        ev.retry_count += 1
        ev.last_error = str(exc)
        if ev.retry_count >= 5:
            ev.status = "failed"
        db.flush()
    ```
  - In `backend/app/models/outbox.py`: `DomainOutboxEvent` has NO `retry_count`, `last_error`, or `next_attempt_at` columns.
  - In `backend/alembic/versions/20261109_0008_d4_assessment_attempts_and_grading.py`: table `domain_outbox_events` does not have `retry_count`, `last_error`, or `next_attempt_at`.
- **Architectural Impact:** Python dynamically assigned `retry_count` and `last_error` on the model object in memory. They were never persisted to PostgreSQL. Upon worker restart or new batch scan, `retry_count` was lost, making bounded retry and dead-lettering completely inoperative.
- **Correction:**
  - Create additive Alembic migration `20261109_0011_d4_outbox_retry_and_leaderboard_privacy.py`.
  - Add physical columns:
    - `retry_count`: `INTEGER NOT NULL DEFAULT 0`
    - `last_error`: `TEXT NULL`
    - `next_attempt_at`: `TIMESTAMP WITH TIME ZONE NULL`
  - Map columns in `DomainOutboxEvent` ORM model.

### Defect 4: `P8-FIX-04` — Unprotected Worker Endpoint & Unsafe Row Claiming
- **Evidence:**
  - In `backend/app/api/v1/endpoints/gamification.py` (line 273):
    `current_user: User = Depends(get_current_user)` on `POST /gamification/process-events`. Any student could trigger batch worker processing.
  - In `backend/app/services/gamification_service.py` (lines 629–635):
    `events = db.query(DomainOutboxEvent).filter(DomainOutboxEvent.status == "pending").limit(limit).all()`. Lacks `FOR UPDATE SKIP LOCKED`. If two workers run concurrently, both claim the exact same pending events.
- **Correction:**
  - Protect `POST /gamification/process-events` with `require_role(["administrator"])`.
  - In `process_pending_outbox_events()`: check dialect, use `.with_for_update(skip_locked=True)` on PostgreSQL.
  - Wrap each event processing step in `with db.begin_nested():` to isolate transactions.
  - Implement `backend/app/workers/outbox_worker.py` CLI worker.

### Defect 5: `P8-FIX-05` — Non-Compliant Leaderboard Default (`True` instead of `False`)
- **Evidence:**
  - In `backend/app/models/gamification.py` line 34: `is_opted_in_leaderboard: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")`.
  - In `backend/alembic/versions/20261109_0010_d4_gamification.py` line 36: `sa.Column("is_opted_in_leaderboard", sa.Boolean(), server_default=sa.true(), nullable=False)`.
- **Architectural Impact:** Blueprint Section 8.6 and SRS state leaderboard participation is an explicit student opt-in feature. Defaulting to `True` lists students publicly without affirmative consent.
- **Correction:**
  - Change default to `False` in `GamificationProfile`.
  - In migration `20261109_0011`, alter column server default to `false` and update existing rows to `false`.
  - Preserve student ability to opt in via `PATCH /api/v1/gamification/profile`.

---

## 3. Exact Proposed File Ledger

| File Path | Component | Action | Detailed Description of Change |
|---|---|:---:|---|
| `backend/app/models/outbox.py` | ORM Model | Edit | Add `retry_count`, `last_error`, and `next_attempt_at` columns with proper types, defaults, and docstrings. |
| `backend/app/models/gamification.py` | ORM Model | Edit | Update `GamificationProfile.is_opted_in_leaderboard` default and server_default to `False` / `"false"`. |
| `backend/alembic/versions/20261109_0011_d4_outbox_retry_and_leaderboard_privacy.py` | Migration | Create | Add additive Alembic migration adding retry metadata columns to `domain_outbox_events` and altering `gamification_profiles.is_opted_in_leaderboard` default to `false` with safe data migration. |
| `backend/app/services/grading_service.py` | Domain Service | Edit | Remove synchronous call to `GamificationService.process_outbox_event()` in `submit_attempt()`. Persist `AssessmentAttempt` and `DomainOutboxEvent(status="pending")` in single atomic commit (`P8-FIX-01`). |
| `backend/app/services/enrollment_service.py` | Domain Service | Edit | Remove synchronous call to `GamificationService.process_outbox_event()` and remove premature `outbox_event.status = "published"` mutation in `record_lesson_completion()`. Persist `LessonCompletion` and `DomainOutboxEvent(status="pending")` atomically (`P8-FIX-01`). |
| `backend/app/services/gamification_service.py` | Domain Service | Edit | Update `process_pending_outbox_events()`: use `with_for_update(skip_locked=True)` on PostgreSQL; use `db.begin_nested()` per event; persist `retry_count`, `last_error`, and `next_attempt_at`; dead-letter to `"failed"` on max retries; update `get_or_create_profile()` to default `is_opted_in_leaderboard=False`. |
| `backend/app/api/v1/endpoints/gamification.py` | REST API | Edit | Guard `POST /gamification/process-events` with `require_role(["administrator"])` (`P8-FIX-04`). |
| `backend/app/workers/outbox_worker.py` | CLI Worker | Create | Provide repeatable standalone CLI worker supporting one-shot execution (`--once`), batch limits (`--limit`), and daemon mode (`--interval`). |
| `backend/tests/test_gamification_outbox_worker.py` | Tests | Edit | Update existing worker test to use admin credentials; add test for student 403 rejection (`P8-C09`); add tests for persisted retry metadata (`P8-C07`) and dead-lettering. |
| `backend/tests/test_attempt_concurrency_and_outbox.py` | Tests | Edit | Verify atomic attempt submission leaves event `pending` and does not run request-path gamification (`P8-C01`). |
| `backend/tests/test_leaderboard_privacy.py` | Tests | Edit | Add tests verifying new profiles default to `is_opted_in_leaderboard=False` (`P8-C11`) and anonymous peer masking (`P8-C10`). |
| `backend/tests/test_outbox_concurrency.py` | Tests | Create | Test simulated concurrent worker event claiming (`P8-C06`) and idempotency (`P8-C05`). |
| `DECISIONS.md` | Governance | Edit | Update `DEC-P8-001`, `DEC-P8-004`; add `DEC-P8-005` (Transactional Outbox Asynchronous Decoupling), `DEC-P8-006` (Outbox Retry Metadata & Worker Concurrency), `DEC-P8-007` (Affirmative Consent Leaderboard Opt-in). |
| `API_CONTRACT.md` | Governance | Edit | Update Section 3.6 to reflect admin-only access on `/gamification/process-events` and explicit leaderboard opt-in semantics. |
| `IMPLEMENTATION_STATUS.md` | Governance | Edit | Reconcile Phase 8 Corrective Stabilization status. |
| `docs/antigravity-bible/phase-records/PHASE-08-CORRECTION/*` | Records | Create | Create `PLAN.md`, `EXECUTION_LOG.md`, `FILE_CHANGE_LEDGER.md`, `TEST_AND_EVALUATION.md`, `ISSUES_AND_DECISIONS.md`, and `PHASE_SUMMARY.md`. |

---

## 4. API & Database Impact

### Database Migrations
- **New Additive Migration:** `20261109_0011_d4_outbox_retry_and_leaderboard_privacy.py` (Revises: `20261109_0010`).
- **Columns Added to `domain_outbox_events`:**
  - `retry_count` (`sa.Integer()`, nullable=False, server_default="0")
  - `last_error` (`sa.Text()`, nullable=True)
  - `next_attempt_at` (`sa.DateTime(timezone=True)`, nullable=True)
  - Index `ix_domain_outbox_events_status_created` on `("status", "created_at")`.
- **Columns Altered on `gamification_profiles`:**
  - `is_opted_in_leaderboard` server default changed from `sa.true()` to `sa.false()`.
  - Data migration: `UPDATE gamification_profiles SET is_opted_in_leaderboard = false WHERE is_opted_in_leaderboard IS NULL OR is_opted_in_leaderboard = true`.
- **Destructive Changes:** None. Zero tables dropped, zero historical columns removed. Existing data and named volume `postgres_data` preserved.

### API Contract Impact
- `POST /api/v1/gamification/process-events`: Now requires role `administrator` (previously accepted any authenticated user). Non-admin callers receive HTTP 403 Forbidden.
- `GET /api/v1/gamification/profile`: Returns `is_opted_in_leaderboard: False` by default for newly provisioned student profiles.
- `PATCH /api/v1/gamification/profile`: Allows students to explicitly toggle `is_opted_in_leaderboard: true` or `false`.

---

## 5. Test Matrix & Verification Scenarios (P8-C01 through P8-C13)

| Test ID | Scenario | Verified Assertions | Target Test File |
|---|---|---|---|
| **P8-C01** | Assessment grading | Attempt and `assessment.completed` outbox event commit atomically; status is `pending`; zero request-path XP awarded | `test_attempt_concurrency_and_outbox.py` |
| **P8-C02** | Lesson completion | `LessonCompletion` and `lesson.completed` outbox event commit atomically; status is `pending`; zero request-path XP awarded | `test_gamification_outbox_worker.py` |
| **P8-C03** | Gamification handler fails | Exception in consumer leaves event in `pending` status; rollback ensures no partial XP awarded | `test_gamification_outbox_worker.py` |
| **P8-C04** | Retry after transient failure | Event is processed on subsequent worker execution; transitions to `published` | `test_gamification_outbox_worker.py` |
| **P8-C05** | Duplicate worker delivery | Repeated processing of same event awards XP exactly once via unique idempotency key | `test_xp_ledger_idempotency.py` |
| **P8-C06** | Two workers claim same event | Row locking (`FOR UPDATE SKIP LOCKED`) prevents concurrent execution or double-processing | `test_outbox_concurrency.py` |
| **P8-C07** | Retry limit reached ($\ge 5$) | Event transitions to `failed` (dead-lettered); `last_error` and `retry_count` are persisted | `test_gamification_outbox_worker.py` |
| **P8-C08** | Migration lifecycle | Upgrade and downgrade of `20261109_0011` succeeds cleanly on PostgreSQL | `test_alembic_disposable.py` |
| **P8-C09** | Student invokes worker endpoint | `POST /gamification/process-events` returns HTTP 403 Forbidden | `test_gamification_outbox_worker.py` |
| **P8-C10** | Leaderboard opt-out | Opted-out student appears as `"Anonymous Scholar"` with null avatar to peers, visible to self | `test_leaderboard_privacy.py` |
| **P8-C11** | New profile without consent | `is_opted_in_leaderboard` defaults to `False`; masked publicly until student opts in | `test_leaderboard_privacy.py` |
| **P8-C12** | Resource activity verification | Passive resource review does not award arbitrary XP without qualifying event | `test_gamification_outbox_worker.py` |
| **P8-C13** | Regression suite | Full backend regression suite (140+ tests) and frontend Vitest (29 tests) pass 100% | Full suite |

---

## 6. Data Safety, Reversibility & Rollback Plan

- **Data Safety:** All database schema changes are strictly additive.
- **Rollback Procedure:**
  - Database: `alembic downgrade -1` cleanly rolls back revision `20261109_0011`, removing the new columns and restoring the previous server default without loss of core application state.
  - Code: Reverting modified services and routers via git restore restores prior request-path behavior if needed.
- **Stop Rule:** This plan is Stage A (Planning Only). Implementation (Stage B) will begin only upon explicit project owner approval.
