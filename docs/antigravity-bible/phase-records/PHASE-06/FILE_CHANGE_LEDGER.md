# Phase 06 — File Change Ledger

**Phase:** Phase 6 — Assessment Attempts & Server-Authoritative Grading  
**Date:** 2026-11-09  
**Total New Files:** 8  
**Total Modified Files:** 5  

---

## 1. New Files Created

| File Path | Description |
|:---|:---|
| `docs/antigravity-bible/phases/PHASE-06_ASSESSMENT_ATTEMPTS_GRADING.md` | Phase 6 specification mirrored from docs/phases |
| `docs/antigravity-bible/phase-records/PHASE-06/PLAN.md` | Phase 6 comprehensive 10-point implementation and test plan |
| `backend/app/models/attempt.py` | SQLAlchemy ORM models `AssessmentAttempt` and `AttemptResponse` with check constraints |
| `backend/app/models/outbox.py` | SQLAlchemy ORM model `DomainOutboxEvent` for transactional outbox pattern |
| `backend/alembic/versions/20261109_0008_d4_assessment_attempts_and_grading.py` | Additive Alembic migration 8 creating attempts, responses, outbox tables |
| `backend/app/schemas/attempt.py` | Pydantic schemas for request/response serialization across attempt lifecycle |
| `backend/app/services/attempt_service.py` | Service managing attempt creation, snapshotting, limits, interim upsert, adaptive logic |
| `backend/app/services/grading_service.py` | Deterministic server grading engine for 5 question types, expiry handling, outbox emission |
| `backend/app/api/v1/endpoints/attempts.py` | FastAPI route endpoints for attempt retrieval, response saving, next-question, submit, result |
| `backend/tests/test_attempt_lifecycle.py` | Automated tests for attempt start, snapshotting, limits, interim responses, expiry, isolation |
| `backend/tests/test_server_grading.py` | Automated tests for grading all 5 question types, normalization, partial credit, anti-tampering |
| `backend/tests/test_attempt_concurrency_and_outbox.py` | Automated tests for submit idempotency, transactional outbox emission, adaptive practice |

---

## 2. Modified Files

| File Path | Modification Summary |
|:---|:---|
| `backend/app/models/assessment.py` | Added `attempts` relationship back-populating to `AssessmentAttempt` |
| `backend/app/models/enrollment.py` | Added `attempts` relationship back-populating to `AssessmentAttempt` |
| `backend/app/models/user.py` | Added `assessment_attempts` relationship back-populating to `AssessmentAttempt` |
| `backend/app/models/__init__.py` | Exported `AssessmentAttempt`, `AttemptResponse`, `DomainOutboxEvent` |
| `backend/app/api/v1/endpoints/assessments.py` | Added `POST /{assessment_id}/attempts` endpoint delegating to `AttemptService.start_attempt` |
| `backend/app/api/v1/router.py` | Mounted `attempts.router` under `/api/v1/attempts` tag |
| `backend/tests/test_migrations_postgres.py` | Added Phase 6 tables (`assessment_attempts`, `attempt_responses`, `domain_outbox_events`) to verification list |
