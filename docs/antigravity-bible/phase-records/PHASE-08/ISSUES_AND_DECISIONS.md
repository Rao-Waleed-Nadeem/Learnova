# Phase 08 Issues and Architecture Decisions

**Phase:** Phase 8 — Gamification and Event Processing  
**Date:** 2026-11-09  
**Status:** **RESOLVED**

---

## 1. Architectural Decisions

### `DEC-P8-001`: Strict Outbox Decoupling of Academic Scoring from Gamification
- **Context:** SRS UC-16, Section 3.2.6, and Blueprint Section 3.3 mandate that gamification rewards (XP, levels, streaks, badges) must be completely decoupled from academic scoring and topic mastery recalculations.
- **Decision:** Academic grading and lesson completions write durable domain events to `domain_outbox_events`. Gamification event handlers consume these events asynchronously. Any failure in gamification processing or ledger writes NEVER causes the academic transaction to roll back.
- **Affected Files:** `backend/app/services/grading_service.py`, `backend/app/services/enrollment_service.py`, `backend/app/services/gamification_service.py`.

### `DEC-P8-002`: Append-Only XP Ledger with Unique Idempotency Keys
- **Context:** Network retries, duplicate submission requests, or event re-deliveries must never double-award XP or repeatedly bump student levels.
- **Decision:** Every XP event is recorded in `xp_ledger` under a unique constraint on `idempotency_key` (e.g. `xp:{student_id}:lesson:{lesson_id}`, `xp:{student_id}:assessment:{attempt_id}`). If an idempotency key already exists, `award_xp_idempotent` returns the existing entry as a no-op without mutating student profile XP or level.
- **Affected Files:** `backend/app/models/gamification.py`, `backend/app/services/gamification_service.py`.

### `DEC-P8-003`: Arithmetic Level Progression Conformance
- **Context:** The frontend client (`studentLogic.ts`) uses an established level formula ($150 + \text{Level} \times 100$ XP per span). Any divergence in backend level arithmetic would cause visual state flickering between backend API responses and frontend renderers.
- **Decision:** Implemented `GamificationService.calculate_level` using the exact identical progression formula: Level 1 (0–250 XP), Level 2 (250–600 XP), Level 3 (600–1050 XP), Level 4 (1050–1600 XP).
- **Affected Files:** `backend/app/services/gamification_service.py`, `backend/tests/test_gamification_profile_and_level.py`.

### `DEC-P8-004`: Privacy-Aware Leaderboard Anonymization
- **Context:** Blueprint Section 8.6 requires student opt-in / privacy compliance on public leaderboards.
- **Decision:** Each student profile includes `is_opted_in_leaderboard: bool` (default `True`). If a student opts out, their entry displays as `"Anonymous Scholar"` with null avatar to other scholars, while preserving their own personal ranking and name when viewed by themselves.
- **Affected Files:** `backend/app/models/gamification.py`, `backend/app/services/gamification_service.py`, `backend/app/api/v1/endpoints/gamification.py`.

---

## 2. Defects Encountered & Resolved

### Issue 1: `ModuleNotFoundError: No module named 'app.db.base_class'`
- **Symptom:** Pytest failed during model collection with `ModuleNotFoundError: No module named 'app.db.base_class'` in `backend/app/models/gamification.py`.
- **Root Cause:** In Learnova, SQLAlchemy declarative base is defined at `app.db.base.Base`, not `app.db.base_class`.
- **Fix:** Corrected import to `from app.db.base import Base`.

### Issue 2: `TypeError: create_access_token() missing 1 required positional argument: 'role'`
- **Symptom:** Fixture setup in test files raised `TypeError: create_access_token() missing 1 required positional argument: 'role'`.
- **Root Cause:** Tests invoked `create_access_token({"sub": str(student.id), "role": "student"})` as a dictionary, whereas `create_access_token` in `backend/app/core/security.py` expects positional arguments `subject: str, role: str`.
- **Fix:** Updated test fixtures to `create_access_token(str(student.id), role="student")`.

### Issue 3: `TypeError: 'course_id' is an invalid keyword argument for Lesson`
- **Symptom:** `test_badge_rules.py` failed during fixture setup with `TypeError: 'course_id' is an invalid keyword argument for Lesson`.
- **Root Cause:** In Learnova's schema, `Lesson` belongs to `topic_id`, with course scoping derived through the parent `topic`.
- **Fix:** Instantiated `Lesson` with `topic_id=topic.id, title="Lesson 1", order=1`.

### Issue 4: `AttributeError: type object 'AssessmentAttempt' has no attribute 'is_passed'`
- **Symptom:** Badge rule evaluation in `evaluate_badges` crashed with `AttributeError: type object 'AssessmentAttempt' has no attribute 'is_passed'`.
- **Root Cause:** The SQLAlchemy column on `AssessmentAttempt` is `passed` (`Boolean`), not `is_passed`.
- **Fix:** Updated query filter in `gamification_service.py` to `AssessmentAttempt.passed.is_(True)`.
