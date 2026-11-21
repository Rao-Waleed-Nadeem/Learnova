---
name: database-migration
description: >-
  A safe, disciplined workflow for designing, implementing, testing, and documenting
  Alembic database migrations and SQLAlchemy 2.0 schema evolutions in Learnova.
---

# Database Migration & Schema Evolution Playbook

Use this skill whenever introducing new database tables, adding columns, modifying constraints, or creating indexes in Learnova.

---

## 1. Pre-Migration Checklist & Schema Analysis
1. Read [`docs/database-schema.md`](file:///c:/Learnova/docs/database-schema.md) and [`backend/alembic/AGENTS.md`](file:///c:/Learnova/backend/alembic/AGENTS.md).
2. Check existing migration revisions in `backend/alembic/versions/` (current latest: `0013`).
3. Verify that the planned modification preserves existing data and supports zero-downtime execution:
   - Adding columns: Must be nullable or have a database server-side default.
   - Adding foreign keys: Ensure `ondelete` action is explicitly defined (`CASCADE`, `RESTRICT`, or `SET NULL`).
   - Adding enums: Use `CheckConstraint` with descriptive check name.
   - Dialect compatibility: Support PostgreSQL 17 (`JSONB`, UUID) and SQLite (`JSON`, string/blob UUIDs).

---

## 2. Step-by-Step Migration Procedure

### Step 1: Update SQLAlchemy Domain Model
1. Open the relevant file in `backend/app/models/` (or create a new model).
2. Ensure the model inherits from `app.db.base.Base`.
3. If creating a new model, register and export it in `backend/app/models/__init__.py`.

### Step 2: Generate Migration Revision
From the `backend/` directory:
```powershell
cd backend
alembic revision -m "add_my_table_or_column"
```
Rename the generated file in `backend/alembic/versions/` to match the project convention:
`<YYYYMMDD>_<sequence>_<description>.py` (e.g. `20261116_0014_add_my_table.py`).

### Step 3: Implement `upgrade()` and `downgrade()`
Write explicit migration logic. Both functions must be symmetric:
```python
"""Description of migration.

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-16
"""
from alembic import op
import sqlalchemy as sa

revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'my_table',
        sa.Column('id', sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )

def downgrade() -> None:
    op.drop_table('my_table')
```

### Step 4: Test Migration Lifecycle (Upgrade & Downgrade)
Test the migration locally:
```powershell
# Apply upgrade
alembic upgrade head

# Verify current revision
alembic current

# Test rollback
alembic downgrade -1

# Re-apply upgrade
alembic upgrade head
```

### Step 5: Run Automated Migration & Persistence Tests
Run pytest tests to ensure SQLite and PostgreSQL compatibility:
```powershell
python -m pytest backend/tests/test_alembic_disposable.py
python -m pytest backend/tests/test_models_d1.py
```

### Step 6: Update Schema Documentation
1. Update [`docs/database-schema.md`](file:///c:/Learnova/docs/database-schema.md) with the new table/column definitions.
2. Update the migration revision catalog in [`backend/alembic/AGENTS.md`](file:///c:/Learnova/backend/alembic/AGENTS.md).
