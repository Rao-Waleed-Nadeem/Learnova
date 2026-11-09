# Repository Integration Notes — Phases 7–9

## Baseline

Reviewed repository: `Rao-Waleed-Nadeem/Learnova`  
Baseline commit: `3b3a6d52775ac972026a5f22dd1353e51a0d4783`  
Existing implementation includes:
- FastAPI `/api/v1` router; synchronous SQLAlchemy sessions; Alembic.
- Phase 2 models for users, roles, courses, topics, prerequisites, lessons, resources.
- Phase 3 auth, sessions, RBAC, teacher/course assignment.
- Phase 4 enrollment and lesson completion.
- Phase 5 questions and assessment authoring.
- Phase 6 attempt snapshots, response persistence, server grading, `domain_outbox_events`.
- Phase 7 mastery and learning path.
- Phase 8 gamification profile, XP ledger, badges, challenges, leaderboard and event processor.
- Express/Vite server still owns legacy `/api/ai/generate-questions` and `/api/ai/simplify-lesson`.

## Findings that drive the sequence

1. `MasteryService.recalculate_from_attempt()` marks `assessment.completed` as `published`. The same event is then passed to the gamification handler by `GradingService`. If gamification processing fails, the event may already be published and therefore excluded from pending retries.
2. `GradingService.submit_attempt()` and `EnrollmentService.complete_lesson()` directly call gamification processing. This is request-path execution, not the separate asynchronous consumer described by the architecture.
3. `GamificationService.process_pending_outbox_events()` references `retry_count` and `last_error`, but the fetched `DomainOutboxEvent` ORM model does not map those fields. Verify the actual migration too; persist retry metadata before claiming durable retry.
4. `Topic.mastery_threshold` in the Phase 2 model has a `0.7500` default, while Phase 7 policy/docs/tests often assume `0.7000`. Readiness uses `score >= threshold OR status in (competent, mastered)`, which can bypass a configured threshold greater than 0.70.
5. If `Assessment.topic_id` is null, mastery currently falls back to a response question topic and then to the first topic in the course. Mixed-topic assessments can therefore attribute a whole attempt to one topic.
6. The Blueprint treats the mastery algorithm and threshold policy as decisions requiring academic approval. Phase 7 introduced BKT parameters and a 60/40 hybrid formula; preserve this implementation during stabilization, but verify and document the approval status rather than silently treating an implementation choice as an approved academic policy.
7. Phase 8 describes leaderboard privacy as opt-in, but `GamificationProfile.is_opted_in_leaderboard` defaults to `True`. Verify the SRS/Blueprint and change to explicit opt-in only with a safe migration and documented treatment of existing records.
8. Phase 9 remains planned. The two AI handlers are still in `frontend/server.ts`; question generation currently has a deterministic fallback and lesson simplification uses an in-memory `Map` cache.

## Repository paths — do not invent a new structure

Backend additions should fit the existing locations:
- `backend/app/api/v1/endpoints/`
- `backend/app/models/`
- `backend/app/schemas/`
- `backend/app/services/`
- `backend/app/core/`
- `backend/app/workers/` only if a worker entrypoint is genuinely needed
- `backend/alembic/versions/`
- `backend/tests/`

Frontend changes should reuse:
- `frontend/src/services/api/`
- Existing React pages/components and `frontend/src/services/storageService.ts`
- Existing Vite/Express routing and Docker topology.

## Placement of these guidance files

- First archive the current Phase 4–6 root prompt as `docs/antigravity-bible/prompts/UNIVERSAL_ANTIGRAVITY_PROMPT_PHASES_04_06.md`. Then update the existing root `UNIVERSAL_ANTIGRAVITY_PROMPT.md` with the supplied Phase 7–9 prompt. Keep one active root prompt; do not leave two competing active prompts.
- Main phase guides: `docs/phases/PHASE-07_CORRECTIVE_STABILIZATION.md`, `docs/phases/PHASE-08_OUTBOX_RELIABILITY_CORRECTIONS.md`, `docs/phases/PHASE-09_AI_INTEGRATION_GOVERNANCE.md`.
- Antigravity Bible mirrors: same three filenames under `docs/antigravity-bible/phases/`.
- Evidence records: `docs/antigravity-bible/phase-records/PHASE-07-CORRECTION/`, `PHASE-08-CORRECTION/`, and `PHASE-09/`.

Do not overwrite the original Phase 7/8 plans or historical reports. Append corrective records so the audit trail remains intact.
