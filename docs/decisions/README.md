# Learnova Architectural Decision Records (ADR) Catalog

This catalog indexes and summarizes all architectural decisions made across the lifecycle of the **Learnova** platform. Full details and context for each decision are maintained in [`DECISIONS.md`](file:///c:/Learnova/DECISIONS.md).

---

## 1. Core Architecture Decisions

| Decision ID | Title | Summary & Invariant | Status |
| :--- | :--- | :--- | :--- |
| **DEC-001** | Normalized Topic Mastery Scale | Normalized `0.0000` to `1.0000` float stored in DB; serialized as integer percentage `0-100` for frontend. | Approved & Implemented |
| **DEC-002** | Modular Monolith vs Distributed | Option B Modular Monolith in FastAPI + PostgreSQL; deferred distributed microservices until proven necessary. | Approved & Implemented |
| **DEC-003** | Staged AI Endpoint Migration | Retained Express AI proxies initially, migrated to FastAPI with standardized adapters. | Approved & Implemented |
| **DEC-004** | Development Seed Strategy | Guarded development seed script reading from `.env` to avoid credential leakage. | Approved & Implemented |
| **DEC-005** | Question Scoring & Partial Credit | Partial credit permitted for matching pairs and rubric-based answers; binary scoring for objective types. | Approved & Implemented |
| **DEC-006** | Asynchronous Gamification Processing | Decoupled academic grading from XP/badge processing using transactional outbox events. | Approved & Implemented |
| **DEC-P12-001** | In-Process Lifespan Outbox Processor | Durable outbox processor integrated directly into FastAPI application lifespan; no external broker containers. | Approved & Implemented |

---

## 2. Authentication & Authorization Decisions

| Decision ID | Title | Summary & Invariant | Status |
| :--- | :--- | :--- | :--- |
| **DEC-P2-001** | Single Active Role per User | Users operate under one designated primary role (`admin`, `teacher`, `student`). | Approved & Implemented |
| **DEC-P2-002** | Teacher-Course Assignment Junction | Teachers are linked to courses via `course_teachers` junction table. | Approved & Implemented |
| **DEC-P3-001** | Server-Side Revocable Sessions | Refresh tokens tracked in `user_sessions` for instant server-side revocation. | Approved & Implemented |
| **DEC-P3-002** | Browser Credential Protection | Auth cookies configured with `HttpOnly`, `SameSite=Lax`, and `Secure` flags. | Approved & Implemented |
| **DEC-P3-004** | Transactional Admin Lockout Safeguards | Prevents deactivating, deleting, or demoting the last active Administrator account. | Approved & Implemented |
| **DEC-P10-001** | Teacher Course Access Scoping | Enforces course ownership verification on all teacher operations via `verify_course_teacher_access()`. | Approved & Implemented |

---

## 3. Curriculum, Question Bank & Grading Decisions

| Decision ID | Title | Summary & Invariant | Status |
| :--- | :--- | :--- | :--- |
| **DEC-P4-002** | Prerequisite DAG Cycle Detection | Prevents circular dependencies in topic prerequisites using Kahn's topological sort and DFS. | Approved & Implemented |
| **DEC-P4-003** | Course Publication Quality Gate | Prevents publishing courses without at least one topic, lesson, and valid prerequisite structure. | Approved & Implemented |
| **DEC-P5-001** | Segregated Payload & Answer Key | Student question deliverable (`payload`) strictly excludes grading answers (`answer_key`). | Approved & Implemented |
| **DEC-P5-003** | Assessment Publication Quality Gate | Ensures assessments have valid question snapshot compositions before publishing. | Approved & Implemented |
| **DEC-P6-001** | Immutable Attempt Question Snapshotting | Freezes question prompts and points at the moment an attempt starts. | Approved & Implemented |
| **DEC-P6-002** | Authoritative Server UTC Deadlines | Timed attempts strictly expire on server UTC time; automatically evaluated on expiry. | Approved & Implemented |

---

## 4. Mastery & Gamification Decisions

| Decision ID | Title | Summary & Invariant | Status |
| :--- | :--- | :--- | :--- |
| **DEC-P7-001** | Hybrid Bayesian Knowledge Tracing | Combines prior mastery, slip, guess, and transit probabilities to compute dynamic mastery. | Approved & Implemented |
| **DEC-P7-002** | Topic Readiness Gate | Recommends remediation loops when prerequisite mastery falls below threshold. | Approved & Implemented |
| **DEC-P8-001** | Strict Outbox Decoupling | Grading finishes synchronously; XP and streaks process asynchronously via outbox. | Approved & Implemented |
| **DEC-P8-002** | Append-Only XP Ledger | All XP awards recorded with unique idempotency keys to guarantee idempotency. | Approved & Implemented |
| **DEC-P8-004** | Privacy-Aware Leaderboard Anonymization | Leaderboard honors user privacy flags with affirmative consent defaults. | Approved & Implemented |

---

## 5. AI Integration & Governance Decisions

| Decision ID | Title | Summary & Invariant | Status |
| :--- | :--- | :--- | :--- |
| **DEC-P9-001** | Quarantined AI Candidate Governance | Generated questions stored in `ai_question_candidates` with `pending_review`; zero live exposure without teacher review. | Approved & Implemented |
| **DEC-P9-002** | Durable Content Cache for Lesson Tutoring | Caches generated explanations with SHA-256 fingerprinting in `ai_content_cache`. | Approved & Implemented |
| **DEC-P9-007** | Single-Transaction Atomic Promotion | Approving candidates locks the row (`with_for_update()`), creates the Question, and logs audit record atomically. | Approved & Implemented |
| **DEC-P9-008** | PII Minimization & Boundary Defense | Scrubs PII from user text before sending prompts to external LLM providers. | Approved & Implemented |

---

For complete architectural background, trade-off analyses, and author sign-offs, refer to the full [`DECISIONS.md`](file:///c:/Learnova/DECISIONS.md) document.
