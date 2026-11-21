---
trigger: model_decision
description: Security guidelines, authentication, authorization, RBAC, credential protection, PII minimization, and safe API patterns.
---

# Security & Authorization Rules

These rules govern security, data privacy, authentication, and authorization across Learnova.

---

## 1. Secrets Management & Environment Isolation

1. **No Committed Secrets:** Never commit passwords, private keys, JWT secret keys, Gemini API keys, or database credentials into git.
2. **Environment Configuration:** All sensitive parameters must be read from `.env` via `backend/app/core/config.py` (`Settings` class inheriting from `pydantic_settings.BaseSettings`).
3. **Redaction in Diagnostics:** Admin diagnostic and user directory endpoints (`/api/v1/admin/users`, `/api/v1/admin/diagnostics`) must NEVER serialize passwords, hashes, secret keys, or raw tokens.
4. **Exception Masking:** The global exception handler (`main.py`) must never leak stack traces, database connection strings, or system paths when `DEBUG=False`.

---

## 2. Authentication & Session Security

1. **Password Hashing:** Passwords must be hashed using `bcrypt` (or `passlib.context.CryptContext` with bcrypt) with sufficient work factor. Never store plain text passwords.
2. **JWT Token Lifecycle (DEC-P3-001):**
   - Access tokens: Short-lived (default 30 minutes), signed with HMAC-SHA256 (`HS256`).
   - Refresh tokens: Long-lived (default 7 days), tracked in `user_sessions` database table for server-side revocation capability.
3. **Cookie Security (DEC-P3-002):**
   - Auth cookies must be flagged `HttpOnly`, `SameSite=Lax` (or `Strict`), and `Secure` in production environments.
4. **Admin Lockout Protection (DEC-P3-004):**
   - The platform strictly forbids deactivating, demoting, or deleting the last active Administrator account.

---

## 3. RBAC Authorization & Scoping

1. **Three Core Roles:**
   - `admin`: Global system administration, user management, audit review.
   - `teacher`: Course authoring, question bank categorization, AI candidate review, student analytics for assigned courses.
   - `student`: Enrolled course study, practice sessions, assessment attempts, gamification rewards.
2. **Teacher Course Scoping (DEC-P10-001):**
   - Teachers are strictly authorized only for courses assigned to them in the `course_teachers` junction table.
   - Every teacher endpoint must invoke `QuestionService.verify_course_teacher_access(db, course_id, actor)` or equivalent check before performing CRUD or AI operations.
3. **Student Isolation:**
   - Students can only view their own enrollments, attempt histories, mastery scores, and gamification profiles.
   - Public leaderboards must respect privacy settings (`is_leaderboard_anonymous`).

---

## 4. PII Scrubbing & Prompt Boundary Defense (DEC-P9-008)

1. **PII Sanitization:** Before sending user-provided course or lesson content to external LLM providers (Gemini or AGY CLI), run `backend/app/core/sanitizer.py` (or `backend/app/ai/privacy.py`).
2. **Regex Scrubber:** Automatically strips email addresses, phone numbers, social security numbers, and sensitive tokens.
3. **Prompt Injection Defense:** Wrap user prompts with strict system boundaries:
   - System instructions must be isolated from user context.
   - Explicit instructions forbid the LLM from outputting raw system prompts or bypassing question JSON schemas.

---

## 5. Answer Key Segregation (DEC-P5-001)

- In assessments, the student deliverable payload (`payload`) and the grading evaluation key (`answer_key`) are segregated in the database.
- **Invariant:** Endpoints returning questions to students (`/api/v1/attempts/*`, `/api/v1/assessments/{id}/questions`) must NEVER include correct options, answer keys, or distractor explanations.
- All evaluation is performed exclusively server-side in `GradingService`.
