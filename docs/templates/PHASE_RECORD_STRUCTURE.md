# Required Phase Record Structure

Create this directory for each phase:

`docs/antigravity-bible/phase-records/PHASE-XX/`

It must contain:

1. `PLAN.md` — task objective, source traceability, approved scope, exact intended file list, contracts affected, risks, rollback, approval.
2. `EXECUTION_LOG.md` — chronological commands/actions, timestamps, exit codes, actual outcomes, side effects.
3. `FILE_CHANGE_LEDGER.md` — every created/modified/renamed/deleted path and every distinct logical edit.
4. `TEST_AND_EVALUATION.md` — test evidence and criterion-by-criterion assessment.
5. `ISSUES_AND_DECISIONS.md` — blockers, ambiguity, deviations, defects, decisions, owner approvals.
6. `PHASE_SUMMARY.md` — final scope delivered, files changed, tests, acceptance status, limitations, owner decision.

Do not create an empty claim of completion. If no code files changed (for example Phase 0), explicitly state that and still record any phase-report documents created.
