# Phase 9 — AI Adapter, Persistent Caching and Teacher Governance

**Phase:** 9 — AI Integration & Review  
**Depends on:** Phase 8 corrective reliability accepted  
**Architecture:** Existing FastAPI modular monolith; no new microservice

## 1. Objective

Move the existing AI capabilities from `frontend/server.ts` into FastAPI behind the documented `ILLMServiceAdapter`, while preserving the current React/Express/Vite runtime and user workflows.

Current legacy routes:
- `POST /api/ai/generate-questions`
- `POST /api/ai/simplify-lesson`

Current implementation uses Google Gemini directly in Express, a process-local `Map` for lesson explanation cache, and deterministic question-generation fallback. The question-generation response includes answer data for teacher review. Preserve compatible behavior while moving ownership to FastAPI.

## 2. Scope

### 2.1 Provider abstraction

Create a small adapter boundary using existing backend patterns:
- `backend/app/ai/` or `backend/app/services/ai/` only after inspecting existing package layout.
- `ILLMServiceAdapter` protocol/interface.
- Gemini adapter as the initial provider.
- Provider-neutral request/result objects.
- Pydantic validation for all external and internal payloads.
- Configuration through existing `app/core/config.py` / settings.
- API key remains server-side; never return it, log it, or bundle it into frontend JavaScript.

Do not add more providers unless required. Do not create a second settings system.

### 2.2 Student lesson simplification and tutoring

Implement FastAPI endpoint(s) for the current modes:
- `simplify`
- `analogy`
- `example`
- `custom`

Preserve existing fields where possible (`lessonTitle`, `topicTitle`, `courseTitle`, `lessonContent`, `customPrompt`, `mode`) or define a versioned snake_case API with an explicit compatibility mapping. Avoid a silent payload break.

Use bounded input length, safe prompt construction, provider timeout, bounded retry, and clear error/fallback source labels. Avoid sending unnecessary personal/student identity data to the provider.

### 2.3 Candidate question generation and teacher review

Implement the flow:
1. Authorized teacher requests candidate generation for an assigned course/topic.
2. FastAPI invokes the adapter.
3. Validate output against the five existing question types.
4. Persist candidates in a pending-review state, separate from official `questions`.
5. Teacher can list, inspect, edit and approve/reject.
6. Approval promotes a validated candidate through existing `QuestionService`, preserving course/topic/author, type, difficulty, payload, answer key, grading mode, provenance and version semantics.
7. Approval/rejection is audited and idempotent.
8. A candidate never becomes an official question or enters an assessment merely because the model generated it.

Never expose answer keys in student-facing APIs. Do not change the existing Phase 5 question/assessment contract.

### 2.4 Cache

Replace process-local-only caching with a durable cache compatible with current PostgreSQL infrastructure:
- Deterministic cache key based on normalized prompt/context, mode, model/provider and prompt version.
- Store generated content, source/provider metadata, created/expiry timestamps and relevant version.
- Add explicit invalidation/versioning.
- Avoid storing unnecessary personal data.
- Do not add Redis solely for this phase; no Redis service is present in the current target topology.

### 2.5 Provider outage and fallback

- Timeout and bounded retry.
- If valid cached content exists, return it with `source = cache` and `is_cached = true`.
- If deterministic fallback is used, label it `deterministic_fallback`; never claim it came from Gemini.
- If no safe fallback exists, return a clear controlled error.
- Never return a fake success or silently substitute unrelated content.

### 2.6 Legacy route transition

- First inspect all frontend callers of both Express routes.
- Add FastAPI `/api/v1/ai/...` endpoints and tests.
- Update frontend API client(s) to use the FastAPI contract only after the backend endpoint is verified.
- Keep Express routes operational during cutover.
- If old callers require compatibility, convert Express handlers into a thin proxy/adapter, not a second AI implementation.
- Remove legacy Gemini logic only after all consumers are cut over and end-to-end tests pass.
- Preserve port 3000, Vite HMR behavior, Docker topology and existing `/api` proxy behavior unless inspection proves a narrow change is required.

## 3. Authorization and governance

- Students may request lesson assistance only for content they are authorized to access.
- Teachers may generate/review candidates only for courses assigned to them or administrators.
- Candidate approval/rejection requires teacher assignment or administrator privileges.
- All candidate operations are course-scoped in the service/query layer, not only route guards.
- Never trust client-supplied `author_id`, role, course ownership or approval status.
- AI-generated provenance remains stored and distinguishable after promotion.
- Do not use the LLM to grade short answers. Phase 5's `manual_review` / `exact_match` policy remains authoritative.

## 4. Proposed persistence

Inspect existing models/migrations first. Add only what is missing. Likely additions:
- `ai_question_candidates`: course/topic, requesting teacher, candidate payload, answer key/rubric, provider/model, prompt version, status (`pending_review`, `approved`, `rejected`), approved question reference, timestamps.
- `ai_content_cache`: cache key, content type, provider/model, prompt version, response payload, expiry and timestamps.

Use additive Alembic migration(s). Do not alter historical migrations. If existing `questions` fields can store provenance, reuse them rather than duplicate.

## 5. Likely file scope — verify actual repository first

```text
backend/app/core/config.py
backend/app/ai/* or backend/app/services/ai/*
backend/app/api/v1/endpoints/ai.py
backend/app/models/ai_candidate.py
backend/app/models/ai_cache.py
backend/app/schemas/ai.py
backend/app/services/ai_service.py
backend/app/services/ai_candidate_service.py
backend/app/services/question_service.py       # integrate existing promotion path
backend/app/models/__init__.py
backend/app/api/v1/router.py
backend/alembic/versions/<new_ai_governance_revision>.py
backend/tests/test_ai_adapter.py
backend/tests/test_ai_cache.py
backend/tests/test_ai_candidate_governance.py
backend/tests/test_ai_authorization.py
frontend/src/services/api/aiApi.ts
frontend/src/components/student/AIHelperPanel.tsx
frontend/src/pages/teacher/AIReviewPage.tsx
frontend/server.ts                             # compatibility proxy/removal only after cutover
.env.example
API_CONTRACT.md
DECISIONS.md
IMPLEMENTATION_STATUS.md
```

Do not assume all these files need changes. The approved PLAN must contain the exact list.

## 6. Required tests

| ID | Scenario | Expected result |
|---|---|---|
| P9-01 | Gemini configured | Adapter returns validated provider result |
| P9-02 | Missing API key | Controlled fallback/error; no secret exposure |
| P9-03 | Provider timeout/rate limit | Bounded retry and controlled response |
| P9-04 | Cache hit | Correct cached content and metadata |
| P9-05 | Cache invalidation/version change | Stale content not reused |
| P9-06 | Invalid model JSON/schema | Rejected safely; not persisted as approved |
| P9-07 | Candidate generated | Stored pending review, separate from official questions |
| P9-08 | Student attempts candidate approval | 403 |
| P9-09 | Teacher accesses unassigned course candidate | 403 |
| P9-10 | Assigned teacher edits/approves candidate | Validated promotion via QuestionService |
| P9-11 | Duplicate approval request | No duplicate official question |
| P9-12 | Candidate rejection | Persisted/audited, not promoted |
| P9-13 | Student API response | No answer key or rubric leakage |
| P9-14 | Prompt contains unnecessary PII | PII minimized/omitted |
| P9-15 | Legacy route cutover | Existing UI behavior works through FastAPI |
| P9-16 | Express handler retired | No duplicate Gemini implementation remains |
| P9-17 | Short-answer grading | No implicit LLM grading |
| P9-18 | Existing backend/frontend regression | All existing tests/build remain passing |

## 7. Acceptance criteria

- FastAPI owns the AI domain behavior behind `ILLMServiceAdapter`.
- Gemini is the first provider and its key is server-only.
- Lesson assistance modes remain compatible with existing UI.
- Cache is durable, versioned and tested.
- Generated questions are persisted as candidates and require teacher review.
- Approval uses existing question-bank services and preserves provenance.
- Provider failure is honest, bounded and safe.
- Legacy Express logic is removed only after verified cutover.
- Existing assessment, grading, mastery and gamification behavior is unchanged.
- All tests and migrations have actual evidence.
- API contract, status and decisions are updated.
- Stop after Phase 9; Phase 10/11 are not part of this task.

## 8. Execution protocol

**Stage A — Plan only:** inspect current Express callers, FastAPI settings, models, question service, auth/course scoping, proxy and Docker configuration. Present exact file list, API contract, migration design, threat model, test plan and rollback. Stop for approval.

**Stage B — Implement after approval:** adapter, endpoints, persistence, governance, frontend client cutover and compatibility bridge.

**Stage C — Verify:** run focused tests, full backend tests, frontend tests/build, migration lifecycle on disposable PostgreSQL, and student/teacher end-to-end journeys. Inspect diff and secrets. Complete Phase 9 records and stop.
