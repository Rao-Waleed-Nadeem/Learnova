# Phase 06 Summary — Assessment Attempt Lifecycle & Server-Authoritative Grading

**Phase:** Phase 6 — Assessment Attempts & Server-Authoritative Grading  
**Status:** **COMPLETED, FULLY TESTED & VERIFIED**  
**Date:** 2026-11-09  

---

## 1. Executive Summary

Phase 6 successfully delivers the student assessment attempt lifecycle, secure snapshotting, server-authoritative time-limit enforcement, and deterministic grading engine in FastAPI and SQLAlchemy. 

All student scoring is strictly server-authoritative: client requests can never inject or forge scores, percentages, correctness, or attempt states. All five required question formats (`multiple_choice`, `true_false`, `fill_blank`, `matching`, and `short_answer`) are evaluated securely using server answer keys, with zero answer leakage to the browser.

Assessment completion automatically triggers transactional outbox event emission (`assessment.completed`), decoupling grading from downstream Phase 7 (Mastery Calculation) and Phase 8 (Gamification Ledger).

---

## 2. Key Accomplishments

1. **Alembic Migration 8 (`20261109_0008`):**
   - Created `assessment_attempts` with check constraints for valid status transitions, positive scores, and deadline consistency (`ck_assessment_attempts_deadline_valid`).
   - Created `attempt_responses` with unique constraint `(attempt_id, question_id)` ensuring idempotent interim response upserts.
   - Created `domain_outbox_events` with unique idempotency keys for transactional outbox event emission.
   - Verified clean upgrade and downgrade (`-1`) on disposable database.

2. **Server-Authoritative Attempt Lifecycle (`AttemptService`):**
   - Verified student active enrollment in the parent course prior to starting an attempt.
   - Blocked attempts on unpublished or draft assessments.
   - Enforced assessment `max_attempts` boundaries.
   - Implemented immutable question and scoring snapshotting (`DEC-P6-001`).
   - Enforced server UTC deadlines and auto-submit on expiry (`DEC-07`, `DEC-P6-002`).
   - Provided session-local adaptive practice question selection without persisting premature mastery (`DEC-03`).

3. **Deterministic Grading Engine (`GradingService`):**
   - Multiple Choice: Evaluates exact selection against `correct_option_ids`.
   - True/False: Evaluates boolean response against `correct_bool`.
   - Fill-in-the-Blank: Trims and normalizes strings against `accepted_answers` (case sensitivity option honored).
   - Matching: Computes proportional credit based on fraction of correct left-right pairs.
   - Short Answer: Deterministic scoring for `exact_match` mode; transitions to `pending_manual_review` for `manual_review` mode per `DEC-06` without speculative scoring.
   - Idempotent submission: Re-submitting an already graded attempt returns cached results without duplicate processing (`DEC-P6-004`).

4. **Transactional Outbox Event Emission (`DEC-P6-003`):**
   - Atomic recording of `assessment.completed` event in `domain_outbox_events` with payload containing attempt ID, user ID, assessment ID, score, max score, percentage, and passed flag.

5. **Testing & Quality Assurance:**
   - 14 targeted Phase 6 automated tests in Pytest: 100% pass rate.
   - Full regression suite: 102 passed, 1 skipped (disposable postgres container test), 0 failed.
   - Frontend test suite: 29 passed, 0 failed.
   - Frontend Vite build: Clean build, 0 errors.

---

## 3. Workflows Enabled

| Workflow | Endpoints Used | Status |
|:---|:---|:---:|
| `SSD-02` (Prerequisite Diagnostic) | `POST /api/v1/assessments/{id}/attempts`, `PUT /api/v1/attempts/{id}/responses/{qid}`, `POST /api/v1/attempts/{id}/submit` | **ENABLED** |
| `SSD-04` (Adaptive Practice) | `POST /api/v1/attempts/{id}/next-question`, `PUT /api/v1/attempts/{id}/responses/{qid}`, `POST /api/v1/attempts/{id}/submit` | **ENABLED** |
| `SSD-06` (Summative Final Exams) | `POST /api/v1/assessments/{id}/attempts` (timed), `PUT /api/v1/attempts/{id}/responses/{qid}`, `POST /api/v1/attempts/{id}/submit`, `GET /api/v1/attempts/{id}/result` | **ENABLED** |

---

## 4. Next Phase Gate: Phase 7

With Phase 6 completed and verified, Learnova is ready for **Phase 7: Knowledge Tracing & Dynamic Mastery Engine**, which will:
- Process `assessment.completed` events from `domain_outbox_events`.
- Implement Bayesian Knowledge Tracing (BKT) and Elo skill rating calculations.
- Maintain durable topic mastery states across enrolled courses.
