---
trigger: always_on
description: Universal coding standards, naming conventions, error handling, type safety, and formatting conventions for Learnova.
---

# Universal Coding Standards

These standards govern code written for both the Python FastAPI backend and the TypeScript React frontend.

---

## 1. General Principles

1. **Explicit is Better than Implicit:** Avoid magic constants, implicit type coercions, and hidden state mutations.
2. **Fail Fast with Clear Messages:** Validate inputs at API and component boundaries. Raise or return semantic error objects immediately.
3. **Keep Files Focused:** Aim for single-responsibility modules. Do not combine database models, route handlers, and UI rendering in single files.
4. **No Code Duplication:** Before implementing a helper, inspect `backend/app/services/` or `frontend/src/utils/` to reuse existing functionality.

---

## 2. Python (Backend) Standards

### 2.1 Style & Formatting
- Adhere to **PEP 8** conventions.
- Use 4 spaces for indentation.
- Maximum line length target: 120 characters.
- Use explicit imports; never use wildcard imports (`from module import *`).

### 2.2 Naming Conventions
- **Files & Modules:** `snake_case.py` (e.g. `question_service.py`, `assessment_endpoints.py`).
- **Classes:** `PascalCase` (e.g. `AICandidateQuestion`, `GradingService`).
- **Functions & Methods:** `snake_case` (e.g. `verify_course_teacher_access`, `calculate_mastery`).
- **Constants:** `UPPER_SNAKE_CASE` (e.g. `OUTBOX_ADVISORY_LOCK_ID`, `DEFAULT_MAX_ATTEMPTS`).
- **Private/Protected Attributes:** Prefix with single underscore (e.g. `_stop_event`, `_discover_cli`).

### 2.3 Type Annotations & Schemas
- Use strict Python type hinting on all function signatures, return types, and dataclass fields.
- Use `typing.Optional`, `typing.List`, `typing.Dict`, `typing.Tuple`, or modern generic equivalents (`list[str]`, `dict[str, Any]`).
- Request and response schemas must inherit from `pydantic.BaseModel` (Pydantic v2).
- Use `ConfigDict(from_attributes=True)` for schemas serializing SQLAlchemy ORM entities.

### 2.4 Error Handling & HTTP Status Codes
- In FastAPI endpoints, always raise `fastapi.HTTPException` with explicit status codes:
  - `status.HTTP_400_BAD_REQUEST` for syntactic malformations.
  - `status.HTTP_401_UNAUTHORIZED` for missing or invalid tokens.
  - `status.HTTP_403_FORBIDDEN` for insufficient permissions or course-teacher scope violations.
  - `status.HTTP_404_NOT_FOUND` when an entity does not exist.
  - `status.HTTP_409_CONFLICT` for state conflicts (e.g. attempt already submitted, duplicate unique key).
  - `status.HTTP_422_UNPROCESSABLE_ENTITY` for semantic/domain validation errors (e.g. prerequisite cycle, publication quality gate failure).
- Never catch generic `Exception` silently. Always log unexpected exceptions with `logger.exception()` or `logger.error(..., exc_info=True)`.

### 2.5 Logging Practices
- Use Python's built-in `logging` module. Obtain a module logger via:
  ```python
  import logging
  logger = logging.getLogger(__name__)
  ```
- Use structured, parameterized logging (`logger.info("Processed attempt %s in %.2f ms", attempt_id, duration)`) instead of f-strings in log statements.
- Never log passwords, raw JWT tokens, API keys, or student PII.

---

## 3. TypeScript / React (Frontend) Standards

### 3.1 Style & Formatting
- Strict TypeScript (`"strict": true` in `tsconfig.json`).
- Never use `any` when a typed interface can be defined or imported from `src/types/index.ts`.
- Prefer `const` over `let`; never use `var`.
- Use 2 spaces for indentation.

### 3.2 Naming Conventions
- **Components & Layouts:** `PascalCase.tsx` (e.g. `TeacherLayout.tsx`, `DalaParticleBrain.tsx`, `AICandidateCard.tsx`).
- **Hooks:** `camelCase` starting with `use` (e.g. `useAuth.ts`, `useMastery.ts`).
- **Services & Utils:** `camelCase.ts` (e.g. `storageService.ts`, `dag.ts`, `assessment.ts`).
- **Types & Interfaces:** `PascalCase` (e.g. `StudentUser`, `AssessmentAttempt`, `QuestionBankItem`).
- **Constants:** `UPPER_SNAKE_CASE` or `PascalCase` for enum-like objects.

### 3.3 Component Architecture
- Prefer React 19 functional components with explicit props interfaces:
  ```tsx
  interface CourseCardProps {
    course: Course;
    onSelect: (courseId: string) => void;
  }
  export const CourseCard: React.FC<CourseCardProps> = ({ course, onSelect }) => { ... };
  ```
- Keep state local where possible. For shared cross-portal state, use React Context (`src/context/`) or typed API service wrappers.
- Use Tailwind CSS v4 utility classes. Follow design system color tokens (`royal-cobalt`, `emerald`, `amber`, `slate`, `obsidian`).

### 3.4 API Integration
- All HTTP calls must reside in `src/services/api/` (e.g. `aiApi.ts`, `teacherApi.ts`, `studentApi.ts`, `authApi.ts`).
- Do NOT make direct ad-hoc `fetch` or `axios` calls inside UI component render bodies.
- Handle rejected promises gracefully and display user-friendly error banners or toast alerts.

---

## 4. Dependencies and Environment
- Do NOT install dependencies unless strictly necessary for a verified requirement.
- Never hardcode environment variables, URLs, or ports. Read backend config via `app.core.config.settings` and frontend config via `import.meta.env` or `process.env`.
