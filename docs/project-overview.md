# Learnova â€” Comprehensive Project Overview

---

## 1. Executive Summary & Purpose

**Learnova** is an enterprise-grade, adaptive, and gamified educational platform built for higher education, universities, and high-stakes technical training institutes. It bridges the gap between cognitive learning theory, automated assessment, and interactive learner engagement.

Rather than relying on static quiz banks or unmonitored generative AI text, Learnova implements a rigorous, scientifically grounded learning architecture:
- **Bayesian Knowledge Tracing (BKT):** Continuously estimates latent student skill mastery based on response history, slips, and guesses.
- **Prerequisite DAG (Directed Acyclic Graph):** Dynamically sequences learning topics and enforces curriculum prerequisites using topological sorting (Kahn's algorithm) to prevent learning bottlenecks.
- **Teacher-Governed AI Content (SSD-08):** Harnesses LLMs (Google Gemini 2.5 Flash and Antigravity CLI) to assist teachers in generating rich assessments, but enforces an absolute quarantine in `ai_question_candidates` with `status = "pending_review"` until explicitly approved by an assigned course teacher.
- **Server-Authoritative Assessment & Answer Key Segregation:** Question delivery payloads strictly omit answer keys and solution pairs to guarantee academic integrity; all grading is performed server-side by `GradingService`.
- **Durable Asynchronous Gamification (Option B):** Rewards learners with XP, tiered achievement badges, and streaks via an in-process transactional outbox queue integrated into the FastAPI application lifespan.

---

## 2. Core Portals & User Roles

Learnova partitions functionality into three authenticated operational portals plus a public marketing bundle:

### 2.1 Student Portal
- **Dashboard & Activity Hub:** Real-time metrics showing total XP, current level, active streaks, daily challenge progress, and recent activity.
- **Adaptive Practice & Timed Exams:** Assessments supporting 5 question formats (`multiple_choice`, `true_false`, `fill_blank`, `matching`, `short_answer`) with client timers, auto-submission on expiration, and server-side scoring.
- **Knowledge Tracing Tree (Mastery):** Visual cognitive mastery map displaying normalized BKT mastery levels across topics (`novice`, `developing`, `proficient`, `mastered`).
- **Learning Path Navigator:** Evaluates topic prerequisites to recommend the optimal next learning step and suggests remediation when mastery falls below thresholds.
- **AI Lesson Simplification Studio:** Instant contextual tutoring allowing students to simplify dense textbook lessons, request real-world analogies, or generate practical examples.
- **Privacy-Preserving Leaderboards:** Gamification rankings with affirmative student consent defaults and anonymous pseudonym options.

### 2.2 Teacher Portal
- **Course & Syllabus Management:** Multi-tier curriculum management structured hierarchically as **Course -> Topic -> Lesson -> LearningResource**.
- **Lesson-Categorized Question Bank:** Browsable repository categorizing questions by Course and Lesson, displaying difficulty distributions and question types.
- **AI Question Generation & Review Queue (SSD-08):**
  - Teacher selects Course -> Lesson (input resources automatically filtered strictly to that lesson).
  - Configures question types, count, and difficulty.
  - Quarantined candidates enter `pending_review` in `ai_question_candidates`.
  - Review queue features search, multi-field filtering, sorting, bulk rejection, prompt editing, and single-click atomic promotion to the official Question Bank with row-level locking.
- **Student Performance Analytics:** Drilldown analytics showing class averages, at-risk students, mastery distributions, and weakest topics.

### 2.3 Administrator Portal
- **User Directory & RBAC:** Comprehensive user management with role assignments (`admin`, `teacher`, `student`).
- **Admin Lockout Safeguard:** Built-in constraint preventing deletion or demotion of the final active administrator.
- **Security Audit Logs:** Immutable ledger recording security events, authentication attempts, role modifications, and AI question approvals.
- **System Health Monitor:** Real-time health probes verifying database connectivity and outbox worker state.

### 2.4 Public Showcase Pages (`learnova-public-pages/`)
- **Landing Page with 3D Holographic Particle Cortex:** Interactive Three.js WebGL canvas simulating neural synaptic networks (Dala Brain Engine) with GSAP scroll-triggered animations.
- **About Us & Architecture Pages:** Public overview of the platform's vision, institutional mission, and cognitive science foundation.
- **Contact Us Page:** Interactive inquiries form with category selection and validation.

---

## 3. Technology Stack Breakdown

```text
+--------------------------------------------------------------------------+
|                            LEARNOVA ECOSYSTEM                            |
+------------------------------------+-------------------------------------+
| FRONTEND LAYER                     | BACKEND LAYER                       |
| React 19.0.1                       | FastAPI 0.115+                      |
| TypeScript 7.0+                    | Python 3.13                         |
| Vite 8.3+                          | Uvicorn 0.34+ (ASGI Server)         |
| Tailwind CSS v4                    | SQLAlchemy 2.0 (Sync ORM)           |
| Express 4.21 (Dev/Proxy Host)      | Alembic 1.13+ (13 Migrations)       |
| Three.js 0.187 (3D Particle Brain) | Pydantic v2 (Validation & DTOs)     |
| GSAP 3.15 (ScrollTrigger)          | PyJWT & Bcrypt (Authentication)     |
| Lucide React & Motion              | OutboxProcessor (FastAPI Lifespan)  |
+------------------------------------+-------------------------------------+
| PERSISTENCE & INFRASTRUCTURE                                             |
| PostgreSQL 17 (Production / Docker)                                      |
| SQLite with PRAGMA foreign_keys = ON (Unit & Integration Testing)        |
| Docker Compose (Database, Backend, Frontend Services)                    |
| Google Gemini 2.5 Flash & Antigravity CLI (agy / agentapi)               |
+--------------------------------------------------------------------------+
```

---

## 4. Key Architectural Decisions (Summary)

- **Option B Modular Monolith (DEC-P12-001):** Consolidates API endpoints and the transactional outbox worker into a single FastAPI process without external message brokers.
- **Teacher AI Governance (SSD-08, DEC-P9-001):** AI content is quarantined until explicitly reviewed and atomically promoted by an assigned teacher.
- **Answer Key Segregation (DEC-P5-001):** Question deliverables omit answers; grading occurs exclusively server-side.
- **Normalized BKT Scale (DEC-001):** Normalized `0.0000` to `1.0000` float in PostgreSQL; serialized as integer percentage `0` to `100` for frontend display.
- **DAG Cycle Prevention (DEC-P4-002):** Directed acyclic prerequisite structure validated using Kahn's algorithm and DFS.
