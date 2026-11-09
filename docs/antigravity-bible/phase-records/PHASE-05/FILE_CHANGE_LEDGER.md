# File Change Ledger — Phase 05 (Question Bank & Assessment Authoring)

## Created Files (10 files)

| File Path | Lines | Purpose |
|---|---|---|
| [question.py](file:///d:/Learnova/backend/app/models/question.py) | 148 | Question entity model supporting five question types, versioning, check constraints, JSONB payload/answer_key |
| [assessment.py](file:///d:/Learnova/backend/app/models/assessment.py) | 187 | Assessment and AssessmentQuestion entity models with ordering, points, unique constraint, and pinned question version |
| [20261109_0007_d3_questions_and_assessments.py](file:///d:/Learnova/backend/alembic/versions/20261109_0007_d3_questions_and_assessments.py) | 129 | Additive migration 7 creating `questions`, `assessments`, `assessment_questions` tables and indexes |
| [question.py](file:///d:/Learnova/backend/app/schemas/question.py) | 114 | Discriminated Pydantic schemas for the 5 question formats, teacher authoring, and student-safe projection |
| [assessment.py](file:///d:/Learnova/backend/app/schemas/assessment.py) | 108 | Pydantic schemas for assessment creation, update, composition, and teacher/student responses |
| [question_service.py](file:///d:/Learnova/backend/app/services/question_service.py) | 600 | Question bank CRUD, format validation, segregation of payload/answer_key, course scoping, and archival |
| [assessment_service.py](file:///d:/Learnova/backend/app/services/assessment_service.py) | 436 | Assessment authoring, composition, version pinning, points aggregation, and publication quality gate |
| [questions.py](file:///d:/Learnova/backend/app/api/v1/endpoints/questions.py) | 73 | API endpoints for Question Bank CRUD, filtering, and archival |
| [assessments.py](file:///d:/Learnova/backend/app/api/v1/endpoints/assessments.py) | 75 | API endpoints for Assessment authoring, composition, retrieval, and publication |
| [test_question_bank.py](file:///d:/Learnova/backend/tests/test_question_bank.py) | 338 | Automated test suite verifying 5 question formats, anti-leak secrecy, teacher scoping, student 403, archival |
| [test_assessment_authoring.py](file:///d:/Learnova/backend/tests/test_assessment_authoring.py) | 266 | Automated test suite verifying assessment composition, cross-course checks, publication gates, version pinning |

## Modified Files (8 files)

| File Path | Lines Delta | Purpose |
|---|---|---|
| [course.py](file:///d:/Learnova/backend/app/models/course.py) | +12 / -0 | Added `questions` and `assessments` relationships |
| [topic.py](file:///d:/Learnova/backend/app/models/topic.py) | +11 / -0 | Added `questions` and `assessments` relationships |
| [user.py](file:///d:/Learnova/backend/app/models/user.py) | +10 / -0 | Added `authored_questions` and `created_assessments` relationships |
| [__init__.py](file:///d:/Learnova/backend/app/models/__init__.py) | +5 / -0 | Registered `Question`, `Assessment`, and `AssessmentQuestion` models |
| [router.py](file:///d:/Learnova/backend/app/api/v1/router.py) | +4 / -0 | Mounted `/questions` and `/assessments` API routers |
| [test_alembic_disposable.py](file:///d:/Learnova/backend/tests/test_alembic_disposable.py) | +9 / -4 | Added absolute path resolution for `script_location` allowing tests from root or backend |
| [test_migrations_postgres.py](file:///d:/Learnova/backend/tests/test_migrations_postgres.py) | +12 / -5 | Added D3 table assertions (`questions`, `assessments`, `assessment_questions`) and downgrade -1 test |
| [PLAN.md](file:///d:/Learnova/docs/antigravity-bible/phase-records/PHASE-05/PLAN.md) | +2 / -2 | Updated Phase 5 status to IMPLEMENTATION COMPLETED AND 100% VERIFIED |
