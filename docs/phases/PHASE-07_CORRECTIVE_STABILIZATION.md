# Phase 7 — Corrective Stabilization: Mastery, Readiness and Attribution

**Type:** Narrow corrective phase; not a replacement implementation  
**Baseline:** `3b3a6d52775ac972026a5f22dd1353e51a0d4783`  
**Depends on:** Existing Phases 1–6 and the current Phase 7 implementation

## 1. Objective

Retain the current `MasteryService`, `LearningPathService`, `StudentTopicMastery`, `MasteryAuditLedger`, endpoint and migration structure. Correct only the identified cross-phase defects and unresolved policy documentation.

## 2. Verified implementation to preserve

- BKT sequence and current hybrid score implementation in `backend/app/services/mastery_service.py`.
- Persisted mastery in `student_topic_mastery` and audit history in `mastery_audit_ledger`.
- Existing learning-path planner and DAG ordering.
- Current endpoint family under `/api/v1/courses`, `/api/v1/topics`, and `/api/v1/mastery`.
- Existing test fixtures and PostgreSQL schema unless a narrow additive migration is justified.

Do not replace BKT with Elo, introduce a new mastery subsystem, or redesign the learning path.

## 3. Corrections required

### P7-FIX-01 — Outbox ownership

Current behavior: `MasteryService.recalculate_from_attempt()` finds `assessment.completed` and changes its status from `pending` to `published`.

Required behavior:
- Mastery recalculation may update mastery and its audit ledger.
- It must not mark the gamification outbox event published.
- Outbox delivery status belongs to the consumer that processes the event for gamification.
- Keep the event pending until the Phase 8 consumer has successfully committed its work.

This is a narrow ownership correction. Do not create a second outbox or new broker.

### P7-FIX-02 — Honor the configured topic threshold

The Phase 2 model uses a normalized topic threshold and currently defaults to `0.7500`. Phase 7 reports/tests often use `0.7000`.

Required behavior:
- Read `Topic.mastery_threshold` for the prerequisite.
- `is_satisfied` must be based on `current_mastery >= required_mastery`.
- A `competent` status label must not override a configured threshold that is higher than the current score.
- Preserve per-topic configuration and current database defaults. Do not globally change 0.75 to 0.70 without an approved decision and migration plan.
- Update tests to cover at least a 0.75 configured threshold with a 0.70 score and `competent` status; it must remain unmet.

### P7-FIX-03 — Correct topic attribution

Current fallback behavior can assign an assessment's full score to one question topic or the first topic in the course when `Assessment.topic_id` is null.

Required behavior:
1. If `Assessment.topic_id` is set, it is authoritative.
2. Otherwise, inspect the persisted attempt snapshot/response question metadata and group graded responses by their actual `topic_id`.
3. Calculate each topic's score ratio and BKT observations from only that topic's responses.
4. Record one mastery update per affected topic, with idempotency scoped to `(student_id, topic_id, attempt_id)`.
5. Do not use a first-question or first-course-topic fallback.
6. If no reliable topic mapping exists, leave mastery unchanged and return/log a controlled diagnostic; do not invent attribution.

Preserve historical attempt meaning. If question topic metadata can change after attempt creation, add topic identity to the attempt snapshot through a narrow backward-compatible change and test old snapshots.

### P7-FIX-04 — Algorithm approval status

The Master Backend Blueprint identifies mastery algorithm selection as a decision requiring academic approval. The current implementation uses:
- `P(L0)=0.10`
- `P(T)=0.20`
- `P(G)=0.20`
- `P(S)=0.10`
- Hybrid score: 60% assessment score ratio + 40% final BKT probability.

Do not alter these numbers in this corrective phase. Inspect the approval trail. If no explicit academic approval exists:
- Keep the current algorithm running to avoid changing student outcomes.
- Mark the policy as **implemented, approval evidence outstanding/provisional** in `DECISIONS.md`.
- Record the owner/academic approval as a follow-up decision before tuning or replacing the formula.
- Keep algorithm name/version in the audit ledger.

### P7-FIX-05 — Readiness authorization and course boundaries

Verify that:
- A student must be enrolled in the course to inspect private readiness/mastery data.
- A topic and all prerequisite topics belong to the same course.
- Teachers are scoped to assigned courses; admin access follows existing RBAC.
- Readiness cannot leak another student's mastery.

### P7-OPEN-01 — Course completion and remediation termination

The Blueprint still identifies course completion criteria and remediation-loop termination as decisions. The current learning path has `course_completed` and repeats `adaptive_practice` while mastery is developing.

Do not redesign this behavior now. Document the current behavior and leave explicit decisions for:
- Whether final exam pass plus topic criteria is sufficient for course completion.
- Whether remediation needs a maximum attempt/cycle count or teacher escalation.

## 4. Likely file scope — verify before editing

```text
backend/app/services/mastery_service.py
backend/app/services/learning_path_service.py
backend/app/schemas/mastery.py                 # only if response needs per-topic detail
backend/app/models/attempt.py                  # only if immutable topic metadata is missing
backend/app/services/attempt_service.py        # only if snapshot metadata is missing
backend/tests/test_mastery_bkt.py
backend/tests/test_topic_readiness.py
backend/tests/test_mastery_outbox_integration.py
backend/tests/test_learning_path_planner.py
DECISIONS.md
API_CONTRACT.md
IMPLEMENTATION_STATUS.md
docs/antigravity-bible/phase-records/PHASE-07-CORRECTION/*
```

Do not add new domain tables unless the inspection proves a required field cannot be represented safely in the existing schema.

## 5. Required tests

| ID | Scenario | Expected result |
|---|---|---|
| P7-C01 | Interim response | No persisted mastery mutation |
| P7-C02 | Aborted/invalid attempt | No mastery mutation |
| P7-C03 | Completed attempt | Correct mastery update |
| P7-C04 | Recalculate same attempt twice | No score drift or duplicate ledger row |
| P7-C05 | Mastery recalculation with pending outbox event | Event remains pending |
| P7-C06 | Topic threshold 0.75, mastery 0.70, status competent | Readiness remains false |
| P7-C07 | Topic threshold 0.70, mastery 0.70 | Readiness true |
| P7-C08 | Assessment with explicit topic_id | Score attributed to that topic |
| P7-C09 | Assessment without topic_id, questions across two topics | Each topic gets only its own responses |
| P7-C10 | Assessment without reliable topic metadata | No fabricated first-topic update |
| P7-C11 | Unenrolled student | Access denied |
| P7-C12 | Teacher outside assignment | Access denied |

Also run existing mastery, readiness, learning-path, attempt, and full backend regression tests.

## 6. Acceptance criteria

- Existing Phase 7 APIs and response contracts remain compatible.
- Outbox state is no longer mutated by MasteryService.
- Configured threshold is honored exactly.
- Multi-topic results are not misattributed.
- Algorithm changes are not made without approval.
- Course-completion/remediation ambiguities are recorded, not silently decided.
- All tests are actual executed results.
- Complete Git diff reconciles with the correction ledger.
- Original Phase 7 records remain unchanged; corrective records are appended.

## 7. Execution protocol

**Stage A — Plan only:** inspect actual source and migrations, prove the defects, list exact files and test plan. Stop for approval.

**Stage B — Implement after approval:** make the narrow corrections only.

**Stage C — Verify:** run focused and regression tests, inspect migration status and full diff, update control docs, create `PHASE-07-CORRECTION` records, and stop.

Do not start Phase 8 automatically.
