# Phase 9 Issues and Decisions

**Phase:** Phase 9 — AI Integration & Review (`PHASE-09`)  
**Date:** 2026-11-09  
**Authority:** `UNIVERSAL_ANTIGRAVITY_PROMPT.md`, `PHASE-09_AI_INTEGRATION_GOVERNANCE.md`

---

## 1. Issues Identified and Resolved

### Issue 1: SQLite Timezone Comparison in Cache Expiration Check
- **Problem:** SQLite does not store timezone awareness on datetime values, returning offset-naive datetimes from `AIContentCache.expires_at`. Comparing `cached.expires_at > now` raised `TypeError: can't compare offset-naive and offset-aware datetimes`.
- **Impact:** Broke cache verification tests on SQLite test databases.
- **Resolution:** Added defensive normalization in `AIService.simplify_lesson`: if `cached.expires_at.tzinfo is None`, assigned `tzinfo = timezone.utc` before comparison with `now`.

### Issue 2: Cache Key Collision on Refreshing Expired Rows
- **Problem:** When an expired cache row existed for a given prompt/mode, `AIService` attempted an unconditional `INSERT` with the same `cache_key`, violating the unique constraint `uq_ai_content_cache_key`.
- **Impact:** Refreshing expired cache entries threw an `IntegrityError`.
- **Resolution:** Implemented clean upsert logic: if an expired row exists for `cache_key`, update its `content`, `source`, `created_at`, and `expires_at` in-place rather than inserting a duplicate record.

### Issue 3: Missing `outcome` Argument in `log_audit_event`
- **Problem:** `log_audit_event` requires `outcome: str` as its second positional argument. Calls in `AICandidateService` passed `actor_id` as the second argument.
- **Impact:** Caused runtime `TypeError` when logging candidate generation, approval, or rejection.
- **Resolution:** Updated all three audit logging invocations in `AICandidateService` to pass `outcome="success"` explicitly.

### Issue 4: `Lesson` Model Attribute Mismatch
- **Problem:** Test fixture in `test_ai_authorization.py` initialized `Lesson(..., content="...")`. The `Lesson` entity defines `description`, not `content`.
- **Impact:** Caused `TypeError` during fixture instantiation.
- **Resolution:** Corrected parameter to `description="Paging is a memory management scheme."`.

---

## 2. Architectural Decisions Recorded

The following formal decisions have been ratified and documented in the root `DECISIONS.md`:

1. **`DEC-P9-001: Quarantined AI Candidate Question Governance`**
   - AI-generated assessment questions are quarantined in `ai_question_candidates` with `status = "pending_review"`. They never enter the active `questions` pool without explicit teacher audit and approval.
2. **`DEC-P9-002: Durable PostgreSQL Content Cache for Lesson Explanations`**
   - Lesson tutoring and simplification explanations are persisted in `ai_content_cache` with deterministic SHA-256 keys and TTL expiration, eliminating process-restart cache loss without introducing Redis.
3. **`DEC-P9-003: Thin Express Proxy Cutover & Monolith Integration`**
   - Legacy routes `/api/ai/*` on port 3000 were converted into thin proxies forwarding to FastAPI `/api/v1/ai`, retiring process-local `@google/genai` and centralizing all AI domain logic in the FastAPI monolith.
