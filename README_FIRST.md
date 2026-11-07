# Learnova — Phase 2 and Phase 3 Instruction Package

## Contents

- `phases/PHASE-02_INITIAL_DOMAIN_SCHEMA.md`
- `phases/PHASE-03_AUTHENTICATION_RBAC.md`
- `UNIVERSAL_ANTIGRAVITY_PROMPT_PHASES_02_03.md`

## Repository placement

Copy the two phase files into `docs/antigravity-bible/phases/`. Copy the universal prompt into `docs/antigravity-bible/`. Check for existing files before overwriting.

## Execution order

1. Give Antigravity the universal prompt and Phase 2 instruction.
2. Antigravity audits and submits a plan only.
3. Review and approve the Phase 2 plan.
4. Antigravity implements Phase 2, tests, documents every change, and stops.
5. Review and accept Phase 2.
6. Only then give Antigravity the Phase 3 instruction.
7. Repeat plan → approval → implementation → evidence → owner acceptance.

## Scope summary

**Phase 2:** D1 users/roles/profile and D2 courses/curriculum/resources schema, constraints, migrations, tests, and development seed command.

**Phase 3:** bcrypt authentication, JWT/session lifecycle, logout/revocation, current-user/profile operations, backend RBAC, teacher assignment enforcement, administrator safeguards, and minimal frontend authentication integration.

Neither phase authorizes complete migration of localStorage workflows. Assessments, mastery, adaptive learning, gamification, AI migration, and analytics remain in later phases.
