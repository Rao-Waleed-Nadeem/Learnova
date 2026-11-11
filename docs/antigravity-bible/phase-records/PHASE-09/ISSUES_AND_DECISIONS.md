# Phase 9 Issues and Decisions — Corrective Stabilization

**Phase:** Phase 9 — AI Integration, Review & Corrective Stabilization (`PHASE-09`)  
**Date:** 2026-11-10  
**Authority:** `docs/refactoring/PHASE-9_CORRECTIVE_REFACTORING_AND_STABILIZATION.md`, `UNIVERSAL_ANTIGRAVITY_PROMPT.md`

---

## 1. Corrective Audit Findings & Identified Defects

### Defect 1: Express AI Business-Logic Fallback & Bypassed Governance
- **Issue:** `frontend/server.ts` implemented independent in-memory deterministic question generation and lesson simplification fallbacks. When FastAPI failed or returned an error status (401, 403, 422, 500), Express caught the error and returned hardcoded questions or explanations with `200 OK`.
- **Root Cause:** Phase 9 cutover originally attempted client-side resilience by providing fallback items directly in Node/Express when FastAPI was offline or missing keys.
- **Architectural Violation:** Violates Blueprint Section 3.4 and SRS Section 3.2.7. AI question generation and candidate governance must be authoritative in FastAPI. Express must not fabricate AI output or bypass teacher quarantine.
- **Resolution:** Remove deterministic generators from `frontend/server.ts`. Express acts purely as a thin proxy forwarding request headers, body, and status codes. Network failure returns a controlled `503 Service Unavailable` JSON response without fabricating content.

### Defect 2: Insecure Student Tutoring Authorization & Untrusted Client Context
- **Issue:** In `backend/app/services/ai_service.py`, `req.lesson_id` was optional. If omitted or if `lesson` did not resolve in the database, enrollment verification was silently bypassed, permitting arbitrary client text to reach Gemini and populate cache. Untrusted client `req.lesson_content` was sent to LLM instead of persisted database lesson content.
- **Root Cause:** Backward-compatibility convenience allowed general tutoring requests without tying them to a persisted lesson entity.
- **Architectural Violation:** Violates Blueprint Section 5.1 and Operating Rules Section 7. Enforce authorization at the service boundary. Never trust client-supplied enrollment or course context.
- **Resolution:** Require a valid `lesson_id` for lesson tutoring. Resolve `Lesson`, `Topic`, and `Course` from database. Verify course is published and authenticated student has an active `Enrollment`. Extract authoritative content from persisted database records. Unauthorized requests reject with 401/403/404 before touching cache or LLM.

### Defect 3: AI Content Cache Lacked Content Fingerprint Invalidation
- **Issue:** `AIContentCache` key was derived only from string titles: `c:{course}::t:{topic}::l:{lesson}::m:{mode}::p:{prompt}::v:v1`. It lacked a content hash of authoritative lesson text. If a teacher updated lesson content, the cache served stale explanations for up to 30 days.
- **Root Cause:** Cache key design assumed lesson titles were stable proxies for lesson content.
- **Architectural Violation:** Stale cache risks academic inaccuracies and violates data correctness standards.
- **Resolution:** Introduce versioned namespace (`v2:`) and incorporate a cryptographic SHA-256 fingerprint of the authoritative persisted lesson text into the cache key. Authorization strictly precedes cache lookup. Old `v1` cache keys will safely miss.

### Defect 4: Non-Atomic Candidate Approval & Concurrency Race Condition
- **Issue:** Sequential duplicate approval was idempotent, but concurrent requests could create duplicate official questions in the `questions` table because `cand` was not locked with `FOR UPDATE` and `QuestionService.create_question()` committed the transaction early before `cand.status` was updated.
- **Root Cause:** `create_question()` contained an internal `db.commit()`, splitting question creation and candidate status update into two separate database transactions.
- **Architectural Violation:** Violates the invariant that an AI candidate can become an official question ONLY ONCE.
- **Resolution:** Add `commit: bool = True` to `QuestionService.create_question()`, allowing callers to defer commit. In `AICandidateService.approve_candidate`, lock the candidate row with `with_for_update()`, re-verify status under the lock, create the question with `commit=False`, update candidate status and `approved_question_id`, and commit as a single atomic transaction.

### Defect 5: Missing PII Scrubbing and Prompt Injection Defense
- **Issue:** No dedicated PII scrubbing utility existed. User custom prompts were passed raw to Gemini without scrubbing emails, phone numbers, API keys, or tokens. Prompts used direct string interpolation without XML boundary tags separating system instructions from untrusted user queries.
- **Root Cause:** Initial Phase 9 relied solely on generic logging filters rather than input sanitization.
- **Architectural Violation:** Violates GDPR/FERPA minimization requirements and security guardrails against prompt injection.
- **Resolution:** Implement pure Python `backend/app/core/sanitizer.py` to scrub emails, phone numbers, tokens, and passwords from all user prompts before dispatching to LLM. Enclose student queries within `<student_query>` XML tags with explicit boundary instructions. Sanitize provider error logging.

---

## 2. Architectural Decisions Ratified

1. **`DEC-P9-004: Pure Express Proxy with Controlled Failure Semantics`**
   - Express on port 3000 will not contain fallback generation logic. If FastAPI is unavailable, Express returns 503. Status codes from FastAPI (400, 401, 403, 422, 500) are forwarded directly.
2. **`DEC-P9-005: Database-Authoritative Lesson Resolution for AI Tutoring`**
   - Tutoring requires a persisted `lesson_id`. Authoritative content is extracted from PostgreSQL (`Lesson.description` + resources). Student active enrollment is verified prior to cache lookup or Gemini provider calls.
3. **`DEC-P9-006: Versioned Content-Aware Cache Identity (v2)`**
   - Cache keys incorporate SHA-256 fingerprint of persisted lesson content, ensuring instant cache invalidation upon teacher curriculum edits.
4. **`DEC-P9-007: Atomic Candidate Promotion with Row-Level Locking`**
   - Candidate approval uses `with_for_update()` row locking and single-transaction commit, guaranteeing zero duplicate questions under concurrency.
5. **`DEC-P9-008: Centralized PII Minimization and Prompt Boundary Framing`**
   - User prompts undergo regex PII scrubbing and are wrapped in explicit boundary tags before dispatch to LLM providers.

---

## 3. Resolution Verification Status

| Decision ID | Description | Implementation Target | Verification Reference | Owner Status |
|:---|:---|:---|:---|:---:|
| `DEC-P9-004` | Pure Express Proxy (No Fallbacks) | `frontend/server.ts` | `frontend/src/utils/aiProxy.test.ts` (10 passed) | IMPLEMENTED & VERIFIED |
| `DEC-P9-005` | DB-Authoritative Tutoring Authorization | `backend/app/services/ai_service.py` | `backend/tests/test_ai_authorization.py` (10 passed) | IMPLEMENTED & VERIFIED |
| `DEC-P9-006` | Content-Aware Versioned Cache (v2) | `backend/app/services/ai_service.py` | `backend/tests/test_ai_cache.py` (5 passed) | IMPLEMENTED & VERIFIED |
| `DEC-P9-007` | Atomic Approval with Row Locking | `ai_candidate_service.py`, `question_service.py` | `test_ai_candidate_governance.py`, `test_ai_concurrency.py` (11 passed, 1 skipped) | IMPLEMENTED & VERIFIED |
| `DEC-P9-008` | Centralized PII Minimization & XML Boundary | `sanitizer.py`, `adapter.py` | `backend/tests/test_ai_privacy.py` (8 passed) | IMPLEMENTED & VERIFIED |
