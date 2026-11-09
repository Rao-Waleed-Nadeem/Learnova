# Phase 7 Correction Issues and Decisions

**Phase:** Phase 7 Corrective Stabilization (`PHASE-07-CORRECTION`)  
**Date:** 2026-11-09  

---

## 1. Resolved Defects

### P7-FIX-01: Outbox Event Ownership Decoupling
- **Issue:** `MasteryService.recalculate_from_attempt()` was querying `domain_outbox_events` and setting `status = "published"` upon mastery recalculation. If downstream gamification failed, the event was excluded from retry loops.
- **Resolution:** Removed the outbox mutation block from `MasteryService.recalculate_from_attempt()`. Outbox delivery state transitions belong exclusively to the gamification consumer in Phase 8.

### P7-FIX-02: Configured Topic Mastery Threshold Enforcement
- **Issue:** Prerequisite satisfaction logic in `get_topic_readiness()` permitted `is_sat = cur_mastery >= req_mastery or cur_status in ("competent", "mastered")`. Because `Topic.mastery_threshold` defaults to `0.7500` in the database while `competent` starts at `0.7000`, students with a score of 0.70 bypassed higher configured thresholds (0.75).
- **Resolution:** Removed the status string bypass: `is_sat = cur_mastery >= req_mastery`. The configured threshold (`0.7500` default) is strictly honored.

### P7-FIX-03: Multi-Topic Assessment Attribution
- **Issue:** For assessments where `Assessment.topic_id` was `None`, the service fell back to the first question's topic or the first topic in the course, attributing multi-topic exams wholesale to a single topic.
- **Resolution:** Implemented question-level response grouping by `topic_id` (sourced from immutable snapshot with database fallback). Mastery is recalculated and recorded per topic independently. If no question maps to a valid topic, a controlled diagnostic warning is logged and HTTP 400 is returned, leaving mastery unchanged.

### P7-FIX-04: Algorithm Approval Status Documentation
- **Issue:** BKT parameters and the 60/40 hybrid formula were previously classified as fully approved without university faculty sign-off evidence.
- **Resolution:** Kept the exact numerical parameters locked in code to prevent regressions, but formally classified `DEC-P7-001` as `IMPLEMENTED (PROVISIONAL PENDING FORMAL ACADEMIC SIGN-OFF)` in `DECISIONS.md`.

### P7-FIX-05: Readiness Authorization and Course Boundaries
- **Issue:** `GET /api/v1/topics/{id}/readiness` lacked teacher course assignment checks and defaulted `student_id` to the teacher's UUID.
- **Resolution:** Added teacher assignment verification against `CourseTeacher` and accepted an optional `student_id` query parameter for teachers and administrators. Added cross-course prerequisite validation in `MasteryService.get_topic_readiness()`.

---

## 2. Open Decisions (P7-OPEN-01) Recorded in Governance

### DEC-P7-007: Course Completion Criteria
- **Description:** Whether course completion requires passing a final comprehensive exam with $\ge 70\%$ in addition to topic-level mastery.
- **Current Baseline:** Existing hybrid check in `learning_path_service.py` preserved until formal owner/academic sign-off.

### DEC-P7-008: Remediation Loop Termination Criteria
- **Description:** Whether adaptive practice remediation loops should be capped at $N$ consecutive attempts before escalating to instructor intervention.
- **Current Baseline:** Unbounded adaptive practice preserved during stabilization to prevent premature behavioral regressions.
