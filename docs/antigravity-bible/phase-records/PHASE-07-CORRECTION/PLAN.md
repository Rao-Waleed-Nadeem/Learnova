# Phase 7 Correction Plan — Mastery, Readiness and Attribution Stabilization

**Phase:** Phase 7 Corrective Stabilization  
**Stage:** Stages A, B, and C Completed (Planning, Implementation, Verification & Evidence Recorded)  
**Governing Standard:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md`; `README_FIRST.md`; `REPO_INTEGRATION_NOTES.md`; `docs/phases/PHASE-07_CORRECTIVE_STABILIZATION.md`; `Learnova_Master_Backend_Implementation_Blueprint.md` Sections 3.2, 5.5, 7.3, 8.4; `Learnova_SRS_Final_Aligned_V2 (1).docx` Section 3.2.6; `Learnova_Final_SSDs_V2.xml` (SSD-02, SSD-03, SSD-04).  
**Baseline Commit:** `3b3a6d52775ac972026a5f22dd1353e51a0d4783`  
**Date:** 2026-11-09  
**Status:** **COMPLETED & VERIFIED — SUBMITTED FOR PROJECT OWNER ACCEPTANCE (SEQUENCE B)**

---

## 1. Executive Summary & Objective

This plan defines the narrow corrective stabilization of Phase 7 (Knowledge Tracing & Dynamic Mastery Engine) required by `UNIVERSAL_ANTIGRAVITY_PROMPT.md` and `docs/phases/PHASE-07_CORRECTIVE_STABILIZATION.md`.

The existing implementation architecture is preserved:
- FastAPI modular monolith (`/api/v1`).
- Corbett & Anderson (1995) Bayesian Knowledge Tracing (BKT) engine and 60/40 hybrid formula.
- Physical PostgreSQL tables `student_topic_mastery` and `mastery_audit_ledger` (Migration 9).
- Kahn's topological sort dynamic learning path generator.

Phase 7 Corrective Stabilization addresses five verified defects without architectural churn:
1. **P7-FIX-01 (Outbox Ownership Correction):** Remove mutation of `domain_outbox_events.status` from `MasteryService.recalculate_from_attempt()`. Outbox delivery status belongs strictly to the gamification consumer in Phase 8.
2. **P7-FIX-02 (Honor Configured Topic Thresholds):** Eliminate the `status in ('competent', 'mastered')` loophole in `get_topic_readiness()`. Prerequisites are satisfied strictly when `current_mastery >= required_mastery` (`Topic.mastery_threshold`), honoring the Phase 2 default `0.7500` without silent threshold bypass.
3. **P7-FIX-03 (Accurate Multi-Topic Attribution):** When an assessment has no explicit `topic_id`, eliminate the arbitrary first-question or first-course-topic fallback. Group graded responses by their own question's `topic_id`, and update mastery independently per affected topic. If no reliable topic metadata exists, leave mastery unchanged and return a controlled diagnostic.
4. **P7-FIX-04 (Algorithm Approval Status Documentation):** Formally document the BKT parameters ($P(L_0)=0.10, P(T)=0.20, P(G)=0.20, P(S)=0.10$) and 60/40 hybrid formula as *implemented (provisional pending formal academic sign-off)* in `DECISIONS.md`.
5. **P7-FIX-05 (Readiness Scoping & Teacher Authorization):** Enforce course-assignment authorization for teachers accessing topic readiness, enforce student enrollment boundaries, and verify that prerequisite topics belong to the same course graph.
6. **P7-OPEN-01 (Policy Documentation):** Document course completion criteria and remediation loop termination as explicit decision records.

---

## 2. Defect Analysis with Direct Code Evidence

### Defect 1: `P7-FIX-01` — Outbox Delivery Ownership Hijacking
- **Evidence:** In `backend/app/services/mastery_service.py` (lines 257–268):
  ```python
  outbox_event = (
      db.query(DomainOutboxEvent)
      .filter(
          DomainOutboxEvent.event_type == "assessment.completed",
          DomainOutboxEvent.aggregate_id == str(attempt.id),
      )
      .first()
  )
  if outbox_event and outbox_event.status == "pending":
      outbox_event.status = "published"
      outbox_event.published_at = datetime.now(timezone.utc)
  ```
- **Architectural Impact:** Mastery service marks the outbox event `published` prematurely. When `GradingService` subsequently passes the event to `GamificationService`, if gamification fails or throws an exception, the event has already been marked `published`. The worker dispatcher (`process_pending_outbox_events()`) only selects `pending` events, permanently stranding the event from retry.
- **Correction:** Delete lines 257–268 from `MasteryService.recalculate_from_attempt()`. Mastery recalculation updates mastery and the audit ledger only.

### Defect 2: `P7-FIX-02` — Topic Threshold Bypass via Status Label
- **Evidence:** In `backend/app/services/mastery_service.py` (line 464):
  ```python
  req_mastery = float(p_topic.mastery_threshold) if p_topic else 0.7000
  ...
  is_sat = cur_mastery >= req_mastery or cur_status in ("competent", "mastered")
  ```
- **Architectural Impact:** In `20261108_0003_d2_topics_and_prerequisites.py`, `mastery_threshold` defaults to `0.7500`. A student with score `0.7000` receives status `competent` ($\ge 0.70$). Because `cur_status in ("competent", "mastered")` is `True`, the topic is unlocked as `is_ready = True` even though `0.7000 < 0.7500`, bypassing the higher configured threshold.
- **Correction:** Enforce `is_sat = cur_mastery >= req_mastery`. A categorical label must never override a higher configured numerical threshold.

### Defect 3: `P7-FIX-03` — Mixed-Topic Assessment Attribution Fallback
- **Evidence:** In `backend/app/services/mastery_service.py` (lines 147–163):
  ```python
  topic_id = assessment.topic_id
  if not topic_id:
      first_resp = db.query(AttemptResponse).filter(AttemptResponse.attempt_id == attempt.id).first()
      if first_resp and first_resp.question and first_resp.question.topic_id:
          topic_id = first_resp.question.topic_id
  if not topic_id:
      first_topic = db.query(Topic).filter(Topic.course_id == course_id).order_by(Topic.order).first()
      if first_topic:
          topic_id = first_topic.id
  ```
- **Architectural Impact:** For multi-topic assessments (e.g. final comprehensive examinations or diagnostic baseline pre-tests without a single `assessment.topic_id`), all questions across different syllabus topics are attributed entirely to the first question's topic, or to the first topic in the course syllabus. This distorts the student's mastery profile.
- **Correction:**
  1. If `assessment.topic_id` is set, attribute the whole assessment to that topic (single-topic quiz/practice).
  2. If `assessment.topic_id` is `None`, inspect snapshot/response metadata and group responses by `topic_id`.
  3. Calculate topic mastery and BKT updates independently for each distinct `topic_id` using only responses belonging to that topic.
  4. Ensure `snap_questions` in `AssessmentAttempt.snapshot_data` records `topic_id` (with fallback to `Question.topic_id` in database if missing in legacy snapshots).
  5. If no questions map to a reliable `topic_id`, do not guess or fallback to the first course topic; log a controlled warning and leave mastery unmutated.

### Defect 4: `P7-FIX-04` — Algorithm Approval Trail
- **Evidence:** In `DECISIONS.md`, `DEC-P7-001` recorded the hybrid BKT + 60/40 score formula as `APPROVED & IMPLEMENTED`, but no formal academic sign-off exists from the university faculty or curriculum committee.
- **Correction:** Maintain the exact numeric parameters ($P(L_0)=0.10, P(T)=0.20, P(G)=0.20, P(S)=0.10, 60/40$) to prevent regressions, but update `DECISIONS.md` to classify it as `IMPLEMENTED (PROVISIONAL)` pending owner/academic sign-off.

### Defect 5: `P7-FIX-05` — Readiness Authorization and Graph Boundary
- **Evidence:** In `backend/app/api/v1/endpoints/mastery.py` (lines 118–139):
  A teacher accessing `GET /api/v1/topics/{id}/readiness` is not validated for assignment to `topic.course_id`, and `student_id` defaults to the teacher's own UUID.
- **Correction:**
  1. For students: verify active enrollment in `topic.course_id` (already in place).
  2. For teachers: verify assignment in `course_teachers` for `topic.course_id`. Allow teacher to pass `student_id: Optional[UUID] = Query(None)`. If provided, evaluate readiness for that student.
  3. For admins: unrestricted read access.
  4. In `MasteryService.get_topic_readiness`: verify all prerequisite topics belong to the same course as the dependent topic.

---

## 3. Exact Proposed File Ledger

| File Path | Component | Action | Detailed Description of Change |
|---|---|---|---|
| `backend/app/services/mastery_service.py` | Domain Service | Edit | 1. Remove outbox mutation lines 257–268 (`P7-FIX-01`).<br>2. In `get_topic_readiness`, evaluate `is_sat = cur_mastery >= req_mastery` without label override (`P7-FIX-02`).<br>3. In `recalculate_from_attempt`, group responses by `topic_id` when `assessment.topic_id` is null; compute independent mastery per topic; eliminate first-topic fallback (`P7-FIX-03`).<br>4. Add course-boundary validation for prerequisite edges (`P7-FIX-05`). |
| `backend/app/services/attempt_service.py` | Domain Service | Edit | Include `"topic_id": str(q.topic_id)` in `snap_questions` inside `start_attempt()` and `get_next_adaptive_question()` for immutable question snapshot metadata. |
| `backend/app/api/v1/endpoints/mastery.py` | REST API | Edit | Update `get_topic_readiness` to authorize teachers against `course_teachers` assignment and accept optional `student_id` query parameter (`P7-FIX-05`). |
| `backend/app/schemas/mastery.py` | Schemas | Edit | Support multi-topic recalculation response (`items: List[MasteryRecalculateItem]` or backward-compatible composite). |
| `backend/tests/test_mastery_bkt.py` | Tests | Edit | Update existing BKT tests for multi-topic support and remove assumptions about outbox status mutation. |
| `backend/tests/test_topic_readiness.py` | Tests | Edit | Add tests verifying 0.75 threshold with 0.70 score remains unmet; test teacher course scoping. |
| `backend/tests/test_mastery_outbox_integration.py` | Tests | Edit | Assert `DomainOutboxEvent` remains `pending` after `MasteryService.recalculate_from_attempt()`. |
| `DECISIONS.md` | Governance | Edit | Update `DEC-P7-001` to `IMPLEMENTED (PROVISIONAL)`. Add `DEC-P7-005` (Topic Attribution in Multi-Topic Assessments), `DEC-P7-006` (Prerequisite Numeric Threshold Enforcement), `DEC-P7-007` (Course Completion Criteria Open Decision), and `DEC-P7-008` (Remediation Loop Termination Open Decision). |
| `API_CONTRACT.md` | Governance | Edit | Reconcile endpoint descriptions with multi-topic recalculation behavior and teacher scoping. |
| `IMPLEMENTATION_STATUS.md` | Governance | Edit | Note Phase 7 corrective stabilization state. |
| `docs/antigravity-bible/phase-records/PHASE-07-CORRECTION/*` | Records | Create | Create `EXECUTION_LOG.md`, `FILE_CHANGE_LEDGER.md`, `TEST_AND_EVALUATION.md`, `ISSUES_AND_DECISIONS.md`, and `PHASE_SUMMARY.md`. |

---

## 4. API & Database Impact

- **Database Migrations:** None required. `student_topic_mastery`, `mastery_audit_ledger`, and `assessment_attempts.snapshot_data` (JSONB) already have full physical capacity to store multi-topic mastery records and topic metadata.
- **Destructive Operations:** None. Zero tables dropped, zero columns altered, named volume `postgres_data` preserved.
- **API Response Compatibility:**
  - `GET /api/v1/topics/{id}/readiness`: Returns identical `TopicReadinessResponse` schema.
  - `GET /api/v1/courses/{id}/mastery`: Returns identical `CourseMasteryResponse` schema.
  - `GET /api/v1/courses/{id}/learning-path`: Returns identical `CourseLearningPathResponse` schema.
  - `POST /api/v1/mastery/recalculate/{id}`: Returns `MasteryRecalculateResponse` with backward-compatible primary topic summary plus optional `updated_topics` list.

---

## 5. Test Matrix & Verification Scenarios (P7-C01 through P7-C12)

| Test ID | Test Scenario | Verified Assertions | Target Test File |
|---|---|---|---|
| **P7-C01** | Interim question response logged | `student_topic_mastery` rows count unchanged; zero mastery mutation. | `test_mastery_bkt.py` |
| **P7-C02** | Aborted / in-progress attempt | `recalculate_from_attempt()` raises 400 Bad Request; zero mastery mutation. | `test_mastery_bkt.py` |
| **P7-C03** | Valid completed single-topic attempt | Topic mastery score and audit ledger entry updated accurately. | `test_mastery_bkt.py` |
| **P7-C04** | Idempotent recalculation on same attempt | Subsequent calls return identical mastery score; zero Bayes drift; no duplicate audit ledger rows. | `test_mastery_bkt.py` |
| **P7-C05** | Mastery recalculation with pending outbox event | `DomainOutboxEvent.status` remains strictly `"pending"`; `published_at` remains `None`. | `test_mastery_outbox_integration.py` |
| **P7-C06** | Configured topic threshold 0.75, mastery 0.70 (`competent`) | `is_ready` evaluates to `False`; prerequisite is marked unmet (`P7-FIX-02`). | `test_topic_readiness.py` |
| **P7-C07** | Configured topic threshold 0.70, mastery 0.70 | `is_ready` evaluates to `True`; unmet prerequisites list is empty. | `test_topic_readiness.py` |
| **P7-C08** | Assessment with explicit `Assessment.topic_id` | All attempt responses attributed to the explicit assessment topic. | `test_mastery_bkt.py` |
| **P7-C09** | Multi-topic assessment (`Assessment.topic_id = None`) with Qs across Topic A and Topic B | Responses for Topic A update only Topic A mastery; responses for Topic B update only Topic B mastery (`P7-FIX-03`). | `test_mastery_bkt.py` |
| **P7-C10** | Assessment with missing question topic metadata | Controlled warning logged; zero fabricated first-topic updates; mastery left unchanged. | `test_mastery_bkt.py` |
| **P7-C11** | Unenrolled student requests readiness | Returns 403 Forbidden. | `test_topic_readiness.py` |
| **P7-C12** | Unassigned teacher requests readiness | Returns 403 Forbidden. | `test_topic_readiness.py` |

---

## 6. Data Safety, Reversibility & Rollback Plan

- **Data Safety:** No changes to existing stored data rows. All edits are application logic corrections.
- **Rollback Procedure:** If defects arise during Stage B, changes in `mastery_service.py`, `attempt_service.py`, and `mastery.py` can be reverted cleanly via git checkout without schema downgrades.
- **Regression Assurance:** Prior to completion, all 133 backend tests, 29 Vitest tests, and the Vite production build will be executed and verified 100% passing.

---

## 7. Mandatory Stage A Review Stop

As mandated by `UNIVERSAL_ANTIGRAVITY_PROMPT.md` and `PHASE-07_CORRECTIVE_STABILIZATION.md`, implementation code will **NOT** be modified until the Project Owner explicitly reviews and approves this Stage A Plan.
