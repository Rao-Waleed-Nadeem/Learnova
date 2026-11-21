---
name: debug-issue
description: >-
  A systematic debugging and troubleshooting workflow for diagnosing, reproducing,
  isolating root causes, and applying minimal verified fixes with regression tests in Learnova.
---

# Issue Debugging & Root Cause Analysis Workflow

Use this skill whenever investigating a bug, failed test, unexpected runtime behavior, or regression across Learnova. Follow this systematic 6-step procedure:

---

## Step 1: Issue Reproduction
1. Obtain the exact failure message, stack trace, HTTP status code, or unexpected UI state.
2. Formulate a minimal reproduction command or script:
   - Backend API issue: Run a targeted pytest command or curl request.
   - Frontend UI/state issue: Run the relevant Node/TSX test runner.
   - Outbox/concurrency issue: Check `backend/tests/test_outbox_concurrency.py`.
3. If the bug cannot be reproduced, inspect environment variables (`.env`), database migrations, or missing dependencies before proposing fixes.

---

## Step 2: Evidence Gathering & Log Inspection
1. **Backend Logs:** Check terminal output where FastAPI or pytest is running. Inspect structured logs for error messages and stack traces.
2. **Frontend Logs:** Check browser console or terminal logs from Express (`frontend/server.ts`).
3. **Database Records:** Inspect the state of relevant rows (e.g. `domain_outbox_events` with `status = 'dead_letter'`, `ai_question_candidates` status, or attempt records).
4. **Audit Logs:** Check `security_audit_events` for authorization failures or access denials.

---

## Step 3: Data Flow Tracing Across Monolith Boundaries
Trace the request journey through the modular monolith:
1. **Client -> Express Proxy:** Did the client send the request to `/api/v1/*`? Did Express forward headers, cookies, and body correctly?
2. **Express -> FastAPI Router:** Did FastAPI match the route in `backend/app/api/v1/router.py`?
3. **Route -> Dependency Injection:** Did `get_current_user` or `require_role` block the request?
4. **Dependency -> Service Layer:** Did the service enforce business rules (e.g. `verify_course_teacher_access`, DAG cycle check, or BKT formula)?
5. **Service -> Database/Outbox:** Did the transaction commit? Did a row lock or constraint trigger a rollback?

---

## Step 4: Root Cause Identification (Zero Speculation)
- Do NOT guess or apply speculative shotgun edits.
- Identify the single logical flaw:
  - Is it a missing schema field or type mismatch?
  - Is it a violated constraint or unhandled null?
  - Is it a missing row lock resulting in a race condition?
  - Is it an answer key leak or PII scrubber failure?

---

## Step 5: Implement the Minimal Correct Fix
1. Apply the smallest, targeted code modification addressing the root cause.
2. Do not introduce refactoring or architectural modifications while fixing a bug.
3. Preserve existing architectural invariants:
   - Quarantine invariant for AI questions.
   - Option B lifespan outbox invariant.
   - Answer key segregation.
   - DAG cycle prevention.

---

## Step 6: Add Regression Tests & Verify
1. Add an automated test that specifically reproduces the original bug scenario and validates the fix.
2. Run the affected test suite:
   ```powershell
   python -m pytest backend/tests/test_<affected>.py -v
   npm test
   ```
3. Confirm that all existing tests continue to pass without regressions.
