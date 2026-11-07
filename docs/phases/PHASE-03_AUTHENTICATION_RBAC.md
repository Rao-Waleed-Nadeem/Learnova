# Phase 03 — Authentication and Role-Based Access Control (RBAC)

**Project:** Learnova  
**Goal:** Secure authentication, session lifecycle, and backend-enforced role/resource authorization.  
**Depends on:** Phase 1 foundation and Phase 2 accepted D1 identity/role schema.  
**Execution mode:** Plan first; wait for project-owner approval before code changes.

## 1. Mandatory sources

Read the current repository versions of the SRS, SSD XML, Readme, Master Backend Implementation Blueprint, `API_CONTRACT.md`, `IMPLEMENTATION_STATUS.md`, `DECISIONS.md`, Antigravity Bible operating rules, accepted Phase 2 models/migrations/decisions, and current frontend authentication/portal/admin code.

## 2. Dependency gate

Phase 3 must extend the exact user/role schema accepted in Phase 2. Verify the accepted Phase 2 commit, migration head, User and Role model, and profile representation. Never create a second users table, role table, declarative Base, engine, or authentication database. If the Phase 2 schema is not accepted or unavailable, report `BLOCKED_BY_PHASE_02` and stop.

## 3. Objective and boundary

Implement:
- Student registration and login.
- Logout and session/token revocation.
- Current authenticated user endpoint.
- Permitted profile/preferences update and password change.
- Access-token validation and refresh/session lifecycle.
- Reusable authentication/RBAC dependencies.
- Teacher-to-course assignment authorization.
- Administrator role/account governance guardrails.
- Minimal frontend integration replacing mock sign-in/registration with real backend authentication.

Do not migrate course, lesson, enrollment, assessment, mastery, adaptive learning, gamification, AI, or analytics workflows in this phase.

## 4. Source requirements and API contract

SRS requirements include secure registration/login/logout/profile management, RBAC, bcrypt password hashing, signed JWT tokens transmitted over HTTPS, input validation, security auditing, student data protection, and teacher restrictions to assigned courses.

The repository API contract currently lists planned register/login/refresh/auth-me endpoints. The Blueprint additionally specifies logout, `GET /api/v1/auth/me`, `PUT /api/v1/users/me`, `PUT /api/v1/users/me/preferences`, and `PUT /api/v1/users/me/password`.

Use one canonical route set and update `API_CONTRACT.md`:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/auth/register` | Register permitted account |
| POST | `/api/v1/auth/login` | Authenticate and create session |
| POST | `/api/v1/auth/refresh` | Rotate/refresh credentials |
| POST | `/api/v1/auth/logout` | Revoke current session |
| GET | `/api/v1/auth/me` | Return current authenticated user |
| PUT | `/api/v1/users/me` | Update allowed profile fields |
| PUT | `/api/v1/users/me/preferences` | Update preferences |
| PUT | `/api/v1/users/me/password` | Change password |

Do not create duplicate aliases unless compatibility evidence requires them. Mark routes `PLANNED` until implemented and tested.

## 5. Authentication design

### 5.1 Passwords

- Bcrypt hashing is mandatory per SRS.
- Store only a password hash in the Phase 2 user record.
- Never store/log plaintext passwords, hashes, reset tokens, raw JWTs, refresh tokens, signing keys, or API keys.
- Use a maintained compatible library and pin compatible dependency versions.
- Validate password policy on the server.
- Use generic login failures to reduce account enumeration.
- Never return a password hash in an API response.

### 5.2 JWT and revocable session lifecycle

A stateless access JWT alone does not provide individual logout/revocation.

Recommended baseline for the plan:
- Short-lived signed access token.
- Server-side session record linked to the Phase 2 user.
- Rotating refresh credential.
- Store a hash of refresh credentials where practical, not the raw token.
- Revoke the session on logout.
- Invalidate affected sessions after password change, account deactivation, or security-sensitive role change according to the approved policy.
- Validate signature, permitted algorithm, expiry, subject, token type, and session state.
- Keep signing keys in backend environment/secret management only.
- Treat database account/role state as authoritative; do not rely only on stale role claims.

Record access lifetime, refresh lifetime, rotation, reuse detection, concurrent refresh behavior, multi-session policy, clock skew, and revocation semantics in `DECISIONS.md`. Use short-lived access credentials. Do not invent long token lifetimes without approval.

### 5.3 Browser token storage and transport

The Blueprint requires threat review and warns against putting long-lived credentials in localStorage.

Document:
- Access token held in memory.
- Refresh credential in protected `HttpOnly`, `Secure`, `SameSite` cookie where compatible.
- CSRF protection for cookie-authenticated operations.
- CORS credentials and same-origin proxy behavior.
- Local development differences from HTTPS production.

Preferred direction: refresh credential in a protected HttpOnly cookie and short-lived access token in memory. Do not persist long-lived refresh tokens in browser localStorage. The SRS requires HTTPS in production; document TLS termination/deployment responsibility and do not claim local HTTP meets that requirement.

### 5.4 Registration and bootstrap policy

Current frontend registration page is titled **Create Student Account** and creates a student. Recommended initial policy:
- Public self-registration creates students only.
- Teacher accounts are invited/provisioned by an authorized administrator.
- Administrator accounts are never created through public registration.
- First administrator is created through a protected one-time bootstrap command/procedure using secret input, not a hard-coded default account.

If owner chooses a different teacher policy, record it before implementation. Never allow public administrator registration or trust a client-supplied role.

## 6. RBAC and ownership rules

Authorization is enforced by FastAPI/backend services and resource-scoped queries. Frontend routes and portal switching are not security controls.

### Student
- Access/update only permitted fields of own profile/preferences.
- Cannot access teacher/admin operations.
- Cannot read another student's private profile or learning records.
- Future learning-data APIs must use the authenticated user identity, not a client-supplied student ID.

### Teacher
- Must be an active authenticated teacher.
- May manage only courses assigned through the Phase 2 assignment relationship.
- Cannot access unassigned courses by guessing IDs or direct API calls.
- Cannot change own role/account status through teacher APIs.
- Student/class information must be limited to assigned courses and approved policy.

Role checking alone is insufficient: every teacher course read/update must enforce assignment at the service/query boundary.

### Administrator
- May use protected user/role/account status operations.
- Audit successful, rejected, and blocked high-impact actions.
- Enforce backend guardrails already represented in `frontend/src/utils/adminLogic.ts`:
  - No self-demotion.
  - No self-deactivation.
  - No demotion/deactivation of the last active administrator.
  - Protect against concurrent requests removing the last active administrator using transaction/locking or an equivalent database-safe method.
- Frontend `adminLogic.ts` is not the security boundary.

### Deny by default
- Protected endpoints require a valid authenticated principal.
- Unknown roles are denied.
- Consistent 401/403 behavior; avoid unnecessary resource-existence leaks.
- Validate object ownership/assignment, not only route role.

## 7. Session and security audit persistence

Phase 3 may add the minimum D1 session persistence needed for revocation through a new Alembic migration based on Phase 2 models.

Session concepts: user FK, session ID, hashed refresh credential or revocation handle, issued/created time, expiry, revoked state/time, rotation/reuse metadata where supported, and only safe/necessary device metadata.

The SRS requires security-critical audit logging. If no suitable structure exists, add a minimal append-only security audit event model/migration as a Phase 3 security dependency, not the complete D8 analytics/audit domain. Capture actor, action, target, outcome, timestamp, correlation ID, and safe reason/metadata. Never store credentials or sensitive personal data. Do not call an ordinary table “tamper-evident” without cryptographic verification and tests.

## 8. Frontend authentication integration

Current repository evidence:
- `frontend/src/pages/student/SignInPage.tsx` preloads demo student credentials and uses `setTimeout` for mock success.
- `frontend/src/pages/student/CreateAccountPage.tsx` uses `setTimeout` and creates a local mock student.
- Portal switching exists for teacher/admin.
- `storageService.ts` contains mock user records and localStorage-backed state.
- Admin guardrails currently exist in `frontend/src/utils/adminLogic.ts`.

Implement only the authentication boundary:
1. Add typed auth API client using configured API base.
2. Replace mock timeout login with real `POST /api/v1/auth/login`.
3. Replace mock registration with real `POST /api/v1/auth/register`.
4. Restore current user using the approved session mechanism.
5. Implement logout/revocation.
6. Route based on server-authenticated user/role.
7. Support profile/preferences operations where used by current auth UI.
8. Remove demo credential prefill and mock success from active production auth flow.
9. Preserve UI design and unrelated learning workflows.
10. Limit `storageService.ts` changes to auth identity/session boundary.

Do not migrate courses, topics, lessons, resources, enrollments, assessments, mastery, learning paths, XP, badges, or analytics. Browser code must use configured API base/same-origin proxy; never call Docker hostname `backend` from a user's browser.

## 9. Suggested file scope

Inspect the actual repository and put the exact final list in `PLAN.md`. Potential files:

```text
backend/app/api/v1/endpoints/auth.py
backend/app/api/v1/endpoints/users.py
backend/app/core/security.py
backend/app/core/dependencies.py
backend/app/schemas/auth.py
backend/app/schemas/user.py
backend/app/services/auth_service.py
backend/app/services/authorization_service.py
backend/app/models/session.py
backend/app/models/security_audit_event.py
backend/alembic/versions/<phase_03_session_audit_revision>.py
backend/tests/test_auth_*.py
backend/tests/test_rbac_*.py
backend/tests/test_sessions_*.py
backend/tests/test_admin_guardrails.py
frontend/src/services/api/auth*.ts
frontend/src/pages/student/SignInPage.tsx
frontend/src/pages/student/CreateAccountPage.tsx
frontend auth state/context using existing architecture
frontend auth tests
API_CONTRACT.md
DECISIONS.md
IMPLEMENTATION_STATUS.md
docs/antigravity-bible/phase-records/PHASE-03/*
```

Do not create a second User model, Role table, Base, engine, or database. Extend Phase 2.

## 10. Required security tests

| ID | Scenario | Expected result |
|---|---|---|
| P3-SEC-01 | Valid student registration | Student created; bcrypt hash stored |
| P3-SEC-02 | Duplicate normalized email | Rejected by DB uniqueness |
| P3-SEC-03 | Registration submits administrator role | No privilege elevation |
| P3-SEC-04 | Valid login | Session/access credential issued |
| P3-SEC-05 | Invalid credentials | Generic authentication failure |
| P3-SEC-06 | Missing/malformed/invalid/expired token | 401 |
| P3-SEC-07 | Revoked session | Access/refresh rejected per design |
| P3-SEC-08 | Logout then refresh | Rejected |
| P3-SEC-09 | Refresh credential reuse after rotation | Rejected and safely handled |
| P3-SEC-10 | Student calls teacher/admin API | 403 |
| P3-SEC-11 | Teacher accesses assigned course | Allowed only for permitted operation |
| P3-SEC-12 | Teacher accesses unassigned course | Denied |
| P3-SEC-13 | Student reads another student's private record | Denied |
| P3-SEC-14 | Non-admin changes role/status | Denied |
| P3-SEC-15 | Admin self-demotion/self-deactivation | Blocked |
| P3-SEC-16 | Last active admin demotion/deactivation | Blocked |
| P3-SEC-17 | Concurrent admin changes | At least one active administrator remains |
| P3-SEC-18 | Password change | Old password rejected; sessions invalidated per policy |
| P3-SEC-19 | Inactive account uses old token | Denied |
| P3-SEC-20 | Logs/responses scanned | No password/hash/raw token/key/secret leakage |
| P3-SEC-21 | Direct API bypassing frontend | Backend still denies unauthorized action |
| P3-SEC-22 | Frontend auth regression | Existing layout and unrelated features preserved |

Also test cookie flags, CSRF, CORS, refresh rotation, concurrent refresh, and abuse/rate controls according to approved design.

## 11. Acceptance criteria

| ID | Criterion |
|---|---|
| P3-AC-01 | Phase 1 and Phase 2 accepted baselines are recorded. |
| P3-AC-02 | Auth uses exact Phase 2 User/Role schema. |
| P3-AC-03 | Passwords are bcrypt-hashed and never returned/logged. |
| P3-AC-04 | Public registration cannot grant unapproved roles. |
| P3-AC-05 | Login/logout/refresh/current-user endpoints work. |
| P3-AC-06 | Expiry, refresh rotation, and revocation are verified. |
| P3-AC-07 | Student/teacher/admin RBAC is backend-enforced. |
| P3-AC-08 | Teacher assignment enforced at service/query boundary. |
| P3-AC-09 | Admin self-demotion, self-deactivation, and last-admin lockout prevented. |
| P3-AC-10 | Concurrent admin changes cannot remove last active admin. |
| P3-AC-11 | Security-critical events safely audited. |
| P3-AC-12 | Frontend sign-in and registration use real backend behavior. |
| P3-AC-13 | Logout and authenticated-user restoration work. |
| P3-AC-14 | Non-auth localStorage workflows remain intact. |
| P3-AC-15 | Backend, security, and frontend regression tests pass. |
| P3-AC-16 | No secrets, raw tokens, plaintext passwords, or hard-coded production accounts. |
| P3-AC-17 | API contract, decisions, and status match actual behavior. |
| P3-AC-18 | Diff reconciles with ledger and six phase records. |

## 12. Mandatory phase records

Create `docs/antigravity-bible/phase-records/PHASE-03/` with:

1. `PLAN.md`
2. `EXECUTION_LOG.md`
3. `FILE_CHANGE_LEDGER.md`
4. `TEST_AND_EVALUATION.md`
5. `ISSUES_AND_DECISIONS.md`
6. `PHASE_SUMMARY.md`

Record every changed file and logical edit. Test results must be actual outputs, not intended commands.

## 13. Execution protocol

**Stage A — Plan only:** verify accepted Phase 1/2 baselines; inspect Phase 2 identity schema and frontend auth; finalize API contracts, registration policy, token/session strategy, cookie/CSRF/CORS, admin safeguards, exact file list, threat model, tests, and rollback plan. Create six records. Do not edit code. Stop for owner approval.

**Stage B — Implement after approval:** use Phase 2 schema; implement only approved scope; add only approved session/audit migrations; do not silently change security policy.

**Stage C — Verify and hand off:** run backend/security/concurrency/frontend tests; test direct API calls; scan logs and repository for secrets; reconcile diff/ledger; update controls; stop. Do not start Phase 4.

Final status: `READY_FOR_REVIEW`, `BLOCKED`, or `NOT_ACCEPTED`. Only the project owner may mark `ACCEPTED`.
