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

### 2.1 Backend Health & Readiness Endpoints (FastAPI)

#### 2.1.1 Root Health (Liveness) Endpoint
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
- **Note:** Preserved for 100% backward compatibility.

#### 2.1.2 Root Readiness Endpoint
- **Method & Path:** `GET /ready`
- **Host / Port:** `http://localhost:8000`
- **Ownership:** FastAPI (`backend/app/main.py`)
- **Authentication:** None
- **Response Format:**
  - `200 OK` (Database connected):
    ```json
    {
      "status": "ready",
      "database": "connected",
      "service": "learnova-api"
    }
    ```
  - `503 Service Unavailable` (Database unavailable):
    ```json
    {
      "status": "not_ready",
      "database": "disconnected",
      "service": "learnova-api"
    }
    ```

#### 2.1.3 API v1 Liveness Endpoint
- **Method & Path:** `GET /api/v1/health/liveness`
- **Host / Port:** `http://localhost:8000`
- **Ownership:** FastAPI (`backend/app/api/v1/endpoints/health.py`)
- **Authentication:** None
- **Response Format:** JSON (`200 OK`)
  ```json
  {
    "status": "ok",
    "service": "Learnova API",
    "version": "0.1.0"
  }
  ```

#### 2.1.4 API v1 Readiness Endpoint
- **Method & Path:** `GET /api/v1/health/readiness`
- **Host / Port:** `http://localhost:8000`
- **Ownership:** FastAPI (`backend/app/api/v1/endpoints/health.py`)
- **Authentication:** None
- **Response Format:**
  - `200 OK` (Database connected):
    ```json
    {
      "status": "ready",
      "database": "connected",
      "service": "Learnova API",
      "version": "0.1.0"
    }
    ```
  - `503 Service Unavailable` (Database unavailable):
    ```json
    {
      "status": "not_ready",
      "database": "disconnected",
      "service": "Learnova API",
      "version": "0.1.0",
      "error": "Database unavailable"
    }
    ```

---

### 2.2 AI Candidate Question Generation (Express Compatibility Proxy)
- **Method & Path:** `POST /api/ai/generate-questions`
- **Host / Port:** `http://localhost:3000`
- **Ownership:** Express (`frontend/server.ts`) — Pure reverse proxy forwarding to FastAPI (`http://localhost:8000/api/v1/ai/generate-questions`).
- **Authentication:** Forwards `Authorization` header and `Cookie` to FastAPI; requires teacher or administrator credentials.
- **Request Body:**
  ```json
  {
    "course_id": "UUID (required)",
    "topic_id": "UUID (optional)",
    "source_content": "string (optional)",
    "question_types": ["multiple_choice" | "true_false" | "fill_blank" | "matching" | "short_answer"],
    "difficulty": "easy" | "medium" | "hard",
    "count": 3
  }
  ```
- **Response Format (`200 OK`):**
  Forwards exact FastAPI response payload with candidate list quarantined in `pending_review` status.
- **Error Responses:**
  - Upstream errors (400, 401, 403, 422, 429, 500) are forwarded directly with their upstream status and JSON body.
  - On network connection failure to FastAPI, returns `503 Service Unavailable`:
    ```json
    {
      "error": "AI service unavailable",
      "message": "Failed to connect to backend AI service",
      "status_code": 503
    }
    ```
- **Behavior:** Acts strictly as a transparent proxy. Zero in-memory deterministic fallback items are generated.

---

### 2.3 AI Lesson Simplification & Tutoring (Express Compatibility Proxy)
- **Method & Path:** `POST /api/ai/simplify-lesson`
- **Host / Port:** `http://localhost:3000`
- **Ownership:** Express (`frontend/server.ts`) — Pure reverse proxy forwarding to FastAPI (`http://localhost:8000/api/v1/ai/simplify-lesson`).
- **Authentication:** Forwards `Authorization` header and `Cookie` to FastAPI; requires active student enrollment or assigned teacher access.
- **Request Body:**
  ```json
  {
    "lesson_id": "UUID (required)",
    "mode": "simplify" | "analogy" | "example" | "custom",
    "custom_prompt": "string (optional)"
  }
  ```
- **Response Format (`200 OK`):**
  Forwards exact FastAPI response payload (`explanation`, `source`, `is_cached`, `prompt_used`).
- **Error Responses:**
  - Upstream errors (400, 401, 403, 404, 422, 429, 500) are forwarded directly with their upstream status and JSON body.
  - On network connection failure to FastAPI, returns `503 Service Unavailable`:
    ```json
    {
      "error": "AI service unavailable",
      "message": "Failed to connect to backend AI service",
      "status_code": 503
    }
    ```
- **Behavior:** Acts strictly as a transparent proxy. No in-memory cache and no fallback templates exist in Express. Fast-path authorization, database-authoritative lesson resolution, and durable caching are handled entirely by FastAPI.

---

## 3. Proposed Target API Contracts (`/api/v1/*`) [PROPOSED]

These endpoints represent the target FastAPI architecture planned across Phases 1 through 10. They are NOT yet implemented.

> [!NOTE]
> Phase 2 implements exclusively the underlying relational database models and migrations for D1 (User Accounts & Roles) and D2 (Courses, Curriculum & Resources). No REST API endpoints are activated in Phase 2. Authentication and profile endpoints are introduced in Phase 3; course and curriculum CRUD endpoints are introduced in Phase 4.

### 3.1 Authentication & RBAC (`/api/v1/auth`, `/api/v1/users`, `/api/v1/admin`) — Planned Phase 3
- `POST /api/v1/auth/register` — Register new student account (public self-registration strictly restricted to `student`).
- `POST /api/v1/auth/login` — Authenticate credentials via bcrypt; returns short-lived access JWT (15 mins) and sets `HttpOnly, Secure, SameSite=Lax` refresh cookie (`learnova_refresh_token`).
- `POST /api/v1/auth/refresh` — Rotate refresh token and issue fresh access token using valid session cookie.
- `POST /api/v1/auth/logout` — Revoke active session in database (`is_revoked = True`) and clear refresh cookie.
- `GET /api/v1/auth/me` — Return current authenticated user identity and profile.
- `PUT /api/v1/users/me` — Update allowed current user profile fields (bio, department, avatar_url).
- `PUT /api/v1/users/me/preferences` — Update current user UI preferences JSON.
- `PUT /api/v1/users/me/password` — Rotate password (verifies current password, writes new bcrypt hash, revokes other active sessions).
- `PUT /api/v1/admin/users/{id}/role` — Administrator changes user role (enforces no self-demotion and last-active-admin transactional lock).
- `PUT /api/v1/admin/users/{id}/status` — Administrator toggles account active status (enforces no self-deactivation and last-active-admin lock).

### 3.2 Courses, Curriculum, Enrollment & Resources — Implemented Phase 4 (Accepted)
- `GET /api/v1/courses` — List published courses (students/public) or assigned/created courses (teachers/admins).
- `POST /api/v1/courses` — Teacher/Admin creates a new course in draft status.
- `GET /api/v1/courses/{id}` — Get course details and complete syllabus hierarchy (topics, lessons, resources with synthesized course_id).
- `PATCH /api/v1/courses/{id}` — Update course title, description, or status (scoped to assigned teachers/admins).
- `POST /api/v1/courses/{id}/publish` — Validate course structural integrity (>= 1 topic, acyclic DAG, topics have lessons) and transition to `published`.
- `POST /api/v1/courses/{id}/enrollments` — Student enrolls in published course (enforces `UNIQUE (student_id, course_id)` with idempotent 200 return if active; 201 on new).
- `GET /api/v1/students/me/enrollments` — List current authenticated student's active and completed course enrollments with real-time derived progress.
- `GET /api/v1/courses/{id}/learning-map` — Topic prerequisite DAG graph nodes, edges, and topic readiness states for student.
- `POST /api/v1/courses/{id}/topics` — Add topic to course syllabus.
- `PATCH /api/v1/topics/{id}` — Update topic metadata (title, description, order, mastery threshold).
- `DELETE /api/v1/topics/{id}` — Delete topic and cascade lessons/prerequisites.
- `PUT /api/v1/topics/{id}/prerequisites` — Update prerequisite edges after server-side DFS cycle detection (rejects self-edges and cycles with 400).
- `POST /api/v1/topics/{id}/lessons` — Add lesson to topic.
- `GET /api/v1/lessons/{id}` — Get lesson details with resources.
- `PATCH /api/v1/lessons/{id}` — Update lesson metadata (title, description, order).
- `DELETE /api/v1/lessons/{id}` — Delete lesson and its resources.
- `POST /api/v1/lessons/{id}/complete` — Idempotently record lesson completion for authenticated student and update enrollment progress.
- `POST /api/v1/lessons/{id}/resources` — Add learning resource (markdown, video, link, code, document) to lesson.
- `PATCH /api/v1/resources/{id}` — Update learning resource metadata or content.
- `DELETE /api/v1/resources/{id}` — Delete learning resource.
- `POST /api/v1/resources/{id}/activity` — Log resource interaction and study duration.

### 3.3 Question Bank & Assessments (`/api/v1/questions`, `/api/v1/assessments`) — Implemented (Phase 5)
- `POST /api/v1/questions` — Teacher/Admin creates question across 5 formats (`multiple_choice`, `true_false`, `fill_blank`, `matching`, `short_answer`) with segregated payload and answer_key.
- `GET /api/v1/questions` — List questions filterable by `course_id` (required), `topic_id`, `type`, `difficulty`, `status`.
- `GET /api/v1/questions/{id}` — Get full question details including grading rubric and answer keys (teachers/admins only).
- `PATCH /api/v1/questions/{id}` — Update question contents or status and increment its monotonic version.
- `POST /api/v1/questions/{id}/archive` — Safely archive question from active bank without breaking assessment references.
- `POST /api/v1/assessments` — Create assessment with selected question items, ordering, points, and pinned question version snapshots.
- `GET /api/v1/assessments` — List assessments for course (scoped by role; students see only published).
- `GET /api/v1/assessments/{id}` — Retrieve assessment (teachers receive full answer keys; students receive safe projection without secrets).
- `PATCH /api/v1/assessments/{id}` — Update assessment configuration or question composition (locked once published).
- `POST /api/v1/assessments/{id}/publish` — Transactionally validate publication gate (>= 1 question, total points > 0) and publish.

### 3.4 Assessment Attempts & Server-Authoritative Grading (`/api/v1/assessments`, `/api/v1/attempts`) — Implemented (Phase 6)
- `POST /api/v1/assessments/{assessment_id}/attempts` — Enrolled student starts a new assessment attempt. Snapshots question deliverable content, points, and server answer keys; computes authoritative UTC `deadline_at`; enforces active enrollment and `max_attempts`.
- `GET /api/v1/attempts/{id}` — Retrieve attempt state and deliverable questions (student receives questions with answer keys sanitized out; teacher/admin receives attempt metadata).
- `PUT /api/v1/attempts/{id}/responses/{question_id}` — Save or update interim student response with client timing metadata. Idempotent upsert; rejected if past UTC `deadline_at` or if attempt is not `in_progress`.
- `POST /api/v1/attempts/{id}/next-question` — Adaptive practice question selection. Returns next unpresented question in topic dynamically adjusted to session accuracy without persisting premature mastery (DEC-03).
- `POST /api/v1/attempts/{id}/submit` — Submit assessment for authoritative server-side grading. Evaluates all 5 question types, handles auto-submit on expiry (DEC-07), transitions attempt status (`graded` or `pending_manual_review` per DEC-06), atomically writes transactional outbox event `assessment.completed` to `domain_outbox_events` (DEC-P6-003). Idempotent on retry (DEC-P6-004).
- `GET /api/v1/attempts/{id}/result` — Retrieve completed assessment score, score percentage, pass status, and per-question evaluated feedback.

### 3.5 Student Knowledge Tracing & Mastery Engine (`/api/v1/courses/{id}/mastery`, `/api/v1/courses/{id}/learning-path`, `/api/v1/topics/{id}/readiness`, `/api/v1/mastery`) — Phase 7 Stabilized
- `GET /api/v1/courses/{course_id}/mastery` — Get complete topic mastery matrix and course syllabus progress for authenticated student (`student_topic_mastery`). (Alias: `GET /api/v1/students/me/mastery?course_id=...`).
- `GET /api/v1/courses/{course_id}/learning-path` — Get dynamic, personalized ordered learning path regenerated from mastery states, lesson completions, and prerequisite gates, with sub-50ms execution SLA. (Alias: `GET /api/v1/students/me/learning-path?course_id=...`).
- `GET /api/v1/topics/{topic_id}/readiness` — Inspect topic prerequisite DAG nodes and calculate student readiness score. Students can only inspect their own readiness; teachers assigned to the course via `course_teachers` and administrators can pass `?student_id={id}` to inspect enrolled student readiness. Prerequisites strictly require `current_mastery >= required_mastery` (`Topic.mastery_threshold`, default 0.7500); status labels do not bypass configured thresholds. All prerequisites must belong to the same course. If locked, surfaces direct link to diagnostic assessment for prerequisite bypass.
- `POST /api/v1/mastery/recalculate/{attempt_id}` — Authoritatively recalculate topic mastery from a completed assessment attempt using hybrid Bayesian Knowledge Tracing (BKT) and empirical weighting; idempotently updates mastery and records immutable audit ledger entry. If `assessment.topic_id` is set, all responses attribute to that topic; if null, responses group by each question's actual `topic_id`, updating mastery per topic independently (`updated_topics`). If no reliable topic metadata exists, emits controlled diagnostic without mutating mastery. Never mutates `DomainOutboxEvent` status.

### 3.6 Gamification & Event Processing (`/api/v1/gamification`) — Phase 8 Corrected & Verified
- `GET /api/v1/gamification/profile` — Get authenticated student gamification profile (XP, level, level floor, next level XP threshold, progress percent, continuous daily streak, leaderboard opt-in status; defaults to `is_opted_in_leaderboard: false` under affirmative privacy consent policy).
- `PATCH /api/v1/gamification/profile` — Update gamification profile preferences (explicitly grant or revoke affirmative consent for leaderboard privacy opt-in).
- `GET /api/v1/gamification/xp-history` — Paginated chronological XP audit ledger history for authenticated student.
- `GET /api/v1/gamification/badges` — Badge catalog with student unlock status and earned timestamps.
- `GET /api/v1/gamification/leaderboard` — Ranked academic leaderboard respecting privacy opt-in settings, returning student XP, level, earned badges count, and peer badge snippets. Opted-out students are displayed to peers as "Anonymous Scholar" with null avatars.
- `GET /api/v1/gamification/challenges` — Active learning challenges with current student progress tracking.
- `POST /api/v1/gamification/process-events` — Worker dispatcher endpoint to drain and process pending domain outbox events (`domain_outbox_events`). Requires `administrator` role (`require_role("administrator")`); processes events with row locking (`FOR UPDATE SKIP LOCKED` on PostgreSQL), retry tracking, exponential backoff, and dead-lettering at 5 retries. Standalone CLI worker entrypoint available at `python -m app.workers.outbox_worker`.

### 3.7 AI Integration & Review (`/api/v1/ai`) — Phase 9 Verified & Stabilized
- `POST /api/v1/ai/simplify-lesson` — Student and teacher lesson tutoring, analogies, worked examples, and contextual clarifications.
  - **Inputs:** `lesson_id` (UUID, strictly required), `mode` (`"simplify"` | `"analogy"` | `"example"` | `"custom"`), optional `custom_prompt` (string).
  - **Authorization:** Authenticated caller. Resolves `Lesson`, `Topic`, and `Course` from PostgreSQL (returns 404 if not found). For students, strictly enforces that `Course.status == "published"` and the student has an active enrollment (`Enrollment.status == "active"`). For teachers, verifies course assignment via `QuestionService.verify_course_teacher_access()`. Unauthorized callers receive 401 or 403 before any cache lookup or Gemini provider invocation.
  - **Authoritative Resolution:** Tutoring context is extracted solely from persisted DB records (`Lesson.description` + attached `LearningResource`). Client-supplied text overrides are ignored.
  - **Content-Aware Caching:** Durable PostgreSQL cache (`ai_content_cache`) lookup occurs strictly after authorization. Keys use namespace `ns:v2` and incorporate SHA-256 cryptographic fingerprints of authoritative lesson content, prompt mode, normalized custom prompt, and provider model: `ns:v2::c:{course_id}::t:{topic_id}::l:{lesson_id}::ch:{sha256(content)}::m:{mode}::pm:{sha256(prompt)}::md:{model}`. Lesson content edits immediately trigger cache misses.
  - **PII Minimization & Prompt Boundaries:** Custom prompts and content excerpts are sanitized via pure Python regex (`scrub_pii`) removing emails, international phone numbers, Google API keys, bearer tokens, and credit cards. Untrusted queries are enclosed in `<student_query>` XML boundaries with anti-injection instructions. Provider error logging redacts response payloads and credentials.
- `POST /api/v1/ai/generate-questions` — Course-scoped candidate question generation for assigned teachers and administrators (`require_role("teacher", "administrator")`); outputs are strictly quarantined in `ai_question_candidates` with `status = "pending_review"` and never appear on assessments without review.
- `GET /api/v1/ai/candidates` — List quarantined candidate questions filtered by `course_id`, `topic_id`, and `status`.
- `GET /api/v1/ai/candidates/{id}` — Detailed candidate question inspection for teacher audit.
- `PATCH /api/v1/ai/candidates/{id}` — Edit candidate question prompt, difficulty, points, options, or rubric prior to approval.
- `POST /api/v1/ai/candidates/{id}/approve` — Authoritatively promote candidate to official `Question` in the Question Bank via `QuestionService` with `source = "ai_generated"`, `status = "approved"`, linking `approved_question_id`.
  - **Single-Transaction Atomicity:** Acquires row-level exclusive lock on the candidate (`with_for_update()`). Re-verifies status under lock; if already approved, idempotently returns the existing question ID without duplicating items or audit logs. Calls `QuestionService.create_question(..., commit=False)` within the locked transaction, updates candidate `status = "approved"` and `approved_question_id`, writes audit log, and commits all changes atomically in one transaction. Full database rollback on error ensures candidate remains `pending_review` with zero orphaned questions.
- `POST /api/v1/ai/candidates/{id}/reject` — Reject candidate question with recorded reason and security audit log. Acquires row-level lock (`with_for_update()`); idempotent.

### 3.8 Administration, Analytics, and Diagnostics (`/api/v1/students/me`, `/api/v1/teacher`, `/api/v1/admin`) — Phase 10 Verified & Stabilized

#### Student Personal Analytics (`/api/v1/students/me`)
- `GET /api/v1/students/me/dashboard` — Authenticated student overview dashboard.
  - **Authorization:** `require_role("student")`.
  - **Payload:** Returns enrolled course progress summaries (`enrolled_courses`), recent graded attempts (`recent_attempts`), recent learning activities (`recent_activities`), and gamification profile summary (`gamification`).
  - **Invariants:** Strictly isolated to caller's `current_user.id`. Mastery is never calculated from gamification XP.
- `GET /api/v1/students/me/analytics` — Detailed student cognitive progress analytics.
  - **Query Parameters:** `course_id` (optional UUID filter).
  - **Payload:** Course syllabus topic masteries (`topic_masteries`), dynamic weak topics list (`weak_topics`), chronological score trajectory trends (`attempt_trends`), and overall engagement counts.
  - **Invariants:** Dynamic weak topic evaluation (`mastery_percent < Topic.mastery_threshold`); `not_assessed` topics are strictly excluded from weak lists (DEC-P10-002). In-progress and unsubmitted attempts are excluded from trend lines and score averages.
- `GET /api/v1/students/me/attempts` — Paginated assessment attempts history for authenticated student.
  - **Query Parameters:** `course_id` (optional UUID), `assessment_id` (optional UUID), `limit` (default 20, max 100), `offset` (default 0).
  - **Payload:** Paginated list of attempts ordered newest first with total count.

#### Teacher Reporting & Class Analytics (`/api/v1/teacher`)
- `GET /api/v1/teacher/dashboard` — Teacher multi-course overview dashboard.
  - **Authorization:** `require_role("teacher", "administrator")`.
  - **Payload:** Summaries of assigned courses (`assigned_courses`), total students reached (`total_students_reach`), and total active assessments (`total_active_assessments`).
  - **Invariants:** Scoped strictly to courses assigned in `course_teachers` for teachers; administrators see all courses (DEC-P10-001).
- `GET /api/v1/teacher/courses/{id}/analytics` — Comprehensive course-level class performance analytics.
  - **Authorization:** `require_role("teacher", "administrator")` + course teacher assignment check.
  - **Query Parameters:** `timeframe` (`"all"` | `"30d"` | `"7d"`).
  - **Payload:** Overall class average mastery, topic mastery distribution heatmap (`topic_mastery_distribution` with counts for mastered, competent, developing, and not_assessed), class weak concepts (`weak_concepts`), assessment score distribution bands (`0-49%`, `50-69%`, `70-84%`, `85-100%`), assessment summaries, and at-risk students list (`at_risk_students`).
  - **Invariants:** Empty cohorts return `null` averages (never fabricated zeros). Unassigned teachers receive 403 Forbidden.
- `GET /api/v1/teacher/courses/{id}/students/{student_id}/analytics` — Teacher drilldown into an enrolled student's course performance.
  - **Authorization:** `require_role("teacher", "administrator")` + course teacher assignment check + active student course enrollment check.
  - **Payload:** Detailed course lesson progress, topic mastery states, and weak topics for the specific student.
  - **Invariants:** Returns 404 if the student is not actively enrolled in the course.
- `GET /api/v1/teacher/courses/{id}/students/{student_id}/attempts` — Teacher drilldown into an enrolled student's course assessment attempts.
  - **Authorization:** `require_role("teacher", "administrator")` + course teacher assignment check + active student course enrollment check.
  - **Query Parameters:** `limit` (default 20, max 100), `offset` (default 0).
  - **Payload:** Paginated assessment attempts history for the enrolled student within the course scope.

#### Platform Administration, Directory, Audit & Diagnostics (`/api/v1/admin`)
- `GET /api/v1/admin/dashboard` — High-level platform KPIs dashboard.
  - **Authorization:** `require_role("administrator")`.
  - **Payload:** Platform aggregations: user counts by role and active status (`users`), curriculum volume (`curriculum`), enrollment volume (`enrollments`), assessment attempts (`assessments`), and 24-hour security audit metrics (`security_audit`).
- `GET /api/v1/admin/users` — Paginated user directory with multi-attribute filtering.
  - **Authorization:** `require_role("administrator")`.
  - **Query Parameters:** `role` (optional), `is_active` (optional), `search` (optional substring match on email or full name), `limit` (default 20, max 100), `offset` (default 0).
  - **Payload:** Paginated list of `UserResponse` objects with safe profile projections.
  - **Invariants:** Password hashes, salt strings, auth tokens, and session secrets are strictly redacted (DEC-P10-004).
- `GET /api/v1/admin/users/{user_id}` — Detailed single user inspection.
  - **Authorization:** `require_role("administrator")`.
  - **Payload:** User profile plus contextual platform metrics (`enrolled_courses_count`, `assigned_courses_count`, `completed_attempts_count`, `security_audit_events_count`).
- `PUT /api/v1/admin/users/{id}/role` — Authoritative user role mutation.
  - **Authorization:** `require_role("administrator")`.
  - **Safeguards:** Enforces anti-lockout protection: blocks self-demotion and prevents demoting the last active administrator. Writes immutable audit log.
- `PUT /api/v1/admin/users/{id}/status` — Account active status toggle.
  - **Authorization:** `require_role("administrator")`.
  - **Safeguards:** Blocks self-deactivation and deactivating the last active administrator. Writes immutable audit log.
- `GET /api/v1/admin/audit-logs` — Immutable security audit log viewer.
  - **Authorization:** `require_role("administrator")`.
  - **Query Parameters:** `action`, `outcome`, `actor_id`, `from_date`, `to_date`, `limit` (default 50, max 100), `offset` (default 0).
  - **Payload:** Paginated list of `SecurityAuditEventResponse` records ordered newest first.
- `GET /api/v1/admin/system/health` — Safe operational system diagnostics.
  - **Authorization:** `require_role("administrator")`.
  - **Payload:** Database ping latency (ms), connection pool sizing, Alembic current revision head and sync status, domain outbox queue backlog, AI service status, application version, and server timestamp.
  - **Invariants:** Credentials, connection strings, API keys, and secrets are strictly redacted from output (DEC-P10-004).

---

## 4. Invariant Rules & Security Standards

1. **Authorization:** All `/api/v1/*` routes (except public health, login, registration, and catalog preview) require a valid JWT bearer token.
2. **Server-Side Validation:** Never trust client-supplied scores, mastery percentages, XP amounts, or role claims. All computations occur server-side.
3. **Mastery Recalibration Boundary:** Interim responses logged via `POST /api/v1/student/assessments/{session_id}/answer` do NOT update mastery. Mastery is recalculated strictly upon complete submission via `POST /api/v1/student/assessments/{session_id}/submit`.
4. **Gamification Decoupling:** Academic evaluation generates domain events; gamification listeners process events asynchronously without blocking or modifying academic records.
