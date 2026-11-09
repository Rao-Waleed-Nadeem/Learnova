# Phase 9 File Change Ledger

**Phase:** Phase 9 — AI Integration & Review (`PHASE-09`)  
**Date:** 2026-11-09  
**Authority:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md`, `PHASE-09_AI_INTEGRATION_GOVERNANCE.md`

---

## 1. Modified Files

| File Path | Type | Nature of Changes |
|:---|:---|:---|
| `backend/app/core/config.py` | Config | Added `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_TIMEOUT_SECONDS`, `AI_CACHE_TTL_DAYS`. |
| `backend/app/models/__init__.py` | Model Registry | Registered and exported `AICandidateQuestion` and `AIContentCache`. |
| `backend/app/api/v1/router.py` | API Router | Included `ai.router` under prefix `/ai`. |
| `frontend/src/components/student/AIHelperPanel.tsx` | UI Component | Migrated to `aiApi.simplifyLesson()` with fallback. |
| `frontend/src/pages/teacher/AIReviewPage.tsx` | UI Page | Migrated candidate generation, approval, and rejection to `aiApi`. |
| `frontend/server.ts` | Server | Converted legacy `/api/ai/*` to thin proxy forwarding to FastAPI; retired process-local `@google/genai` and Map cache. |
| `DECISIONS.md` | Architecture Documentation | Recorded `DEC-P9-001` (Quarantined AI Candidate Governance), `DEC-P9-002` (Durable PostgreSQL Content Cache), `DEC-P9-003` (Thin Express Proxy Cutover). |
| `API_CONTRACT.md` | Contract Documentation | Updated Section 3.7 with verified `/api/v1/ai` endpoints. |
| `IMPLEMENTATION_STATUS.md` | Traceability Matrix | Updated matrix to reflect Phase 9 completion (162 backend tests passing, 29 Vitest tests passing). |

---

## 2. Added Files

| File Path | Type | Purpose |
|:---|:---|:---|
| `backend/app/ai/__init__.py` | Backend Package | Package init for AI provider abstraction. |
| `backend/app/ai/adapter.py` | AI Adapter | `ILLMServiceAdapter` protocol, `GeminiServiceAdapter` implementation, dataclasses, and deterministic academic fallback engine. |
| `backend/app/models/ai.py` | SQLAlchemy Models | `AICandidateQuestion` and `AIContentCache` entities. |
| `backend/alembic/versions/20261109_0012_d5_ai_governance_and_cache.py` | Alembic Migration | Additive migration creating `ai_question_candidates` and `ai_content_cache` tables with constraints and indexes. |
| `backend/app/schemas/ai.py` | Pydantic Schemas | Validation schemas for tutoring requests/responses and candidate review/governance. |
| `backend/app/services/ai_service.py` | Backend Service | Student tutoring service with durable caching, PII scrubbing, and access controls. |
| `backend/app/services/ai_candidate_service.py` | Backend Service | Teacher candidate generation, quarantine persistence, editing, idempotent approval promotion, and rejection. |
| `backend/app/api/v1/endpoints/ai.py` | FastAPI Endpoints | Routes under `/api/v1/ai`. |
| `backend/tests/test_ai_adapter.py` | Backend Test | Tests for adapter protocol, fallback, candidate normalization, and timeout handling. |
| `backend/tests/test_ai_cache.py` | Backend Test | Tests for durable PostgreSQL cache hit/miss, TTL expiration, and versioning. |
| `backend/tests/test_ai_candidate_governance.py` | Backend Test | Tests for candidate generation quarantine, teacher editing, approval promotion to `questions`, and rejection. |
| `backend/tests/test_ai_authorization.py` | Backend Test | Tests for student role denial (403), teacher unassigned course denial (403), and answer key secrecy. |
| `frontend/src/services/api/aiApi.ts` | Frontend Service | TypeScript API client for `/api/v1/ai`. |
| `docs/antigravity-bible/phase-records/PHASE-09/PLAN.md` | Phase Record | Stage A Plan for Phase 9. |
| `docs/antigravity-bible/phase-records/PHASE-09/EXECUTION_LOG.md` | Phase Record | Chronological execution log. |
| `docs/antigravity-bible/phase-records/PHASE-09/FILE_CHANGE_LEDGER.md` | Phase Record | Complete file change ledger. |
| `docs/antigravity-bible/phase-records/PHASE-09/TEST_AND_EVALUATION.md` | Phase Record | Test evidence and verification report. |
| `docs/antigravity-bible/phase-records/PHASE-09/ISSUES_AND_DECISIONS.md` | Phase Record | Encountered issues and architectural decisions. |
| `docs/antigravity-bible/phase-records/PHASE-09/PHASE_SUMMARY.md` | Phase Record | Formal executive summary and acceptance handoff. |

---

## 3. Deleted Files
- *None.* Zero files were deleted.
