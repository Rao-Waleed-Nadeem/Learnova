# Phase 08 Plan — Gamification and Event Processing

**Phase:** Phase 8 — Gamification and Event Processing  
**Stage:** Stage C (Governance & Phase Sign-Off Complete)  
**Governing Standard:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md`; `agent-prompt.md` Section 4; `Learnova_Master_Backend_Implementation_Blueprint.md` Sections 3.3, 5.7, 7.1 (D7), 7.4, 8.6 & 9 (Phase 8); `Readme.md` Lines 30–48; `Learnova_SRS_Final_Aligned_V2 (1).docx` Section 3.2.6 & UC-16 (`HL-08`); `Learnova_Final_SSDs_V2.xml` (SSD-04, SSD-06); `DEC-006`, `DEC-P6-003`, `DEC-P7-004`; `docs/phases/PHASE-08_GAMIFICATION_EVENT_PROCESSING.md`.  
**Date:** 2026-11-09  
**Status:** **IMPLEMENTED, VERIFIED & ACCEPTED (133/134 Pytest Passed, 29/29 Vitest Passed, Build Clean)**

---

## 1. Objective of Phase 8

The objective of Phase 8 is to implement the authoritative, resilient Gamification & Event Processing Engine in FastAPI and PostgreSQL, elevating student engagement and reward tracking from client-side `localStorage` state (`storageService.ts` and `studentLogic.ts`) into a durable, server-authoritative domain subsystem.

Phase 8 fulfills:
1. **SRS UC-16 (Earn Gamification Rewards) & HL-08 (Manage Gamification):** Asynchronously records qualifying learning events (lesson completion, resource reviews, diagnostic baselines, adaptive practices, final examinations) to award non-duplicate Experience Points (XP), advance levels, update continuous daily streaks, and unlock achievement badges.
2. **Asynchronous Gamification Decoupling (`DEC-006`, Blueprint Section 3.3):** Strictly decouples gamification reward calculations from academic grading and topic mastery. Academic grading writes durable domain events to the outbox (`domain_outbox_events`); gamification processes them asynchronously without risking academic transaction rollbacks.
3. **Idempotency & Double-Dipping Prevention (`DEC-006`, Blueprint 924 & 931):** Every XP reward is guarded by an immutable unique idempotency key (`idempotency_key`). Reprocessing an identical event or network retry NEVER awards duplicate XP.
4. **Privacy-Aware Academic Leaderboard (Blueprint Section 8.6):** Ranks students by verified total XP with strict opt-in / privacy compliance (`is_opted_in_leaderboard`).
5. **Time-Bound Learning Challenges (SRS 3.2.6):** Tracks time-delimited objectives (e.g. daily XP goals, weekly lesson counts, streak targets) with automated completion checks and bonus XP.

> [!IMPORTANT]
> **Strict Phase 8 Architectural Invariants & Scope Boundaries:**
> 1. **Zero Academic-to-Gamification Feedback Invariant:** Gamification metrics (XP, level, streaks, badges) must **never** be used as inputs to topic mastery, prerequisite compliance, question difficulty selection, or exam passing determinations. Academic scoring and mastery remain 100% server-authoritative and mathematically pure.
> 2. **Transactional Outbox Decoupling:** Grading and lesson completions write domain events (`domain_outbox_events`). The gamification engine operates as a durable consumer. An error or failure in gamification processing MUST NOT cause the academic grading transaction to fail.
> 3. **Strict Idempotency Guarantee:** Reprocessing any domain event (e.g., retrying an assessment completion or re-submitting a lesson completion) MUST produce identical gamification state without double-awarding XP or duplicating badges.
> 4. **Formula Conformance:** Student level progression MUST conform exactly to the established arithmetic formula in `frontend/src/utils/studentLogic.ts` ($150 + \text{Level} \times 100$ XP per span).
> 5. **Midnight UTC Streak Boundary:** Streaks increment on consecutive calendar days (calculated in UTC `YYYY-MM-DD`). Inactivity gaps $\ge 2$ calendar days reset the streak to 1 upon the next activity.
> 6. **Zero Destructive Database Operations:** Persistent data volume `postgres_data` is preserved. Schema migration 10 is strictly additive with verified rollback (`-1`).

---

## 2. Requirement and Workflow Traceability

### SRS Requirements
- **`FR-GAM-01` (XP & Level Progression):** The system shall asynchronously record qualifying learning events to award non-duplicate Experience Points (XP) and calculate overall level progression using $150 + \text{Level} \times 100$ XP per level span.
- **`FR-GAM-02` (Append-Only XP Ledger):** Every XP transaction shall be recorded in an immutable ledger with unique `idempotency_key`, event type, description, timestamp, and optional related entity reference (`FR-GAM-02`).
- **`FR-GAM-03` (Streaks Tracking):** The system shall track consecutive daily learning streaks, award streak milestones, and handle calendar date boundaries and inactivity resets.
- **`FR-GAM-04` (Badges & Achievement Unlocks):** The system shall evaluate automated qualification rules across 7 official badges (`First Step`, `Diagnostic Pioneer`, `Syntax Virtuoso`, `Streak Sentinel`, `Adaptive Ace`, `Summative Scholar`, `Mastery Titan`), persist earned badges in `user_badges`, and award +200 bonus XP per unlocked badge.
- **`FR-GAM-05` (Time-Bound Learning Challenges):** The system shall manage learning challenges, track student progress, and award completion rewards.
- **`FR-GAM-06` (Privacy-Aware Leaderboard):** The system shall render ranked student leaderboards respecting student privacy opt-in preferences.
- **`FR-GAM-07` (Durable Outbox Event Processing):** The system shall asynchronously consume `domain_outbox_events` with retry tracking and dead-letter handling.

### System Sequence Workflows
- **`SSD-04` (Adaptive Practice / Assessment Completion Gamification):** Assessment submitted $\to$ grading completed $\to$ outbox event `assessment.completed` written $\to$ gamification worker consumes event $\to$ awards XP (+120 or +150 or +250) $\to$ updates streak $\to$ evaluates badge qualification $\to$ updates profile $\to$ student dashboard reflects new XP and level.
- **`SSD-06` (Final Exam Gamification):** Final exam submitted $\to$ outbox event written $\to$ gamification worker awards exam XP and evaluates `Summative Scholar` badge.

---

## 3. Step-by-Step Implementation Plan

### Step 1: Physical Schema & Migration 10
- Create Alembic migration `backend/alembic/versions/20261109_0010_d4_gamification.py` with down revision `20261109_0009`.
- Tables created:
  - `gamification_profiles`: `student_id` (UUID FK -> `users.id`, unique), `xp`, `level`, `streak_days`, `last_active_date`, `is_opted_in_leaderboard`, timestamps.
  - `xp_ledger`: `id` (UUID PK), `student_id` (UUID FK), `event_type`, `xp_earned`, `description`, `related_id`, `idempotency_key` (unique), `created_at`.
  - `badges`: `id` (VARCHAR PK), `title`, `description`, `icon`, `category`, `criteria_type`, `criteria_threshold`, `created_at`.
  - `user_badges`: `student_id` (UUID FK), `badge_id` (VARCHAR FK), `earned_at`, unique `(student_id, badge_id)`.
  - `challenges`: `id` (VARCHAR PK), `title`, `description`, `xp_reward`, `challenge_type`, `target_value`, `starts_at`, `expires_at`, `is_active`, `created_at`.
  - `user_challenges`: `student_id` (UUID FK), `challenge_id` (VARCHAR FK), `current_progress`, `is_completed`, `completed_at`, unique `(student_id, challenge_id)`.
- Pre-seed official badges and default active challenges.
- Verify migration upgrade to `head` and downgrade (`-1`) on disposable SQLite database.

### Step 2: Domain Models (`backend/app/models/gamification.py`)
- Define SQLAlchemy models matching migration tables.
- Add relationships to `User`:
  - `user.gamification_profile` (1:1)
  - `user.xp_ledger` (1:N)
  - `user.earned_badges` (1:N through `UserBadge`)
  - `user.challenge_progress` (1:N through `UserChallenge`)
- Export models in `backend/app/models/__init__.py`.

### Step 3: Pydantic Schemas (`backend/app/schemas/gamification.py`)
- `GamificationProfileResponse`: student_id, xp, level, current_level_floor_xp, next_level_xp, progress_percent, streak_days, last_active_date, is_opted_in_leaderboard.
- `GamificationProfileUpdate`: is_opted_in_leaderboard.
- `XPLedgerItemResponse`: id, student_id, event_type, xp_earned, description, related_id, timestamp.
- `XPLedgerListResponse`: items, total, page, page_size.
- `BadgeItemResponse`: id, title, description, icon, category, earned_at, is_unlocked.
- `BadgesListResponse`: items, total_earned, total_available.
- `LeaderboardEntryResponse`: rank, student_id, display_name, avatar, xp, level, earned_badges_count, badges, is_current_user.
- `LeaderboardResponse`: entries, current_user_entry, total_ranked.
- `ChallengeItemResponse`: id, title, description, xp_reward, challenge_type, target_value, current_progress, is_completed, completed_at, expires_at.
- `ChallengesListResponse`: items.
- `OutboxProcessResultResponse`: processed_count, failed_count, message.

### Step 4: Domain Service (`backend/app/services/gamification_service.py`)
- `calculate_level(xp: int) -> dict`: Implements $150 + \text{Level} \times 100$ formula returning level, floor_xp, next_level_xp, progress_percent.
- `get_or_create_profile(db: Session, student_id: UUID) -> GamificationProfile`: Returns profile or initializes with defaults (`xp=0, level=1, streak_days=0`).
- `award_xp_idempotent(db: Session, student_id: UUID, event_type: str, xp_amount: int, description: str, idempotency_key: str, related_id: Optional[str] = None) -> Tuple[Optional[XPLedger], bool]`: Enforces unique idempotency key; updates profile XP, recalculates level, updates streak.
- `update_streak(db: Session, profile: GamificationProfile, activity_date: Optional[date] = None) -> bool`: Computes consecutive calendar days; increments streak and awards daily streak XP if consecutive; resets to 1 if gap $\ge 2$ days.
- `evaluate_badges(db: Session, student_id: UUID) -> List[Badge]`: Rule engine inspecting student activity (lessons, diagnostics, practice, exams, streaks, mastery) and unlocking badges with +200 bonus XP.
- `evaluate_challenges(db: Session, student_id: UUID, challenge_type: str, increment: int = 1) -> List[UserChallenge]`: Updates challenge progress and awards completion reward.
- `get_leaderboard(db: Session, current_user_id: Optional[UUID] = None, course_id: Optional[UUID] = None, limit: int = 50) -> dict`: Produces ranked leaderboard honoring privacy settings.

### Step 5: Outbox Consumer & Event Dispatcher
- `process_outbox_event(db: Session, event: DomainOutboxEvent) -> bool`: Dispatches `assessment.completed`, `lesson.completed`, `resource.reviewed`.
- `process_pending_outbox_events(db: Session, limit: int = 50) -> dict`: Worker dispatcher selecting pending outbox events, executing `process_outbox_event` in transactional boundaries, updating `status = 'published'` and `published_at`, and logging `retry_count` and `last_error` on failures.
- In `EnrollmentService.complete_lesson`: Emit `domain_outbox_events` record for `lesson.completed` and dispatch gamification.

### Step 6: FastAPI Endpoints (`backend/app/api/v1/endpoints/gamification.py`)
- `GET /api/v1/gamification/profile` — Current student gamification profile.
- `PATCH /api/v1/gamification/profile` — Update leaderboard opt-in.
- `GET /api/v1/gamification/xp-history` — Paginated XP ledger.
- `GET /api/v1/gamification/badges` — Badge catalog and unlock statuses.
- `GET /api/v1/gamification/leaderboard` — Privacy-aware student leaderboard.
- `GET /api/v1/gamification/challenges` — Active challenges and progress.
- `POST /api/v1/gamification/process-events` — Worker endpoint for outbox drainage.
- Mount router in `backend/app/api/v1/router.py`.

### Step 7: Automated Tests
- `backend/tests/test_gamification_profile_and_level.py`: Level formula verification, streak progression and gap reset.
- `backend/tests/test_xp_ledger_idempotency.py`: Reprocessing events yields zero duplicate XP; idempotency key collision safely ignored.
- `backend/tests/test_badge_rules.py`: Qualification evaluation for all 7 badges and bonus XP awards.
- `backend/tests/test_leaderboard_privacy.py`: Ranking order, privacy opt-out masking, and self-entry identification.
- `backend/tests/test_gamification_outbox_worker.py`: End-to-end event outbox consumption and retry handling.

### Step 8: Full Regression Suite & Vitest Verification
- Run full pytest suite (aiming for $\ge 130$ passing tests, 0 failures).
- Run frontend Vitest suite (29 passing).
- Run frontend Vite production build (clean build, 0 errors).

### Step 9: Governance Updates
- Record execution log, file ledger, test evaluation, and decisions in `docs/antigravity-bible/phase-records/PHASE-08/`.
- Update `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, and `DECISIONS.md`.

### Step 10: Sign-Off
- Present Phase 8 verification results to user for review and approval.

---

## 4. Reversibility & Rollback Plan

- **Database:** Alembic Migration 10 defines explicit `downgrade()` dropping `user_challenges`, `challenges`, `user_badges`, `badges`, `xp_ledger`, and `gamification_profiles` in strict reverse dependency order.
- **Application Code:** Pure additive module `gamification.py`, `gamification_service.py`, `gamification.py` endpoints, isolated router mount.
- **Data Volume Protection:** `postgres_data` persistent volume is strictly preserved; no destructive volume wipes.
