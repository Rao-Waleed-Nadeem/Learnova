# Learnova REST API Documentation (`/api/v1`)

This document is the authoritative API reference for the **Learnova FastAPI Backend** (`http://localhost:8000`), reverse-proxied transparently by Express on Port 3000 (`/api/v1/*`).

---

## 1. Global Conventions & Authentication

### 1.1 Base Paths
- Primary API Base: `http://localhost:8000/api/v1`
- Proxied Base (Frontend): `http://localhost:3000/api/v1`
- Root Health Endpoints: `http://localhost:8000/health` and `http://localhost:8000/ready`

### 1.2 Authentication
- Protected endpoints require an `Authorization: Bearer <access_token>` header or an authenticated `access_token` HTTP-only cookie.
- Access tokens are HMAC-SHA256 JWTs with standard claims (`sub` = user ID, `role` = user role, `exp` = expiration).

### 1.3 Standard Error Format
All 4xx and 5xx responses return a consistent JSON payload:
```json
{
  "detail": "Actionable description of the error."
}
```

---

## 2. System Health & Readiness Endpoints

### 2.1 Root Health (Liveness)
- **Path:** `GET /health` or `GET /api/v1/health/liveness`
- **Auth:** None
- **Response:** `200 OK`
  ```json
  {
    "status": "ok",
    "service": "learnova-api"
  }
  ```

### 2.2 Root Readiness
- **Path:** `GET /ready` or `GET /api/v1/health/readiness`
- **Auth:** None
- **Response:**
  - `200 OK` (Database connected):
    ```json
    {
      "status": "ready",
      "database": "connected",
      "service": "learnova-api"
    }
    ```
  - `503 Service Unavailable` (Database disconnected):
    ```json
    {
      "status": "not_ready",
      "database": "disconnected",
      "service": "learnova-api"
    }
    ```

---

## 3. Authentication & User Management

### 3.1 Register User
- **Path:** `POST /api/v1/auth/register`
- **Auth:** None
- **Body:**
  ```json
  {
    "email": "student@example.com",
    "password": "SecurePassword123!",
    "first_name": "Alex",
    "last_name": "Smith",
    "role": "student"
  }
  ```
- **Response:** `201 Created` returns user object.

### 3.2 Login
- **Path:** `POST /api/v1/auth/login`
- **Auth:** None
- **Body:**
  ```json
  {
    "email": "teacher@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "teacher@example.com",
      "role": "teacher"
    }
  }
  ```

### 3.3 Get Current User
- **Path:** `GET /api/v1/auth/me`
- **Auth:** Bearer JWT (Any active user)
- **Response:** `200 OK` returns authenticated `UserResponse`.

---

## 4. Curriculum Endpoints

### 4.1 List Courses
- **Path:** `GET /api/v1/courses`
- **Auth:** Bearer JWT
- **Query:** `is_published` (optional boolean)
- **Response:** `200 OK` array of `CourseResponse` objects.

### 4.2 Get Course Syllabus Hierarchy
- **Path:** `GET /api/v1/courses/{id}/syllabus`
- **Auth:** Bearer JWT
- **Response:** `200 OK` returns course with ordered nested `topics`, `lessons`, and `resources`.

### 4.3 Validate Topic Prerequisite Addition
- **Path:** `POST /api/v1/topics/{id}/prerequisites/validate`
- **Auth:** Bearer JWT (`admin` or assigned `teacher`)
- **Body:**
  ```json
  {
    "prerequisite_topic_id": "4fa85f64-5717-4562-b3fc-2c963f66afa7"
  }
  ```
- **Response:**
  - `200 OK` `{"valid": true}`
  - `422 Unprocessable Entity` `{"valid": false, "detail": "Circular prerequisite detected."}`

---

## 5. Question Bank & Assessment Authoring

### 5.1 List Questions (Categorized by Course & Lesson)
- **Path:** `GET /api/v1/questions`
- **Auth:** Bearer JWT (`admin` or `teacher`)
- **Query:** `course_id` (required for teachers), `lesson_id`, `difficulty`, `type`, `search`
- **Response:** `200 OK` list of questions with prompts, points, and source.

### 5.2 Create Assessment
- **Path:** `POST /api/v1/assessments`
- **Auth:** Bearer JWT (`admin` or assigned `teacher`)
- **Body:**
  ```json
  {
    "course_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "title": "Module 1 Knowledge Check",
    "type": "quiz",
    "time_limit_minutes": 30,
    "passing_score": 70.0,
    "question_ids": ["q1-uuid", "q2-uuid"]
  }
  ```
- **Response:** `201 Created`.

---

## 6. Assessment Attempts & Server-Authoritative Grading

### 6.1 Start Assessment Attempt
- **Path:** `POST /api/v1/attempts/start`
- **Auth:** Bearer JWT (`student`)
- **Body:** `{"assessment_id": "3fa85f64-..."}`
- **Response:** `201 Created` returns attempt ID, frozen question snapshots (NO answer keys!), and expiration deadline.

### 6.2 Save Intermediate Response
- **Path:** `POST /api/v1/attempts/{id}/responses`
- **Auth:** Bearer JWT (`student` owning the attempt)
- **Body:**
  ```json
  {
    "question_id": "q1-uuid",
    "response_data": {"selected_option_id": "opt-2"}
  }
  ```
- **Response:** `200 OK` idempotent acknowledgment.

### 6.3 Submit Attempt for Authoritative Grading
- **Path:** `POST /api/v1/attempts/{id}/submit`
- **Auth:** Bearer JWT (`student` owning the attempt)
- **Body:** Optional final batch of responses.
- **Response:** `200 OK`
  ```json
  {
    "attempt_id": "att-uuid",
    "score": 85.00,
    "max_score": 100.00,
    "passed": true,
    "submitted_at": "2026-11-15T21:00:00Z",
    "results": [
      {
        "question_id": "q1-uuid",
        "is_correct": true,
        "points_awarded": 10.0,
        "explanation": "Option B is correct because..."
      }
    ]
  }
  ```
- **Side Effect:** Inserts `domain_outbox_events` (`assessment.completed`) in the same database transaction.

---

## 7. AI Question Governance (SSD-08)

### 7.1 Generate AI Question Candidates (Quarantine)
- **Path:** `POST /api/v1/ai/generate-questions`
- **Auth:** Bearer JWT (`admin` or assigned `teacher`)
- **Body:**
  ```json
  {
    "course_id": "course-uuid",
    "topic_id": "topic-uuid",
    "lesson_id": "lesson-uuid",
    "source_content": "Lesson markdown text...",
    "question_types": ["multiple_choice", "true_false"],
    "difficulty": "medium",
    "count": 3
  }
  ```
- **Response:** `200 OK` list of quarantined candidates with `status = "pending_review"`.

### 7.2 Approve Candidate (Atomic Promotion)
- **Path:** `POST /api/v1/ai/candidates/{id}/approve`
- **Auth:** Bearer JWT (`admin` or assigned `teacher`)
- **Response:** `200 OK` promotes candidate to official Question Bank (`source = "ai_generated"`), acquires row lock, and records audit log.

### 7.3 Reject Candidate
- **Path:** `POST /api/v1/ai/candidates/{id}/reject`
- **Auth:** Bearer JWT (`admin` or assigned `teacher`)
- **Body:** `{"reason": "Misaligned with curriculum standard"}`
- **Response:** `200 OK` updates candidate `status = "rejected"`.

---

## 8. AI Lesson Simplification Studio

### 8.1 Simplify Lesson Content
- **Path:** `POST /api/v1/ai/simplify-lesson`
- **Auth:** Bearer JWT (`student`, `teacher`, or `admin`)
- **Body:**
  ```json
  {
    "course_title": "Data Structures",
    "topic_title": "Graphs",
    "lesson_title": "Topological Sort",
    "lesson_content": "Detailed text...",
    "mode": "analogy",
    "custom_prompt": ""
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "explanation": "Think of topological sort like getting dressed...",
    "source": "gemini",
    "is_cached": false,
    "prompt_used": "analogy"
  }
  ```
