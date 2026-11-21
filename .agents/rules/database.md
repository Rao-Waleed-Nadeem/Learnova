---
trigger: glob
globs: "**/backend/app/models/**, **/backend/app/db/**, **/backend/alembic/**"
description: Database schema conventions, SQLAlchemy 2.0 ORM patterns, Alembic migrations, and data integrity constraints.
---

# Database & Persistence Rules

These rules apply when creating or modifying database models, migrations, or database queries in Learnova.

---

## 1. Domain Entities & Schema Conventions

Learnova uses **SQLAlchemy 2.0 DeclarativeBase** mapping to PostgreSQL 17 (production) and SQLite (testing).

### 1.1 Primary Keys & Surrogate Keys
- All entity tables use surrogate UUIDv4 primary keys (`Uuid(as_uuid=True)`, `default=uuid.uuid4`).
- Foreign keys must explicitly state `ondelete` actions (e.g. `ondelete="CASCADE"` for owned children, `ondelete="RESTRICT"` or `ondelete="SET NULL"` for referenced catalogs).

### 1.2 Naming Conventions
- **Tables:** Plural `snake_case` (e.g. `users`, `courses`, `ai_question_candidates`, `domain_outbox_events`).
- **Junction Tables:** Plural join naming (e.g. `course_teachers`, `topic_prerequisites`, `assessment_questions`).
- **Columns:** Lowercase `snake_case` (e.g. `created_at`, `is_published`, `approved_question_id`).
- **Foreign Key Columns:** `<target_singular>_id` (e.g. `course_id`, `topic_id`, `user_id`).

### 1.3 Timestamps & Constraints
- Entities must track `created_at` (and `updated_at` where mutable) using `DateTime(timezone=True)`.
- Use explicit `CheckConstraint` definitions for enum columns to guarantee database-level integrity (e.g. candidate status: `pending_review`, `approved`, `rejected`).

---

## 2. Multi-Dialect Compatibility (PostgreSQL 17 & SQLite)

The application runs on PostgreSQL in Docker/production and SQLite with foreign keys during fast unit tests:
- **JSON Fields:** Use `sqlalchemy.dialects.postgresql.JSONB` on PostgreSQL with fallback to `sqlalchemy.types.JSON` for SQLite.
- **Foreign Keys in SQLite:** SQLite requires `PRAGMA foreign_keys = ON;`, which is configured in `backend/app/db/session.py`.
- **Text Queries:** Never write PostgreSQL-only raw SQL in services unless guarded by dialect inspection. Use SQLAlchemy ORM or Expression Language.

---

## 3. Concurrency Safety & Row-Level Locking

1. **Atomic Question Promotion (SSD-08):**
   When a teacher approves an AI candidate (`ai_candidate_service.py`), always acquire an exclusive row lock before updating:
   ```python
   candidate = db.query(AICandidateQuestion).filter(
       AICandidateQuestion.id == candidate_id
   ).with_for_update().first()
   ```
2. **Outbox Batch Claiming:**
   The outbox processor uses `FOR UPDATE SKIP LOCKED` on PostgreSQL to safely allow multiple workers without duplicate event processing:
   ```sql
   SELECT id FROM domain_outbox_events
   WHERE status = 'pending'
   ORDER BY created_at ASC
   LIMIT :batch_size
   FOR UPDATE SKIP LOCKED;
   ```
3. **Outbox Leader Election:**
   Use the established PostgreSQL session advisory lock key `OUTBOX_ADVISORY_LOCK_ID = 742918` when multi-worker clustering is active.

---

## 4. Alembic Migration Rules

- **Location:** `backend/alembic/versions/`.
- **Naming Pattern:** `<YYYYMMDD>_<sequence>_<description>.py` (e.g. `20261113_0013_ai_persistent_sessions.py`).
- **Never Modify Existing Applied Migrations:** Never edit or delete migration versions 0001 through 0013 that have already been applied to existing databases.
- **Always Provide Upgrade & Downgrade:** Every migration file must implement both `upgrade()` and `downgrade()` functions.
- **Test Migrations in Both Directions:** Verify migrations by upgrading to `head` and downgrading back before committing.
- **Migration Commands:**
  ```powershell
  # Upgrade database to latest revision
  cd backend
  alembic upgrade head

  # Check current revision
  alembic current

  # Downgrade one revision
  alembic downgrade -1
  ```
