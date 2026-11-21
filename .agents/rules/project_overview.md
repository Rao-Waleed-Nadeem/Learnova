---
trigger: always_on
description: Authoritative project overview, core invariants, and execution commands for Learnova.
---

# Project Overview & Architecture Rule: Learnova

This workspace contains **Learnova**, an adaptive and gamified educational platform built with an **Option B Modular Monolith** topology (FastAPI + in-process Durable Outbox Processor + PostgreSQL 17 / SQLite + React 19 / TypeScript / Vite).

For complete architectural details, see the authoritative reference at `.agents/PROJECT_OVERVIEW.md`.

## Key Invariants & Conventions:
1. **Teacher Governance for AI Content (SSD-08):**
   - AI generated questions are strictly quarantined in `ai_question_candidates` with `status = "pending_review"`.
   - Never add AI questions directly to the active Question Bank (`questions`) without explicit teacher review and approval.
   - Approval is atomic: row-level lock (`with_for_update()`), creates official `Question` with `source = "ai_generated"`, links `approved_question_id`, and writes audit log in one transaction.
   - Teachers can only generate, review, and manage questions for courses assigned to them (`course_teachers`).
2. **Curriculum Hierarchy:**
   - Hierarchy is strictly: `Course` -> `Topic` -> `Lesson` -> `LearningResource`.
   - Question generation is scoped to Course -> Lesson, with resources filtered strictly to that specific lesson.
   - Question Bank categorizes questions by Course -> Lesson.
3. **Outbox Reliability (Option B):**
   - Asynchronous gamification (XP, badges, streaks) and mastery recalculation are managed by the in-process outbox processor in FastAPI's lifespan (`backend/app/main.py`), utilizing `domain_outbox_events`.
4. **Answer Key Segregation & Server-Authoritative Grading:**
   - Student payloads must NEVER contain `is_correct` flags or solution pairs. All grading is performed server-side by `GradingService`.
5. **Execution Commands:**
   - Backend: `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload`
   - Frontend: `npm run dev` (Port 3000)
   - Tests: `npm test` (Frontend) and `python -m pytest backend/tests` (Backend)
