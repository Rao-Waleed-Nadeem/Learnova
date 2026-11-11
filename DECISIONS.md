# Learnova Architecture Decisions Record (ADR)

**Document Status:** Baseline Approved for Phase 0  
**Authority:** `Learnova_Master_Backend_Implementation_Blueprint.md`, Sections 14.3 & 15  
**Last Updated:** Phase 0 Baseline Audit (2026-11-06)

---

## Decision Entries

### DEC-001: Normalized Topic Mastery Scale & Algorithm
- **Context:** `frontend/src/utils/studentLogic.ts` and `storageService.ts` currently compute mastery on an integer scale from `0` to `100` (`MasteryStatus: 'novice' | 'developing' | 'proficient' | 'mastered'`). Blueprint Section 5.5 and 7.3 note that persistence standards often utilize a normalized `0.0000` to `1.0000` float or decimal.
- **Options:**
  1. Store `0.0` to `1.0` as `DECIMAL(5,4)` in PostgreSQL and serialize as integer percentage `0–100` for the frontend.
  2. Store `0` to `100` as `INTEGER` across both database and frontend API.
- **Recommendation:** Option 1. Stores mathematically precise normalized decimals in PostgreSQL while preserving 100% compatibility with existing frontend display logic.
- **Affected Phases:** Phase 2, Phase 6, Phase 7.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 7).

---

### DEC-002: Modular Monolith vs Distributed Architecture
- **Context:** The repository blueprint recommends building Learnova as a modular monolith within FastAPI and PostgreSQL, deferring Redis or distributed brokers (Kafka/RabbitMQ) until measured demand requires them.
- **Options:**
  1. Modular monolith: single FastAPI service, shared connection pool, schema-isolated domain models, database-backed outbox for events.
  2. Distributed services: separate auth, assessment, and gamification microservices.
- **Recommendation:** Option 1 (Modular monolith), as specified in Blueprint Section 2.2. Maximizes developmental velocity, transactional consistency, and deployment simplicity.
- **Affected Phases:** Phases 1 through 12.
- **Owner Status:** APPROVED IN BLUEPRINT (Awaiting explicit formal sign-off).

---

### DEC-003: Staged AI Endpoint Migration Timing
- **Context:** Express on port 3000 currently serves `POST /api/ai/generate-questions` and `POST /api/ai/simplify-lesson`. Moving them immediately to FastAPI in Phase 1 would break frontend functionality before FastAPI proxying is established.
- **Options:**
  1. Retain Express AI routes on port 3000 during early backend phases (Phases 1–8); migrate to FastAPI behind a standardized LLM adapter in Phase 9.
  2. Immediately port AI routes to FastAPI in Phase 1.
- **Recommendation:** Option 1. Preserves existing working frontend AI capabilities while focusing initial phases on core backend foundations, auth, curriculum, and assessments.
- **Affected Phases:** Phase 1, Phase 9, Phase 11.
- **Owner Status:** PENDING OWNER APPROVAL.

---

### DEC-004: Development Seed Strategy & Credential Handling
- **Context:** Frontend `storageService.ts` contains hardcoded mock accounts (`adm-sarah`, `teacher-101`, `student-1`). Operating rules strictly forbid committing default production accounts or plain credentials.
- **Options:**
  1. Implement a dedicated CLI seed script (`python -m app.cli.seed`) that executes only when `ENVIRONMENT=development` and reads seed credentials from `.env`.
  2. Auto-seed default accounts on Alembic migration run.
- **Recommendation:** Option 1. Explicit, guarded, and prevents accidental credential seeding in non-development environments.
- **Affected Phases:** Phase 2, Phase 3.
- **Owner Status:** PENDING OWNER APPROVAL.

---

### DEC-005: Question Scoring & Partial Credit Model
- **Context:** Question types include `multiple_choice`, `true_false`, `fill_blank`, `matching`, and `short_answer`.
- **Options:**
  1. Binary scoring (full or zero points) for objective types; partial credit permitted for matching pairs and rubric-based short answers.
  2. Strict all-or-nothing scoring for all question types.
- **Recommendation:** Option 1. Matches educational expectations and the existing frontend `matchingPairs` structure.
- **Affected Phases:** Phase 5, Phase 6.
- **Owner Status:** PENDING OWNER APPROVAL.

---

### DEC-006: Asynchronous Gamification Event Processing
- **Context:** Source requirements demand that gamification (XP, leveling, badges, streaks) be decoupled from academic evaluation and mastery recalibration.
- **Options:**
  1. Transactional Outbox pattern: Assessment completion writes a domain event (`gamification_events` / `domain_outbox_events` table) within the same database transaction; an asynchronous worker processes events idempotently.
  2. Direct synchronous function call in the assessment route.
- **Recommendation:** Option 1 (Transactional Outbox). Guarantees zero academic rollbacks due to gamification errors, ensures idempotency, and eliminates race conditions.
- **Affected Phases:** Phase 8.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 8).

---

### DEC-007: Reference Documentation Baseline Authority
- **Context:** In Phase 0, `Learnova_SRS_Final_Aligned_V2.docx` was missing. In commit `abd879e`, the project owner provided `Learnova_SRS_Final_Aligned_V2 (1).docx` in `docs/sources/`.
- **Resolution:** Requirements traceability is now verified directly against `Learnova_SRS_Final_Aligned_V2 (1).docx`, `Learnova_Final_SSDs_V2.xml`, `Readme.md`, and the Master Blueprint.
- **Affected Phases:** All phases.
- **Owner Status:** RESOLVED.

---

### DEC-P1-001: Synchronous SQLAlchemy with psycopg2-binary Driver Strategy
- **Context:** Blueprint Section 5.10 and 16 recommend selecting one deliberate driver strategy without mixing async and sync drivers.
- **Options:**
  1. Synchronous SQLAlchemy 2.0+ with `psycopg2-binary`.
  2. Asynchronous SQLAlchemy 2.0+ with `asyncpg`.
- **Decision:** Option 1. Simplifies Alembic migrations (native sync execution), provides high stability in Python 3.12, eliminates async session bridge complexity, and performs with high throughput via FastAPI's threadpool execution for synchronous dependencies.
- **Affected Files:** `backend/requirements.txt`, `backend/app/db/session.py`, `backend/alembic/env.py`.
- **Owner Status:** APPROVED.

---

### DEC-P1-002: Liveness vs Readiness Endpoint Topology & Backwards Compatibility
- **Context:** `PHASE-01_BACKEND_FOUNDATION.md` AC-3 requires distinguishing application availability from database readiness while preserving `/health` compatibility (AC-4).
- **Options:**
  1. Root `/health` remains backward-compatible returning `{"status": "ok", "service": "learnova-api"}`; Root `/ready` checks DB connectivity returning `200` (ready) or `503` (not ready). Additionally, `/api/v1/health/liveness` and `/api/v1/health/readiness` provide structured monitoring.
  2. Change `/health` to fail if database is disconnected.
- **Decision:** Option 1. Guarantees 100% backward compatibility with existing Docker Compose and external probes while providing precise readiness diagnostics.
- **Affected Files:** `backend/app/main.py`, `backend/app/api/v1/endpoints/health.py`.
- **Owner Status:** APPROVED.


---

### DEC-P2-001 (Blueprint DEC-04): Single Active Role per User
- **Context:** `frontend/src/types/index.ts` models `UserAccount` with a single `role: UserRole` (`student | teacher | administrator`). D1 mentions assigned roles; Blueprint Section 7.2 requires confirming role cardinality.
- **Options:**
  1. Single active role per user, referencing a normalized `roles` lookup table (`student`, `teacher`, `administrator`).
  2. Multi-role array/JSON per user.
- **Decision:** Option 1. Preserves 100% alignment with current UI capabilities and admin guardrails while maintaining strict referential integrity.
- **Affected Files:** `backend/app/models/user.py`, `backend/app/models/role.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).

---

### DEC-P2-002 (Blueprint DEC-05): Teacher-to-Course Many-to-Many Assignment Junction
- **Context:** Teachers must be restricted to assigned courses. Source requirements do not limit courses to a single instructor.
- **Options:**
  1. Single teacher foreign key on `courses` table.
  2. Many-to-many junction entity `course_teachers`.
- **Decision:** Option 2. Supports multi-instructor courses, co-teaching, and granular course scoping.
- **Affected Files:** `backend/app/models/course_teacher.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).

---

### DEC-P2-003 (Blueprint DEC-02): Topic Mastery Threshold Normalized Unit
- **Context:** Blueprint Section 7.3 recommends internal normalized range `[0.0, 1.0]` with percentage conversion at API boundaries.
- **Options:**
  1. Store integer percentage (`75`).
  2. Store normalized float/decimal (`0.7500`) with check constraint `[0.0000, 1.0000]`.
- **Decision:** Option 2. Guarantees mathematical consistency across adaptive algorithms without hardcoding threshold logic into the schema.
- **Affected Files:** `backend/app/models/topic.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).

---

### DEC-P2-004 (Blueprint DEC-11): Provider-Neutral Learning Resource Metadata
- **Context:** Resources have types `document`, `video`, `markdown`, `code`, `link`. File upload infrastructure and cloud vendor selection are out of scope for Phase 2.
- **Options:**
  1. Store file blobs in PostgreSQL (`BYTEA`).
  2. Prematurely bind schema to AWS S3 / Google Cloud Storage SDKs.
  3. Store provider-neutral metadata (`type`, `content_or_url`, `file_size_bytes`).
- **Decision:** Option 3. Fully supports current frontend content requirements while remaining storage-agnostic.
- **Affected Files:** `backend/app/models/resource.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).

---

### DEC-P2-005: Surrogate UUIDv4 Primary Keys
- **Context:** System requires stable, collision-free identifiers compatible with frontend string IDs (`id: string`).
- **Options:**
  1. Sequential integers (`BIGSERIAL`).
  2. UUIDv4 primary keys.
- **Decision:** Option 2. Standardizes identifiers across all domain models without exposing table counts or sequential enumeration vulnerabilities.
- **Affected Files:** All models in `backend/app/models/`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 2).


---

### DEC-P3-001 (Blueprint DEC-08): Token Lifecycle & Server-Side Revocable Session Model
- **Context:** Stateless JWT access tokens cannot be revoked individually before expiration. Logout, account deactivation, and session invalidation after password changes require revocable state.
- **Options:**
  1. Stateless JWT access tokens without server revocation.
  2. Redis-backed token blacklist.
  3. Server-side session table in PostgreSQL tracking hashed refresh tokens and revocation state.
- **Decision:** Option 3. Short-lived access tokens (15 minutes) minimize the exposure window, while rotating refresh tokens tracked in `sessions` provide authoritative revocation on logout or security events.
- **Affected Files:** `backend/app/models/session.py`, `backend/app/services/auth_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 3).

---

### DEC-P3-002 (Blueprint DEC-09): Browser Credential Transport & Cookie Protection
- **Context:** Storing long-lived tokens in browser `localStorage` exposes them to XSS exfiltration.
- **Options:**
  1. Store access and refresh tokens in browser `localStorage`.
  2. Store refresh token in `HttpOnly, SameSite=Lax, Secure` cookie; keep short-lived access token in frontend memory.
- **Decision:** Option 2. Protects refresh tokens from XSS theft while keeping access tokens short-lived and ephemeral.
- **Affected Files:** `backend/app/api/v1/endpoints/auth.py`, `frontend/src/services/api/authApi.ts`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 3).

---

### DEC-P3-003 (Blueprint DEC-10): Public Registration & Bootstrap Policy
- **Context:** Frontend `CreateAccountPage.tsx` registers student accounts. Blueprint Section 10 requires defining registration permissions and bootstrap procedures.
- **Options:**
  1. Public registration accepts arbitrary client-supplied role flags.
  2. Public registration provisions `student` accounts ONLY. Teachers are provisioned/invited by administrators. Initial administrator is created via secure bootstrap CLI.
- **Decision:** Option 2. Eliminates privilege escalation vulnerabilities.
- **Affected Files:** `backend/app/services/auth_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 3).

---

### DEC-P3-004: Transactional Admin Lockout Safeguards
- **Context:** Frontend checks in `adminLogic.ts` prevent self-demotion, self-deactivation, and demoting the last active administrator, but can be bypassed via direct API calls or raced by concurrent requests.
- **Options:**
  1. Rely on frontend checks only.
  2. Backend non-locking count check.
  3. Transactional backend check with database row lock (`SELECT count(*) FROM users WHERE role_id = :admin_role_id AND is_active = true FOR UPDATE`).
- **Decision:** Option 3. Guarantees that concurrent requests cannot demote or deactivate the last active administrator.
- **Affected Files:** `backend/app/services/admin_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 3).

---

### DEC-P3-005: Teacher-to-Course Access Enforcement at Service/Query Boundary
- **Context:** In SSD-07 and SSD-08, teachers manage curriculum and questions for specific courses. Role checking alone does not prevent access to unassigned courses.
- **Options:**
  1. Global teacher access to all courses.
  2. Service and query boundary checking `course_teachers` junction table on all course-specific teacher operations.
- **Decision:** Option 2. Enforces multi-tenant course data isolation authoritatively in backend queries.
- **Affected Files:** `backend/app/core/dependencies.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 3).

---

### DEC-P4-001: Relational Normalization vs. Redundant `course_id`
- **Context:** Frontend mock objects duplicate `courseId` inside `Lesson` and `LearningResource`. Relational normalization requires `lessons` to belong to `topics` and `resources` to belong to `lessons`. Redundant foreign keys create update anomaly risks.
- **Options:**
  1. Add redundant `course_id` columns with compound foreign keys on `lessons` and `learning_resources`.
  2. Maintain strict 3NF in PostgreSQL (`lessons` references `topics.id`, `learning_resources` references `lessons.id`). Pydantic API response serializers dynamically synthesize `course_id` from the parent relationship.
- **Decision:** Option 2. Preserves relational consistency while guaranteeing 100% backward compatibility with frontend contracts.
- **Affected Files:** `backend/app/models/lesson.py`, `backend/app/schemas/curriculum.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 4).

---

### DEC-P4-002: Prerequisite DAG Cycle Detection Strategy
- **Context:** Database constraint `CHECK (topic_id <> prerequisite_topic_id)` prevents direct self-edges. Multi-hop cycles ($A \rightarrow B \rightarrow C \rightarrow A$) cannot be prevented by simple column check constraints.
- **Options:**
  1. Rely on frontend cycle detection in `src/utils/dag.ts` only.
  2. Implement database triggers with recursive CTEs.
  3. Implement authoritative domain service cycle detection (`dag_service.py`) using Depth-First Search (DFS) with recursion stack tracking and Kahn's algorithm before persisting edges.
- **Decision:** Option 3. Guarantees strict acyclicity at the application boundary, returning `400 Bad Request` with the exact cycle path if a cycle is attempted.
- **Affected Files:** `backend/app/services/dag_service.py`, `backend/app/api/v1/endpoints/topics.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 4).

---

### DEC-P4-003: Course Publication Gate & Quality Invariants
- **Context:** Publishing a course makes it publicly discoverable in the student catalog. Incomplete courses break the learning experience.
- **Options:**
  1. Allow publishing any course unconditionally.
  2. Enforce a strict server-side validation gate verifying course readiness (>= 1 topic, every topic has >= 1 lesson, acyclic prerequisite DAG) before allowing publication.
- **Decision:** Option 2. Ensures that only fully configured, structurally sound courses can be published.
- **Affected Files:** `backend/app/services/course_service.py`, `backend/app/api/v1/endpoints/courses.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 4).

---

### DEC-P4-004: Enrollment Lifecycle & Idempotency
- **Context:** Students enroll in courses via `POST /api/v1/courses/{course_id}/enrollments`. Repeated requests should not create duplicates or fail needlessly.
- **Options:**
  1. Return `400 Bad Request` / `409 Conflict` on duplicate enrollment.
  2. Enforce unique database constraint `UNIQUE (student_id, course_id)`, but handle repeat enrollment idempotently in the service layer: if already enrolled with `active` status, return the existing enrollment with `200 OK`.
- **Decision:** Option 2. Provides idempotency and a seamless user experience, while strictly prohibiting enrolling in draft courses.
- **Affected Files:** `backend/app/services/enrollment_service.py`, `backend/app/api/v1/endpoints/enrollments.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 4).

---

### DEC-P4-005: Lesson Completion Tracking & Dynamic Progress Derivation
- **Context:** As students complete lessons, their course progress percentage must be tracked. Materializing a stored progress_percent field without an invalidation strategy risks stale percentages when curriculum items are added or removed.
- **Options:**
  1. Persist source events (`LessonCompletion`) as authoritative and derive progress dynamically from the current lesson denominator on read. Honor DEC-09 by not equating all lessons completed with final course completion.
  2. Materialize a static `progress_percent` column on the `enrollments` table updated by triggers or application logic.
- **Decision:** Option 1. Guarantees 100% mathematical accuracy of derived progress as the course curriculum dynamically evolves.
- **Affected Files:** `backend/app/models/lesson_completion.py`, `backend/app/services/enrollment_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 4).

---

### DEC-P5-001: Segregated Deliverable `payload` and Grading `answer_key`
- **Context:** To satisfy FR-ASM-04 and eliminate any risk of answer leakage to students during exam delivery or catalog inspection.
- **Options:**
  1. Store all fields flat in the `questions` table and rely on Pydantic serializers to filter out answer keys.
  2. In the PostgreSQL `questions` table, store student deliverable content in a `payload` JSONB column and all grading secrets in an `answer_key` JSONB column.
- **Decision:** Option 2. Student projection serializers serialize ONLY `payload` and metadata, making answer leakage structurally impossible at the database and serialization layers.
- **Affected Files:** `backend/app/models/question.py`, `backend/app/schemas/question.py`, `backend/app/services/question_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 5).

---

### DEC-P5-002: Short-Answer Grading Mode Governance (DEC-06 Alignment)
- **Context:** DEC-06 mandates that automated grading must never implicitly invoke an external or unmonitored LLM.
- **Options:**
  1. Allow short answers to implicitly trigger LLM auto-grading in the background.
  2. Require an explicit `grading_mode` field: `"manual_review"` (default, flagged for teacher evaluation against `expected_rubric`) or `"exact_match"` (deterministic evaluation against teacher-provided `accepted_answers`).
- **Decision:** Option 2. Guarantees complete adherence to DEC-06, ensuring no implicit LLM costs or grading non-determinism.
- **Affected Files:** `backend/app/models/question.py`, `backend/app/schemas/question.py`, `backend/app/services/question_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 5).

---

### DEC-P5-003: Assessment Publication Quality Gate & Composition Lock
- **Context:** Students must not take unvalidated or empty assessments; historical assessment validity must be protected from post-publication modifications.
- **Options:**
  1. Allow publishing assessments with 0 questions or unvalidated question associations.
  2. Enforce a strict server-side publication quality gate requiring >= 1 question, total points > 0, and course-scoping validation. Once published, lock question composition against direct alteration.
- **Decision:** Option 2. Ensures that only structurally complete, valid assessments can be published, preventing corrupt assessment attempts.
- **Affected Files:** `backend/app/models/assessment.py`, `backend/app/services/assessment_service.py`, `backend/app/api/v1/endpoints/assessments.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 5).

---

### DEC-P5-004: Monotonic Question Version Pinning
- **Context:** Questions in the question bank evolve over time. Retroactively altering a published or completed exam's questions corrupts historical student attempts and scores.
- **Options:**
  1. Associate assessments with `question_id` only, pulling the live question state on every exam attempt.
  2. Maintain a monotonic `version: int` on the `questions` table, incremented on every edit. Pin `question_version` on the `assessment_questions` junction table at composition time.
- **Decision:** Option 2. Published assessments remain permanently pinned to the exact question snapshot configured at authoring time.
- **Affected Files:** `backend/app/models/question.py`, `backend/app/models/assessment.py`, `backend/app/services/assessment_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 5).

---

### DEC-P6-001: Immutable Attempt Question Snapshotting
- **Context:** Post-publication edits to questions in the Question Bank must not mutate active or historical student exam attempts, leak answers, or invalidate scored results.
- **Options:**
  1. Dynamically join with the `questions` table during the attempt and upon grading.
  2. Snapshot deliverable question content, points, and server answer keys into `AssessmentAttempt.snapshot_data` upon attempt creation. Student projections serve sanitized questions exclusively from the snapshot.
- **Decision:** Option 2. Guarantees complete immutability of assessment attempts and permanently isolates exams from concurrent teacher edits.
- **Affected Files:** `backend/app/models/attempt.py`, `backend/app/services/attempt_service.py`, `backend/app/services/grading_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 6).

---

### DEC-P6-002: Authoritative Server UTC Deadlines and Auto-Submit on Expiry (DEC-07)
- **Context:** Client clocks are untrusted. High-stakes timed examinations require fair, deterministic expiry enforcement.
- **Options:**
  1. Trust client-submitted completion timestamps or countdown timer states.
  2. Compute authoritative UTC `deadline_at` on the server at attempt start (`started_at + timedelta(minutes=time_limit_minutes)`). Reject late responses or trigger auto-submission awarding 0 points to unanswered items on expiry.
- **Decision:** Option 2. Server UTC clock is authoritative; client time manipulation is neutralized.
- **Affected Files:** `backend/app/models/attempt.py`, `backend/app/services/attempt_service.py`, `backend/app/services/grading_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 6).

---

### DEC-P6-003: Transactional Outbox Pattern for Assessment Completion
- **Context:** Assessment completion triggers downstream side-effects (topic mastery calculation in Phase 7 and gamification rewards in Phase 8). Directly coupling these within the grading transaction violates architectural phase boundaries and introduces distributed transaction failure risks.
- **Options:**
  1. Invoke Phase 7/8 logic synchronously inside the grading endpoint.
  2. Persist a domain event in a durable `domain_outbox_events` table in the exact same database transaction as the attempt grading.
- **Decision:** Option 2. Transactional outbox event with `event_type = 'assessment.completed'` and unique idempotency key decouples grading from downstream processing.
- **Affected Files:** `backend/app/models/outbox.py`, `backend/alembic/versions/20261109_0008_d4_assessment_attempts_and_grading.py`, `backend/app/services/grading_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 6).

---

### DEC-P6-004: Idempotent Response Upsert and Submission
- **Context:** Network retry loops, connection drops, or rapid user clicks can resend interim answers or submit calls multiple times.
- **Options:**
  1. Treat duplicate writes as errors or create duplicate records.
  2. Upsert interim answers against unique constraint `(attempt_id, question_id)` with updated `received_at` timestamps. Return existing graded result on re-submission without re-running grading or duplicating outbox events.
- **Decision:** Option 2. Eliminates duplicate processing and state inconsistencies under network retries.
- **Affected Files:** `backend/app/models/attempt.py`, `backend/app/services/attempt_service.py`, `backend/app/services/grading_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 6).

---

### DEC-P7-001: Hybrid Bayesian Knowledge Tracing & Assessment Score Blending
- **Context:** Pure classical BKT updates hidden mastery based on single item correctness, which can produce non-intuitive score jumps on comprehensive exams. Conversely, raw percentage scores ignore latent skill acquisition across longitudinal attempts.
- **Options:**
  1. Rely 100% on Corbett & Anderson BKT posterior probability.
  2. Rely 100% on simple moving average of exam scores.
  3. Hybrid weighted model combining 60% empirical assessment score ratio ($S / S_{\max}$) and 40% Corbett & Anderson BKT posterior $P(L_{\text{final}})$ ($0.60 \times \text{Score Ratio} + 0.40 \times P(L_{\text{final}})$).
- **Decision:** Option 3. Balances empirical examination rigor with Bayesian latent state estimation, ensuring students receive intuitive mastery jumps on ace exams while preserving knowledge acquisition modeling. Numerical parameters ($P(L_0)=0.10, P(T)=0.20, P(G)=0.20, P(S)=0.10, 60/40$) are locked in code to prevent regressions, but are classified as provisional pending explicit academic faculty sign-off.
- **Affected Files:** `backend/app/services/mastery_service.py`, `backend/app/models/mastery.py`.
- **Owner Status:** IMPLEMENTED (PROVISIONAL PENDING FORMAL ACADEMIC SIGN-OFF).

---

### DEC-P7-002: Topic Readiness Gate & Prerequisite Diagnostic Bypass
- **Context:** Students must not encounter topics whose prerequisite foundations are missing. However, advanced students need an avenue to test out of prerequisites without manually taking every prior lesson.
- **Options:**
  1. Strictly require manual completion of all prerequisite lessons before topic unlocking.
  2. Evaluate student mastery across prerequisite topics against passing threshold (`Topic.mastery_threshold`, default 0.7500). If prerequisites are unmet, provide a direct diagnostic assessment link (`diagnostic_assessment_id`) enabling the student to demonstrate competence and unlock the topic.
- **Decision:** Option 2. Enforces academic rigor while enabling fast-track progression via diagnostic testing (`SSD-02`).
- **Affected Files:** `backend/app/services/mastery_service.py`, `backend/app/api/v1/endpoints/mastery.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 7).

---

### DEC-P7-003: Deterministic DAG Kahn's Topological Sorting & Remediation Loops
- **Context:** Generating an individualized, dynamic learning path (`SSD-03`) across arbitrary curriculum DAGs requires deterministic topic ordering and adaptive branch selection based on mastery status.
- **Options:**
  1. Recalculate learning paths via an external heuristics solver or asynchronous job.
  2. In-memory Kahn's topological sort with tie-breaking on `topic.order`, sequencing uncompleted lessons in ready topics, routing to `adaptive_practice` remediation when mastery is developing ($< 0.7000$), accelerating past mastered topics ($\ge 0.8500$), and unlocking summative final exams when all topics achieve competence.
- **Decision:** Option 2. Sub-50ms deterministic execution (well under the 1,000ms SLA) without external queue latency.
- **Affected Files:** `backend/app/services/dag_service.py`, `backend/app/services/learning_path_service.py`, `backend/app/api/v1/endpoints/mastery.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 7).

---

### DEC-P7-004: Synchronous Recalculation with Outbox Ownership Decoupling (P7-FIX-01)
- **Context:** In initial Phase 7 implementation, `MasteryService.recalculate_from_attempt()` prematurely marked `domain_outbox_events.published_at` and `status = 'published'`, which hijacked delivery state ownership and broke retries if downstream gamification failed.
- **Options:**
  1. Allow `MasteryService` to mutate `domain_outbox_events`.
  2. Restrict `MasteryService` strictly to updating `student_topic_mastery` and `mastery_audit_ledger`. Outbox event delivery status (`pending -> published / failed`) belongs strictly to the Phase 8 gamification consumer.
- **Decision:** Option 2. `MasteryService` no longer reads or mutates `DomainOutboxEvent`. The event remains `pending` until the gamification processor successfully commits XP and badges.
- **Affected Files:** `backend/app/services/mastery_service.py`, `backend/tests/test_mastery_outbox_integration.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 7 Corrective Stabilization).

---

### DEC-P7-005: Accurate Topic Attribution for Multi-Topic Assessments (P7-FIX-03)
- **Context:** When `Assessment.topic_id` was `None` (e.g. comprehensive exams or diagnostic baseline tests), previous code fell back to the first question's topic or the first topic in the course syllabus, attributing the entire exam wholesale to a single topic.
- **Options:**
  1. Fall back to the first topic in the course.
  2. Group graded responses by each question's actual `topic_id` (from immutable attempt snapshot with database fallback). Calculate score ratios and BKT sequences independently per topic, updating each topic's mastery and audit ledger separately. If no question topic metadata exists, emit a controlled diagnostic and leave mastery unchanged.
- **Decision:** Option 2. Guarantees that multi-topic exams accurately distribute knowledge evidence across topics without fabrication.
- **Affected Files:** `backend/app/services/mastery_service.py`, `backend/app/services/attempt_service.py`, `backend/tests/test_mastery_bkt.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 7 Corrective Stabilization).

---

### DEC-P7-006: Topic Mastery Threshold Enforcement (P7-FIX-02)
- **Context:** In `get_topic_readiness()`, prerequisite satisfaction used `cur_mastery >= req_mastery or cur_status in ("competent", "mastered")`. Because `Topic.mastery_threshold` defaults to `0.7500` in the schema while status `competent` begins at `0.7000`, a score of 0.7000 bypassed a configured threshold of 0.7500.
- **Options:**
  1. Allow status labels to override numerical thresholds or change the database default threshold from 0.75 to 0.70.
  2. Strictly enforce numerical threshold: `is_satisfied = current_mastery >= required_mastery` (`Topic.mastery_threshold`, default 0.7500). A categorical status label must never override a higher configured numerical threshold.
- **Decision:** Option 2. Preserves database schema defaults and per-topic configuration integrity without silent bypass.
- **Affected Files:** `backend/app/services/mastery_service.py`, `backend/tests/test_topic_readiness.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 7 Corrective Stabilization).

---

### DEC-P7-007: Course Completion Criteria (Open Decision Record - P7-OPEN-01)
- **Context:** The Master Backend Blueprint identifies course completion criteria as an open decision requiring academic governance sign-off. The current implementation in `LearningPathService` emits `type: "course_completed"` when all topics are competent/mastered and all lessons are finished, or upon passing the final exam.
- **Options Under Consideration:**
  1. Require passing the course final summative exam with $\ge 70\%$ score in addition to all topic mastery thresholds.
  2. Require passing all topic mastery thresholds only.
  3. Require both topic mastery thresholds, 100% lesson completions, and passing the final exam.
- **Current Baseline Preserved:** Option 1/3 hybrid baseline preserved in `learning_path_service.py`.
- **Owner Status:** OPEN DECISION (Recorded for formal owner/academic sign-off; existing code preserved).

---

### DEC-P7-008: Remediation Loop Termination Criteria (Open Decision Record - P7-OPEN-01)
- **Context:** When a student struggles on a topic ($< 0.7000$ mastery), the dynamic learning path routes them to `adaptive_practice`. Without termination bounds, a struggling student could experience an infinite remediation loop.
- **Options Under Consideration:**
  1. Unbounded adaptive practice until mastery threshold is achieved.
  2. Cap remediation at $N$ consecutive failed practice attempts (e.g. 3 attempts), after which the system escalates to an assigned course instructor for manual intervention.
  3. Dynamic difficulty dampening with minimum floor before teacher alert.
- **Current Baseline Preserved:** Option 1 unbounded adaptive practice preserved during stabilization to prevent premature regression.
- **Owner Status:** OPEN DECISION (Recorded for formal owner/academic sign-off; existing code preserved).

---

### DEC-P8-001: Strict Outbox Decoupling of Academic Scoring from Gamification
- **Context:** SRS UC-16, Section 3.2.6, and Blueprint Section 3.3 mandate that gamification rewards (XP, levels, streaks, badges) must be completely decoupled from academic scoring and topic mastery recalculations.
- **Options:**
  1. Synchronously execute gamification reward calculations inside the attempt submission database transaction.
  2. Emit domain events to `domain_outbox_events` and process them through decoupled consumer handlers. Gamification failures or ledger errors never cause academic grading transactions to roll back.
- **Decision:** Option 2. Guarantees academic scoring purity and transaction isolation while providing durable gamification processing.
- **Affected Files:** `backend/app/services/grading_service.py`, `backend/app/services/enrollment_service.py`, `backend/app/services/gamification_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 8).

---

### DEC-P8-002: Append-Only XP Ledger with Unique Idempotency Keys
- **Context:** Network retries, duplicate submission requests, or event re-deliveries must never double-award XP or repeatedly bump student levels.
- **Options:**
  1. Maintain an aggregate `xp` counter only on `gamification_profiles`.
  2. Maintain an append-only `xp_ledger` table with unique constraint on `idempotency_key` (`uq_xp_ledger_idempotency`), atomically incrementing profile XP and updating level on first insert, while treating re-submissions as safe idempotent no-ops.
- **Decision:** Option 2. Provides full auditability, zero duplicate XP rewards, and resilience against race conditions.
- **Affected Files:** `backend/app/models/gamification.py`, `backend/app/services/gamification_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 8).

---

### DEC-P8-003: Arithmetic Level Progression Conformance
- **Context:** The frontend client (`studentLogic.ts`) uses an established level formula ($150 + \text{Level} \times 100$ XP per span). Any divergence in backend level arithmetic would cause visual state flickering between backend API responses and frontend renderers.
- **Options:**
  1. Define a new logarithmic or exponential level formula in backend.
  2. Implement `GamificationService.calculate_level` using the exact identical progression formula: Level 1 (0–250 XP), Level 2 (250–600 XP), Level 3 (600–1050 XP), Level 4 (1050–1600 XP).
- **Decision:** Option 2. Guarantees 100% mathematical parity across backend API responses and frontend components.
- **Affected Files:** `backend/app/services/gamification_service.py`, `backend/tests/test_gamification_profile_and_level.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 8).

---

### DEC-P8-004: Privacy-Aware Leaderboard Anonymization
- **Context:** Blueprint Section 8.6 requires student opt-in / privacy compliance on public leaderboards.
- **Options:**
  1. Disallow opting out of leaderboards.
  2. Completely exclude opted-out students from leaderboard database queries.
  3. Include opted-out students in ranking order but display their name as `"Anonymous Scholar"` with null avatar to peers, while allowing the student to view their own unmasked name and rank.
- **Decision:** Option 3. Preserves global competitive rank accuracy while respecting personal privacy preferences.
- **Affected Files:** `backend/app/models/gamification.py`, `backend/app/services/gamification_service.py`, `backend/app/api/v1/endpoints/gamification.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 8).

---

### DEC-P8-005: Outbox Decoupling from Synchronous Request Path (P8-FIX-01)
- **Context:** In original Phase 8 implementation, `submit_attempt` in `GradingService` and `record_lesson_completion` in `EnrollmentService` directly invoked `GamificationService.process_outbox_event()` on the synchronous HTTP request path, and `record_lesson_completion` pre-emptively inserted the event with `status = "published"`.
- **Options:**
  1. Retain synchronous execution of outbox consumer handlers during HTTP requests.
  2. Strictly insert domain events with `status = "pending"` within the domain transaction, commit, and delegate consumption solely to the asynchronous worker / dispatcher.
- **Decision:** Option 2. Eliminates latency overhead on critical student submissions, eliminates race conditions, and guarantees reliable transactional outbox semantics.
- **Affected Files:** `backend/app/services/grading_service.py`, `backend/app/services/enrollment_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 8 Reliability Corrections).

---

### DEC-P8-006: Outbox Retry Metadata, Dead-Lettering, and Concurrent Claiming (P8-FIX-02)
- **Context:** `domain_outbox_events` lacked retry counters, error logging, and next-attempt scheduling. If a downstream consumer failed, the event was either stuck or retried endlessly without exponential backoff or dead-letter limits.
- **Options:**
  1. Keep outbox table minimal and handle retries purely in memory.
  2. Add `retry_count`, `last_error`, and `next_attempt_at` columns via additive migration `20261109_0011`. Implement exponential backoff ($2^{\text{retry\_count}} \times 5$ seconds), cap retries at 5 with dead-lettering (`status = "failed"`), isolate per-event execution with `db.begin_nested()`, and use `with_for_update(skip_locked=True)` on PostgreSQL. Restrict dispatcher triggering to administrators and dedicated background workers.
- **Decision:** Option 2. Provides enterprise-grade resilience, prevents poison pills from blocking event batches, and enables safe concurrent workers.
- **Affected Files:** `backend/app/models/outbox.py`, `backend/alembic/versions/20261109_0011_d4_outbox_retry_and_leaderboard_privacy.py`, `backend/app/services/gamification_service.py`, `backend/app/workers/outbox_worker.py`, `backend/app/api/v1/endpoints/gamification.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 8 Reliability Corrections).

---

### DEC-P8-007: Affirmative Consent Default for Leaderboard Privacy (P8-FIX-03)
- **Context:** Student privacy guidelines require affirmative consent (opt-in) before exposing student identity to peers on public or course leaderboards. The previous schema default of `is_opted_in_leaderboard = True` defaulted students to public exposure.
- **Options:**
  1. Retain `is_opted_in_leaderboard = True` default.
  2. Change default and server_default to `False` (`"false"`). Newly created profiles remain opted out until the student explicitly toggles opt-in via `PATCH /api/v1/gamification/profile`. Existing opted-out students are preserved.
- **Decision:** Option 2. Enforces affirmative privacy consent by default across ORM, migrations, and service layers.
- **Affected Files:** `backend/app/models/gamification.py`, `backend/alembic/versions/20261109_0011_d4_outbox_retry_and_leaderboard_privacy.py`, `backend/app/services/gamification_service.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 8 Reliability Corrections).

---

### DEC-P9-001: Quarantined AI Candidate Question Governance
- **Context:** Blueprint Section 3.4 and SRS Section 3.2.7 mandate strict teacher oversight before AI-generated content can enter curriculum assessments. AI-generated questions must never be automatically promoted into the active question bank or presented to students on tests without explicit teacher review.
- **Options:**
  1. Store generated questions directly in the `questions` table with `status = "draft"`.
  2. Quarantine generated items in a separate physical table `ai_question_candidates` with `status = "pending_review"`. Require assigned course teachers or administrators to audit, edit, and approve candidates, which promotes them through authoritative `QuestionService` validation into `questions` with `source = "ai_generated"`. Rejections are recorded with reasons and never enter the question bank.
- **Decision:** Option 2. Guarantees 100% academic containment, ensures zero unreviewed questions appear in assessment authoring pickers, and maintains clear audit trails.
- **Affected Files:** `backend/app/models/ai.py`, `backend/app/services/ai_candidate_service.py`, `backend/app/api/v1/endpoints/ai.py`, `backend/alembic/versions/20261109_0012_d5_ai_governance_and_cache.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 9).

---

### DEC-P9-002: Durable PostgreSQL Content Cache for Lesson Explanations
- **Context:** Lesson simplification and tutoring explanations in `frontend/server.ts` previously relied on an in-memory process-local JavaScript `Map` (`lessonAICache`). Cache entries were lost on server restart, could not be shared across backend replicas, and lacked TTL management.
- **Options:**
  1. Retain in-memory process cache or introduce a Redis dependency.
  2. Store explanations in a dedicated `ai_content_cache` table in PostgreSQL with deterministic SHA-256 keys (`c:{course}::t:{topic}::l:{lesson}::m:{mode}::p:{prompt}::v:{version}`), TTL expiration, and prompt versioning.
- **Decision:** Option 2. Eliminates process-restart cache loss, preserves the modular monolith constraint without introducing Redis, and ensures multi-tenant cache isolation.
- **Affected Files:** `backend/app/models/ai.py`, `backend/app/services/ai_service.py`, `backend/alembic/versions/20261109_0012_d5_ai_governance_and_cache.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 9).

---

### DEC-P9-003: Thin Express Proxy Cutover & Monolith Integration
- **Context:** AI generation and tutoring routes originally resided on Port 3000 (`frontend/server.ts`) directly invoking `@google/genai`. All AI capabilities must transition to FastAPI (`/api/v1/ai`) without disrupting the Vite dev server, Docker topology, or frontend navigation.
- **Options:**
  1. Maintain dual AI implementations in both Express and FastAPI.
  2. Implement all AI domain logic, validation, caching, and Gemini adapter in FastAPI. Convert Express routes (`/api/ai/*`) into a thin proxy forwarding requests to FastAPI, retiring process-local `@google/genai` and providing graceful deterministic fallbacks if the backend is unreachable.
- **Decision:** Option 2. Centralizes all AI logic in FastAPI behind `ILLMServiceAdapter`, eliminates duplicate provider code, and guarantees zero downtime cutover.
- **Affected Files:** `frontend/server.ts`, `frontend/src/services/api/aiApi.ts`, `backend/app/ai/adapter.py`, `backend/app/api/v1/endpoints/ai.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 9).

---

### DEC-P9-004: Pure Express AI Proxy with Strict Controlled Failure Semantics
- **Context:** During the initial Phase 9 implementation, `frontend/server.ts` maintained independent deterministic fallback generators for question generation and lesson simplification. When FastAPI was offline or returned error status codes (401, 403, 422, 500), Express caught the error and returned 200 OK with hardcoded items or academic summaries. This created a dual business-logic split, bypassed teacher candidate quarantine, and masked authentication/authorization errors.
- **Options:**
  1. Maintain deterministic fallback generators in Express for offline frontend resilience.
  2. Remove all fake/deterministic generation from `frontend/server.ts`. Express acts purely as a thin backward-compatibility proxy forwarding request headers (including `Authorization` and `Cookie`), forwarding upstream HTTP status codes directly (400, 401, 403, 422, 429, 500), and returning a clean JSON `503 Service Unavailable` on network connection failure.
- **Decision:** Option 2. FastAPI is the single authoritative source of AI business logic, governance, and RBAC. Express never fabricates unquarantined content or masks upstream security failures.
- **Affected Files:** `frontend/server.ts`, `frontend/src/utils/aiProxy.test.ts`, `frontend/package.json`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 9 Corrective Refactoring).

---

### DEC-P9-005: Database-Authoritative Lesson Resolution and Strict Enrollment Authorization for AI Tutoring
- **Context:** In `backend/app/services/ai_service.py`, `lesson_id` was optional. If omitted or if the lesson did not resolve in the database, enrollment verification was silently bypassed, permitting unauthenticated/unenrolled callers to reach Gemini and populate cache with arbitrary client text. Furthermore, untrusted client-supplied `req.lesson_content` was sent to Gemini instead of persisted lesson text.
- **Options:**
  1. Allow optional `lesson_id` with best-effort enrollment checking and fallback to client-supplied text.
  2. Make `lesson_id` strictly required in `AISimplifyLessonRequest`. Resolve `Lesson`, `Topic`, and `Course` authoritatively from PostgreSQL (returning 404 if not found). Verify that the course is published (`Course.status == 'published'`) and the authenticated student has an active enrollment (`Enrollment.status == 'active'`) or the caller is an assigned teacher/administrator. Extract canonical content from `Lesson.description` and attached resources, ignoring any client-provided content override. Reject unauthorized requests with 401/403 before cache lookup or Gemini provider invocation.
- **Decision:** Option 2. Guarantees zero unauthenticated LLM token consumption, prevents arbitrary text injection, and binds tutoring explanations strictly to verified, published curriculum content.
- **Affected Files:** `backend/app/schemas/ai.py`, `backend/app/services/ai_service.py`, `frontend/src/components/student/AIHelperPanel.tsx`, `frontend/src/pages/student/LessonWorkspacePage.tsx`, `frontend/src/services/api/aiApi.ts`, `backend/tests/test_ai_authorization.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 9 Corrective Refactoring).

---

### DEC-P9-006: Versioned Content-Aware Cache Identity (`ns:v2`) with Cryptographic Fingerprinting
- **Context:** AI tutoring explanations were cached using keys derived solely from titles and string metadata (`c:{course}::t:{topic}::l:{lesson}::m:{mode}::p:{prompt}::v:v1`). The cache identity omitted a hash of the actual lesson text, allowing stale explanations to be served for up to 30 days if a teacher edited lesson contents. Furthermore, cache lookups occurred before full enrollment authorization.
- **Options:**
  1. Invalidate cache entries by deleting rows on lesson updates via database triggers or hooks.
  2. Introduce versioned namespace (`ns:v2`) and incorporate a cryptographic SHA-256 fingerprint of the authoritative persisted lesson text into the cache key: `ns:v2::c:{course_id}::t:{topic_id}::l:{lesson_id}::ch:{sha256(content)}::m:{mode}::pm:{sha256(prompt)}::md:{model}`. Enforce that access authorization occurs strictly before cache lookup. Old `v1` cache entries miss cleanly.
- **Decision:** Option 2. Provides deterministic, instant cache invalidation upon lesson content modification without requiring cache purging or secondary index synchronization, while preventing unauthorized users from probing cached responses.
- **Affected Files:** `backend/app/services/ai_service.py`, `backend/tests/test_ai_cache.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 9 Corrective Refactoring).

---

### DEC-P9-007: Single-Transaction Atomic Candidate Promotion with Row-Level Locking
- **Context:** When approving an AI question candidate, `QuestionService.create_question()` performed an internal `db.commit()` before `AICandidateService.approve_candidate()` updated `cand.status` to `"approved"`. Under concurrent approval requests, two workers could simultaneously read `cand.status == "pending_review"` and create duplicate official questions in the question bank. Additionally, if the candidate status update failed, an orphaned question remained in the bank.
- **Options:**
  1. Add application-level distributed mutex lock via Redis.
  2. Add `commit: bool = True` parameter to `QuestionService.create_question()` to permit callers to defer transaction commitment. In `AICandidateService.approve_candidate()`, acquire a database row-level lock via `db.query(AIQuestionCandidate).filter(...).with_for_update().first()`, re-verify status under lock (idempotently returning existing question if already approved), call `create_question(..., commit=False)`, update `cand.status = "approved"` and `cand.approved_question_id`, emit audit log, and commit atomically in one transaction. Ensure full `db.rollback()` on exception.
- **Decision:** Option 2. Enforces the strict invariant that a candidate can become an official question only once, prevents duplicate questions and audit events under high concurrency, and guarantees rollback atomicity without adding Redis dependencies.
- **Affected Files:** `backend/app/services/question_service.py`, `backend/app/services/ai_candidate_service.py`, `backend/tests/test_ai_candidate_governance.py`, `backend/tests/test_ai_concurrency.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 9 Corrective Refactoring).

---

### DEC-P9-008: Centralized PII Minimization and Prompt Boundary Defense
- **Context:** User-submitted custom prompts and contextual queries were passed directly to Gemini without input sanitization or boundary framing. If a student or teacher accidentally included PII (emails, phone numbers, API keys, credentials) in their prompt, sensitive data was sent to the LLM provider. Additionally, string interpolation without explicit boundary tags left prompts vulnerable to instruction injection.
- **Options:**
  1. Rely on client-side regex checking in React.
  2. Implement centralized, pure Python regex-based PII minimization in `backend/app/core/sanitizer.py` supporting email addresses, international phone numbers, Google API keys, generic API tokens, JWT bearer tokens, and credit card numbers while preserving code syntax and mathematical formulas. Frame user queries with `<student_query>` boundary tags with system-level instruction containment. Sanitize error logging to redact provider payload echoes.
- **Decision:** Option 2. Centralizes privacy and security enforcement on the authoritative backend, enforces FERPA/GDPR data minimization prior to provider transmission, and hardens LLM prompts against prompt injection.
- **Affected Files:** `backend/app/core/sanitizer.py`, `backend/app/ai/adapter.py`, `backend/tests/test_ai_privacy.py`.
- **Owner Status:** APPROVED & IMPLEMENTED (Phase 9 Corrective Refactoring).
