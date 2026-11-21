# Learnova Comprehensive Testing Strategy

This document details the testing architecture, frameworks, automation suites, execution commands, and verification protocols for the Learnova ecosystem.

---

## 1. Testing Frameworks Overview

| Layer | Framework / Runner | Scope | Key Configuration |
| :--- | :--- | :--- | :--- |
| **Backend** | `pytest` (v9.1+), `anyio`, `httpx` | Unit, integration, concurrency, RBAC, outbox | `backend/tests/conftest.py` |
| **Frontend Unit** | Node Native Test Runner (`node --experimental-strip-types --test`) | Pure TypeScript utility algorithms, DAG cycle checks, BKT logic | Direct execution |
| **Frontend E2E / UI** | TSX Test Runner (`tsx --test`) | Multi-step user workflows (Student, Teacher, Admin), UI page rendering | `frontend/src/utils/*.test.ts` |
| **Static Verification** | `tsc --noEmit` & `vite build` | Type safety and production asset compilation | `npm --prefix frontend run lint` |

---

## 2. Backend Test Suites (`backend/tests/`)

The backend test suite contains **230+ automated tests** verifying core logic:

| Test Module | Coverage & Verification Target |
| :--- | :--- |
| `test_health.py` | Liveness (`/health`) and readiness (`/ready`) endpoints. |
| `test_auth_endpoints.py` | Registration, login, password hashing, JWT claims, current user. |
| `test_rbac_authorization.py` | Enforcing role requirements (`admin`, `teacher`, `student`). |
| `test_prerequisite_dag.py` | DFS & Kahn's DAG cycle detection, circular dependency rejection (`422`). |
| `test_curriculum_endpoints.py` | Course, topic, lesson, and resource CRUD and hierarchy. |
| `test_question_bank.py` | Question authoring, 5 question types, teacher course scoping. |
| `test_assessment_authoring.py` | Assessment composition, snapshotting, and publication quality gates. |
| `test_server_grading.py` | Server-authoritative scoring, partial credit, segregated answer keys. |
| `test_attempt_lifecycle.py` | Attempt start, response saving, auto-submit on expiration. |
| `test_mastery_bkt.py` | 4-parameter Bayesian Knowledge Tracing calculation & normalization. |
| `test_gamification_profile_and_level.py` | XP progression, level curve, streak calculations. |
| `test_xp_ledger_idempotency.py` | Preventing duplicate XP rewards via unique transaction idempotency keys. |
| `test_outbox_processor_unit.py` | Durable outbox event polling, exponential backoff, dead-letter quarantine. |
| `test_outbox_concurrency.py` | Concurrency safety, multi-worker advisory locking (`OUTBOX_ADVISORY_LOCK_ID`). |
| `test_ai_candidate_governance.py` | Quarantined AI candidates (`pending_review`), atomic approval row locking. |
| `test_ai_cache.py` | SHA-256 fingerprint caching in `ai_content_cache`. |
| `test_ai_privacy.py` | Regex PII scrubbing and prompt injection sanitization. |
| `test_admin_guardrails.py` | Admin lockout prevention, credential redaction in user directories. |

---

## 3. Frontend Test Suites (`frontend/src/utils/`)

The frontend test suites verify client-side business logic and full user workflows:

| Test Module | Runner | Verification Focus |
| :--- | :--- | :--- |
| `dag.test.ts` | Node Native | Self-dependency, direct circular dependencies, transitive circular dependencies. |
| `assessment.test.ts` | Node Native | Client timer calculations, question formatting, answer display. |
| `studentLogic.test.ts` | Node Native | Student level derivation, mastery badge requirements. |
| `teacherLogic.test.ts` | Node Native | Course access filtering, question bank categorization. |
| `adminLogic.test.ts` | Node Native | User directory filtering, role assignment formatting. |
| `uiPageRendering.test.ts` | TSX | Render stability of Student, Teacher, and Admin page layouts. |
| `e2eStudentWorkflow.test.ts` | TSX | Complete student journey: login, practice, exam submission, XP reward. |
| `e2eTeacherWorkflow.test.ts` | TSX | Teacher journey: course selection, AI question generation, candidate review, approval. |
| `e2eAdminWorkflow.test.ts` | TSX | Admin journey: directory inspection, role change, lockout safeguard check. |

---

## 4. Test Execution Runbook

### Backend Commands:
```powershell
# Run all backend tests
python -m pytest backend/tests

# Run single test module
python -m pytest backend/tests/test_question_bank.py

# Run specific test function with verbose output
python -m pytest backend/tests/test_ai_candidate_governance.py -k "test_atomic_approval" -v
```

### Frontend Commands:
```powershell
# Run full frontend test suite
npm test

# Run focused unit tests
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

## 5. Mocking Policies & Isolation

1. **LLM Calls:** Tests must never make live network calls to external Google Gemini APIs. Use `MockLLMAdapter` or mock responses in `backend/app/ai/adapter.py`.
2. **Database Isolation:** Pytest tests run against an isolated SQLite database configured in `conftest.py`. SQLite operates with `PRAGMA foreign_keys = ON;` to enforce relational constraints.
3. **Time Mocking:** Timed assessment attempts and streak updates use deterministic test timestamps rather than system wall-clock time.

---

## 6. Known Testing Limitations

- **Frontend TypeScript Verification (`npm --prefix frontend run lint`):** `tsc --noEmit` currently reports pre-existing type errors on active branch `Haseeb` in `src/App.tsx`, `DAGVisualizer.tsx`, and test fixtures (`e2eSimplificationStudio.test.tsx`), while Vite production compilation (`npm --prefix frontend run build`) and Node unit tests (`npm test`) pass completely.
- **E2E Browser Automation:** Currently executed via in-memory mock DOM and workflow unit tests. Full Playwright browser automation is configured via the `e2e-testing-patterns` and `webapp-testing` skills when live browser rendering is requested.
- **PostgreSQL-Specific Features:** Advisory lock multi-worker tests require an active PostgreSQL instance; on SQLite, advisory locks gracefully return mock leader status.
