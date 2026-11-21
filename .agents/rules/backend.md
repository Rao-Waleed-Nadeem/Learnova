---
trigger: glob
globs: "**/backend/**"
description: Architecture, service patterns, API design, and testing standards for the FastAPI backend.
---

# Backend Development Rules

These rules apply when developing or modifying code within `backend/`.

---

## 1. FastAPI Architecture & Router Registration

- **Entry Point:** `backend/app/main.py`.
- **API Router Aggregator:** `backend/app/api/v1/router.py`. All new version 1 endpoints must be included in `api_router` with descriptive prefixes and OpenAPI tags:
  ```python
  from app.api.v1.endpoints import my_feature
  api_router.include_router(my_feature.router, prefix="/my-feature", tags=["my-feature"])
  ```
- **Lifespan Context:** The in-process `OutboxProcessor` starts and stops in `lifespan` in `main.py`. Do NOT add blocking synchronous operations to startup or shutdown.

---

## 2. Service Layer Responsibilities

- **Strict Service Isolation:** Route handlers must only parse requests, extract authenticated user dependencies, invoke a service method, and return a Pydantic response DTO.
- **Transaction Boundaries:** Database session commits (`db.commit()`) belong in the service layer or route wrapper. Use context managers or single-transaction patterns to ensure atomicity.
- **Existing Services Inventory:**
  - `admin_service.py`: Admin user management, directory listing, audit logs.
  - `ai_candidate_service.py`: AI question candidate quarantine, editing, atomic promotion with row locking.
  - `ai_service.py`: Lesson explanation caching and LLM prompt generation.
  - `ai_session_service.py`: Multi-turn AGY / Gemini persistent chat sessions.
  - `analytics_service.py`: Student, teacher, and administrator aggregated metrics.
  - `assessment_service.py`: Assessment authoring, composition, publication gate checks.
  - `attempt_service.py`: Assessment attempt lifecycle, concurrency guards, expiration.
  - `audit_service.py`: Security audit event recording.
  - `auth_service.py`: User registration, credential verification, JWT issuance, session management.
  - `course_service.py`: Course CRUD, syllabus structure.
  - `curriculum_service.py`: Topics, lessons, and resources management.
  - `dag_service.py`: Topic prerequisite DAG cycle detection (DFS / Kahn's algorithm).
  - `enrollment_service.py`: Student course enrollments, lesson completion tracking.
  - `gamification_service.py`: XP ledger transactions, streaks, badge evaluations, privacy-preserving leaderboard.
  - `grading_service.py`: Server-authoritative scoring across all 5 question types.
  - `learning_path_service.py`: Next recommended topic and remediation planning.
  - `mastery_service.py`: Bayesian Knowledge Tracing (BKT) engine and audit trail.
  - `question_service.py`: Question Bank management, teacher course verification.

---

## 3. Request Validation & Pydantic DTOs

- All request bodies and query parameters must be validated using Pydantic v2 schemas in `backend/app/schemas/`.
- Never accept raw unstructured `dict` objects in endpoint parameters when a schema can be declared.
- Explicitly validate fields using Pydantic `Field(..., min_length=..., ge=...)` or validator methods.
- Response models should be declared on route decorators (`response_model=MyResponseSchema`) to ensure sensitive fields (e.g. `hashed_password`, `answer_key`) are stripped from outputs.

---

## 4. Authentication & RBAC Authorization

- Inject authenticated users using `app.core.dependencies`:
  - `get_current_user`: Returns the authenticated `User` entity or raises `401 Unauthorized`.
  - `require_role(role_name)`: Enforces user role (`admin`, `teacher`, `student`) or raises `403 Forbidden`.
  - `get_db`: Yields a scoped SQLAlchemy session (`SessionLocal`).
- **Teacher Course Authorization:** For all teacher operations on courses, topics, lessons, questions, or AI candidates, verify access using `QuestionService.verify_course_teacher_access(db, course_id, actor)`.

---

## 5. Error Handling & Status Codes

- Always raise `fastapi.HTTPException` with specific HTTP status codes and actionable error details:
  ```python
  from fastapi import HTTPException, status

  if not entity:
      raise HTTPException(
          status_code=status.HTTP_404_NOT_FOUND,
          detail="Course not found",
      )
  ```
- Use `status.HTTP_422_UNPROCESSABLE_ENTITY` for domain validation failures (e.g., prerequisite cycles, publication quality gates).

---

## 6. Backend Testing Standards

- All backend tests reside in `backend/tests/`.
- Execute tests using `pytest`:
  ```powershell
  # Full test suite
  python -m pytest backend/tests

  # Focused test execution
  python -m pytest backend/tests/test_question_bank.py
  python -m pytest backend/tests/test_ai_candidate_governance.py
  python -m pytest backend/tests/test_server_grading.py
  ```
- Use the shared `db_session` and `client` fixtures from `backend/tests/conftest.py`.
- Tests run against an isolated SQLite database or PostgreSQL test instance. Ensure model queries and migrations support both dialects.
