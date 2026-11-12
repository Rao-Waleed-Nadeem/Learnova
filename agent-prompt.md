# LEARNOVA — OPTION B IMPLEMENTATION
# Integrate the Durable Outbox Processor into FastAPI Application Lifespan

**Task type:** Backend architecture correction, implementation, reliability hardening, testing, and Docker runtime verification  
**Project:** Learnova — An Adaptive and Gamified Learning Platform  
**Priority:** High  
**Implementation decision:** Option B — In-process background outbox processor  
**Architecture:** Modular monolith  
**Infrastructure:** Existing Docker Compose services only  
**Primary objective:** Make asynchronous gamification event processing work reliably inside the existing FastAPI backend without introducing a separate worker container.

---

# 1. YOUR ROLE AND RESPONSIBILITY

Act as a senior backend engineer, software architect, database engineer, DevOps engineer, and QA engineer.

You are working on the existing Learnova project. You are not creating a new project or designing an alternative architecture.

Your responsibility is to:

1. Inspect the complete current repository before changing anything.
2. Understand the existing backend implementation and its conventions.
3. Identify the current outbox implementation and its dependencies.
4. Integrate the existing outbox processor into the FastAPI application lifecycle.
5. Preserve all existing business logic and database contracts.
6. Make event processing reliable, idempotent, concurrency-safe, recoverable, and observable.
7. Add comprehensive automated tests.
8. Verify the implementation inside the existing Docker environment.
9. Update relevant documentation.
10. Produce a precise implementation and verification report.

**Do not simply create files that look correct. Implement, execute, test, and verify the complete workflow.**

Do not claim that something works unless you have evidence from tests or runtime verification.

---

# 2. AUTHORITATIVE PROJECT SOURCES

Read and understand these project documents before implementation:

1. `Learnova_SRS_Final_Aligned_V2.docx`
2. `Learnova_Final_SSDs_V2.xml`
3. `Readme.md`
4. `Learnova_Master_Backend_Implementation_Blueprint.md`
5. Current backend source code.
6. Current Docker Compose and Dockerfiles.
7. Existing migrations and database models.
8. Existing backend and frontend integration tests.

Use the documents according to their authority:

- The SRS establishes functional requirements.
- The SSDs describe system interactions and process responsibilities.
- The architecture README explains the intended system structure.
- The Master Backend Blueprint provides the consolidated engineering implementation guidance.
- The current repository establishes the actual implementation state.

If the current code conflicts with an approved source requirement, investigate and correct the conflict without silently changing the requirement.

If a genuine ambiguity exists, document it rather than inventing a business rule.

**Important:** An older uploaded repository archive may contain an outdated scaffold. Do not assume that archive represents the current backend. Work from the actual current repository and active branch.

---

# 3. FINAL ARCHITECTURE DECISION — DO NOT CHANGE IT

We have explicitly selected Option B.

The final topology must remain:

```text
                  LEARNOVA
                     |
          +----------+----------+
          |                     |
       FRONTEND              BACKEND
       React/Express          FastAPI
          |                     |
          |              +------+------+
          |              |             |
          |           REST API     Outbox Processor
          |              |             |
          |              +------+------+
          |                     |
          +---------------------+
                                |
                         PostgreSQL
                         (Docker DB)
```

The backend process will perform two responsibilities:

**Responsibility A — API processing**
- Accept HTTP requests.
- Authenticate and authorize users.
- Execute business workflows.
- Interact with database services.
- Return API responses.

**Responsibility B — background event processing**
- Periodically inspect pending outbox events.
- Claim eligible events safely.
- Dispatch events to the existing gamification handler.
- Award eligible XP.
- Update levels, streaks, badges, and related records according to existing business rules.
- Mark events processed or schedule retries.
- Record failures for diagnosis.

Both responsibilities run inside the existing FastAPI backend deployment.

## Strict infrastructure restrictions

DO NOT:

- Add a separate Docker Compose worker service.
- Add Redis.
- Add Celery.
- Add Kafka.
- Add RabbitMQ.
- Add another database.
- Introduce a microservice.
- Create a second independent gamification implementation.
- Move gamification processing into the frontend.
- Award XP directly from assessment grading.
- Replace PostgreSQL outbox persistence with an in-memory queue.

Keep the existing three-service Docker Compose architecture.

---

# 4. PHASE 1 — COMPLETE REPOSITORY INVESTIGATION

Before editing files, inspect the actual current repository.

Do not assume filenames or class names are identical to this prompt. Discover the real implementation first.

## 4.1 Inspect backend entry points

Locate and inspect:

- FastAPI application entry point, likely `backend/app/main.py`.
- Application configuration/settings.
- Database engine configuration.
- Database session factory.
- SQLAlchemy Base and model registration.
- Existing dependency injection.
- Existing API routers.
- Existing application lifecycle implementation, if any.
- Logging configuration.
- Existing exception handling.

Determine:

1. Is FastAPI currently using a lifespan context manager?
2. Are startup/shutdown event handlers already present?
3. Is the application initialized more than once in tests?
4. Is the database engine synchronous or asynchronous?
5. Which PostgreSQL driver is used?
6. How are database sessions created and disposed?
7. Does the current backend use multiple Uvicorn workers?
8. Is there an existing application factory?
9. How are settings loaded from environment variables?

Do not introduce a second database engine or a second independent session factory.

## 4.2 Inspect outbox implementation

Find the actual equivalents of:

- `outbox_worker.py`
- `outbox_service.py`
- Outbox event model.
- Gamification service.
- XP ledger model.
- Gamification profile model.
- Streak model or streak tracking logic.
- Badge and achievement logic.
- Relevant repositories.
- Event schemas and event-type definitions.
- Existing retry or error-handling mechanisms.

Inspect all their callers and dependencies.

Answer these questions before modifying anything:

1. Where are outbox records created?
2. Which business operations create them?
3. Are they created in the same database transaction as the business operation?
4. What event types currently exist?
5. What is the event payload format?
6. How is event ownership/user identity represented?
7. How does the worker select pending events?
8. How does it identify completed events?
9. How are exceptions handled?
10. Is there already an idempotency key?
11. Does the XP ledger have a uniqueness constraint?
12. Are XP and profile updates transactional?
13. Can a failed event be retried?
14. Can a process crash leave an event permanently stuck?
15. Is there an existing polling or scheduling mechanism?
16. Is any worker already being started indirectly?

Produce a concise investigation report before implementation.

## 4.3 Inspect Docker configuration

Inspect:

- Root `docker-compose.yml`.
- Backend Dockerfile.
- Backend requirements/dependency file.
- Root `.env.example`.
- Backend environment settings.
- Any entrypoint or startup scripts.

Identify:

- Backend startup command.
- Uvicorn worker count.
- Database connection configuration.
- Health checks.
- Service dependencies.
- Database persistence volume.
- Migration execution strategy.

Do not change the database volume or delete existing data.

---

# 5. PHASE 2 — FASTAPI LIFESPAN INTEGRATION

## 5.1 Required behavior

The outbox processor must start automatically when the FastAPI backend starts.

It must stop gracefully when the backend shuts down.

Use FastAPI's modern `lifespan` mechanism rather than introducing additional competing startup mechanisms.

The processor must not start when the application is merely imported.

It must start only when the application lifespan actually runs.

## 5.2 Required lifecycle

Expected lifecycle:

```text
FASTAPI START
      |
      v
Initialize application resources
      |
      v
Initialize database dependencies
      |
      v
Start outbox processor
      |
      v
API becomes available
      |
      +--------------------------+
      |                          |
      v                          v
HTTP requests              Outbox polling
      |                          |
      v                          v
Domain services             Pending events
      |                          |
      v                          v
PostgreSQL                Gamification handler
                                 |
                                 v
                         XP / streak / badges
                                 |
                                 v
                         Update event status
                                 |
                                 v
                         Wait and poll again
                                 |
                                 v
                         Repeat until shutdown
      |
      v
FASTAPI SHUTDOWN
      |
      v
Stop accepting new worker iterations
      |
      v
Finish or safely cancel current operation
      |
      v
Release locks and resources
      |
      v
Dispose application resources
```

## 5.3 Implementation expectations

Create or modify the appropriate lifecycle integration.

Possible location:

`backend/app/main.py`

Use the project's existing naming and structure.

Conceptual implementation:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):

    processor = create_outbox_processor()

    await processor.start()

    app.state.outbox_processor = processor

    try:
        yield

    finally:
        await processor.stop()


app = FastAPI(
    title="Learnova API",
    lifespan=lifespan,
)
```

**This is illustrative, not code to paste blindly.**

Adapt it to the existing processor, database stack, configuration, and error-handling conventions.

Important requirements:

- Do not create duplicate processor instances.
- Do not block FastAPI startup with an infinite processing loop.
- Do not block the main API event loop with synchronous database operations.
- If the existing SQLAlchemy implementation is synchronous, use a safe execution strategy compatible with that stack.
- If the existing implementation is asynchronous, preserve its async patterns.
- Do not convert the entire backend from synchronous to asynchronous merely for this feature.
- Do not create a new engine/session factory just for the worker.
- Do not swallow startup failures silently.
- Do not allow a worker exception to crash the API unexpectedly.
- Do not leave an unhandled background task exception.
- Do not start a worker at module import time.

## 5.4 Startup and shutdown configuration

The processor must support configurable settings.

Recommended settings:

| Setting | Suggested default | Purpose |
|---|---:|---|
| `OUTBOX_ENABLED` | `true` | Enable/disable background processing |
| `OUTBOX_POLL_INTERVAL_SECONDS` | `5` | Delay between polling cycles |
| `OUTBOX_BATCH_SIZE` | `20` | Maximum events processed per batch |
| `OUTBOX_MAX_ATTEMPTS` | `5` | Maximum processing attempts |
| `OUTBOX_RETRY_BASE_SECONDS` | `5` | Base retry delay |
| `OUTBOX_RETRY_MAX_SECONDS` | `300` | Maximum retry delay |
| `OUTBOX_SHUTDOWN_TIMEOUT_SECONDS` | `30` | Graceful shutdown timeout |

These are initial operational defaults, not immutable business requirements.

If equivalent configuration already exists, reuse it.

Validate configuration values:
- Poll interval must be positive.
- Batch size must be positive.
- Maximum attempts must be positive.
- Retry values must be valid.
- Shutdown timeout must be positive.

The worker should be disabled only when explicitly configured or when running an intentional test configuration.

Never silently disable production processing because of a missing or malformed setting.

---

# 6. PHASE 3 — PROCESSOR DESIGN

Reuse the existing outbox worker implementation.

Do not rewrite the business logic if it already works.

Separate these responsibilities clearly:

1. Application lifecycle management.
2. Polling and scheduling.
3. Event retrieval and claiming.
4. Event dispatch.
5. Gamification business processing.
6. Retry and failure handling.
7. Logging and monitoring.

The processor should have a clear public lifecycle interface, conceptually:

```python
class OutboxProcessor:

    async def start(self):
        ...

    async def stop(self):
        ...

    async def run_forever(self):
        ...

    async def process_batch(self):
        ...

    async def process_event(self, event_id):
        ...
```

Use the actual existing project style. These methods are a responsibility guide, not mandatory names.

## 6.1 Polling behavior

The worker should:

1. Begin a processing cycle.
2. Fetch a bounded number of eligible events.
3. Process the available batch.
4. Record successful processing.
5. Record failed processing and retry information.
6. Finish the cycle.
7. Wait for the configured interval.
8. Repeat.

It must not continuously spin at 100% CPU when no events exist.

Use an interruptible sleep or equivalent mechanism so shutdown does not need to wait for the full polling interval.

## 6.2 Batch behavior

Process a bounded batch.

Do not load every pending event into memory.

Use the configured batch size.

One failed event must not prevent unrelated events in the same batch from being processed unless the event dependencies or business rules explicitly require ordering.

Preserve event ordering where the existing business model requires it.

Do not assume all event types are independent.

---

# 7. PHASE 4 — DATABASE SAFETY AND EVENT CLAIMING

This is one of the most important sections.

The implementation must prevent two processor executions from awarding duplicate rewards or corrupting event state.

## 7.1 Durable event requirements

An outbox record should have the equivalent of:

- Unique primary key.
- Event type.
- Event payload.
- Unique event/idempotency key.
- Created timestamp.
- Processing status.
- Attempt count.
- Next retry timestamp.
- Last error information.
- Processed timestamp.

Use the existing model and migration if they already provide these fields.

Do not create duplicate columns or tables unnecessarily.

If a required field is absent, determine whether it needs a migration.

## 7.2 Event statuses

Use the project's existing status conventions if they are already correct.

The intended lifecycle is:

```text
PENDING
   |
   v
PROCESSING (only if the implementation uses a committed claim/lease)
   |
   +------------------+
   |                  |
   v                  v
PROCESSED          RETRY WAIT
                      |
                      v
                   PENDING
                      |
                      v
                 MAX ATTEMPTS
                      |
                      v
                 DEAD / FAILED
```

Do not add a `PROCESSING` state merely for appearance.

If the worker claims and processes an event inside one database transaction using row locks, the transaction itself may provide sufficient ownership. In that design, a committed processing state may be unnecessary.

Choose one coherent strategy and document it.

## 7.3 Concurrency-safe claiming

PostgreSQL supports row-level locking and `SKIP LOCKED`.

If compatible with the existing SQLAlchemy version and session strategy, use a query conceptually equivalent to:

```sql
SELECT *
FROM outbox_events
WHERE status IN ('PENDING', 'RETRY')
  AND next_retry_at <= NOW()
ORDER BY created_at ASC
LIMIT :batch_size
FOR UPDATE SKIP LOCKED;
```

Adapt the status and column names to the actual schema.

Requirements:

- Two concurrent processing attempts must not claim the same event simultaneously.
- A worker must not hold a lock indefinitely.
- Database transactions must be short and bounded.
- Events must not be silently lost when a process crashes.
- The database must remain the source of truth.

If the existing implementation uses a different safe claiming method, retain it if it meets these guarantees.

## 7.4 Transaction boundaries

The recommended processing boundary is:

For each event:

1. Begin a database transaction.
2. Claim/lock the event.
3. Confirm it is eligible.
4. Validate its event type and payload.
5. Check whether its reward has already been applied.
6. Apply the required gamification changes.
7. Insert the XP ledger entry if appropriate.
8. Update the profile, streak, and badge records as required.
9. Mark the outbox event as processed.
10. Commit the transaction.

The gamification changes and event completion status must be committed atomically.

If any database operation fails, roll back the transaction.

A failed transaction must not leave:
- XP awarded without an appropriate ledger record.
- A ledger entry without its corresponding profile update where the model requires one.
- An event marked processed when its reward transaction failed.
- Partially updated badge or streak state.

If retry metadata must be recorded after a rollback, record it in a separate transaction.

Do not keep a failed transaction open while sleeping or waiting for a retry.

## 7.5 Crash recovery

Consider all of these situations:

- Backend crashes before an event is claimed.
- Backend crashes after claiming but before processing.
- Backend crashes during XP insertion.
- Backend crashes after XP insertion but before event completion.
- Database connection is interrupted during commit.
- Backend is restarted after a temporary outage.

The design must recover safely.

If processing is atomic within a database transaction, a process crash should cause uncommitted changes to roll back. The event should remain eligible for a later attempt.

If the implementation uses committed claims and leases, it must include lease expiration and recovery for abandoned claims.

Do not leave events stuck permanently in `PROCESSING`.

---

# 8. PHASE 5 — IDEMPOTENCY AND DUPLICATE XP PREVENTION

This is a mandatory business requirement.

Learnova must not award duplicate XP when:

- The frontend submits the same request twice.
- A user retries after a timeout.
- An API request is repeated.
- The worker processes an event again.
- The worker restarts.
- A database transaction is retried.
- Two backend instances attempt to process events concurrently.
- An event is manually reprocessed.

## 8.1 Stable event identity

Determine the correct idempotency key from the existing business operation.

It should identify the qualifying learning event, not merely identify a processing attempt.

Do not generate a fresh random key every time the same business operation is retried.

For example, if a completed lesson event has a stable completion identifier, use that identifier or a deterministic key derived from the business event.

Conceptual examples:

```text
LESSON_COMPLETED:<completion_id>
EXAM_COMPLETED:<attempt_id>
QUIZ_PASSED:<attempt_id>
RESOURCE_REVIEWED:<review_id>
```

Use only event types and business identifiers supported by the actual project.

Do not invent new reward triggers or alter XP amounts.

## 8.2 Database-level protection

Application-level checks are insufficient.

Add or preserve a database uniqueness constraint that prevents the same qualifying source event from generating duplicate XP ledger entries.

For example, conceptually:

```sql
UNIQUE(source_event_key)
```

Use the actual ledger columns and constraints.

If one source event legitimately creates multiple different reward categories, design the unique key around the correct combination of source event and reward type.

Do not create a uniqueness rule that blocks legitimate rewards.

## 8.3 Atomic idempotency

The following operations must be coordinated transactionally:

- Check event/reward idempotency.
- Insert XP ledger entry.
- Update XP profile.
- Update level if required.
- Update streak if the event qualifies.
- Evaluate and record badges.
- Mark the outbox event processed.

A duplicate must be recognized without applying the reward twice.

Do not rely exclusively on a Python `if` check before inserting.

Use the database uniqueness constraint as the final protection.

## 8.4 External side effects

Do not claim universal exactly-once delivery.

The correct guarantee for database-backed gamification is:

**At-least-once event processing with idempotent database effects, producing effectively-once reward application for each qualifying source event.**

If notifications are external side effects, do not send them before the reward transaction is safely committed.

If the current system supports notifications, ensure retries cannot create uncontrolled duplicate notifications. Use a separate durable notification mechanism or idempotency mechanism if required.

Do not introduce an external message broker for this task.

---

# 9. PHASE 6 — RETRIES AND PERMANENT FAILURE HANDLING

Temporary failures must not permanently discard events.

## 9.1 Retryable errors

Examples:

- Temporary PostgreSQL connection failure.
- Database deadlock or transient transaction conflict.
- Temporary internal dependency failure.
- Recoverable service exception.

Classify errors deliberately.

Do not retry invalid payloads forever.

Do not retry unsupported event types forever.

## 9.2 Retry strategy

Use bounded exponential backoff with jitter.

Conceptual formula:

```python
delay = min(
    retry_max,
    retry_base * (2 ** max(attempt_count - 1, 0))
)

delay = apply_small_random_jitter(delay)
```

Adapt the exact calculation to the existing configuration.

Requirements:

- Retry attempts are persisted.
- The next retry time is persisted.
- The worker skips events whose retry time has not arrived.
- The retry count is incremented correctly.
- Retries do not generate additional XP.
- Permanent failures become visible.
- Maximum attempts are enforced.

## 9.3 Failed/dead events

When the retry limit is reached:

- Mark the event as permanently failed/dead using the project's status convention.
- Store the final error classification.
- Store a safe, truncated error message.
- Preserve the event payload for diagnosis, subject to data privacy requirements.
- Log the event identifier.
- Make the failure discoverable to an administrator or developer through existing operational tooling.

Do not silently delete failed events.

Do not expose sensitive payloads, passwords, tokens, or personal information in logs.

## 9.4 Recovery and manual replay

If the project already has an administrative retry mechanism, review it.

Otherwise, do not invent an unsafe public endpoint merely to satisfy this task.

Document a safe way for an authorized operator to inspect and replay a failed event.

Manual replay must preserve the original source event idempotency key.

It must never become a way to award XP repeatedly.

---

# 10. PHASE 7 — MULTIPLE BACKEND PROCESSES AND DEPLOYMENTS

This must be investigated and explicitly addressed.

Option B does not mean that multiple backend processes may blindly start independent uncontrolled processors.

First inspect the actual Uvicorn worker configuration and deployment topology.

## 10.1 Single-process configuration

If the current deployment uses one Uvicorn worker and one backend container, document this operating assumption.

Ensure the processor is initialized once per FastAPI application lifespan.

## 10.2 Multiple backend instances

The architecture must not become unsafe if two backend instances are accidentally started or the deployment is later scaled.

Use one of these safe approaches:

**Preferred where appropriate:**
- PostgreSQL advisory lock to elect one active polling processor.
- Keep the lock on a dedicated database connection for the processor's active lifetime.
- Release it safely on shutdown or connection loss.
- Handle lock contention without crashing the API.

Alternatively:

- Allow multiple processor loops to poll concurrently using correct PostgreSQL `FOR UPDATE SKIP LOCKED` claiming.
- Ensure every event is claimed by only one active transaction.
- Ensure idempotency constraints protect reward application.

Choose the simplest correct design based on the existing worker implementation.

Do not add an advisory lock simply for decoration.

Do not use an in-memory Python boolean as a cross-container singleton guarantee.

Do not assume an `asyncio.Lock` protects multiple containers.

## 10.3 API availability

If the processor cannot obtain its database coordination lock:

- The API should still start and serve requests when its normal database dependencies are healthy.
- The processor should log that another instance owns processing.
- It should retry lock acquisition according to a controlled policy.
- It must not start duplicate uncontrolled processing.

If the processor encounters a recoverable error:

- Log it.
- Roll back the failed transaction.
- Continue future polling cycles where safe.
- Do not crash the API process.

If database connectivity is unavailable, respect the application's normal database health and readiness policy. Do not falsely report that database-dependent functionality is healthy.

## 10.4 Worker count

If the implementation requires a single worker and the current Docker command already uses one worker, document it.

Do not change Uvicorn worker count unnecessarily.

If the architecture is safe with multiple processors, demonstrate this through tests rather than relying on a claim.

---

# 11. PHASE 8 — EVENT SOURCING AND GAMIFICATION BUSINESS BOUNDARIES

Preserve the Learnova business rules.

The processor must not become responsible for academic grading or mastery calculation.

## 11.1 Correct responsibility flow

Expected flow:

```text
Student completes qualifying activity
             |
             v
Backend validates the activity
             |
             v
Business operation is committed
             |
             v
Qualifying outbox event is recorded
in the same transaction where possible
             |
             v
Outbox processor detects pending event
             |
             v
Existing GamificationService handles it
             |
             v
Idempotency check
             |
             v
XP / level / streak / badge evaluation
             |
             v
Database transaction committed
             |
             v
Outbox event marked processed
```

The actual event insertion must be atomic with the originating business operation whenever both use the same database transaction.

If an existing business flow cannot provide that transaction boundary, document the reason and implement an appropriate reliable alternative. Do not silently accept an event that can be lost between the business operation and event insertion.

## 11.2 Assessment separation

The assessment grader must not directly award XP.

It may:

- Validate responses.
- Calculate academic scores.
- Record assessment completion.
- Update mastery according to the approved assessment completion boundary.
- Create a qualifying outbox event when the activity meets the approved reward criteria.

The outbox handler then performs gamification processing separately.

XP must never influence topic mastery calculations.

Gamification failure must not roll back a successfully committed academic assessment result.

## 11.3 Event types

Inspect the actual project and approved documentation.

The SRS includes qualifying activities such as:

- Lesson completion.
- Resource review.
- Successful quiz attempt.

The SSD/README materials also describe completed learning events and exam completion.

Process only event types that are already implemented or explicitly approved in the current Learnova design.

Do not award rewards for every API request.

Do not invent XP values, streak rules, level thresholds, or badge criteria.

Reuse the existing GamificationService and its rules.

---

# 12. PHASE 9 — OBSERVABILITY AND DIAGNOSTICS

The worker must be diagnosable.

Add structured logging consistent with the existing project.

At minimum, record:

- Processor startup.
- Processor shutdown.
- Polling cycle start/end where useful.
- Number of eligible events.
- Number of successfully processed events.
- Number of failed attempts.
- Event identifier.
- Event type.
- Retry count.
- Processing duration.
- Permanent failure.
- Database or lock acquisition failures.

Never log:
- Passwords.
- Database credentials.
- API tokens.
- Full sensitive event payloads.
- Private student information unnecessarily.

Use consistent log levels:

- `INFO`: normal startup, shutdown, successful batch summaries.
- `WARNING`: retryable errors, lock contention, recoverable failures.
- `ERROR`: permanent event failure or serious processing failure.

## 12.1 Health visibility

Inspect the existing health endpoint.

Do not make the normal API health endpoint fail just because the outbox currently has no pending events.

A lack of pending events is normal.

If useful, expose minimal worker state through existing internal diagnostics or application state:

- Enabled/disabled.
- Running/stopped.
- Last successful polling time.
- Last processing error time.
- Pending event count if safely queryable.

Do not expose sensitive operational details to unauthenticated users.

Do not add a large monitoring platform for this task.

---

# 13. PHASE 10 — DATABASE MIGRATIONS

Inspect existing outbox and gamification migrations.

Do not create duplicate schema.

If changes are necessary:

1. Create a proper Alembic migration.
2. Preserve existing records.
3. Add the necessary indexes and constraints.
4. Verify upgrade behavior.
5. Verify downgrade behavior against a disposable test database.
6. Do not run destructive downgrade operations against the project's persistent database.

Potential indexes, only if supported by the actual query plan and schema:

- Status and next retry timestamp.
- Created timestamp.
- Unique source event/idempotency key.

Do not add indexes blindly.

Check query performance and index selectivity.

Do not rename existing columns or rewrite historical records without a clear requirement.

---

# 14. PHASE 11 — TESTING REQUIREMENTS

Testing is mandatory.

Do not stop after writing the code.

Use the project's existing test framework and conventions.

## 14.1 Unit tests

Test:

1. Processor initialization.
2. Processor shutdown.
3. Polling interval behavior.
4. Empty batch behavior.
5. Batch size enforcement.
6. Valid event dispatch.
7. Unsupported event type handling.
8. Invalid payload handling.
9. Retryable exception handling.
10. Permanent failure handling.
11. Exponential backoff.
12. Maximum retry enforcement.
13. Safe logging.

## 14.2 Database integration tests

Use PostgreSQL-compatible integration tests for locking, uniqueness, and transaction behavior.

Do not assume SQLite accurately reproduces PostgreSQL locking semantics.

Test:

1. Pending event is retrieved.
2. Eligible event is processed.
3. Event becomes processed after successful transaction.
4. XP ledger entry is created correctly.
5. Gamification profile is updated correctly.
6. Streak changes follow existing rules.
7. Badges follow existing criteria.
8. Duplicate event does not award duplicate XP.
9. Reprocessing does not award duplicate XP.
10. Transaction rollback does not leave partial reward state.
11. Failed event remains retryable.
12. Retry timestamp is respected.
13. Maximum attempts produce permanent failure.
14. Process interruption does not permanently lose an event.
15. Concurrent claiming does not process the same event twice.
16. Unique database constraints work under concurrent requests.

## 14.3 Lifespan tests

Test the actual FastAPI lifespan:

1. Processor starts when application lifespan starts.
2. Processor does not start at module import.
3. Processor starts only once per application lifecycle.
4. Processor stops during application shutdown.
5. Background task cancellation is handled.
6. Shutdown timeout is respected.
7. Processor failure does not unexpectedly crash the API.
8. Database resources are disposed in the correct order.
9. Repeated test application creation does not leak tasks or connections.

Use mocks only for lifecycle-specific unit tests. Also include actual integration tests.

## 14.4 Multi-instance tests

If advisory locking is implemented:

- Start two processor instances against the same PostgreSQL test database.
- Verify only one owns the singleton processing lock.
- Verify lock release and reacquisition after shutdown.
- Verify loss of the lock connection is handled safely.

If concurrent `SKIP LOCKED` polling is implemented instead:

- Start two processing transactions.
- Verify different events are claimed independently.
- Verify the same event is not claimed twice.
- Verify idempotency still prevents duplicate XP.

## 14.5 Regression tests

Run the existing backend test suite.

Do not delete or weaken tests to obtain a passing result.

Run relevant frontend integration tests if the changed backend contracts could affect the frontend.

Report:
- Tests discovered.
- Tests executed.
- Passed.
- Failed.
- Skipped.
- Reasons for skipped tests.

Never report mocked tests as proof of Docker runtime behavior.

---

# 15. PHASE 12 — DOCKER IMPLEMENTATION AND RUNTIME VERIFICATION

Keep the existing Docker Compose topology.

Expected services:

```text
frontend
backend
database
```

There must not be a fourth worker service.

## 15.1 Backend startup

The backend container must start FastAPI normally.

The outbox processor should start automatically through the FastAPI lifespan.

Do not introduce a separate shell process that competes with the API process.

Do not change the database volume.

Do not remove existing persistent data.

## 15.2 Environment configuration

Add only necessary settings to:

- Backend settings module.
- Root `.env.example`.
- Docker Compose backend environment, if needed.

Do not commit actual credentials.

Keep secrets in the local `.env`.

Ensure Docker Compose passes the required environment values to the backend.

## 15.3 Runtime test procedure

Execute the following using the existing Compose project.

First inspect configuration:

```bash
docker compose config
```

Then build and start the existing services using the project's established workflow.

Inspect status:

```bash
docker compose ps
```

Inspect backend logs:

```bash
docker compose logs --tail=200 backend
```

Verify the API health endpoint.

Verify that startup logs show the outbox processor initialized.

Create or use a valid test qualifying event through the actual supported application flow or a controlled test fixture.

Verify:

1. The event appears in PostgreSQL.
2. Its initial status is eligible for processing.
3. The backend processor discovers it.
4. The event is processed.
5. The XP ledger contains the expected single entry.
6. The profile is updated.
7. A duplicate processing attempt does not award XP again.
8. A simulated temporary failure schedules a retry.
9. A restart does not lose pending events.
10. The processor starts again after backend restart.
11. The API remains available during normal worker operation.

Do not manually insert malformed rows into the production-like database just to make the test pass.

Use an isolated test user and controlled test records.

## 15.4 Data protection

Do not run:

```bash
docker compose down -v
```

Do not remove the persistent PostgreSQL volume.

Do not reset the user's existing development database.

If schema changes are required, apply migrations safely.

---

# 16. PHASE 13 — DOCUMENTATION

Update the relevant existing documentation rather than creating many overlapping files.

Document:

1. Why Option B was selected.
2. Why there is no separate worker container.
3. How the processor starts.
4. How it stops.
5. How polling works.
6. How event claiming works.
7. How transactions work.
8. How duplicate rewards are prevented.
9. How retries and permanent failures work.
10. How multi-instance execution is handled.
11. How to configure polling and retries.
12. How to inspect backend logs.
13. How to verify the processor in Docker.
14. How to test event processing.
15. Known limitations and future scaling considerations.

Keep the documentation aligned with the actual code.

Do not claim features that have not been implemented.

If the project has a canonical implementation status file, update it accurately.

---

# 17. REQUIRED FILES TO INVESTIGATE AND POSSIBLY MODIFY

These are likely locations, not permission to create duplicates.

Inspect actual paths first.

| Area | Likely location | Responsibility |
|---|---|---|
| FastAPI lifecycle | `backend/app/main.py` | Start and stop processor |
| Worker implementation | `backend/app/workers/outbox_worker.py` | Existing processing loop |
| Outbox service | `backend/app/services/outbox_service.py` | Event retrieval and status management |
| Gamification service | `backend/app/services/gamification_service.py` | Existing reward business logic |
| Outbox model | `backend/app/models/` | Durable event persistence |
| XP ledger model | `backend/app/models/` | Reward idempotency |
| Database setup | `backend/app/core/` or actual equivalent | Engine and session management |
| Configuration | `backend/app/core/config.py` or actual equivalent | Polling/retry settings |
| Migrations | `backend/alembic/versions/` | Required schema changes |
| Tests | `backend/tests/` | Unit and integration tests |
| Docker Compose | `docker-compose.yml` | Existing three-service topology |
| Backend Dockerfile | `backend/Dockerfile` | Existing application startup |
| Environment template | `.env.example` | Safe configuration documentation |
| Architecture docs | Existing canonical Markdown documentation | Design and operational explanation |

Before modifying a file, establish why it needs modification.

Do not create:
- `outbox_worker_v2.py` just because an existing worker needs correction.
- A second `GamificationService`.
- A duplicate outbox model.
- A second database session module.
- A new Compose worker service.

---

# 18. CODE QUALITY REQUIREMENTS

All implementation must follow the current project's conventions.

Requirements:

- Type hints.
- Clear naming.
- Small focused functions.
- Proper transaction management.
- Explicit error classification.
- Structured logging.
- No circular imports.
- No hidden global worker initialization.
- No duplicated business rules.
- No hardcoded secrets.
- No unexplained magic numbers.
- No unnecessary dependencies.
- No unnecessary abstractions.
- No swallowed exceptions.
- No unbounded loops without cancellation.
- No unbounded database queries.
- No database sessions held indefinitely.
- No synchronous blocking work on the async event loop.

Do not refactor unrelated modules.

Do not change frontend functionality.

Do not change API response contracts unless absolutely necessary and documented.

Do not alter existing XP rules, streak boundaries, levels, badges, or event payloads without an explicit source-backed reason.

---

# 19. ACCEPTANCE CRITERIA — ALL MUST PASS

The task is complete only when all applicable criteria below are satisfied.

| ID | Acceptance criterion |
|---|---|
| AC-01 | No separate worker Docker service exists. |
| AC-02 | Existing three-service Docker architecture is preserved. |
| AC-03 | Outbox processor starts through FastAPI lifespan. |
| AC-04 | Processor does not start at module import. |
| AC-05 | Processor starts only once per application lifecycle. |
| AC-06 | Processor shuts down gracefully. |
| AC-07 | Existing worker and gamification logic are reused. |
| AC-08 | No second gamification implementation exists. |
| AC-09 | Pending events are discovered automatically. |
| AC-10 | Processing uses bounded batches. |
| AC-11 | Database event claiming is concurrency-safe. |
| AC-12 | Duplicate event processing does not award duplicate XP. |
| AC-13 | Database uniqueness constraints enforce idempotency. |
| AC-14 | XP, profile changes, and event completion are transactionally consistent. |
| AC-15 | Temporary failures are retried. |
| AC-16 | Retry delays are persisted and bounded. |
| AC-17 | Permanent failures remain visible. |
| AC-18 | Crashed processing can recover safely. |
| AC-19 | Multiple backend processes are handled safely or a verified deployment restriction is documented. |
| AC-20 | Processor errors do not unexpectedly crash the API. |
| AC-21 | Assessment grading remains independent from XP awarding. |
| AC-22 | Existing API behavior remains compatible. |
| AC-23 | Backend tests pass. |
| AC-24 | PostgreSQL integration tests verify concurrency and idempotency. |
| AC-25 | FastAPI lifespan tests pass. |
| AC-26 | Docker runtime verification is completed. |
| AC-27 | Documentation reflects the actual implementation. |
| AC-28 | Existing database data and persistent volume are preserved. |

Do not mark an acceptance criterion complete merely because the relevant code exists.

---

# 20. REQUIRED FINAL REPORT

After implementation, provide a detailed report using this exact structure.

## A. Executive summary
- What was wrong?
- What was changed?
- What is the final architecture?
- Is Option B fully implemented?

## B. Initial repository findings
- Existing worker implementation.
- Existing lifecycle.
- Existing event schema.
- Existing idempotency.
- Existing retry behavior.
- Existing Docker configuration.
- Risks discovered.

## C. Architecture decisions
For each decision, explain:
- What was selected?
- Why was it selected?
- What alternative was rejected?
- What trade-off remains?

## D. Modified files
Provide a table:

| File | Change | Reason |
|---|---|---|

List every created, modified, and deleted file.

If no file was needed, state that explicitly.

## E. Implementation details
Explain:
- Lifespan integration.
- Worker loop.
- Polling.
- Event claiming.
- Transaction boundaries.
- Idempotency.
- Retry/backoff.
- Permanent failure handling.
- Multi-instance safety.
- Graceful shutdown.
- Logging and health visibility.

Include relevant code excerpts from the actual implementation.

## F. Database changes
List:
- Migrations.
- New columns.
- New constraints.
- New indexes.
- Existing structures reused.
- Data-preservation verification.

## G. Test results
Provide actual commands and results.

| Test category | Executed | Passed | Failed | Evidence |
|---|---:|---:|---:|---|
| Unit tests | | | | |
| Database integration | | | | |
| Lifespan | | | | |
| Idempotency | | | | |
| Concurrency | | | | |
| Regression | | | | |
| Docker runtime | | | | |

Never fabricate test results.

## H. Docker verification
Show:
- Actual Compose service list.
- Backend startup logs.
- Processor startup evidence.
- Successful event processing evidence.
- Duplicate prevention evidence.
- Retry evidence.
- Restart recovery evidence.

## I. Remaining risks
List every unresolved issue honestly.

## J. Acceptance criteria
Mark every criterion as:
- PASS
- FAIL
- NOT VERIFIED
- NOT APPLICABLE

Explain any failure.

## K. Final recommendation
Tell us whether the implementation is safe to proceed with further Learnova integration testing.

---

# 21. STRICT EXECUTION INSTRUCTIONS

Follow this sequence:

1. Inspect the current repository.
2. Read the existing implementation.
3. Produce the initial findings.
4. Identify the smallest safe change.
5. Implement the FastAPI lifespan integration.
6. Harden event processing and idempotency.
7. Add or correct retry and recovery logic.
8. Address multiple-process behavior.
9. Add automated tests.
10. Run the tests.
11. Verify PostgreSQL behavior.
12. Verify Docker runtime.
13. Update documentation.
14. Produce the final report.

Do not stop after step 3 and provide only recommendations. This is an implementation task.

Do not skip tests.

Do not make broad unrelated refactors.

Do not add infrastructure that we explicitly rejected.

Do not overwrite existing working functionality.

Do not hide failures.

If a required change could destroy data or alter an important business rule, stop and explain the issue before proceeding.

**FINAL ENGINEERING DECISION**

Implement Option B using the existing FastAPI backend application lifespan and the existing PostgreSQL-backed outbox.

The processor is an internal background responsibility of the backend, not a new independent service.

Preserve the modular monolith, existing business rules, existing database, and existing three-service Docker topology.

The result must be implemented, tested, and verified—not merely documented.
