# Phase 10 Issues and Decisions — Analytics, Teacher Reporting & Administration

**Phase:** Phase 10 — Analytics, Teacher Reporting and Administration (`PHASE-10`)  
**Date:** 2026-11-11  
**Authority:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md` Section 6, `docs/phases/PHASE-10_ANALYTICS_TEACHER_ADMINISTRATION.md`

---

## 1. Architectural Decisions

### DEC-P10-001: Zero-Migration Analytics Strategy via Pure SQL Aggregations
- **Context:** Blueprint Section 3.5 and Phase 10 Guide mandate providing comprehensive student, teacher, and administrator reporting without introducing microservices, Kafka, Redis, or denormalized analytics tables.
- **Options:**
  1. Create a separate analytics database or denormalized reporting tables updated via background jobs.
  2. Implement bounded, indexed SQL aggregation queries directly on existing PostgreSQL domain models (`users`, `enrollments`, `courses`, `course_teachers`, `topics`, `lessons`, `lesson_completions`, `resource_activities`, `assessments`, `assessment_attempts`, `student_topic_mastery`, `security_audit_events`).
- **Decision:** Option 2. Preserves the modular monolith architecture, eliminates database synchronization lag, avoids redundant tables, and requires zero new Alembic migrations.
- **Affected Files:** `backend/app/services/analytics_service.py`, `backend/app/services/admin_service.py`.
- **Status:** APPROVED & IMPLEMENTED (Phase 10).

---

### DEC-P10-002: Dynamic Topic-Configured Weak Concept Evaluation
- **Context:** The Phase 10 guide explicitly instructs: "Never hard-code mastery thresholds. Never classify not_assessed as weak." Weak concepts must be derived from actual persisted mastery records compared to each individual topic's configured syllabus threshold (`Topic.mastery_threshold`).
- **Options:**
  1. Use a universal hard-coded cutoff (e.g. 70% or 75%) across all courses and topics.
  2. Dynamically evaluate `StudentTopicMastery.mastery_score * 100 < Topic.mastery_threshold` for topics where `StudentTopicMastery.status != 'not_assessed'`. Topics with no completed assessment are reported explicitly as `not_assessed` and excluded from weak concept lists.
- **Decision:** Option 2. Respects teacher-configured curriculum standards, guarantees mathematical correctness, and prevents unassessed topics from being falsely flagged as academic deficiencies.
- **Affected Files:** `backend/app/services/analytics_service.py`, `backend/app/schemas/analytics.py`.
- **Status:** APPROVED & IMPLEMENTED (Phase 10).

---

### DEC-P10-003: Strict Course Teacher Access Enforcement for Teacher Analytics
- **Context:** In multi-tenant and multi-instructor institutions, teachers must only inspect data for courses they are formally assigned to teach. Unassigned teachers must never view class heatmaps, score distributions, or student performance in other instructors' courses.
- **Options:**
  1. Rely on frontend route guards to restrict teacher views.
  2. Authoritatively verify course assignment at the backend service and endpoint boundary using `CourseTeacher` junction records (`QuestionService.verify_course_teacher_access()`). Administrators retain cross-institution oversight.
- **Decision:** Option 2. Guarantees FERPA/data isolation compliance and prevents unauthorized data leakage even if a malicious client crafts direct HTTP requests.
- **Affected Files:** `backend/app/api/v1/endpoints/teacher_analytics.py`, `backend/app/services/analytics_service.py`.
- **Status:** APPROVED & IMPLEMENTED (Phase 10).

---

### DEC-P10-004: Safe System Telemetry without Credential or Stack Trace Leaks
- **Context:** Administrators require real-time operational diagnostics (DB latency, pool size, migration state, outbox backlog, and AI provider status). However, diagnostics endpoints must never leak sensitive infrastructure credentials, environment variables, or database passwords.
- **Options:**
  1. Return raw environment variables and configuration dictionaries.
  2. Expose a sanitized, structured `SystemHealthResponse` containing connectivity status ("connected" | "disconnected"), measured ping latency in milliseconds, Alembic revision hash, outbox queue metrics (pending/failed/processed), and Gemini configuration flag without exposing connection strings, passwords, or API keys.
- **Decision:** Option 2. Provides actionable telemetry for administrators while enforcing zero secret exposure.
- **Affected Files:** `backend/app/schemas/admin.py`, `backend/app/services/admin_service.py`, `backend/app/api/v1/endpoints/admin.py`.
- **Status:** APPROVED & IMPLEMENTED (Phase 10).

---

## 2. Unresolved Policy Issues

| Issue ID | Domain | Context | Current Conservative Implementation | Owner Direction Required |
|:---|:---|:---|:---|:---|
| `ISSUE-P10-01` | Inactive Student Mastery | If an enrolled student becomes inactive or unenrolls, should their historical mastery remain in class heatmap aggregates? | Currently includes active enrollments (`Enrollment.status == 'active'`) only. | Awaiting owner confirmation if historical enrollments should be toggleable. |
| `ISSUE-P10-02` | Audit Log Retention | Does Learnova mandate an automatic pruning or archival window for `security_audit_events`? | Append-only without automatic deletion; paginated queries prevent memory overload. | Preserved without destructive pruning. |
