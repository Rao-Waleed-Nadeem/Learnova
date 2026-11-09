# Phase 7: Knowledge Tracing & Dynamic Mastery Engine Specification

**Phase:** Phase 7 — Knowledge Tracing & Dynamic Mastery Engine  
**Authority:** `Learnova_Master_Backend_Implementation_Blueprint.md` Sections 3.2, 5.5, 7.3, 8.4 & 9 (Phase 7); `Readme.md` Lines 30–48 & 1713–1731; `Learnova_Final_SSDs_V2.xml` (SSD-02, SSD-03, SSD-04); `DEC-001`, `DEC-P2-003`, `DEC-P6-003`.  
**Date:** 2026-11-09  
**Status:** **SPECIFIED (Stage A Planning)**

---

## 1. Executive Summary & Core Objectives

Phase 7 implements the authoritative, persistent Knowledge Tracing & Dynamic Mastery Engine for Learnova. It elevates topic mastery from client-side `localStorage` calculations (`calculateAcademicMastery` in `studentLogic.ts`) into a resilient, mathematically sound, server-authoritative domain service in FastAPI and PostgreSQL.

Phase 7 fulfills:
1. **SSD-02 (Topic Selection & Prerequisite Diagnostic Assessment):** Evaluates topic readiness by traversing the prerequisite DAG against persisted topic mastery states; triggers diagnostic evaluation of prerequisite skills to unlock ready topics.
2. **SSD-03 (Personalized Learning Path Generation & Resource Study):** Dynamically plans an individualized sequential learning path across curriculum topics and lessons; provides remediation loops for developing mastery and acceleration for mastered topics.
3. **SSD-04 (Formative Practice Mastery Recalibration):** Processes completed assessment attempts, executing Bayesian Knowledge Tracing (BKT) and weighted performance scoring to recalibrate topic mastery states upon full attempt submission.
4. **Outbox Event Consumption (`DEC-P6-003`):** Reliably consumes `assessment.completed` domain events, updating topic mastery states transactionally without coupling grading to gamification (Phase 8).

---

## 2. Academic Invariants & Scope Boundaries

> [!IMPORTANT]
> **Strict Phase 7 Academic Invariants:**
> 1. **Assessment-Level Mastery Boundary Invariant:** Mastery recalculation occurs **strictly upon full, valid assessment completion and submission**. Interim question responses, in-progress attempts, abandoned attempts, and expired attempts without submission NEVER update persisted mastery.
> 2. **Explicit Representation of Unassessed Topics:** No unassessed topic is silently treated as zero mastery or failure. An unassessed topic carries `status = 'not_assessed'`, `mastery_score = None` (or `0.0000` with unassessed status flag), and `attempts_count = 0`.
> 3. **Normalized Internal Representation ([`DEC-001`](file:///d:/Learnova/DECISIONS.md#dec-001)):** Stored internally in PostgreSQL as `Numeric(5, 4)` in the range `[0.0000, 1.0000]`. Exposed at API boundaries as integer percentages `0–100` alongside status labels (`not_assessed`, `developing`, `competent`, `mastered`).
> 4. **Standard Mastery Status Thresholds:**
>    - `mastered`: $\ge 0.8500$ ($\ge 85\%$)
>    - `competent`: $\ge 0.7000$ ($\ge 70\%$) — Default readiness and passing threshold
>    - `developing`: $< 0.7000$ ($< 70\%$) — Triggers remediation
>    - `not_assessed`: 0 completed attempts
> 5. **Zero Academic Gamification Coupling:** Gamification entities (XP, streaks, badges) must **never** be used as inputs to topic mastery calculations, prerequisite compliance, or topic readiness.
> 6. **Performance Target:** The recommendation / learning path generation endpoint must execute under **1,000 ms** for a full course graph.

---

## 3. Data Architecture & Alembic Migration 9

### Table: `student_topic_mastery`
Persists the student's current cognitive mastery state for every accessed topic.

```sql
CREATE TABLE student_topic_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    mastery_score NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    score_percent INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'not_assessed',
    bkt_probability NUMERIC(5, 4) NULL,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_id UUID NULL REFERENCES assessment_attempts(id) ON DELETE SET NULL,
    last_assessed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT ck_topic_mastery_score CHECK (mastery_score >= 0.0000 AND mastery_score <= 1.0000),
    CONSTRAINT ck_topic_mastery_percent CHECK (score_percent >= 0 AND score_percent <= 100),
    CONSTRAINT ck_topic_mastery_status CHECK (status IN ('not_assessed', 'developing', 'competent', 'mastered')),
    CONSTRAINT uq_student_topic_mastery UNIQUE (user_id, topic_id)
);

CREATE INDEX ix_student_topic_mastery_user_course ON student_topic_mastery (user_id, course_id);
CREATE INDEX ix_student_topic_mastery_topic ON student_topic_mastery (topic_id);
```

### Table: `mastery_audit_ledger`
Immutable chronological ledger recording every mastery adjustment event for auditability and explainable AI analytics.

```sql
CREATE TABLE mastery_audit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    previous_score NUMERIC(5, 4) NULL,
    new_score NUMERIC(5, 4) NOT NULL,
    previous_status VARCHAR(32) NULL,
    new_status VARCHAR(32) NOT NULL,
    assessment_type VARCHAR(32) NOT NULL,
    algorithm_used VARCHAR(64) NOT NULL DEFAULT 'BKT_HYBRID_V1',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT ck_ledger_scores CHECK (new_score >= 0.0000 AND new_score <= 1.0000)
);

CREATE INDEX ix_mastery_ledger_user_topic ON mastery_audit_ledger (user_id, topic_id);
```

---

## 4. Algorithmic Formulation

### 4.1 Bayesian Knowledge Tracing (BKT) Engine
Standard Corbett & Anderson (1995) formulation:
- $P(L_0) = 0.10$ (Initial prior probability of knowing the skill; $0.50$ if diagnostic was passed).
- $P(T) = 0.20$ (Probability of learning transition per opportunity).
- $P(G) = 0.20$ (Probability of lucky guess when skill is unknown).
- $P(S) = 0.10$ (Probability of slip/careless error when skill is known).

For each item observation $obs_t \in \{0, 1\}$ in an assessment attempt:
1. **Posterior Computation:**
   - If correct ($obs_t = 1$):
     $$P(L_t \mid obs_t=1) = \frac{P(L_{t-1}) \cdot (1 - P(S))}{P(L_{t-1}) \cdot (1 - P(S)) + (1 - P(L_{t-1})) \cdot P(G)}$$
   - If incorrect ($obs_t = 0$):
     $$P(L_t \mid obs_t=0) = \frac{P(L_{t-1}) \cdot P(S)}{P(L_{t-1}) \cdot P(S) + (1 - P(L_{t-1})) \cdot (1 - P(G))}$$
2. **Transition Prediction for next step:**
   $$P(L_{t+1}) = P(L_t \mid obs_t) + (1 - P(L_t \mid obs_t)) \cdot P(T)$$

### 4.2 Hybrid Mastery Scoring Policy
To preserve full predictability across both individual quiz scores and probabilistic skill modeling:
$$\text{MasteryScore} = 0.60 \times (\text{Assessment Score Ratio}) + 0.40 \times P(L_{\text{final}})$$
For single assessments, if student scores $100\%$ ($1.0$), BKT updates ensure high mastery; if student scores $0\%$, mastery is held down.

### 4.3 Topic Readiness Algorithm (`DAGService` + `MasteryService`)
For student $S$ requesting readiness for topic $T$:
1. Fetch all direct prerequisite topic IDs: $\text{Prereqs}(T) = \{ P \mid (P \to T) \in \text{TopicPrerequisite} \}$.
2. If $\text{Prereqs}(T) = \emptyset$, return `is_ready = True`, `unmet_prerequisites = []`.
3. For each $P \in \text{Prereqs}(T)$:
   - Fetch `StudentTopicMastery(user_id=S, topic_id=P)`.
   - If missing, status is `not_assessed`, or `mastery_score < P.mastery_threshold` (default 0.7000):
     - Append $P$ to `unmet_prerequisites`.
4. Return `is_ready = (len(unmet_prerequisites) == 0)`.

### 4.4 Personalized Learning Path Planner (`LearningPathService`)
Given enrolled course $C$ and student $S$:
1. Perform topological sort of topics in $C$.
2. For each topic $T$ in topological order:
   - Check readiness. If not ready, mark locked.
   - If ready:
     - Check lesson completions (`LessonCompletion`).
     - If uncompleted lessons exist in $T$:
       - Next item is the first uncompleted lesson $\to$ return as current recommended action.
     - If all lessons completed:
       - Check `StudentTopicMastery` for $T$:
         - If `not_assessed` or `developing` ($< 70\%$):
           - **Remediation Loop:** Recommend `adaptive_practice` or targeted remedial lesson.
         - If `competent` ($70\% - 84\%$):
           - Can proceed to next topic or take formative practice.
         - If `mastered` ($\ge 85\%$):
           - **Acceleration:** Skip directly to subsequent syllabus node.
3. If all topics are completed and competent/mastered:
   - Check course final exam. If not passed $\to$ recommend `final_exam`.
   - If final exam passed $\to$ recommend course completion.

---

## 5. API Endpoints

| Method | Endpoint | Authorization | Description |
|:---|:---|:---:|:---|
| `GET` | `/api/v1/courses/{course_id}/mastery` | Student, Teacher, Admin | Returns student's topic mastery list for the course. |
| `GET` | `/api/v1/courses/{course_id}/learning-path` | Student | Generates personalized learning path with recommended next step. |
| `GET` | `/api/v1/topics/{topic_id}/readiness` | Student | Detailed prerequisite check and diagnostic recommendations for a topic. |
| `POST` | `/api/v1/mastery/recalculate/{attempt_id}` | Student (own), Admin | Recalculate and persist mastery for a completed assessment attempt. |

---

## 6. Acceptance Criteria

- **`AC-P7-01` (Assessment Boundary Recalculation):** Mastery recalculates strictly after valid attempt completion; interim responses leave persisted mastery untouched (`DEC-03`).
- **`AC-P7-02` (Explicit Unassessed Topics):** Unassessed topics explicitly report `not_assessed` status and are never silently treated as zero mastery failure.
- **`AC-P7-03` (BKT Mathematical Invariance):** BKT calculations produce identical, deterministic posterior probabilities on repeat runs with identical input responses.
- **`AC-P7-04` (Prerequisite Readiness Gates):** Topics with unmet prerequisites are strictly reported as `is_ready = False` with the list of unmet prerequisites.
- **`AC-P7-05` (Remediation Feedback Loop):** Sub-threshold topic mastery ($< 70\%$) routes student to remedial practice before unlocking advanced dependents.
- **`AC-P7-06` (Learning Path Latency):** Full course learning path generation executes well within the 1,000 ms SLA.
- **`AC-P7-07` (Zero Gamification Leakage):** No XP, badge, or streak attributes are read or mutated by the mastery calculation.
