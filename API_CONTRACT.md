# Learnova API Contract Specification

**Document Status:** Baseline Approved for Phase 0  
**Authority:** `Learnova_Master_Backend_Implementation_Blueprint.md`, Sections 8 & 14.1  
**Last Updated:** Phase 0 Baseline Audit (2026-11-06)

---

## 1. Overview & Architectural Boundaries

Learnova is transitioning from a client-side mock/localStorage and Express architecture to a FastAPI backend backed by PostgreSQL 17.

### Ownership Boundary
- **FastAPI (Target Port 8000):** Authoritative business logic, authentication/RBAC, database persistence, grading, mastery recalculation, and background gamification events. Base prefix: `/api/v1`.
- **Express (Current Port 3000):** Frontend Vite dev server / production static asset host. Currently temporarily hosts two AI endpoints, which will transition to FastAPI in Phase 9.

---

## 2. Current Verified Endpoints [VERIFIED CURRENT]

These are the ONLY endpoints currently existing and functional in the repository:

### 2.1 Backend Health Endpoint (FastAPI)
- **Method & Path:** `GET /health`
- **Host / Port:** `http://localhost:8000`
- **Ownership:** FastAPI (`backend/app/main.py`)
- **Authentication:** None
- **Response Format:** JSON (`200 OK`)
  ```json
  {
    "status": "ok",
    "service": "learnova-api"
  }
  ```

---

### 2.2 AI Candidate Question Generation (Express)
- **Method & Path:** `POST /api/ai/generate-questions`
- **Host / Port:** `http://localhost:3000`
- **Ownership:** Express (`frontend/server.ts:15`)
- **Authentication:** None (relies on server-side `GEMINI_API_KEY`)
- **Request Body:**
  ```json
  {
    "courseTitle": "string (optional)",
    "topicTitle": "string (optional)",
    "sourceContent": "string (optional)",
    "questionTypes": ["multiple_choice" | "true_false" | "fill_blank" | "matching" | "short_answer"],
    "difficulty": "easy" | "medium" | "hard",
    "count": 3
  }
  ```
- **Response Format (`200 OK`):**
  ```json
  {
    "success": true,
    "candidates": [
      {
        "id": "string",
        "prompt": "string",
        "type": "multiple_choice | true_false | fill_blank | matching | short_answer",
        "difficulty": "easy | medium | hard",
        "points": 2,
        "explanation": "string",
        "sourceContext": "string",
        "options": [
          { "id": "opt-1", "text": "string", "isCorrect": true }
        ],
        "correctBool": true,
        "acceptedAnswers": ["string"],
        "matchingPairs": [{ "id": "p1", "left": "string", "right": "string" }],
        "expectedRubric": "string"
      }
    ],
    "source": "gemini" | "deterministic_engine"
  }
  ```
- **Behavior:** Attempts Gemini 2.5 Flash API call. If key is missing or call fails, gracefully falls back to deterministic educational items.

---

### 2.3 AI Lesson Simplification & Tutoring (Express)
- **Method & Path:** `POST /api/ai/simplify-lesson`
- **Host / Port:** `http://localhost:3000`
- **Ownership:** Express (`frontend/server.ts:160`)
- **Authentication:** None (relies on server-side `GEMINI_API_KEY`)
- **Request Body:**
  ```json
  {
    "lessonTitle": "string",
    "topicTitle": "string",
    "courseTitle": "string",
    "lessonContent": "string",
    "customPrompt": "string (optional)",
    "mode": "simplify" | "analogy" | "example" | "custom"
  }
  ```
- **Response Format (`200 OK`):**
  ```json
  {
    "success": true,
    "explanation": "Markdown formatted explanation text",
    "source": "gemini" | "gemini_cache" | "academic_cache",
    "isCached": true | false,
    "promptUsed": "string"
  }
  ```
- **Behavior:** Implements in-memory caching keyed by `courseTitle::topicTitle::lessonTitle::mode::customPrompt`. If cached, returns `source: "gemini_cache"`. Otherwise calls Gemini 2.5 Flash or falls back to academic templates (`academic_cache`).

---

## 3. Proposed Target API Contracts (`/api/v1/*`) [PROPOSED]

These endpoints represent the target FastAPI architecture planned across Phases 1 through 10. They are NOT yet implemented.

### 3.1 Authentication & RBAC (`/api/v1/auth`) — Planned Phase 3
- `POST /api/v1/auth/register` — Register new student or teacher account.
- `POST /api/v1/auth/login` — Authenticate credentials; returns access & refresh JWTs.
- `POST /api/v1/auth/refresh` — Issue fresh access token using valid refresh token.
- `GET /api/v1/auth/me` — Return current authenticated user profile and roles.
- `PUT /api/v1/auth/me` — Update current user profile and settings.

### 3.2 Courses, Curriculum & Resources (`/api/v1/courses`) — Planned Phase 4
- `GET /api/v1/courses` — List published courses (filterable by category, search).
- `POST /api/v1/courses` — Teacher/Admin creates a course.
- `GET /api/v1/courses/{id}` — Get course details and topic hierarchy.
- `PUT /api/v1/courses/{id}` — Update course metadata and status.
- `POST /api/v1/courses/{id}/topics` — Add topic to course syllabus.
- `PUT /api/v1/topics/{id}` — Update topic details and prerequisite dependencies.
- `GET /api/v1/topics/{id}/prerequisites` — Get prerequisite DAG nodes and edges.
- `POST /api/v1/topics/{id}/lessons` — Add lesson to topic.
- `POST /api/v1/lessons/{id}/resources` — Add learning resource (markdown, video, link).

### 3.3 Question Bank & Assessments (`/api/v1/assessments`) — Planned Phase 5
- `GET /api/v1/questions` — List questions filterable by course, topic, difficulty, type.
- `POST /api/v1/questions` — Create question item.
- `PUT /api/v1/questions/{id}` — Update question item.
- `GET /api/v1/assessments` — List assessments (diagnostic, practice, final).
- `POST /api/v1/assessments` — Create assessment with selected question items.
- `PUT /api/v1/assessments/{id}/publish` — Publish assessment for student access.

### 3.4 Student Lifecycle & Adaptive Engine (`/api/v1/student`) — Planned Phases 6 & 7
- `POST /api/v1/student/enrollments` — Enroll in course.
- `GET /api/v1/student/enrollments/{course_id}/readiness/{topic_id}` — Check topic prerequisite readiness.
- `GET /api/v1/student/learning-path/{course_id}` — Get personalized ordered learning path.
- `POST /api/v1/student/assessments/start` — Start assessment attempt (returns session token & questions without answers).
- `POST /api/v1/student/assessments/{session_id}/answer` — Record interim question response (does NOT update persisted mastery).
- `POST /api/v1/student/assessments/{session_id}/submit` — Complete attempt; triggers authoritative grading, mastery recalculation, path regeneration, and gamification event.

### 3.5 AI Integration & Review (`/api/v1/ai`) — Planned Phase 9
- `POST /api/v1/ai/generate-questions` — Backend-owned question generation via LLM adapter.
- `GET /api/v1/ai/candidates` — List generated candidate questions pending review.
- `PUT /api/v1/ai/candidates/{id}/approve` — Approve candidate question and promote to Question Bank.
- `PUT /api/v1/ai/candidates/{id}/reject` — Reject candidate question.
- `POST /api/v1/ai/simplify-lesson` — Backend-owned lesson tutoring with Redis/DB caching.

### 3.6 Gamification (`/api/v1/gamification`) — Planned Phase 8
- `GET /api/v1/gamification/profile` — Get current student XP, level, badges, streak.
- `GET /api/v1/gamification/leaderboard` — Get course/global leaderboard.
- `GET /api/v1/gamification/events` — Get student XP audit ledger.

### 3.7 Administration & Analytics (`/api/v1/admin`, `/api/v1/teacher`) — Planned Phase 10
- `GET /api/v1/teacher/analytics/{course_id}` — Class performance and mastery heatmap.
- `GET /api/v1/admin/users` — User management and account listings.
- `PUT /api/v1/admin/users/{id}/role` — Change user role (with safeguards preventing self-demotion or demoting last admin).
- `PUT /api/v1/admin/users/{id}/status` — Activate/deactivate user account.
- `GET /api/v1/admin/audit-logs` — Immutable system audit log.
- `GET /api/v1/admin/system-health` — Real-time backend, DB, and external service health diagnostics.

---

## 4. Invariant Rules & Security Standards

1. **Authorization:** All `/api/v1/*` routes (except public health, login, registration, and catalog preview) require a valid JWT bearer token.
2. **Server-Side Validation:** Never trust client-supplied scores, mastery percentages, XP amounts, or role claims. All computations occur server-side.
3. **Mastery Recalibration Boundary:** Interim responses logged via `POST /api/v1/student/assessments/{session_id}/answer` do NOT update mastery. Mastery is recalculated strictly upon complete submission via `POST /api/v1/student/assessments/{session_id}/submit`.
4. **Gamification Decoupling:** Academic evaluation generates domain events; gamification listeners process events asynchronously without blocking or modifying academic records.
