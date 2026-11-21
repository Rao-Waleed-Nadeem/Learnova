---
trigger: model_decision
description: Testing procedures, test runner commands, mock policies, and regression test requirements for backend (pytest) and frontend (node test runner, tsx).
---

# Testing Strategy & Verification Rules

These rules dictate testing conventions, test runner execution, and verification standards across Learnova.

---

## 1. Test Architecture & Organization

### Backend Tests (`backend/tests/`):
- **Framework:** `pytest` (with `pytest-asyncio` / `anyio`).
- **Test Types:**
  - Unit tests: Business algorithms (`test_prerequisite_dag.py`, `test_mastery_bkt.py`, `test_badge_rules.py`).
  - Integration tests: Database transactions, outbox concurrency, authentication, AI governance (`test_ai_candidate_governance.py`, `test_outbox_concurrency.py`).
  - Security tests: RBAC authorization, PII scrubbing, admin guardrails (`test_rbac_authorization.py`, `test_ai_privacy.py`, `test_admin_guardrails.py`).
- **Fixtures:** Declared in `backend/tests/conftest.py` (`db_session`, `client`, `test_user`, `test_teacher`, `test_admin`).

### Frontend Tests (`frontend/src/utils/`):
- **Frameworks:**
  - Native Node Test Runner (`node --experimental-strip-types --test`).
  - TSX Test Runner (`tsx --test`).
- **Test Types:**
  - Algorithm unit tests (`dag.test.ts`, `studentLogic.test.ts`, `teacherLogic.test.ts`, `assessment.test.ts`).
  - Workflow integration tests (`e2eStudentWorkflow.test.ts`, `e2eTeacherWorkflow.test.ts`, `e2eAdminWorkflow.test.ts`).
  - UI page rendering tests (`uiPageRendering.test.ts`).

---

## 2. Test Execution Commands

### Backend Commands:
```powershell
# Run all backend tests
python -m pytest backend/tests

# Run single test module with verbose output
python -m pytest backend/tests/test_question_bank.py -v

# Run specific test function
python -m pytest backend/tests/test_ai_candidate_governance.py -k "test_approve_candidate"

# Run with stdout printing enabled
python -m pytest backend/tests/test_health.py -s
```

### Frontend Commands:
```powershell
# Run full frontend test suite
npm test

# Run focused DAG cycle test
node --experimental-strip-types --test frontend/src/utils/dag.test.ts

# Run E2E user workflow tests
npm run test:e2e

# Run UI rendering test suite
npm run test:ui

# Verify TypeScript type correctness
npm --prefix frontend run lint

# Verify production Vite build
npm --prefix frontend run build
```

---

## 3. Mocking & Isolation Policies

1. **LLM Calls:** External Google Gemini API calls must NEVER be executed during automated unit tests. Use `MockLLMAdapter` or mock `GeminiServiceAdapter` to provide deterministic responses.
2. **Database Isolation:** Backend tests run against an in-memory or file-isolated SQLite database created freshly per test session by `conftest.py`. Never run tests against a live production database.
3. **Outbox Testing:** When testing outbox events, verify both the insertion of `domain_outbox_events` and the idempotent processing behavior of `GamificationService` and `OutboxProcessor`.
4. **Time Freezing:** For timed assessment attempts or streak testing, mock `datetime.now(timezone.utc)` to test expiration and streak maintenance deterministically.

---

## 4. Quality Rules for Agents

- **Always Run Tests:** Before concluding any code modification, run the affected test suite.
- **Never Fake Results:** Report actual passed/failed counts directly from command outputs.
- **Regression Tests Required:** Whenever fixing a bug, write a regression test reproducing the original issue before applying the fix, and confirm it passes afterwards.
- **Maintain Clean Output:** Fix deprecation warnings and unclosed resource warnings where possible.
