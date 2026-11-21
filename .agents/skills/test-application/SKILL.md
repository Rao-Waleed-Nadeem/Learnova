---
name: test-application
description: >-
  Systematic testing procedures and runbooks for executing backend pytest suites,
  frontend unit tests, E2E workflow tests, linting, and build verification in Learnova.
---

# Application Testing & Verification Playbook

Use this skill whenever verifying the health, correctness, regression safety, or build integrity of the Learnova platform.

---

## 1. Fast Health & Smoke Verification

Verify that local services are running and ready:
```powershell
# Backend Liveness Check
curl http://localhost:8000/health
# Expected: {"status":"ok","service":"learnova-api"}

# Backend Readiness Check (verifies DB connection)
curl http://localhost:8000/ready
# Expected: {"status":"ready","database":"connected","service":"learnova-api"}
```

---

## 2. Backend Automated Testing (`pytest`)

Backend tests execute against an isolated SQLite database using `pytest`:

### Run All Backend Tests:
```powershell
python -m pytest backend/tests
```

### Run Domain-Specific Test Modules:
```powershell
# Question Bank & Categorization
python -m pytest backend/tests/test_question_bank.py -v

# AI Candidate Quarantine & Atomic Approval (SSD-08)
python -m pytest backend/tests/test_ai_candidate_governance.py -v

# Server-Authoritative Grading & Answer Key Segregation
python -m pytest backend/tests/test_server_grading.py -v

# Prerequisite DAG Cycle Prevention (Kahn's / DFS)
python -m pytest backend/tests/test_prerequisite_dag.py -v

# Bayesian Knowledge Tracing (BKT) Cognitive Mastery
python -m pytest backend/tests/test_mastery_bkt.py -v

# Durable Outbox Processing & Concurrency
python -m pytest backend/tests/test_outbox_concurrency.py -v
python -m pytest backend/tests/test_outbox_processor_unit.py -v
```

---

## 3. Frontend Automated Testing (Node & TSX Runners)

Frontend tests execute using the native Node test runner and TSX runner:

### Run Complete Frontend Suite:
```powershell
npm test
```

### Run Focused Tests:
```powershell
# DAG Cycle Prevention Unit Test
node --experimental-strip-types --test frontend/src/utils/dag.test.ts

# Assessment Timer & Logic Test
node --experimental-strip-types --test frontend/src/utils/assessment.test.ts

# Student Progression Logic Test
node --experimental-strip-types --test frontend/src/utils/studentLogic.test.ts

# End-to-End Workflow Suites (Student, Teacher, Admin)
npm run test:e2e

# UI Layout Rendering Suite
npm run test:ui
```

---

## 4. Static Code Verification

### TypeScript Strict Compiler Check:
```powershell
npm --prefix frontend run lint
```
Verifies zero TypeScript type errors (`tsc --noEmit`).

### Production Vite Build Check:
```powershell
npm --prefix frontend run build
```
Verifies successful static asset compilation and bundling into `frontend/dist/`.

---

## 5. Reporting Standards

When reporting test results:
- State exact total tests collected, passed, failed, and duration.
- Include failure trace details if any test failed.
- Explicitly report any test modules that could not be executed (e.g. Docker PostgreSQL tests when running in offline SQLite mode).
- Never report simulated or assumed test passes.
