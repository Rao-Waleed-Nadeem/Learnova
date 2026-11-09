# Phase 07 — Issues, Trade-offs, and Architectural Decisions

**Phase:** Phase 7 — Knowledge Tracing & Dynamic Mastery Engine  
**Date:** 2026-11-09  

---

## 1. Architectural Decisions

### `DEC-P7-001`: Hybrid BKT & Assessment-Weighted Mastery Formula
- **Context:** Classical BKT tracks the latent probabilistic state of a student's skill across sequential item attempts ($P(L)$), but students also expect their intuitive percentage score on a test to directly reflect in their topic grade.
- **Decision:** Implemented Corbett & Anderson (1995) formulation ($P(L_0)=0.10, P(T)=0.20, P(G)=0.20, P(S)=0.10$) and combined it with the empirical assessment score ratio:
  $$\text{MasteryScore} = 0.60 \times (\text{Score Ratio}) + 0.40 \times P(L_{\text{final}})$$
- **Consequence:** Mathematically deterministic, robust against guessing/slipping, and aligns directly with student expectations.

### `DEC-P7-002`: Topic Readiness Prerequisite Evaluation Policy & Diagnostic Bypass
- **Context:** In `SSD-02`, access to advanced curriculum topics must be controlled by prerequisite compliance.
- **Decision:** Readiness is evaluated by traversing direct prerequisite edges in `TopicPrerequisite`. A prerequisite is satisfied if the student's mastery in that prerequisite topic is $\ge \text{mastery\_threshold}$ (default `0.7000` / `70%`). When unmet prerequisites exist, the system links a diagnostic assessment to allow the student to test out of prerequisites.
- **Consequence:** Preserves pedagogical rigor while preventing rigid linear curriculum locking.

### `DEC-P7-003`: Personalized Learning Path Planner & Remediation Loop Architecture
- **Context:** `SSD-03` requires generating a dynamic, ordered learning path for each student.
- **Decision:** Topologically sorts syllabus topics using Kahn's algorithm. Inspects completed lessons, prerequisite readiness, and topic mastery:
  - Accessible topic with uncompleted lessons $\to$ recommends next sequential lesson.
  - Accessible topic with all lessons completed but developing mastery ($< 70\%$) $\to$ triggers **Remediation Loop** recommending `adaptive_practice`.
  - Accessible topic with mastered status ($\ge 85\%$) $\to$ **Accelerates** to next syllabus node.
  - All syllabus topics satisfied $\to$ recommends `final_exam`, and upon passing, `course_completed`.
- **Consequence:** Fully satisfies the Larman Activity Diagram and Swimlane workflow specifications.

### `DEC-P7-004`: Outbox Consumer / Dual Execution Assessment-to-Mastery Pipeline
- **Context:** In Phase 6, `submit_attempt` inserts a transactional outbox event `assessment.completed`. In Phase 7, topic mastery must be updated from this completed assessment attempt.
- **Decision:** Submitting an assessment synchronously triggers `MasteryService.recalculate_from_attempt()` and marks the outbox event as `published`. In addition, dedicated endpoint `POST /api/v1/mastery/recalculate/{attempt_id}` provides idempotent re-triggering.
- **Consequence:** Provides instantaneous UI updates on submission while retaining durable outbox records for Phase 8 gamification consumption.

---

## 2. Issues Encountered & Resolved

### Issue 1: Audit Service Import Path & Signature
- **Problem:** `from app.core.audit import log_audit_event` raised `ModuleNotFoundError: No module named 'app.core.audit'`.
- **Root Cause:** In the codebase, audit service is located in `app.services.audit_service`.
- **Fix:** Updated import to `from app.services.audit_service import log_audit_event` and passed `outcome="success"`, `target_type="topic_mastery"`, `target_id=str(topic_id)`.

### Issue 2: Foreign Key and Column Mismatches in Test Fixtures
- **Problem:** SQLite tests raised `IntegrityError: NOT NULL constraint failed: users.full_name`, `TypeError: 'slug' is an invalid keyword argument for Course`, and `NOT NULL constraint failed: lesson_completions.enrollment_id`.
- **Root Cause:** Fixture construction omitted non-nullable columns required by earlier migration constraints.
- **Fix:** Provided `full_name` on `User`, `creator_id` on `Course`, and `enrollment_id` & `topic_id` on `LessonCompletion`.

### Issue 3: Recalculation Idempotency Compounding
- **Problem:** Repeated calls to `POST /mastery/recalculate/{id}` on the same attempt increased mastery from 0.9352 to 0.9868 because the previous BKT posterior was re-used as the prior for the second calculation.
- **Root Cause:** Idempotency requires that re-evaluating the exact same attempt returns the already computed mastery without compounding.
- **Fix:** Added check in `MasteryService.recalculate_from_attempt`: if `existing_mastery and existing_mastery.last_attempt_id == attempt.id`, returns the existing calculated mastery immediately.
