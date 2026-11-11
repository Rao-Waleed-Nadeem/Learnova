# PHASE 10 — ANALYTICS, TEACHER REPORTING AND ADMINISTRATION

**Project:** Learnova — An Adaptive and Gamified Learning Platform  
**Phase:** 10  
**Status:** PLANNED — NOT IMPLEMENTED  
**Implementation strategy:** Audit → Plan → Owner Approval → Implementation → Verification → Owner Acceptance  
**Architecture:** Existing FastAPI modular monolith, PostgreSQL, synchronous SQLAlchemy, Alembic and React frontend

---

# 1. PURPOSE

Phase 10 completes the backend analytics, reporting and administration capabilities required by Learnova.

The phase builds on the existing Phase 1–9 backend. It must reuse the current database schema, domain services, authorization mechanisms and audit infrastructure wherever possible.

The goal is to provide reliable, role-specific reporting:

1. Students can inspect their own learning progress, topic mastery and assessment history.
2. Teachers can inspect progress and performance for their assigned courses and enrolled students.
3. Administrators can inspect platform-level summaries, manage and inspect users, query security audit events, and access safe system diagnostics.

This phase is primarily a backend phase. Do not redesign or migrate all frontend pages here. The existing frontend will consume these contracts in Phase 11.

# 2. AUTHORITATIVE SOURCES

Read and follow:

1. `docs/sources/Learnova_SRS_Final_Aligned_V2 (1).docx`
2. `docs/sources/Learnova_Final_SSDs_V2.xml`
3. `docs/sources/Readme.md`
4. `docs/sources/Learnova_Master_Backend_Implementation_Blueprint.md`
5. `API_CONTRACT.md`
6. `IMPLEMENTATION_STATUS.md`
7. `DECISIONS.md`
8. `docs/antigravity-bible/AGENT_OPERATING_RULES.md`
9. Current Phase 1–9 source code, migrations, tests and evidence records.

Relevant source requirements include:

- SRS student progress, topic mastery and learning history.
- SRS teacher monitoring of student progress, weak topics and assessment performance.
- SRS analytics and reporting capabilities.
- SRS administration and security management.
- Architecture README AnalyticsService responsibility for attempt history and class mastery reporting.
- Blueprint Phase 10 requirements.

The repository is evidence of current implementation, not proof that a capability is correct.

# 3. ARCHITECTURE RULES

These are mandatory:

- Preserve the FastAPI modular monolith.
- Preserve PostgreSQL and synchronous SQLAlchemy.
- Preserve Alembic migration history.
- Preserve the `/api/v1` route structure.
- Reuse existing services and models.
- Keep domain logic out of HTTP endpoint functions.
- Keep authorization in backend dependencies and service/query boundaries.
- Do not create a second mastery or grading implementation.
- Do not change assessment grading, mastery formulas, XP rules, streak rules or badge criteria.
- Do not introduce microservices, Kafka, Redis or a new analytics database.
- Do not introduce speculative denormalized analytics tables.
- Do not make frontend changes beyond a specifically approved contract requirement.
- Do not delete or rename existing API routes without owner approval.

# 4. ENTRY GATES

Before implementation, verify:

1. Phase 7 stabilization and its corrective evidence are present.
2. Phase 8 retry, outbox and privacy corrections are present.
3. Phase 9 AI closure findings have been resolved or explicitly dispositioned.
4. The project owner has accepted the preceding phases.
5. Git branch and working tree are inspected.
6. Existing database migration head is identified.
7. Existing tests and current API behavior are recorded.
8. The existing admin, user, mastery, enrollment, attempt and audit services are inspected.

If any gate is not satisfied, report the blocker and stop. Do not silently assume acceptance from a phase summary.

# 5. REQUIRED CAPABILITIES

## 5.1 Student analytics

Provide authenticated student-facing reporting for:

- Enrolled course progress.
- Topic-wise mastery.
- Lesson completion and learning activity.
- Assessment attempt history.
- Completed assessment results.
- Learning progress trends where sufficient historical data exists.
- Weak topics based on actual persisted mastery and configured topic thresholds.
- Existing gamification progress as a separate section.

The student identity must always come from the authenticated principal.

Do not accept an arbitrary student ID for personal analytics endpoints.

### Proposed API contract

The following paths are proposals, not permission to duplicate existing endpoints. Inspect the router and API contract first.

- `GET /api/v1/students/me/dashboard`
- `GET /api/v1/students/me/analytics`
- `GET /api/v1/students/me/attempts`

If equivalent endpoints already exist, extend them only where justified.

### Student dashboard response should support

- Course summaries.
- Completion information.
- Mastery summaries.
- Recent completed attempts.
- Recent learning activity.
- Gamification summary, clearly separated from academic mastery.
- Meaningful empty states.

Do not return a fabricated zero score when no graded attempts exist.

## 5.2 Teacher analytics

Teachers need visibility into the courses they are assigned to.

Required reporting:

- Course-level student participation.
- Enrolled student progress.
- Topic-wise class mastery summaries.
- Topic mastery distribution or heatmap data.
- Assessment score distributions.
- Attempt counts and completion information.
- Students with topics below their configured mastery threshold.
- Individual student progress and attempt history within the assigned course.

### Proposed API contract

Inspect existing routes before implementing.

- `GET /api/v1/teacher/dashboard`
- `GET /api/v1/teacher/courses/{course_id}/analytics`
- `GET /api/v1/teacher/courses/{course_id}/students/{student_id}/analytics`
- `GET /api/v1/teacher/courses/{course_id}/students/{student_id}/attempts`

### Teacher authorization requirements

For every teacher analytics request:

1. Confirm the authenticated user has the teacher role.
2. Confirm the teacher is assigned to the requested course through the existing course-teacher relationship.
3. Confirm the student is enrolled in that course when individual student data is requested.
4. Restrict all aggregate queries to that authorized course.
5. Do not rely on frontend route guards for authorization.
6. Do not leak data from another teacher's courses through aggregate queries.

A teacher must not obtain access merely by guessing a course or student UUID.

## 5.3 Weak-concept identification

Weak concepts must be derived from actual mastery records.

Rules:

- Use the persisted `StudentTopicMastery` record.
- Compare normalized mastery against the relevant `Topic.mastery_threshold`.
- Respect the configured threshold for each topic.
- Do not hard-code 70%, 75% or another universal threshold.
- Distinguish `not_assessed` from genuinely weak mastery.
- Do not classify missing mastery records as failed learning.
- Do not infer a weak topic solely from missing activity.
- Include enough context for the teacher to understand the affected topic and student.

Do not invent new remediation or course-completion policies.

## 5.4 Assessment analytics

Use existing server-authoritative assessment records.

Include only valid completed and graded attempts in score statistics.

Exclude:

- In-progress attempts.
- Aborted attempts.
- Invalid submissions.
- Attempts pending manual review where a final grade does not exist.

Where the score is unavailable, represent it as unavailable rather than zero.

Potential measures:

- Number of attempts.
- Number of completed graded attempts.
- Average score.
- Highest and lowest score where meaningful.
- Score distribution.
- Completion counts.
- Attempt history.

Do not change the existing grading rules to make analytics easier.

## 5.5 Administrator dashboard

Provide a secure administrator dashboard API.

Potential summary fields:

- Total users.
- Users by role.
- Active and inactive accounts.
- Course count.
- Enrollment count.
- Assessment activity summary.
- Recent security events.
- Safe operational health indicators.

Use actual database records. Do not use hard-coded dashboard metrics.

Proposed endpoint:

- `GET /api/v1/admin/dashboard`

If an existing equivalent exists, extend it instead of creating a duplicate.

## 5.6 Administrator user directory and detail

The current repository already provides:

- `PUT /api/v1/admin/users/{user_id}/role`
- `PUT /api/v1/admin/users/{user_id}/status`

Preserve these routes and their anti-lockout and session-revocation protections.

Add read capabilities only after inspecting existing user endpoints.

Proposed endpoints:

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/{user_id}`

Requirements:

- Pagination.
- Search and filters where justified.
- Role and account-status filters.
- Safe public profile fields only.
- No password hashes.
- No session tokens.
- No secret configuration.
- No unnecessary personal information.

Never weaken the existing protection against disabling or demoting the last active administrator.

## 5.7 Audit log querying

Reuse `SecurityAuditEvent` and the existing audit service.

Do not create a second audit table or duplicate event-writing system.

Proposed endpoint:

- `GET /api/v1/admin/audit-logs`

Requirements:

- Administrator-only access.
- Pagination.
- Filtering by event category, actor, target and time range where supported by the schema.
- Stable ordering, newest first.
- Safe serialization.
- Preserve existing IP masking or privacy behavior.
- Do not expose passwords, tokens, API keys or sensitive request bodies.

Security-critical actions must continue to produce audit events.

An ordinary append-only table must not be described as cryptographically tamper-evident unless a real verification mechanism exists.

## 5.8 System health and diagnostics

Reuse existing health/readiness infrastructure.

Proposed endpoint:

- `GET /api/v1/admin/system/health`

Only return safe diagnostic information.

Potential fields:

- Application status.
- Database connectivity status.
- Migration/schema status if safely available.
- Worker/outbox status if existing health checks support it.
- Timestamp.
- Service version if already configured.

Do not expose:

- Environment variables.
- Database URLs.
- Passwords.
- API keys.
- Internal stack traces.
- Raw infrastructure credentials.

Public liveness/readiness behavior must remain backward compatible.

# 6. ANALYTICS DATA RULES

Use existing persisted data sources:

| Requirement | Existing source |
|---|---|
| User identity and role | User, Role |
| Course assignment | CourseTeacher |
| Student enrollment | Enrollment |
| Lesson progress | LessonCompletion |
| Resource activity | ResourceActivity |
| Assessment history | AssessmentAttempt |
| Individual answers | AttemptResponse |
| Topic mastery | StudentTopicMastery |
| Mastery history | MasteryAuditLedger |
| Gamification summary | GamificationProfile, XPLedger and related models |
| Audit reporting | SecurityAuditEvent |

Do not use XP as a proxy for academic mastery.

Do not derive academic progress from frontend local storage.

## 6.1 Mastery scale

The current system uses normalized mastery values.

Preserve the internal range:

`0.0–1.0`

Convert to percentage only at the API/UI boundary when appropriate.

Use each topic's configured mastery threshold.

Do not replace the existing mastery policy with a new formula.

Do not modify historical mastery records merely to improve report presentation.

## 6.2 Empty and insufficient data

Use explicit states:

- No attempts yet.
- No mastery assessment yet.
- No enrolled students.
- No completed graded attempts.
- No available trend history.

Averages with no eligible values should be `null` or an equivalent documented representation, not zero.

Distinguish an actual zero score from the absence of a score.

## 6.3 Time and pagination

- Use UTC for stored timestamps and API serialization.
- Use consistent time-window semantics.
- Validate date ranges.
- Use bounded pagination.
- Set reasonable maximum page sizes.
- Use stable ordering.
- Avoid unbounded response collections.

# 7. PERFORMANCE AND QUERY DESIGN

Implement analytics as bounded aggregate queries.

Requirements:

1. Avoid N+1 query behavior.
2. Use SQL aggregation where appropriate.
3. Add indexes only when supported by actual query patterns.
4. Avoid loading entire attempt histories into memory.
5. Avoid calculating analytics separately for every student when a grouped query is appropriate.
6. Avoid unnecessary database round trips.
7. Do not add caching before establishing correctness and measuring query performance.
8. Do not introduce background aggregation tables without an approved need.

The SRS requires responsive pages and adaptive recommendation performance. Phase 10 must not degrade the existing adaptive endpoints.

Record query counts and representative query timings for important reporting paths.

# 8. PRIVACY AND SECURITY

Required role matrix:

| Capability | Student | Teacher | Administrator |
|---|---:|---:|---:|
| Own personal analytics | Yes | No, unless separately authorized | According to approved admin policy |
| Other student's personal analytics | No | Assigned course only | According to approved admin policy |
| Assigned course analytics | No | Yes | Yes |
| Other teacher's course analytics | No | No | Yes |
| User directory | No | No | Yes |
| Role/status management | No | No | Yes |
| Audit log query | No | No | Yes |
| System diagnostics | No | No | Yes |

Additional rules:

- Apply authorization at the backend.
- Validate every UUID and query filter.
- Do not expose correct answers in analytics responses.
- Do not expose private student information to other students.
- Preserve existing session revocation behavior.
- Audit security-critical administrator operations.
- Avoid logging complete analytics payloads or private student records.

If the SRS does not settle a privacy or retention policy, record it in `DECISIONS.md` as unresolved. Do not invent a retention duration or consent rule.

# 9. DATABASE AND MIGRATION POLICY

Prefer zero new tables.

A new migration is allowed only if inspection demonstrates a real requirement that cannot be satisfied using existing structures.

Before creating a migration:

1. Inspect all existing models and migration history.
2. Explain the missing capability.
3. Identify whether the requirement can be served by an existing model/query.
4. Describe upgrade and downgrade behavior.
5. Prove the target database is disposable before migration testing.
6. Obtain owner approval.

Never reset or drop the persistent project database.

# 10. IMPLEMENTATION STAGES

## Stage A — Audit and plan only

Inspect:

- Models.
- Services.
- Endpoints.
- Schemas.
- API router.
- API contract.
- Admin utilities.
- Security audit service.
- Tests.
- Existing frontend analytics pages for contract requirements.

Produce:

- Exact endpoint inventory.
- Existing versus missing capabilities matrix.
- Data-source mapping.
- Role authorization matrix.
- Proposed API schemas.
- Exact file-change ledger proposal.
- Migration impact assessment.
- Query/performance plan.
- Test matrix.
- Risks and rollback strategy.

STOP and request owner approval.

No application source code changes during Stage A.

## Stage B — Student analytics

Implement and test student-owned dashboard, analytics and attempt-history capabilities.

STOP and report evidence.

## Stage C — Teacher analytics

Implement course-scoped aggregate reporting, weak-concept identification and individual student reporting.

STOP and report evidence.

## Stage D — Administration

Implement admin dashboard, user read endpoints, audit querying and safe diagnostics.

Preserve existing role/status write behavior.

STOP and report evidence.

## Stage E — Integration and regression

Run all focused and full test suites.

Update documentation and phase evidence.

STOP for owner acceptance. Do not start Phase 11.

# 11. TESTING REQUIREMENTS

## Student tests

- Student can access own analytics.
- Student cannot request another student's analytics.
- Unauthenticated user is rejected.
- Empty history is represented correctly.
- In-progress attempts do not affect graded score averages.
- Mastery values match persisted records.
- Gamification values are separate from mastery.

## Teacher tests

- Assigned teacher can access assigned course analytics.
- Unassigned teacher receives 403 or the established safe access response.
- Teacher cannot inspect another course's student.
- Student must be enrolled in the requested course.
- Aggregate results contain only authorized course data.
- Weak-concept detection respects the configured threshold.
- `not_assessed` is not reported as weak mastery.

## Administrator tests

- Non-admin cannot access admin dashboard.
- Non-admin cannot query users or audit logs.
- Admin user directory is paginated.
- Sensitive user fields are absent.
- Existing role/status updates still work.
- Last-active-admin protection remains intact.
- Audit log filters and ordering work.
- Diagnostics do not expose secrets.

## Data and performance tests

- Empty datasets.
- Large histories.
- Pagination boundaries.
- Date boundaries and UTC.
- Query-count checks.
- Aggregate accuracy against known fixtures.
- PostgreSQL integration tests for database-specific behavior.

## Required regression

Run the commands supported by the current repository:

```bash
cd backend
pytest
```

```bash
cd frontend
npm test
npm run lint
npm run build
```

```bash
docker compose config
```

Use the actual existing scripts and record exact output. Do not claim a command passed unless it was executed.

# 12. DOCUMENTATION UPDATES

Update:

- `API_CONTRACT.md`
- `IMPLEMENTATION_STATUS.md`
- `DECISIONS.md`
- Relevant test documentation.
- Phase 10 evidence records.

The API contract must document:

- Endpoint and HTTP method.
- Authentication.
- Role requirement.
- Query parameters.
- Response schema.
- Error responses.
- Pagination behavior.
- Data semantics.
- Privacy restrictions.

# 13. REQUIRED EVIDENCE

Create:

`docs/antigravity-bible/phase-records/PHASE-10/`

With:

1. `PLAN.md`
2. `EXECUTION_LOG.md`
3. `FILE_CHANGE_LEDGER.md`
4. `TEST_AND_EVALUATION.md`
5. `ISSUES_AND_DECISIONS.md`
6. `PHASE_SUMMARY.md`

Every changed file must be recorded.

# 14. ACCEPTANCE CRITERIA

Phase 10 is ready for owner acceptance only when:

- Student analytics are correct and private.
- Teacher analytics are correctly scoped to assigned courses.
- Weak concepts use configured mastery thresholds.
- Assessment statistics use only eligible graded attempts.
- Admin dashboard uses real persisted data.
- User directory is secure and paginated.
- Audit querying reuses existing audit infrastructure.
- Diagnostics do not expose secrets.
- Empty states do not fabricate scores.
- Existing mastery, grading and gamification behavior is unchanged.
- All relevant tests pass.
- API_CONTRACT.md is updated.
- IMPLEMENTATION_STATUS.md is accurate.
- DECISIONS.md records unresolved policy questions.
- Full Git diff reconciles with FILE_CHANGE_LEDGER.md.

Only the project owner can mark Phase 10 ACCEPTED.

# 15. EXPLICIT EXCLUSIONS

Phase 10 does not authorize:

- Frontend redesign.
- Wholesale migration of storageService.ts.
- Replacing the mastery algorithm.
- Changing XP, levels, badges or streak rules.
- New course completion rules.
- New remediation termination rules.
- Introducing analytics microservices.
- Introducing Redis or Kafka.
- Destructive database operations.
- Phase 11 implementation.
- Phase 12 deployment hardening.

**Final instruction:** Complete Phase 10 only. Present evidence and stop for explicit owner acceptance.