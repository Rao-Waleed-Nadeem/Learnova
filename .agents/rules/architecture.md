---
trigger: always_on
description: Cross-cutting architectural constraints, modular monolith boundaries, and core system invariants for Learnova.
---

# Architecture & Structural Rules

These rules apply across the entire Learnova codebase. Every AI agent must ensure that any code changes adhere strictly to the **Option B Modular Monolith** topology and related architectural invariants.

---

## 1. Modular Monolith Boundaries

Learnova is deliberately designed as a **single-service Modular Monolith**:
- **Backend Process (`backend/`):** A unified FastAPI application hosting REST endpoints, domain services, database models, and the in-process transactional outbox processor.
- **Frontend Process (`frontend/`):** React 19 single-page application served and reverse-proxied by Express (`frontend/server.ts`).
- **Database (`PostgreSQL 17` / `SQLite`):** Authoritative relational database.

### Strict Boundary Rules:
1. **No External Message Brokers:** Do NOT introduce Redis, Celery, RabbitMQ, Kafka, or separate background worker containers. All asynchronous operations must use the in-process `OutboxProcessor` running inside FastAPI `lifespan` (`backend/app/main.py`).
2. **Encapsulate Domain Logic in Services:** API route handlers (`backend/app/api/v1/endpoints/`) must remain thin orchestrators. Business logic, transactional boundaries, entity assembly, and permission checks belong exclusively in `backend/app/services/`.
3. **No Direct Database Writes Bypassing Services:** Do not execute raw SQL modifications or direct ORM entity commits from API routes or test endpoints without delegating to the appropriate service class.
4. **Dependency Direction:**
   - Routes -> Services -> Models / DB Session.
   - Routes must NOT import from other routes.
   - Lower-level models must NOT import from higher-level services.

---

## 2. Core System Invariants

### 2.1 Teacher Governance for AI Content (SSD-08, DEC-P9-001)
- **Quarantine Invariant:** AI-generated assessment questions generated via Gemini or Antigravity CLI MUST be inserted into `ai_question_candidates` with `status = "pending_review"`.
- **Zero Live Leaks:** Under NO circumstances should an unreviewed AI question candidate be written directly to `questions` or included in live assessments.
- **Atomic Promotion:** Approval (`POST /api/v1/ai/candidates/{id}/approve`) must acquire a database row-level lock (`with_for_update()`), copy the validated candidate to `questions` with `source = "ai_generated"`, set `status = "approved"`, populate `approved_question_id`, and write a security audit log in a single atomic transaction.
- **Teacher Course Authorization:** Teachers are strictly authorized only for courses assigned to them in `course_teachers` via `QuestionService.verify_course_teacher_access(db, course_id, actor)`. Global access is reserved for Administrators (`admin`).

### 2.2 Answer Key Segregation & Server-Authoritative Grading (DEC-P5-001)
- **Zero Answer Exposure:** Question payloads delivered to student clients must NEVER contain `is_correct`, `solution_pairs`, or `answer_key`.
- **Server-Authoritative Evaluation:** All grading is performed server-side by `GradingService`. Student responses submitted to `POST /api/v1/attempts/{id}/submit` are graded against the segregated `answer_key` stored in the database.
- **Attempt Question Snapshots:** When an assessment attempt is started (`POST /api/v1/attempts/start`), question payloads and point values are frozen into immutable attempt snapshots to protect against retroactive assessment edits.

### 2.3 Curriculum Hierarchy & Question Categorization
- **Strict Hierarchy:** `Course` -> `Topic` -> `Lesson` -> `LearningResource`.
- **Question Categorization:** Questions in the Question Bank are categorized and browsed by `Course -> Lesson`. Uncategorized questions are placed under general course-level pool.
- **Lesson-Scoped AI Generation:** When a teacher generates questions, resource inputs are filtered strictly to learning resources belonging to the selected lesson.

### 2.4 Topic Prerequisite DAG & Kahn's Cycle Prevention (DEC-P4-002)
- Topic prerequisites form a Directed Acyclic Graph (DAG).
- Before persisting any prerequisite relationship in `topic_prerequisites`, the application must execute cycle detection using DFS or Kahn's topological sort (`backend/app/services/dag_service.py` and `frontend/src/utils/dag.ts`).
- Circular dependencies (e.g. A -> B and B -> A, or transitive A -> B -> C -> A) must return `HTTP_422_UNPROCESSABLE_ENTITY` and be blocked client-side.

### 2.5 Normalized Bayesian Knowledge Tracing (BKT) Mastery (DEC-001)
- Mastery probabilities are calculated using the 4-parameter BKT model ($P(L_0)$, $P(T)$, $P(G)$, $P(S)$) in `MasteryService`.
- Mastery values in PostgreSQL are normalized decimals from `0.0000` to `1.0000` (`DECIMAL(5,4)`).
- APIs serialize mastery as an integer percentage (`0` to `100`) for frontend presentation compatibility.

### 2.6 Outbox Event Reliability & Idempotency (DEC-P8-002, DEC-P12-001)
- Assessment submissions write academic grades synchronously, then enqueue a `domain_outbox_events` record with `event_type = "assessment.completed"` in the same database transaction.
- The in-process `OutboxProcessor` polls `domain_outbox_events` with `FOR UPDATE SKIP LOCKED` (or advisory lock leader election) and awards XP idempotently via unique transaction keys in `xp_ledger`.
- Duplicate XP or badge awards are strictly prevented by database uniqueness constraints and idempotency keys.

---

## 3. Communication Patterns

- **Frontend -> Backend:** All client communication goes to `/api/v1/*` or `/api/ai/*`. In development and production, Express (`frontend/server.ts`) reverse-proxies these to FastAPI (`http://127.0.0.1:8000`).
- **Backend -> Outbox:** Fire-and-forget events are written to `domain_outbox_events` within the originating service transaction.
- **Backend -> LLM Services:** Outgoing calls to Google Gemini or AGY CLI subprocess must pass through `backend/app/ai/adapter.py` and sanitize prompts using `backend/app/core/sanitizer.py`.
