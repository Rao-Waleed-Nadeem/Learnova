# Phase 9 Plan — AI Adapter, Persistent Caching and Teacher Governance

**Phase:** Phase 9 — AI Integration & Review (`PHASE-09`)  
**Stage:** Stage A, B, and C Completed (Implementation & Verification Complete)  
**Governing Standard:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md` Sequences E & F; `README_FIRST.md`; `REPO_INTEGRATION_NOTES.md`; `docs/phases/PHASE-09_AI_INTEGRATION_GOVERNANCE.md`; `Learnova_Master_Backend_Implementation_Blueprint.md` Section 3.4; `Learnova_SRS_Final_Aligned_V2 (1).docx` Section 3.2.7.  
**Baseline Commit:** `3b3a6d52775ac972026a5f22dd1353e51a0d4783`  
**Date:** 2026-11-09  
**Status:** **IMPLEMENTED & VERIFIED — READY FOR OWNER ACCEPTANCE (SEQUENCE F)**

---

## 1. Executive Summary & Objective

This plan establishes the implementation plan for Phase 9 (AI Adapter, Persistent Caching, and Teacher Governance) as mandated by `UNIVERSAL_ANTIGRAVITY_PROMPT.md` and `docs/phases/PHASE-09_AI_INTEGRATION_GOVERNANCE.md`.

The existing architecture is preserved:
- FastAPI modular monolith (`/api/v1`) without introducing microservices, Kafka, RabbitMQ, or Redis.
- React/Vite/Express frontend runtime remains on Port 3000 with HMR preserved.
- Existing database tables (`questions`, `assessments`, `users`, `courses`, `topics`) are preserved without destructive changes.
- Additive schema migration `20261109_0012` introduces quarantined candidate questions (`ai_question_candidates`) and durable, versioned explanation cache (`ai_content_cache`).
- Quarantined candidate workflow: AI generated questions **never** automatically become official questions or enter assessments until an assigned teacher or administrator audits, edits, and explicitly approves them.
- Short-answer grading policy: Phase 5's `manual_review` / `exact_match` policy remains authoritative; LLM is never used to automatically grade student assessment responses.

---

## 2. Audit Findings & Current State

### 2.1 Current Express Routes in `frontend/server.ts`
- `POST /api/ai/generate-questions`: Directly invokes `@google/genai` with `gemini-2.5-flash` or falls back to an in-memory deterministic generator. Returns candidate array directly to browser.
- `POST /api/ai/simplify-lesson`: Handles modes `simplify`, `analogy`, `example`, `custom`. Uses an in-memory process-local JavaScript `Map` (`lessonAICache`) which loses all cached explanations on process restart.

### 2.2 Frontend Callers
- `frontend/src/components/student/AIHelperPanel.tsx`: `fetch('/api/ai/simplify-lesson')`.
- `frontend/src/pages/teacher/AIReviewPage.tsx`: `fetch('/api/ai/generate-questions')`.
- `frontend/src/services/storageService.ts`: Stores generated candidates in browser `localStorage` and promotes approved questions into client-side state.

### 2.3 Backend Foundation
- `backend/app/models/question.py` already includes constraints:
  - `status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')`
  - `source IN ('teacher', 'ai_generated')`
- `backend/app/services/question_service.py` has rigorous validation and decomposition logic for all 5 question types (`multiple_choice`, `true_false`, `fill_blank`, `matching`, `short_answer`) and teacher course scoping via `verify_course_teacher_access`.
- `backend/app/core/config.py` uses `pydantic-settings` with secret masking.
- `httpx>=0.27.2` is already installed in `requirements.txt` and available for robust HTTP client interaction with provider APIs.

---

## 3. Exact File Change Scope

### 3.1 New Files to be Created (Stage B)
1. `backend/app/ai/__init__.py`: Package init.
2. `backend/app/ai/adapter.py`: Protocol `ILLMServiceAdapter`, `GeminiServiceAdapter` implementation, and provider-neutral dataclasses (`AIGenerateRequest`, `AIGenerateResult`, `AISimplifyRequest`, `AISimplifyResult`).
3. `backend/app/models/ai.py`: SQLAlchemy models `AICandidateQuestion` and `AIContentCache`.
4. `backend/alembic/versions/20261109_0012_d5_ai_governance_and_cache.py`: Additive Alembic migration creating `ai_question_candidates` and `ai_content_cache` tables with foreign keys and indices.
5. `backend/app/schemas/ai.py`: Pydantic validation schemas for requests, responses, candidate inspection, candidate approval, and rejection.
6. `backend/app/services/ai_service.py`: Domain service orchestrating student lesson tutoring, input sanitization, PII minimization, durable caching, and adapter invocation.
7. `backend/app/services/ai_candidate_service.py`: Domain service handling teacher candidate generation, quarantined persistence, listing, editing, approval promotion through `QuestionService`, and audited rejection.
8. `backend/app/api/v1/endpoints/ai.py`: FastAPI endpoints under `/api/v1/ai`.
9. `backend/tests/test_ai_adapter.py`: Unit tests for `ILLMServiceAdapter`, Gemini adapter, payload validation, and deterministic fallback.
10. `backend/tests/test_ai_cache.py`: Tests for durable content cache hit/miss, TTL expiration, and prompt version invalidation.
11. `backend/tests/test_ai_candidate_governance.py`: Tests for candidate generation quarantine, teacher editing, approval promotion to `questions`, duplicate approval idempotency, and rejection.
12. `backend/tests/test_ai_authorization.py`: Tests for role-based access control: student approval denial (403), unassigned teacher denial (403), student access to enrolled lessons, and answer key leakage prevention.
13. `frontend/src/services/api/aiApi.ts`: Frontend TypeScript client communicating with FastAPI `/api/v1/ai`.

### 3.2 Existing Files to be Modified (Stage B)
1. `backend/app/core/config.py`: Add `GEMINI_API_KEY: Optional[str] = None`, `GEMINI_MODEL: str = "gemini-2.5-flash"`, `AI_TIMEOUT_SECONDS: int = 15`, `AI_CACHE_TTL_DAYS: int = 30`.
2. `backend/app/models/__init__.py`: Register `AICandidateQuestion` and `AIContentCache` for metadata discovery.
3. `backend/app/api/v1/router.py`: Register `ai.router` under prefix `/ai`.
4. `backend/app/services/question_service.py`: Add promotion helper `create_question_from_candidate()`.
5. `frontend/src/components/student/AIHelperPanel.tsx`: Connect to FastAPI AI endpoint via `aiApi.ts` with transparent fallback.
6. `frontend/src/pages/teacher/AIReviewPage.tsx`: Connect to FastAPI candidate generation, listing, approval, and rejection endpoints.
7. `frontend/server.ts`: Convert legacy Express endpoints `/api/ai/*` into a thin backward-compatibility proxy forwarding to FastAPI port 8000, retiring process-local `@google/genai` and `Map` cache.
8. `API_CONTRACT.md`: Update Section 3.7 with finalized `/api/v1/ai` endpoints.
9. `DECISIONS.md`: Record `DEC-P9-001` (Quarantined AI Candidate Governance), `DEC-P9-002` (Durable PostgreSQL Content Cache), and `DEC-P9-003` (Thin Express Proxy Cutover).
10. `IMPLEMENTATION_STATUS.md`: Update status matrix reflecting Phase 9 completion.

---

## 4. API Contract & Payload Specifications

### 4.1 Student Tutoring: `POST /api/v1/ai/simplify-lesson`
- **Authorization:** Authenticated student enrolled in the course, assigned teacher, or administrator.
- **Request Body:**
  ```json
  {
    "lesson_id": "uuid (optional)",
    "course_title": "string",
    "topic_title": "string",
    "lesson_title": "string",
    "lesson_content": "string (bounded to max 4000 chars)",
    "mode": "simplify | analogy | example | custom",
    "custom_prompt": "string (optional, max 500 chars)"
  }
  ```
- **Response Body (`200 OK`):**
  ```json
  {
    "success": true,
    "explanation": "markdown content",
    "source": "gemini | gemini_cache | deterministic_fallback",
    "is_cached": false,
    "prompt_used": "string"
  }
  ```
- **Security & Privacy:** Student identifiers and personal details are strictly stripped from LLM prompts. Prompt content is bounded.

### 4.2 Candidate Question Generation: `POST /api/v1/ai/generate-questions`
- **Authorization:** Assigned teacher (`course_teachers`) or administrator. (Students receive `403 Forbidden`).
- **Request Body:**
  ```json
  {
    "course_id": "uuid",
    "topic_id": "uuid",
    "source_content": "string (optional syllabus context, max 4000 chars)",
    "question_types": ["multiple_choice", "true_false", "fill_blank", "matching", "short_answer"],
    "difficulty": "easy | medium | hard",
    "count": 3
  }
  ```
- **Response Body (`200 OK`):**
  ```json
  {
    "success": true,
    "candidates": [
      {
        "id": "uuid",
        "course_id": "uuid",
        "topic_id": "uuid",
        "prompt": "string",
        "type": "multiple_choice",
        "difficulty": "medium",
        "points": 2,
        "explanation": "string",
        "source_context": "string",
        "status": "pending_review",
        "payload": { ... },
        "answer_key": { ... },
        "created_at": "timestamp"
      }
    ],
    "source": "gemini | deterministic_fallback"
  }
  ```
- **Governance Invariant:** Generated candidates are persisted **only** in `ai_question_candidates` with `status = "pending_review"`. They do **not** enter `questions` and are **never** rendered on student assessments.

### 4.3 Candidate Management Endpoints (Teacher Portal)
- `GET /api/v1/ai/candidates?course_id={id}&status={status}`: List quarantined candidates.
- `GET /api/v1/ai/candidates/{id}`: Detailed candidate inspection.
- `PATCH /api/v1/ai/candidates/{id}`: Edit candidate prompt, difficulty, points, options, or rubric before approval.
- `POST /api/v1/ai/candidates/{id}/approve`: Validate candidate format, promote to official Question Bank via `QuestionService` with `source = "ai_generated"`, mark candidate `approved`, link `approved_question_id`. Idempotent.
- `POST /api/v1/ai/candidates/{id}/reject`: Mark candidate `rejected` with audit reason. Idempotent.

---

## 5. Persistence & Migration Design

### Migration `20261109_0012_d5_ai_governance_and_cache.py`
Down revision: `20261109_0011`.

#### 1. Table `ai_question_candidates`
- `id` (UUID, PK)
- `course_id` (UUID, FK `courses.id`, ON DELETE CASCADE, NOT NULL, INDEX)
- `topic_id` (UUID, FK `topics.id`, ON DELETE CASCADE, NOT NULL, INDEX)
- `author_id` (UUID, FK `users.id`, ON DELETE SET NULL, NULLABLE, INDEX)
- `type` (VARCHAR(32), NOT NULL)
- `difficulty` (VARCHAR(16), NOT NULL)
- `points` (INTEGER, NOT NULL, DEFAULT 1)
- `prompt` (TEXT, NOT NULL)
- `explanation` (TEXT, NULLABLE)
- `source_context` (TEXT, NULLABLE)
- `payload` (JSON / JSONB, NOT NULL)
- `answer_key` (JSON / JSONB, NOT NULL)
- `status` (VARCHAR(32), NOT NULL, DEFAULT 'pending_review', INDEX)
- `rejection_reason` (TEXT, NULLABLE)
- `approved_question_id` (UUID, FK `questions.id`, ON DELETE SET NULL, NULLABLE, UNIQUE)
- `provider` (VARCHAR(64), NOT NULL)
- `model` (VARCHAR(64), NOT NULL)
- `prompt_version` (VARCHAR(32), NOT NULL, DEFAULT 'v1')
- `created_at` (TIMESTAMP WITH TIME ZONE, NOT NULL)
- `updated_at` (TIMESTAMP WITH TIME ZONE, NOT NULL)
- Constraints:
  - `ck_ai_candidates_type`: Validates 5 supported question types.
  - `ck_ai_candidates_difficulty`: `'easy', 'medium', 'hard'`.
  - `ck_ai_candidates_status`: `'pending_review', 'approved', 'rejected'`.

#### 2. Table `ai_content_cache`
- `id` (UUID, PK)
- `cache_key` (VARCHAR(255), UNIQUE, NOT NULL, INDEX)
- `content_type` (VARCHAR(64), NOT NULL)
- `content` (TEXT, NOT NULL)
- `source` (VARCHAR(64), NOT NULL)
- `provider` (VARCHAR(64), NOT NULL)
- `model` (VARCHAR(64), NOT NULL)
- `prompt_version` (VARCHAR(32), NOT NULL, DEFAULT 'v1')
- `created_at` (TIMESTAMP WITH TIME ZONE, NOT NULL)
- `expires_at` (TIMESTAMP WITH TIME ZONE, NULLABLE, INDEX)

---

## 6. Threat Model & Security Controls

1. **API Key Confidentiality:** `GEMINI_API_KEY` is parsed server-side via `pydantic-settings` and masked in representations. It is never emitted in API responses, logs, or frontend code.
2. **Student Identity / PII Protection:** Student IDs, emails, names, and IP addresses are completely excluded from prompts dispatched to LLM providers.
3. **Teacher Scoping & RBAC:** Course access is validated via `CourseTeacher` and `creator_id`. Teachers cannot generate questions for or approve questions in courses they are not assigned to. Students are strictly forbidden (403) from candidate endpoints.
4. **Answer Key Protection:** Answer keys, accepted answers, and grading rubrics are strictly isolated to teacher-authenticated endpoints. Student-facing tutoring endpoints never touch or expose question answer keys.
5. **Prompt Injection & Resource Exhaustion Defense:** Lesson content and user prompts have strict character length ceilings (1,500–4,000 chars for content, 500 chars for custom prompts). Provider calls have a 15-second timeout and maximum 1 retry.
6. **Academic Integrity Protection:** Unreviewed LLM outputs are physically quarantined in `ai_question_candidates`. Under no circumstances is a candidate question made visible to students without explicit teacher approval. Automatic LLM grading of short answers is strictly prohibited.

---

## 7. Verification & Test Plan (Stage C)

| Test Identifier | Test Module | Verification Target |
|:---|:---|:---|
| `P9-01` | `test_ai_adapter.py` | Validated Gemini provider response parsing for question candidates and lesson explanations |
| `P9-02` | `test_ai_adapter.py` | Controlled deterministic fallback when `GEMINI_API_KEY` is missing; no secret leakage |
| `P9-03` | `test_ai_adapter.py` | Provider timeout handling with bounded retry and controlled error response |
| `P9-04` | `test_ai_cache.py` | Durable content cache hit returns stored explanation with `is_cached = True` |
| `P9-05` | `test_ai_cache.py` | Cache invalidation on prompt version change or TTL expiration |
| `P9-06` | `test_ai_adapter.py` | Malformed model JSON safely falls back without corrupting database |
| `P9-07` | `test_ai_candidate_governance.py` | Generated questions persist strictly in `ai_question_candidates` with `pending_review` |
| `P9-08` | `test_ai_authorization.py` | Student attempt to access candidate generation, listing, or approval returns 403 |
| `P9-09` | `test_ai_authorization.py` | Teacher attempt to generate or approve candidates for unassigned course returns 403 |
| `P9-10` | `test_ai_candidate_governance.py` | Assigned teacher approval promotes candidate to official `Question` with `source = 'ai_generated'` |
| `P9-11` | `test_ai_candidate_governance.py` | Duplicate approval requests are idempotent and do not create duplicate questions |
| `P9-12` | `test_ai_candidate_governance.py` | Candidate rejection updates status to `rejected`, stores reason, and creates no question |
| `P9-13` | `test_ai_authorization.py` | Student API response never leaks answer key or grading rubric |
| `P9-14` | `test_ai_service.py` | Prompt construction strips student identifiers and bounds context length |
| `P9-15` | `test_ai_adapter.py` | Legacy Express proxy route forwards seamlessly to FastAPI `/api/v1/ai` |
| `P9-16` | Full Platform Backend Suite | Full backend test suite passes (all 146+ tests) |
| `P9-17` | Frontend Vitest Suite | 29/29 Vitest tests pass cleanly |
| `P9-18` | Frontend Build | Vite production build compiles with 0 errors |

---

## 8. Rollback & Contingency Strategy

- **Migration Rollback:** Migration `20261109_0012` implements clean `downgrade()` dropping `ai_content_cache` and `ai_question_candidates`. Tested on disposable SQLite and PostgreSQL databases.
- **Service Isolation:** The AI subsystem is additive and completely decoupled from existing authentication, curriculum, assessment attempt, grading, and gamification modules. If the AI adapter encounters issues, the deterministic fallback engine maintains 100% platform availability.
- **Express Compatibility Bridge:** Express routes `/api/ai/*` remain operational throughout cutover, ensuring zero downtime for frontend clients.

---

## 9. Stage A Mandatory Stop

Per `UNIVERSAL_ANTIGRAVITY_PROMPT.md`:
> Stage rule: Within Phase 7, Phase 8, and Phase 9, strictly execute Stage A (Plan only) -> Owner approval -> Stage B (Implementation) -> Stage C (Verification and Evidence) -> Stop and present evidence.

Execution is paused at **Stage A**. No implementation code will be written until the project owner explicitly reviews and approves this plan.
