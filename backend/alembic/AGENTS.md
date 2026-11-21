# Database Schema & Migration Governance (`backend/alembic/`)

This document is the local instruction contract for AI agents modifying or creating **Database Migrations and Schema Definitions** in Learnova.

---

## 1. Purpose of the Module
The `backend/alembic/` directory contains the database migration environment for Learnova, powered by **Alembic 1.13+**. It manages schema versioning, table creation, column type evolutions, foreign key constraints, indexes, and check constraints across both PostgreSQL 17 (production) and SQLite (fast local testing).

---

## 2. Responsibilities
- Tracking historical schema revisions from baseline foundation up to present capabilities (versions 0001 to 0013).
- Ensuring multi-dialect compatibility (PostgreSQL 17 and SQLite).
- Maintaining data integrity constraints (check constraints, foreign keys, row uniqueness).
- Ensuring zero-downtime schema evolution principles (backward-compatible column additions, non-destructive migrations).
- Providing complete `upgrade()` and `downgrade()` symmetry for all schema changes.

---

## 3. Internal Directory Structure
```text
backend/alembic/
â”œâ”€â”€ env.py                              # Alembic migration execution script; imports app.models
â”œâ”€â”€ README                              # Alembic default readme
â”œâ”€â”€ script.py.mako                      # Template for newly generated migration revisions
â””â”€â”€ versions/                           # Sequential migration versions
    â”œâ”€â”€ 20261108_0001_d1_users_and_roles.py
    â”œâ”€â”€ 20261108_0002_d2_courses_and_teachers.py
    â”œâ”€â”€ 20261108_0003_d2_topics_and_prerequisites.py
    â”œâ”€â”€ 20261108_0004_d2_lessons_and_resources.py
    â”œâ”€â”€ 20261108_0005_d1_sessions_and_audit.py
    â”œâ”€â”€ 20261109_0006_d4_enrollments_and_completions.py
    â”œâ”€â”€ 20261109_0007_d3_questions_and_assessments.py
    â”œâ”€â”€ 20261109_0008_d4_assessment_attempts_and_grading.py
    â”œâ”€â”€ 20261109_0009_d4_student_topic_mastery.py
    â”œâ”€â”€ 20261109_0010_d4_gamification.py
    â”œâ”€â”€ 20261109_0011_d4_outbox_retry_and_leaderboard_privacy.py
    â”œâ”€â”€ 20261109_0012_d5_ai_governance_and_cache.py
    â””â”€â”€ 20261113_0013_ai_persistent_sessions.py
```

---

## 4. Migration History & Timeline
1. **`0001_d1_users_and_roles`:** Roles (`admin`, `teacher`, `student`), users, user profiles, initial admin seed guard.
2. **`0002_d2_courses_and_teachers`:** Courses, course-teachers junction (`course_teachers`).
3. **`0003_d2_topics_and_prerequisites`:** Topics hierarchy, acyclic prerequisite junction (`topic_prerequisites`).
4. **`0004_d2_lessons_and_resources`:** Lessons and lesson learning resources (`learning_resources`).
5. **`0005_d1_sessions_and_audit`:** User sessions (`user_sessions`) and security audit logs (`security_audit_events`).
6. **`0006_d4_enrollments_and_completions`:** Course enrollments (`enrollments`) and lesson completion logs (`lesson_completions`).
7. **`0007_d3_questions_and_assessments`:** Question Bank (`questions`) with segregated `answer_key`, assessments, assessment question composition (`assessment_questions`).
8. **`0008_d4_assessment_attempts_and_grading`:** Student assessment attempts (`assessment_attempts`), response items (`attempt_responses`), snapshot tables.
9. **`0009_d4_student_topic_mastery`:** BKT cognitive mastery persistence (`student_topic_mastery`) and audit log (`mastery_audit_ledger`).
10. **`0010_d4_gamification`:** Gamification profiles, XP ledger (`xp_ledger`), badges, user badges, daily challenges.
11. **`0011_d4_outbox_retry_and_leaderboard_privacy`:** Durable outbox retry fields, dead-letter quarantine, leaderboard privacy flags.
12. **`0012_d5_ai_governance_and_cache`:** Quarantined AI question candidates (`ai_question_candidates`), cryptographic content cache (`ai_content_cache`).
13. **`0013_ai_persistent_sessions`:** Persistent multi-turn AI sessions (`ai_sessions`) and message history (`ai_session_messages`).

---

## 5. Development Operations

### Applying Migrations:
```powershell
# From backend/
alembic upgrade head
```

### Inspecting Current Revision:
```powershell
alembic current
```

### Reverting One Migration:
```powershell
alembic downgrade -1
```

### Creating a New Migration:
Always use sequential, timestamped naming:
```powershell
alembic revision -m "add_my_table"
```
Then rename the file to follow `<YYYYMMDD>_<sequence>_<description>.py`.

---

## 6. Important Restrictions
1. **Never Modify Past Applied Migrations (0001 to 0013):** Once a migration is committed and applied in production/staging environments, it must remain immutable. Any corrections must be introduced via a new migration revision.
2. **Dual-Dialect Compatibility:**
   - JSON types: Use `sqlalchemy.dialects.postgresql.JSONB` when on PostgreSQL; ensure fallback to generic `sqlalchemy.types.JSON` when run on SQLite.
   - Foreign key constraints: SQLite handles foreign keys only when `PRAGMA foreign_keys = ON;`.
3. **Always Implement `downgrade()`:** Never leave `downgrade()` empty or raise `NotImplementedError`. Test downgrades before committing.
4. **Preserve Existing Data:** Migrations must not drop columns containing production data without an explicit deprecation and data migration strategy.

---

## 7. Relevant Testing Procedures
Verify migrations with backend test suites:
```powershell
# Run Alembic migration and rollback lifecycle test
python -m pytest backend/tests/test_alembic_disposable.py

# Run model persistence tests
python -m pytest backend/tests/test_models_d1.py
python -m pytest backend/tests/test_models_d2.py
```

---

## 8. Related Technical Documentation
- [`docs/database-schema.md`](file:///c:/Learnova/docs/database-schema.md): Comprehensive schema reference, tables, and ER diagrams.
- [`backend/AGENTS.md`](file:///c:/Learnova/backend/AGENTS.md): Backend application architecture and models registry.
- [`DECISIONS.md`](file:///c:/Learnova/DECISIONS.md): Architectural Decision Records detailing database decisions.
