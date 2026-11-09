# Phase 5 — Question Bank and Assessment Authoring

**Phase:** 05  
**Depends on:** Accepted Phase 4 course/curriculum/enrollment foundation  
**Primary blueprint scope:** Phase 5; Sections 5.6, 7.2, 8.3, and testing strategy  
**Primary workflows:** SSD-08; assessment-authoring portion of SSD-07; question definitions consumed by SSD-02/04/06  
**Status:** Implementation instruction; not evidence that the phase is implemented.

## 1. Objective

Create the authoritative backend question bank and teacher assessment-authoring workflow. Teachers must be able to create, validate, organize, configure, and publish assessments against topics/courses while preserving the existing Question Bank, Question Editor, Assessments, and Assessment Editor experiences.

Phase 5 defines what an assessment contains. It does not start student attempts, accept student answers, calculate scores, or update mastery; those belong to Phase 6.

## 2. Existing system context

The frontend currently supports five question types and assessment UI through local/mock state. The current Express server also exposes `POST /api/ai/generate-questions`; that endpoint remains owned by Express until Phase 9. The Phase 3 backend API router currently has no verified question or assessment endpoints.

Inspect current frontend types and utilities before designing payloads. Preserve the actual field names/semantics where practical, including question prompt, type, difficulty, points/marks, explanation, options, correct answer, accepted answers, matching pairs, rubric, course/topic association, and assessment ordering. Do not copy client-side answer-key exposure into student-facing APIs.

## 3. In scope

### 3.1 Five question formats

Support and validate all five SRS formats:

1. **Multiple choice:** prompt, options, exactly the allowed number of correct options according to existing product semantics, marks/points, explanation, difficulty, topic/course association.
2. **True/False:** prompt, canonical boolean answer, marks, explanation, difficulty.
3. **Fill in the Blank:** prompt/template, one or more accepted answers, normalization policy, marks, explanation, difficulty.
4. **Matching:** left/right entries and correct pair mapping, marks, explanation, difficulty.
5. **Short Answer:** prompt, marks, rubric/expected answer, optional accepted answers, and explicit grading mode (objective accepted-answer comparison or manual review).

Use discriminated Pydantic schemas or an equivalent strict type-specific validation design. Reject malformed or irrelevant fields for each question type. Do not trust a generic JSON blob without validation.

### 3.2 Question bank lifecycle

- Create, read, update, archive/deactivate questions; delete only when no historical assessment/attempt reference would be broken.
- Filter by authorized course, topic, type, difficulty, status, and text where appropriate.
- Enforce that topic belongs to course and teacher is assigned/authorized for that course.
- Keep correct answers, grading rules, and internal rubric server-side.
- Record author, timestamps, source/provenance (`manual` vs approved AI origin when available), and status.
- Support editing while preserving already-published/attempted historical meaning.

### 3.3 Assessment authoring

- Create/update draft assessment.
- Associate it with a course and optionally a topic or set of topics.
- Support the existing product categories: diagnostic, practice, and final/summative (inspect current types before final enum values).
- Compose assessment from authorized questions, define order, points/weight, required/optional behavior only where supported by the existing UI/SRS.
- Validate total points and question compatibility.
- Support draft, published, scheduled, active/closed states only as needed by current UI and SRS. Do not invent scheduling/time-zone behavior without a decision.
- Publish through a server-side validation operation; published configuration is immutable to active/future attempts unless an explicit versioning strategy is applied.
- Audit teacher/admin changes and publication.

### 3.4 Versioning and attempt safety

Question edits after assessment publication must not silently mutate what students will be tested on. Use a deliberate version/snapshot design. Recommended minimum:

- Each question has a monotonically increasing `revision` (or immutable question-version rows).
- Assessment-question association records the selected question revision and authoring order/points.
- Phase 6 creates an immutable attempt snapshot of the published assessment/question content and grading configuration at attempt start.

If a clean immutable `question_versions` model is already present or is materially simpler in the repository, prefer it. Do not overbuild a generic content-versioning framework. Document how published assessment revisions behave when a teacher edits a question or assessment.

### 3.5 Student-safe assessment projection

Provide a student-facing assessment view that excludes:
- Correct option identifiers/flags.
- Correct boolean values.
- Accepted answer lists.
- Matching answer keys.
- Private grading rubrics/answer keys where disclosure would reveal the answer.
- Internal AI prompts/provider metadata/secrets.

Use separate teacher/admin authoring schemas and student/attempt delivery schemas. Do not serialize an ORM question object directly to a student.

### 3.6 AI question candidate boundary

Do not migrate or replace the Express AI generation route in Phase 5. Preserve `POST /api/ai/generate-questions` and the existing AI review UI. The future Phase 9 adapter/review pipeline owns persistent AI candidates and promotion. Phase 5 may include provenance fields that support later AI-approved questions, but it must not mark unreviewed generated output as an official bank question.

## 4. Out of scope

- Start/answer/submit attempt endpoints and student attempt state machine (Phase 6).
- Server-side grading execution and result calculation (Phase 6).
- Persisted mastery, adaptive learning path, remediation policy (Phase 7).
- XP/outbox consumers (Phase 8); Phase 6 may create qualifying event records.
- LLM provider migration and AI candidate approval APIs (Phase 9).
- Analytics dashboards (Phase 10).
- Full frontend migration (Phase 11); integrate only the question/assessment authoring slice.

## 5. Proposed API contract

Verify existing routes before implementation. Keep endpoint names consistent with the blueprint and API contract.

| Method | Route | Purpose / authorization |
|---|---|---|
| GET | `/api/v1/questions` | List/filter questions within authorized course scope |
| POST | `/api/v1/questions` | Create question; teacher/admin for authorized course |
| GET | `/api/v1/questions/{question_id}` | Authoring detail for authorized teacher/admin |
| PATCH | `/api/v1/questions/{question_id}` | Update draft/new revision |
| POST | `/api/v1/questions/{question_id}/archive` | Archive question safely |
| GET | `/api/v1/assessments` | List assessments in authorized scope; student projection only when published/allowed |
| POST | `/api/v1/assessments` | Create draft assessment |
| GET | `/api/v1/assessments/{assessment_id}` | Teacher authoring detail or safe student metadata projection |
| PATCH | `/api/v1/assessments/{assessment_id}` | Update draft configuration |
| POST | `/api/v1/assessments/{assessment_id}/publish` | Validate and publish assessment |

The exact route for adding/removing/reordering assessment questions may be nested (`/assessments/{id}/questions`) or represented in the assessment update schema. Choose one consistent contract and document it in `API_CONTRACT.md`.

## 6. Data integrity and security rules

1. Every question is scoped to a course and, where applicable, a topic in that same course.
2. A teacher can read/write only questions and assessments in courses they are assigned to or own under existing policy; administrator behavior follows Phase 3.
3. A student cannot access draft/unpublished assessments or question-bank authoring APIs.
4. Correct answers and grading configuration are never included in student assessment delivery schemas.
5. Server validates question type, option cardinality, answer references, matching-pair uniqueness/completeness, marks, difficulty, and required fields.
6. Assessment composition cannot reference questions from another unauthorized course or incompatible topic scope.
7. Published assessment must have at least one valid question, deterministic ordering, valid points configuration, and valid availability settings.
8. Question deletion/archive must preserve assessment history; use archive/revision semantics where references exist.
9. Use transactions for assessment composition and publication; no partially published assessment.
10. Audit create/update/archive/publish operations with actor, course, target, and outcome.
11. Never accept teacher/client-supplied student scores, mastery, XP, or attempt completion state in authoring payloads.
12. Never expose AI-generated material as official until the Phase 9 governance workflow approves it.

## 7. Decisions to resolve before implementation

- **DEC-06 — Short-answer grading:** determine whether exact accepted-answer matching is sufficient, whether rubric-based manual review is required, and how pending review is represented. Do not silently use an LLM as an auto-grader. Recommendation: implement a grading-mode abstraction; support deterministic normalized exact/accepted-answer grading only where explicitly configured; otherwise mark for manual review.
- **Question type semantics:** inspect `frontend/src/types/index.ts` and `frontend/src/utils/assessment.ts` (or actual equivalents) to confirm whether MCQ permits one or multiple correct options, fill-blank normalization, matching scoring, and points behavior. Preserve current product behavior unless source/owner approves a change.
- **Assessment scheduling/time zone:** DEC-07 concerns exam timeout; define server-side schedule/time zone only when required. Do not infer browser-local time as authoritative.
- **Publication/edit policy:** approve whether editing a published assessment creates a new revision, closes the old version, or is prohibited. Recommendation: immutable published revision; edits create a new draft revision.
- **Question history:** choose immutable version rows vs revision snapshots based on existing schema and testability; no historical attempt may change when authoring data changes.

## 8. Frontend integration boundary

Inspect and map:

- `QuestionBankPage.tsx`, `QuestionEditorPage.tsx`, `AIReviewPage.tsx`
- `AssessmentsPage.tsx`, `AssessmentEditorPage.tsx`
- `frontend/src/types/index.ts`, `frontend/src/utils/assessment.ts`, `storageService.ts`, API client and relevant tests.

Replace only the question-bank and assessment-authoring storage calls with typed API services. Preserve editor behavior, question formats, ordering, and validation UX. Keep AI generation/review on the current Express path until Phase 9. Do not migrate the student assessment player yet.

## 9. Expected implementation areas (verify before editing)

- `backend/app/models/`: Question, question options/matching structures or version entities, Assessment, AssessmentQuestion; update registry and relationships.
- `backend/app/schemas/`: discriminated type-specific question schemas, teacher authoring schemas, safe student projection schemas, assessment schemas.
- `backend/app/services/`: question bank, assessment authoring, publication validation, versioning services.
- `backend/app/api/v1/endpoints/`: questions and assessments; router registration.
- `backend/alembic/versions/`: additive D3 schema migrations.
- `backend/tests/`: type validation, authorization, question answer secrecy, assessment composition/publication/versioning, migration tests.
- `frontend/src/services/api/`, authoring pages/hooks/types/tests: narrow feature integration.
- Root control docs and six phase records.

Avoid coupling question authoring to the Phase 6 grader. A clean `Question` domain service and `Assessment` domain service should be independently testable.

## 10. Required tests

### Question types

- Valid and invalid payload for each of five formats.
- Missing/extra fields, malformed options, invalid correct-option references, duplicate matching keys, empty accepted answers, invalid points/difficulty.
- Type-specific round-trip persistence and serialization.
- Student response excludes all answer-key fields; teacher response contains only authorized configuration.

### Authorization and composition

- Assigned teacher allowed; unassigned teacher denied; administrator allowed; student denied authoring.
- Cross-course question association rejected.
- Draft assessment invisible to students.
- Unauthorized question ID cannot be inserted into an assessment.

### Publication/versioning

- Empty assessment cannot publish.
- Invalid question/points/order configuration cannot publish.
- Successful publication is atomic and auditable.
- Edit after publication does not mutate the published revision or prior snapshot.
- Archive/delete preserves references and historical meaning.

### Regression

- Existing frontend assessment/question utility tests remain green.
- Phase 2/3/4 backend tests and migrations remain green.
- Existing Express AI generation endpoint remains functional and unchanged.

## 11. Acceptance criteria

- [ ] All five SRS question formats have strict server-side validation and persistence.
- [ ] Question bank CRUD/filtering respects course authorization.
- [ ] Teacher assessment composition, ordering, and publication work from the backend.
- [ ] Published assessments pass server-side validation.
- [ ] Student-facing projections do not leak answer keys/rubrics.
- [ ] Historical/published question semantics are protected from later edits.
- [ ] Short-answer grading mode is explicitly decided and documented; no implicit LLM grading.
- [ ] Existing question/assessment editor behavior is preserved.
- [ ] Express AI route is not accidentally removed or migrated.
- [ ] Migrations, backend tests, frontend tests/build, and Phase 2–4 regressions pass.
- [ ] `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`, and phase evidence are updated.
- [ ] Phase is `READY_FOR_REVIEW`; owner alone accepts it.

## 12. Stop conditions

Stop for owner input if the five question formats' semantics cannot be derived from existing source/UI, short-answer grading changes student scoring, assessment scheduling/time zone is ambiguous, or published-version behavior would change student-visible outcomes. Do not start Phase 6 attempt endpoints in this phase.
