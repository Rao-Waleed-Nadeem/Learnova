# Backend Module Guide (`backend/`)

This document is the local instruction contract for AI agents modifying or extending the **Learnova FastAPI Backend**.

---

## 1. Purpose of the Module
The `backend/` directory contains the core server application for the Learnova platform, built with **FastAPI** (Python 3.13) and **SQLAlchemy 2.0**. It serves as the authoritative source of truth for all business logic, data persistence, user authentication, RBAC authorization, Bayesian Knowledge Tracing (BKT) mastery evaluations, server-authoritative assessment grading, and teacher-governed AI question generation. It also hosts the in-process **Durable Outbox Processor** running within FastAPI's lifespan.

---

## 2. Responsibilities
- Serving the versioned REST API (`/api/v1/*`) and backward-compatible system health endpoints (`/health`, `/ready`).
- Enforcing Role-Based Access Control (RBAC) across `admin`, `teacher`, and `student` roles.
- Managing persistence across 16 SQLAlchemy domain models using PostgreSQL 17 or SQLite.
- Executing server-authoritative grading across 5 question types (`multiple_choice`, `true_false`, `fill_blank`, `matching`, `short_answer`).
- Enforcing Teacher AI Governance (SSD-08): quarantining AI question candidates in `ai_question_candidates` with `pending_review` status, and atomically promoting them on teacher approval.
- Enforcing prerequisite DAG cycle detection for curriculum topics using DFS and Kahn's algorithm.
- Managing asynchronous, idempotent gamification event processing (XP, streaks, badges) via `OutboxProcessor`.
- Interfacing with LLM providers (Google Gemini 2.5 Flash and Antigravity CLI subprocess).

---

## 3. Internal Directory Structure
```text
backend/
â”œâ”€â”€ alembic.ini                         # Alembic migration configuration
â”œâ”€â”€ Dockerfile                          # Production container specification (Python 3.13-slim)
â”œâ”€â”€ requirements.txt                    # Backend Python package dependencies
â”œâ”€â”€ alembic/                            # Database migrations (versions 0001 to 0013)
â”‚   â”œâ”€â”€ env.py                          # Alembic environment runner loading all models
â”‚   â””â”€â”€ versions/                       # 13 migration script revisions
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ main.py                         # FastAPI app entry point, lifespan, outbox runner
â”‚   â”œâ”€â”€ core/
â”‚   â”‚   â”œâ”€â”€ config.py                   # Pydantic BaseSettings, environment variable parsing
â”‚   â”‚   â”œâ”€â”€ dependencies.py             # FastAPI dependency injection (get_db, get_current_user, require_role)
â”‚   â”‚   â”œâ”€â”€ security.py                 # Password hashing (bcrypt) and JWT encode/decode
â”‚   â”‚   â”œâ”€â”€ sanitizer.py                # Regex PII scrubber and prompt boundary defense
â”‚   â”‚   â””â”€â”€ logging.py                  # Structured logging configuration
â”‚   â”œâ”€â”€ db/
â”‚   â”‚   â”œâ”€â”€ base.py                     # SQLAlchemy DeclarativeBase
â”‚   â”‚   â”œâ”€â”€ session.py                  # Engine setup, sessionmaker, check_db_connection
â”‚   â”‚   â””â”€â”€ init_db.py                  # Schema initialization and optional seed utilities
â”‚   â”œâ”€â”€ models/                         # 16 SQLAlchemy declarative domain models
â”‚   â”‚   â”œâ”€â”€ user.py, role.py, profile.py
â”‚   â”‚   â”œâ”€â”€ course.py, course_teacher.py
â”‚   â”‚   â”œâ”€â”€ topic.py, topic_prerequisite.py
â”‚   â”‚   â”œâ”€â”€ lesson.py, resource.py, lesson_completion.py
â”‚   â”‚   â”œâ”€â”€ question.py, assessment.py, attempt.py
â”‚   â”‚   â”œâ”€â”€ mastery.py, gamification.py, outbox.py, ai.py
â”‚   â”‚   â””â”€â”€ security_audit_event.py, session.py
â”‚   â”œâ”€â”€ schemas/                        # Pydantic v2 request/response DTOs
â”‚   â”œâ”€â”€ services/                       # 18 Domain business logic services
â”‚   â”œâ”€â”€ workers/
â”‚   â”‚   â””â”€â”€ outbox_worker.py            # In-process OutboxProcessor, batching, advisory locks
â”‚   â”œâ”€â”€ ai/
â”‚   â”‚   â”œâ”€â”€ adapter.py                  # ILLMServiceAdapter, GeminiServiceAdapter, MockLLMAdapter
â”‚   â”‚   â”œâ”€â”€ agy_adapter.py              # Subprocess runner for Antigravity CLI (agy / agentapi)
â”‚   â”‚   â”œâ”€â”€ privacy.py                  # Regex PII scrubber
â”‚   â”‚   â””â”€â”€ prompts/                    # External markdown prompt templates
â”‚   â””â”€â”€ api/
â”‚       â””â”€â”€ v1/
â”‚           â”œâ”€â”€ router.py               # Aggregated API v1 router
â”‚           â””â”€â”€ endpoints/              # 16 domain endpoint controllers
â””â”€â”€ tests/                              # Pytest test suite (230+ unit & integration tests)
```

---

## 4. Important Files & Entry Points
- `backend/app/main.py`: Application entry point. Instantiates `FastAPI`, initializes CORS, mounts `api_router`, defines root `/health` and `/ready`, and manages the in-process `OutboxProcessor` via `lifespan`.
- `backend/app/api/v1/router.py`: Central router aggregator including all 16 endpoint modules.
- `backend/app/core/config.py`: `Settings` class loading configuration from `.env`.
- `backend/app/core/dependencies.py`: Core dependency injectors (`get_db`, `get_current_user`, `require_role`).
- `backend/app/workers/outbox_worker.py`: Concurrency-safe background processor executing domain outbox events.
- `backend/app/ai/adapter.py`: Provider-neutral LLM integration connecting to Google Gemini 2.5 Flash and AGY CLI.

---

## 5. Important Classes and Functions
- `OutboxProcessor`: Asynchronous runner dispatching `domain_outbox_events` with advisory lock leader election (`OUTBOX_ADVISORY_LOCK_ID = 742918`).
- `QuestionService`: Question authoring, validation, and teacher course access scoping (`verify_course_teacher_access()`).
- `AICandidateService`: AI question quarantine management, candidate updating, and atomic approval (`approve_candidate()`).
- `GradingService`: Server-authoritative grading engine evaluating student responses against segregated answer keys.
- `DAGService`: Prerequisite graph cycle prevention using topological DFS.
- `MasteryService`: 4-parameter Bayesian Knowledge Tracing (BKT) engine calculating topic mastery decimals.
- `GamificationService`: Append-only XP ledger manager and badge condition evaluator.

---

## 6. Dependencies
- **Web & Core:** `fastapi` (>=0.115.0), `uvicorn[standard]` (>=0.32.0), `pydantic` (>=2.9.0), `pydantic-settings` (>=2.6.0).
- **Database & ORM:** `sqlalchemy` (>=2.0.36), `alembic` (>=1.13.3), `psycopg2-binary` (>=2.9.9).
- **Security & Auth:** `pyjwt` (>=2.9.0), `bcrypt` (>=4.2.0), `email-validator` (>=2.2.0).
- **Testing:** `pytest` (>=8.3.3), `httpx` (>=0.27.2).

---

## 7. Communication with Other Modules
- **Frontend (Port 3000):** Frontend communicates with backend via `/api/v1/*` endpoints reverse-proxied by Express.
- **Database (PostgreSQL / SQLite):** Backend connects using SQLAlchemy synchronous sessions with scoped connection pooling.
- **External AI Providers:** Backend connects to Google Gemini via HTTP API and Antigravity CLI via subprocess execution.

---

## 8. Existing Architectural Patterns
- **Option B Modular Monolith:** No separate worker containers; background tasks run in-process within FastAPI lifespan.
- **Transactional Outbox Pattern:** State changes (e.g. assessment submission) insert outbox events in the same atomic transaction.
- **Repository/Service Separation:** Route controllers delegate to service classes; service classes orchestrate models and sessions.
- **Strict Quarantine Pattern:** Generated AI content is quarantined with `status = 'pending_review'` until explicit teacher promotion.

---

## 9. Common Development Operations

### Start Backend Locally:
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger documentation is available at `http://localhost:8000/docs`.

### Run Database Migrations:
```powershell
cd backend
alembic upgrade head
```

---

## 10. Important Restrictions
1. **Never Expose Answer Keys:** Endpoints serving assessment questions to students must strip all solution keys and correctness flags.
2. **Never Commit AI Candidates Directly to Questions Bank:** AI questions must be saved to `ai_question_candidates` with `pending_review`.
3. **No Direct Model Updates in Route Handlers:** All mutations must go through service layer methods.
4. **Row-Level Lock on Approval:** Always acquire `with_for_update()` when transitioning an AI candidate to approved.

---

## 11. Relevant Testing Procedures
Run backend tests using `pytest`:
```powershell
# Run entire backend test suite
python -m pytest backend/tests

# Run focused tests
python -m pytest backend/tests/test_question_bank.py
python -m pytest backend/tests/test_ai_candidate_governance.py
python -m pytest backend/tests/test_server_grading.py
python -m pytest backend/tests/test_outbox_concurrency.py
```

---

## 12. Related Technical Documentation
- [`docs/architecture.md`](file:///c:/Learnova/docs/architecture.md): Deep architectural specification and diagrams.
- [`docs/database-schema.md`](file:///c:/Learnova/docs/database-schema.md): Detailed database tables, relationships, and indexes.
- [`docs/api-documentation.md`](file:///c:/Learnova/docs/api-documentation.md): Complete REST endpoint documentation.
- [`backend/alembic/AGENTS.md`](file:///c:/Learnova/backend/alembic/AGENTS.md): Database migration guide.
