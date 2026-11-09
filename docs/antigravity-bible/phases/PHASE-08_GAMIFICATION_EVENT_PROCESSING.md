# Phase 8: Gamification & Event Processing Specification

**Phase:** Phase 8 — Gamification and Event Processing  
**Authority:** `Learnova_Master_Backend_Implementation_Blueprint.md` Sections 3.3, 5.7, 7.1 (D7), 7.4, 8.6 & 9 (Phase 8); `Readme.md` Lines 30–48; `Learnova_SRS_Final_Aligned_V2 (1).docx` Section 3.2.6 & UC-16 (`HL-08`); `Learnova_Final_SSDs_V2.xml` (SSD-04, SSD-06); `DEC-006`, `DEC-P6-003`, `DEC-P7-004`.  
**Date:** 2026-11-09  
**Status:** **SPECIFIED (Stage A Planning)**

---

## 1. Executive Summary & Core Objectives

The objective of Phase 8 is to implement the authoritative, durable Gamification & Event Processing Engine in FastAPI and PostgreSQL. It elevates student engagement metrics from client-side `localStorage` state (`storageService.ts` and `studentLogic.ts`) into an asynchronous, idempotent, server-authoritative subsystem.

Phase 8 fulfills:
1. **SRS UC-16 (Earn Gamification Rewards) & HL-08 (Manage Gamification):** Asynchronously records qualifying learning events (lesson completions, resource reviews, diagnostic baselines, adaptive practices, final examinations) to award non-duplicate Experience Points (XP), advance levels, update continuous daily streaks, and unlock achievement badges.
2. **Asynchronous Gamification Decoupling (`DEC-006`, Blueprint Section 3.3):** Strictly decouples gamification reward calculations from academic grading and topic mastery. Grading writes durable domain events to the outbox; gamification processes them asynchronously without risking academic transaction rollbacks.
3. **Idempotency & Double-Dipping Prevention (`DEC-006`, Blueprint 924 & 931):** Every XP reward is guarded by an immutable unique idempotency key (`idempotency_key`). Reprocessing an identical event or network retry NEVER awards duplicate XP.
4. **Privacy-Aware Academic Leaderboard (Blueprint Section 8.6):** Ranks students by verified total XP with strict opt-in / privacy compliance (`is_opted_in_leaderboard`).
5. **Time-Bound Learning Challenges (SRS 3.2.6):** Tracks time-delimited objectives (e.g. daily XP goals, weekly lesson counts, streak targets) with automated completion checks and bonus XP.

---

## 2. Invariants & Scope Boundaries

> [!IMPORTANT]
> **Strict Phase 8 Architectural Invariants:**
> 1. **Zero Academic-to-Gamification Feedback Invariant:** Gamification metrics (XP, level, streaks, badges) must **never** be used as inputs to topic mastery, prerequisite compliance, question difficulty selection, or exam passing determinations. Academic scoring and mastery remain 100% server-authoritative and mathematically pure.
> 2. **Transactional Outbox Decoupling:** Grading and lesson completions write domain events (`domain_outbox_events`). The gamification engine operates as a durable consumer. An error or failure in gamification processing MUST NOT cause the academic grading transaction to fail.
> 3. **Strict Idempotency Guarantee:** Reprocessing any domain event (e.g., retrying an assessment completion or re-submitting a lesson completion) MUST produce identical gamification state without double-awarding XP or duplicating badges.
> 4. **Formula Conformance:** Student level progression MUST conform exactly to the established arithmetic formula in `frontend/src/utils/studentLogic.ts` ($150 + \text{Level} \times 100$ XP per span).
> 5. **Midnight UTC Streak Boundary:** Streaks increment on consecutive calendar days (calculated in UTC `YYYY-MM-DD`). Inactivity gaps $\ge 2$ calendar days reset the streak to 1 upon the next activity.
> 6. **Zero Destructive Database Operations:** Persistent data volume `postgres_data` is preserved. Schema migration 10 is strictly additive with verified rollback (`-1`).

---

## 3. Data Architecture & Alembic Migration 10

Alembic Migration 10 introduces the physical schema for **D7 (Gamification)**:

### Table: `gamification_profiles`
Tracks the current aggregate gamification state for each student.

```sql
CREATE TABLE gamification_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    streak_days INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE NULL,
    is_opted_in_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT ck_gamification_xp CHECK (xp >= 0),
    CONSTRAINT ck_gamification_level CHECK (level >= 1),
    CONSTRAINT ck_gamification_streak CHECK (streak_days >= 0),
    CONSTRAINT uq_gamification_student UNIQUE (student_id)
);

CREATE INDEX ix_gamification_profiles_student ON gamification_profiles (student_id);
CREATE INDEX ix_gamification_profiles_xp ON gamification_profiles (xp DESC);
```

### Table: `xp_ledger`
Append-only chronological audit log of all XP awards. Guarantees non-duplicate XP through unique idempotency keys.

```sql
CREATE TABLE xp_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    xp_earned INTEGER NOT NULL,
    description VARCHAR(255) NOT NULL,
    related_id VARCHAR(255) NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT ck_xp_ledger_earned CHECK (xp_earned > 0),
    CONSTRAINT uq_xp_ledger_idempotency UNIQUE (idempotency_key)
);

CREATE INDEX ix_xp_ledger_student ON xp_ledger (student_id);
CREATE INDEX ix_xp_ledger_created_at ON xp_ledger (created_at DESC);
```

### Table: `badges`
Catalog of unlockable achievement badges.

```sql
CREATE TABLE badges (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(64) NOT NULL,
    category VARCHAR(32) NOT NULL,
    criteria_type VARCHAR(64) NOT NULL,
    criteria_threshold NUMERIC(8, 2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT ck_badges_category CHECK (category IN ('achievement', 'streak', 'mastery', 'exam'))
);
```

### Table: `user_badges`
Earned badges per student.

```sql
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(64) NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT uq_user_badges UNIQUE (student_id, badge_id)
);

CREATE INDEX ix_user_badges_student ON user_badges (student_id);
```

### Table: `challenges`
Time-bound learning challenges.

```sql
CREATE TABLE challenges (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 100,
    challenge_type VARCHAR(64) NOT NULL,
    target_value INTEGER NOT NULL DEFAULT 1,
    starts_at TIMESTAMP WITH TIME ZONE NULL,
    expires_at TIMESTAMP WITH TIME ZONE NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT ck_challenges_reward CHECK (xp_reward > 0)
);
```

### Table: `user_challenges`
Student challenge progress.

```sql
CREATE TABLE user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id VARCHAR(64) NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    current_progress INTEGER NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT uq_user_challenges UNIQUE (student_id, challenge_id)
);

CREATE INDEX ix_user_challenges_student ON user_challenges (student_id);
```

---

## 4. Algorithmic Formulations

### 4.1 Level & Progression Formula
Conforms exactly to `calculateLevelFromXP` in `frontend/src/utils/studentLogic.ts`:

- Base floor: $\text{Level} = 1, \text{FloorXP} = 0, \text{Span} = 250$.
- For each completed level:
  $$\text{Span}(L) = 150 + L \times 100$$
- Next Level XP:
  $$\text{NextLevelXP} = \text{FloorXP} + \text{Span}(L)$$
- Progress Percentage:
  $$\text{ProgressPercent} = \min\left(100, \max\left(0, \operatorname{round}\left(\frac{\text{XP} - \text{FloorXP}}{\text{Span}(L)} \times 100\right)\right)\right)$$

### 4.2 Streak Calculation Rule
Let $D_{\text{act}}$ be the date of activity in UTC (`YYYY-MM-DD`) and $D_{\text{last}}$ be `profile.last_active_date`:
1. If $D_{\text{last}} = D_{\text{act}}$: Active on same calendar day; streak unchanged.
2. If $D_{\text{last}} = D_{\text{act}} - 1 \text{ day}$: Consecutive day; `streak_days += 1`, $D_{\text{last}} \gets D_{\text{act}}$. Triggers `daily_streak` XP event (+30 XP) under key `xp:{student_id}:daily_streak:{D_act}`.
3. If $D_{\text{last}} < D_{\text{act}} - 1 \text{ day}$ or $D_{\text{last}}$ is null: Inactivity gap; `streak_days = 1`, $D_{\text{last}} \gets D_{\text{act}}$.

### 4.3 Standard XP Reward Matrix
| Learning Event | Event Type | XP Award | Idempotency Key Format |
|---|---|---|---|
| Lesson Completion | `lesson_completed` | +50 XP | `xp:{student_id}:lesson:{lesson_id}` |
| Resource Activity Review | `resource_reviewed` | +15 XP | `xp:{student_id}:resource:{resource_id}` |
| Diagnostic Baseline | `diagnostic_completed` | +150 XP | `xp:{student_id}:diagnostic:{attempt_id}` |
| Formative Adaptive Practice | `practice_completed` | +120 XP | `xp:{student_id}:practice:{attempt_id}` |
| Final Examination (Passed) | `exam_completed` | +250 XP | `xp:{student_id}:exam:{attempt_id}` |
| Final Examination (Failed/Review) | `exam_completed` | +100 XP | `xp:{student_id}:exam:{attempt_id}` |
| Daily Streak Bonus | `daily_streak` | +30 XP | `xp:{student_id}:streak:{activity_date}` |
| Badge Earned Bonus | `badge_earned` | +200 XP | `xp:{student_id}:badge:{badge_id}` |

### 4.4 Badge Qualification Rules
| Badge ID | Badge Title | Category | Qualification Rule |
|---|---|---|---|
| `badge-first-step` | First Step | achievement | $\ge 1$ lesson completions in any enrolled course. |
| `badge-diagnostic` | Diagnostic Pioneer | achievement | $\ge 1$ completed diagnostic assessment attempts. |
| `badge-syntax-master` | Syntax Virtuoso | mastery | $\ge 1$ topics with `status = 'mastered'` or `mastery_score >= 0.8500`. |
| `badge-streak` | Streak Sentinel | streak | `streak_days >= 3`. |
| `badge-adaptive-ace` | Adaptive Ace | mastery | $\ge 1$ adaptive practice attempts with score $\ge 80\%$. |
| `badge-exam-scholar` | Summative Scholar | exam | $\ge 1$ final examination attempts with `is_passed = True`. |
| `badge-mastery-titan` | Mastery Titan | mastery | 100% of topics in any course syllabus have `status IN ('mastered', 'competent')`. |

---

## 5. REST API Endpoints (`/api/v1/gamification/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/gamification/profile` | Student | Retrieve student gamification profile (XP, level, level floor, next level threshold, progress %, streak, opt-in). |
| `PATCH` | `/api/v1/gamification/profile` | Student | Update profile preferences (`is_opted_in_leaderboard`). |
| `GET` | `/api/v1/gamification/xp-history` | Student | Retrieve paginated chronological XP ledger entries. |
| `GET` | `/api/v1/gamification/badges` | Student | Retrieve catalog of all badges with student unlock status and timestamps. |
| `GET` | `/api/v1/gamification/leaderboard` | Authenticated | Retrieve ranked leaderboard of opted-in students with badge counts and current user highlight. |
| `GET` | `/api/v1/gamification/challenges` | Student | Retrieve active learning challenges with student progress. |
| `POST` | `/api/v1/gamification/process-events` | Admin/Internal | Dispatcher endpoint to drain and process pending outbox events. |

---

## 6. Verification & Test Plan

1. **`test_gamification_profile_and_level.py`:**
   - Level arithmetic formula calculation across XP boundaries (0, 125, 250, 600, 1050, 1200).
   - Daily streak update on consecutive days, same day idempotency, and streak reset on 2+ day gaps.
2. **`test_xp_ledger_idempotency.py`:**
   - Unique idempotency key enforcement: repeated attempts to award XP with identical key are safely ignored.
   - Profile XP and level are incremented exactly once per event.
3. **`test_badge_rules.py`:**
   - Evaluates all 7 badge criteria: First Step on lesson complete, Diagnostic Pioneer on diagnostic complete, Syntax Virtuoso on 85% mastery, Streak Sentinel on 3-day streak, Adaptive Ace on 80% practice, Summative Scholar on passing exam, Mastery Titan on course syllabus mastery.
   - Verifies +200 bonus XP is awarded on badge unlock.
4. **`test_leaderboard_privacy.py`:**
   - Ranks ordered by XP descending.
   - Privacy opt-out excludes student from public list or displays anonymized name.
   - Current user entry correctly identified.
5. **`test_gamification_outbox_worker.py`:**
   - Consumes `assessment.completed` and `lesson.completed` from `domain_outbox_events`.
   - Idempotently marks events `published` and increments retry counts on simulated errors.
   - Full regression suite execution across all 119 prior backend tests and 29 Vitest tests.
