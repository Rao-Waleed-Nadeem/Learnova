# LEARNOVA â€” COMPREHENSIVE PROJECT ARCHITECTURE & KNOWLEDGE BASE

> **Purpose:** This document is the single source of truth for the Learnova platform architecture, tech stack, directory structure, data models, workflows, API contracts, and portal governance. It is placed in `.agents/` so that any AI agent starting a new session instantly understands the entire project without requiring redundant prompts.

---

## 1. Project Overview & Mission

**Learnova** is an enterprise-grade, adaptive, and gamified educational platform built for higher education and high-stakes technical training. It merges **cognitive science**, **Bayesian Knowledge Tracing (BKT)**, **directed acyclic prerequisite graphs (DAG)**, **server-authoritative grading**, and **teacher-governed AI question generation** with **gamification mechanics** (XP ledgers, streaks, tiered badges, privacy-preserving leaderboards).

### Architecture Topology: Option B Modular Monolith
The application operates on an **Option B Modular Monolith** topology:
- **Backend Process (FastAPI):** Hosts both the RESTful API endpoints and an **in-process Durable Outbox Processor** integrated into the FastAPI application lifespan (`backend/app/main.py`). The outbox asynchronously consumes gamification and mastery recalculation events without requiring a separate standalone worker container.
- **Frontend Process (React / Vite / Express):** Single-page application serving three dedicated portals: Student, Teacher, and Administrator. Express acts as a lightweight reverse proxy and static asset host forwarding to FastAPI.
- **Database (PostgreSQL 17 / SQLite):** Authoritative persistence layer with relational constraints, JSONB segregated answer keys, row-level exclusive locking (`with_for_update`), and transactional outbox tables.

```text
                  LEARNOVA ARCHITECTURE
                            |
          +-----------------+-----------------+
          |                                   |
    FRONTEND (Port 3000)              BACKEND (Port 8000)
    React 19 / Vite / TS                    FastAPI
          |                                   |
          |                      +------------+------------+
          |                      |                         |
          |                 REST API v1             Outbox Processor
          |             (Authoritative Endpoints) (Lifespan In-Process)
          |                      |                         |
          +----------------------+-------------------------+
                                 |
                         PostgreSQL 17 / DB
                    (16 Normalized Relational Tables)
```

---

## 2. Complete Technology Stack

### Backend Stack
- **Language / Runtime:** Python 3.12 / 3.13
- **Web Framework:** FastAPI 0.115+ (ASGI)
- **ASGI Server:** Uvicorn 0.34+ (with uvloop, httptools)
- **Database & ORM:** SQLAlchemy 2.0 (declarative mapped columns, eager loading, row locking)
- **Schema Validation & Serialization:** Pydantic v2
- **Database Migrations:** Alembic
- **Database Engine:** PostgreSQL 17 (production/Docker) & SQLite with foreign key pragmas (local testing)
- **Authentication & Cryptography:** JWT tokens (HMAC-SHA256 via python-jose), password hashing via passlib (bcrypt), cookie & bearer auth
- **Reliability Pattern:** Transactional Outbox Pattern (`domain_outbox_events` table) with exponential backoff, dead-letter quarantine (`status = 'dead_letter'`), idempotency keys, and PostgreSQL advisory locking for multi-worker concurrency safety
- **AI & LLM Services:**
  - Google Gemini 2.5 Flash via `GeminiServiceAdapter`
  - AGY (Antigravity CLI / subprocess agent `agy -m`) for interactive iterative question refinement and lesson tutoring
  - Content-aware SHA-256 fingerprint caching in `ai_content_cache` table
  - Strict teacher quarantine: AI questions are saved as `pending_review` in `ai_question_candidates` and NEVER appear in live assessments until explicitly approved by an assigned teacher
- **Testing:** pytest 9.1+, anyio, httpx TestClient

### Frontend Stack
- **Framework & Runtime:** React 19 / 18, TypeScript 5.7+
- **Build Tool:** Vite 8.3+ (ESM, Hot Module Replacement, production minification)
- **Styling:** Tailwind CSS v4, custom utility classes, design system tokens
- **Icons & UI:** Lucide React (feather icons), Motion
- **State Management & Storage:** Modular service layer (`frontend/src/services/api/`), resilient localStorage fallback (`storageService.ts`)
- **Testing:** Node test runner (`node --experimental-strip-types --test`), TypeScript strict checking (`tsc --noEmit`), Vite production build

---

## 3. Directory Structure & File Inventory

```text
Learnova/
â”œâ”€â”€ .agents/                               # AI Agent configuration, skills, and documentation
â”‚   â”œâ”€â”€ PROJECT_OVERVIEW.md                 # THIS FILE - Authoritative project knowledge base
â”‚   â”œâ”€â”€ rules/
â”‚   â”‚   â”œâ”€â”€ graphify.md                     # Knowledge graph integration rule
â”‚   â”‚   â””â”€â”€ project_overview.md             # Injected rule auto-loading project context into every prompt
â”‚   â”œâ”€â”€ skills/
â”‚   â”‚   â”œâ”€â”€ graphify/                       # Codebase knowledge graph skill
â”‚   â”‚   â””â”€â”€ impeccable/                     # Frontend design & audit skill
â”‚   â””â”€â”€ workflows/
â”œâ”€â”€ backend/                                # FastAPI application root
â”‚   â”œâ”€â”€ app/
â”‚   â”‚   â”œâ”€â”€ main.py                         # FastAPI app entry point, lifespan, outbox runner
â”‚   â”‚   â”œâ”€â”€ ai/
â”‚   â”‚   â”‚   â”œâ”€â”€ adapter.py                  # ILLMServiceAdapter, GeminiServiceAdapter, MockAdapter
â”‚   â”‚   â”‚   â”œâ”€â”€ agy_adapter.py              # AGY CLI subprocess runner for persistent sessions
â”‚   â”‚   â”‚   â””â”€â”€ privacy.py                  # Regex PII scrubber and prompt boundary sanitizer
â”‚   â”‚   â”œâ”€â”€ api/
â”‚   â”‚   â”‚   â””â”€â”€ v1/
â”‚   â”‚   â”‚       â”œâ”€â”€ api.py                  # API v1 router aggregator
â”‚   â”‚   â”‚       â””â”€â”€ endpoints/
â”‚   â”‚   â”‚           â”œâ”€â”€ auth.py             # Login, registration, token refresh, current user
â”‚   â”‚   â”‚           â”œâ”€â”€ courses.py          # Course CRUD, syllabus hierarchy, enrollments
â”‚   â”‚   â”‚           â”œâ”€â”€ topics.py           # Topics, prerequisites, readiness check
â”‚   â”‚   â”‚           â”œâ”€â”€ lessons.py          # Lessons, content, completion tracking
â”‚   â”‚   â”‚           â”œâ”€â”€ resources.py        # Learning materials, attachments, study logs
â”‚   â”‚   â”‚           â”œâ”€â”€ questions.py        # Question Bank CRUD, verification, archiving
â”‚   â”‚   â”‚           â”œâ”€â”€ assessments.py      # Assessment authoring, question composition, publishing
â”‚   â”‚   â”‚           â”œâ”€â”€ attempts.py         # Assessment attempts, response saving, authoritative submission
â”‚   â”‚   â”‚           â”œâ”€â”€ mastery.py          # BKT cognitive mastery endpoints, audit ledgers
â”‚   â”‚   â”‚           â”œâ”€â”€ gamification.py     # XP ledger, badges, streaks, leaderboards
â”‚   â”‚   â”‚           â”œâ”€â”€ ai.py               # AI candidate generation, governance (approve/reject), AGY sessions
â”‚   â”‚   â”‚           â”œâ”€â”€ students.py         # Student dashboard, analytics, attempt history
â”‚   â”‚   â”‚           â”œâ”€â”€ teacher.py          # Teacher dashboard, course class analytics, student drilldown
â”‚   â”‚   â”‚           â”œâ”€â”€ admin.py            # User management, audit logs, service health
â”‚   â”‚   â”‚           â””â”€â”€ health.py           # Liveness & readiness probe endpoints
â”‚   â”‚   â”œâ”€â”€ core/
â”‚   â”‚   â”‚   â”œâ”€â”€ config.py                   # Pydantic BaseSettings, environment variable parsing
â”‚   â”‚   â”‚   â”œâ”€â”€ dependencies.py             # RBAC dependencies (get_current_user, require_role)
â”‚   â”‚   â”‚   â””â”€â”€ security.py                 # Password hashing, JWT creation & decoding
â”‚   â”‚   â”œâ”€â”€ db/
â”‚   â”‚   â”‚   â”œâ”€â”€ base.py                     # SQLAlchemy DeclarativeBase
â”‚   â”‚   â”‚   â”œâ”€â”€ session.py                  # Engine, sessionmaker, get_db generator
â”‚   â”‚   â”‚   â””â”€â”€ migrations/                 # Alembic migration versions and env.py
â”‚   â”‚   â”œâ”€â”€ models/                         # 16 SQLAlchemy Domain Models
â”‚   â”‚   â”‚   â”œâ”€â”€ user.py                     # User account entity
â”‚   â”‚   â”‚   â”œâ”€â”€ role.py                     # Role and UserRole join entity
â”‚   â”‚   â”‚   â”œâ”€â”€ course.py                   # Course & CourseTeacher entities
â”‚   â”‚   â”‚   â”œâ”€â”€ topic.py                    # Topic & TopicPrerequisite entities
â”‚   â”‚   â”‚   â”œâ”€â”€ lesson.py                   # Lesson & LessonCompletion entities
â”‚   â”‚   â”‚   â”œâ”€â”€ resource.py                 # LearningResource & ResourceActivity entities
â”‚   â”‚   â”‚   â”œâ”€â”€ question.py                 # Question Bank entity (5 question formats)
â”‚   â”‚   â”‚   â”œâ”€â”€ assessment.py               # Assessment & AssessmentQuestion snapshot entities
â”‚   â”‚   â”‚   â”œâ”€â”€ attempt.py                  # AssessmentAttempt & AttemptResponse entities
â”‚   â”‚   â”‚   â”œâ”€â”€ mastery.py                  # StudentTopicMastery & MasteryAuditLedger
â”‚   â”‚   â”‚   â”œâ”€â”€ gamification.py             # GamificationProfile, XPLedger, Badge, UserBadge, Challenge
â”‚   â”‚   â”‚   â”œâ”€â”€ outbox.py                   # DomainOutboxEvent durable queue entity
â”‚   â”‚   â”‚   â””â”€â”€ ai.py                       # AICandidateQuestion & AIContentCache entities
â”‚   â”‚   â”œâ”€â”€ schemas/                        # Pydantic DTOs for requests and responses
â”‚   â”‚   â””â”€â”€ services/                      # Business logic services
â”‚   â”‚       â”œâ”€â”€ auth_service.py             # Credential verification, RBAC assignment
â”‚   â”‚       â”œâ”€â”€ course_service.py           # Course CRUD and syllabus assembly
â”‚   â”‚       â”œâ”€â”€ topic_service.py            # Topic DAG cycle prevention (DFS) and readiness
â”‚   â”‚       â”œâ”€â”€ lesson_service.py           # Lesson management and completion verification
â”‚   â”‚       â”œâ”€â”€ resource_service.py         # Resource management and activity tracking
â”‚   â”‚       â”œâ”€â”€ question_service.py         # Question validation, authoring, teacher verification
â”‚   â”‚       â”œâ”€â”€ assessment_service.py       # Assessment authoring, publication gate validation
â”‚   â”‚       â”œâ”€â”€ attempt_service.py          # Attempt lifecycle, concurrency checks, timer expiration
â”‚   â”‚       â”œâ”€â”€ grading_service.py          # Server-authoritative grading across 5 question types
â”‚   â”‚       â”œâ”€â”€ mastery_service.py          # Bayesian Knowledge Tracing (BKT) engine
â”‚   â”‚       â”œâ”€â”€ gamification_service.py     # XP transactions, streak calculations, badge rules
â”‚   â”‚       â”œâ”€â”€ outbox_processor.py         # Outbox dispatcher, multi-worker advisory locks, retry logic
â”‚   â”‚       â”œâ”€â”€ ai_service.py               # AI lesson tutoring and cache lookups
â”‚   â”‚       â”œâ”€â”€ ai_candidate_service.py     # AI question candidate quarantine, editing, atomic promotion
â”‚   â”‚       â”œâ”€â”€ ai_session_service.py       # Persistent AGY chat sessions for iterative refinement
â”‚   â”‚       â”œâ”€â”€ analytics_service.py        # Student, teacher, and admin aggregated metrics
â”‚   â”‚       â””â”€â”€ audit_service.py            # Security and compliance event logging
â”‚   â””â”€â”€ tests/                              # Comprehensive backend test suite (230+ tests)
â”œâ”€â”€ frontend/                               # React + TypeScript + Vite frontend
â”‚   â”œâ”€â”€ server.ts                           # Express development & proxy server
â”‚   â”œâ”€â”€ src/
â”‚   â”‚   â”œâ”€â”€ App.tsx                         # Main client routing and portal orchestrator
â”‚   â”‚   â”œâ”€â”€ types/index.ts                  # Shared TypeScript interfaces and types
â”‚   â”‚   â”œâ”€â”€ services/
â”‚   â”‚   â”‚   â”œâ”€â”€ storageService.ts           # Resilient storage and seed data
â”‚   â”‚   â”‚   â””â”€â”€ api/                        # Typed REST clients (aiApi, teacherApi, studentApi)
â”‚   â”‚   â”œâ”€â”€ components/                     # Reusable UI component library
â”‚   â”‚   â”‚   â”œâ”€â”€ ui/                         # Buttons, forms, modals, tables, badges, search bars
â”‚   â”‚   â”‚   â”œâ”€â”€ teacher/                    # TeacherLayout, CourseCard, Navigation
â”‚   â”‚   â”‚   â”œâ”€â”€ student/                    # StudentLayout, GamificationWidget, LearningPath
â”‚   â”‚   â”‚   â””â”€â”€ admin/                      # AdminLayout, AuditLogTable, UserManagement
â”‚   â”‚   â”œâ”€â”€ pages/
â”‚   â”‚   â”‚   â”œâ”€â”€ teacher/                    # 12 Teacher portal views (AIReviewPage, QuestionBankPage, etc.)
â”‚   â”‚   â”‚   â”œâ”€â”€ student/                    # 18 Student portal views (Dashboard, Practice, Exam, Analytics, etc.)
â”‚   â”‚   â”‚   â””â”€â”€ admin/                      # 8 Administrator portal views
â”‚   â”‚   â””â”€â”€ utils/                          # Pure business logic and testing utilities (DAG, BKT, grading)
â”œâ”€â”€ API_CONTRACT.md                         # Authoritative API endpoints, payload contracts, invariants
â”œâ”€â”€ DECISIONS.md                            # Architectural Decision Records (ADRs)
â”œâ”€â”€ IMPLEMENTATION_STATUS.md                # Traceability matrix and phase capabilities
â””â”€â”€ docker-compose.yml                      # Container topology (Postgres, Backend, Frontend)
```

---

## 4. Teacher Portal Governance & Core Workflows

### 4.1 Teacher Course Authorization
Teachers are strictly scoped to courses assigned to them in the `course_teachers` database table. The backend enforces `QuestionService.verify_course_teacher_access(db, course_id, actor)` on all teacher operations. Administrators have global access across all courses.

### 4.2 AI Candidate Question Governance (SSD-08)
1. **Teacher Course & Lesson Selection:**
   - Teacher selects an authorized course.
   - Teacher selects the target lesson within that course.
   - Resource input automatically filters to **only learning resources belonging to that selected lesson**.
2. **Generation Request:**
   - Teacher specifies allowed question formats (`multiple_choice`, `true_false`, `fill_blank`, `matching`, `short_answer`), difficulty (`easy`, `medium`, `hard`), question count, and optional custom instructions.
   - Submits to `POST /api/v1/ai/generate-questions`.
3. **Quarantine State:**
   - Candidates are stored in `ai_question_candidates` table with `status = "pending_review"`.
   - Quarantined candidates **never appear** in live assessments or student question pools.
4. **Teacher Review Queue:**
   - Teacher inspects question prompt, options, answer key, distractor rationales, and pedagogical explanation.
   - Teacher can filter candidates (by status, difficulty, type, search keyword).
   - Teacher can sort candidates (ascending/descending by date, difficulty, points, type).
   - Teacher can perform **Bulk Reject** ("Reject All Pending") or individual reject with recorded reason.
   - Teacher can edit candidate prompt or points via `PATCH /api/v1/ai/candidates/{id}`.
5. **Atomic Approval Promotion:**
   - When teacher approves a candidate (`POST /api/v1/ai/candidates/{id}/approve`), backend acquires a row-level lock (`with_for_update()`), creates the official `Question` in the Question Bank with `source = "ai_generated"` and `status = "approved"`, links `approved_question_id`, and writes an immutable audit log in a single atomic database transaction.

### 4.3 Question Bank Architecture & Categorization
- Questions are categorized hierarchically: **Course -> Lesson**.
- Under each selected course, questions are categorized and grouped by **Lesson**:
  - Each lesson category displays its title, order, parent topic, question count, and difficulty breakdown.
  - Questions belonging to that lesson are displayed with prompts, formats, points, and status.
  - Quick action shortcuts allow adding questions directly to a lesson or generating AI questions anchored to that lesson.
  - Questions without a specific lesson mapping are displayed under "General / Course-Wide Questions".
- Full search and filtering support across question prompts, types, difficulties, and statuses.

---

## 5. System Execution & Verification Runbook

### Running the Services Locally

#### 1. Backend (FastAPI on Port 8000)
```powershell
# From workspace root
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Health & Readiness endpoints:
- Liveness: `http://localhost:8000/health` or `http://localhost:8000/api/v1/health/liveness`
- Readiness: `http://localhost:8000/ready` or `http://localhost:8000/api/v1/health/readiness`
- Interactive API Docs: `http://localhost:8000/docs`

#### 2. Frontend (Vite / Express on Port 3000)
```powershell
# From frontend directory
cd frontend
npm run dev
# Or from root
npm run dev
```
Access the application at `http://localhost:3000`.

### Running Automated Test Suites

#### Backend Tests (Pytest)
```powershell
# Run all backend unit & integration tests
python -m pytest backend/tests

# Run focused test modules
python -m pytest backend/tests/test_question_bank.py
python -m pytest backend/tests/test_ai_candidate_governance.py
```

#### Frontend Tests (Node test runner & TypeScript verification)
```powershell
# Run frontend unit tests
npm test

# Verify TypeScript type correctness
npm --prefix frontend run lint

# Verify production Vite build
npm --prefix frontend run build
```

---

## 6. Rules for Future Agent Sessions
1. **Never bypass Teacher Governance:** AI-generated assessment content must always enter `pending_review` in `ai_question_candidates` before entering `questions`.
2. **Preserve Option B Lifespan Outbox:** Gamification and mastery event dispatching happens inside the FastAPI lifespan process; do not create separate worker containers.
3. **Segregate Answer Keys:** Question payloads delivered to students must never contain `is_correct`, `solution_pairs`, or `answer_key`. Server-authoritative grading occurs exclusively on the backend.
4. **Maintain Curriculum Hierarchy:** Courses contain Topics; Topics contain Lessons; Lessons contain Learning Resources. Questions are anchored to Courses, Topics, and Lessons.
5. **Follow Strict Status Enums:** Use `HTTP_422_UNPROCESSABLE_ENTITY` for semantic validation errors in FastAPI.
