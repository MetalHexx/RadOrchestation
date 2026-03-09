---
name: triage-report
description: 'Triage task reports and phase reviews to determine the Tactical Planner next action. Embedded in Tactical Planner Mode 3 and Mode 4. Writes verdict/action to state.json — no standalone output.'
---

# Triage Report

Triage task reports and review documents to determine the Tactical Planner's next action. This skill encodes exhaustive, deterministic decision tables — every input combination maps to exactly one action. No row requires judgment.

## Invocation Context

- **Embedded step** within Tactical Planner Mode 3 (phase-level triage) and Mode 4 (task-level triage) only
- **Never invoked standalone** — the Planner executes this skill inline during planning
- **Produces no output document** — triage writes verdict/action fields to `state.json`; the decision tables themselves are the deliverable

## Mode 4 — Task-Level Triage Read Sequence

Execute this read sequence when the Tactical Planner is in Mode 4 (Create Task Handoff), after reading the Phase Plan and Architecture but before producing the Task Handoff document.

| Step | Condition | Read | Source Path |
|------|-----------|------|-------------|
| 1 | ALWAYS | Task Report | `state.json → execution.phases[N].tasks[M].report_doc` |
| 2 | ONLY IF `task.review_doc` is non-null | Code Review | `state.json → execution.phases[N].tasks[M].review_doc` |

- If step 2 is skipped (no review doc), both `review_verdict` and `review_action` remain `null` — do not write them.
- If step 2 is attempted but the file at the path cannot be read, report error and halt (see Error Handling).

## Task-Level Decision Table

The Planner applies this table after completing the Mode 4 read sequence. Match the first row whose conditions are satisfied.

| # | Task Report Status | Has Deviations? | Code Review Verdict | `review_verdict` Written | `review_action` Written | Planner Next Action |
|---|---|---|---|---|---|---|
| 1 | `complete` | No | `null` (no review yet) | *(skip — no review doc)* | *(skip — no review doc)* | Create next task handoff; carry any Recommendations from report into context |
| 2 | `complete` | No | `"approved"` | `"approved"` | `"advanced"` | Create next task handoff normally |
| 3 | `complete` | Yes — minor | `"approved"` | `"approved"` | `"advanced"` | Create next task handoff; surface minor deviations in context section |
| 4 | `complete` | Yes — architectural | `"approved"` | `"approved"` | `"advanced"` | Create next task handoff; include architectural deviation as carry-forward item |
| 5 | `complete` | Any | `"changes_requested"` | `"changes_requested"` | `"corrective_task_issued"` | Create corrective task handoff; inline specific issues from review Issues table |
| 6 | `complete` | Any | `"rejected"` | `"rejected"` | `"halted"` | Write halt to state.json; do NOT produce a handoff; signal Orchestrator to halt pipeline |
| 7 | `partial` | — | `null` (no review yet) | *(skip — no review doc)* | *(skip — no review doc)* | Assess severity: if minor issues → create corrective handoff; if blocking → halt |
| 8 | `partial` | — | `"changes_requested"` | `"changes_requested"` | `"corrective_task_issued"` | Create corrective handoff; merge partial-completion issues AND review issues into single handoff |
| 9 | `partial` | — | `"rejected"` | `"rejected"` | `"halted"` | Write halt to state.json; signal Orchestrator to halt |
| 10 | `failed` | — | Any or `null` | *(record if review doc exists)* | See note | If `retries < max_retries` AND `severity == "minor"` → `"corrective_task_issued"`; else → `"halted"` |
| 11 | `failed` | — | Any or `null` — critical severity | *(record if review doc exists)* | `"halted"` | Halt immediately regardless of retry budget |

### Row Clarifications

**Row 10 — failed task, non-critical severity:**
For a `failed` task with an existing review doc, write the `review_verdict` (transcribed verbatim from the review frontmatter), then apply the retry-budget check to determine `review_action`:
- If `task.retries < limits.max_retries_per_task` AND `task.severity == "minor"` → write `review_action` = `"corrective_task_issued"`
- Otherwise → write `review_action` = `"halted"`
- Critical severity always results in `"halted"` regardless of retry budget (see Row 11)

**Row 11 — failed task, critical severity:**
Critical severity means immediate halt. Do not check retry budget. Write `review_action` = `"halted"` unconditionally.

**Row 1 / Row 7 — no review doc:**
When `task.review_doc` is `null` (no Code Review exists yet), skip the verdict/action write entirely — both fields remain `null`. This is NOT a gatekeep violation because the Orchestrator's invariant requires `review_doc != null` to trigger: `review_doc != null AND review_verdict == null`. When `review_doc` is `null`, the first condition is false and the invariant is not triggered.

## Mode 3 — Phase-Level Triage Read Sequence

Execute this read sequence when the Tactical Planner is in Mode 3 (Create Phase Plan), after reading the Master Plan and Architecture but before producing the Phase Plan document.

| Step | Condition | Read | Source Path |
|------|-----------|------|-------------|
| 1 | ALWAYS (skip if first phase) | Phase Report | `state.json → execution.phases[N].phase_report` |
| 2 | ONLY IF `phase.phase_review` is non-null | Phase Review | `state.json → execution.phases[N].phase_review` |

- If step 1 is skipped (first phase — no previous Phase Report), proceed directly to Phase Plan creation without triage.
- If step 2 is skipped (no phase review doc), both `phase_review_verdict` and `phase_review_action` remain `null` — do not write them.
- If step 2 is attempted but the file at the path cannot be read, report error and halt (see Error Handling).

## Phase-Level Decision Table

The Planner applies this table after completing the Mode 3 read sequence. Match the first row whose conditions are satisfied.

| # | Phase Review Verdict | Exit Criteria Assessment | `phase_review_verdict` Written | `phase_review_action` Written | Planner Next Action |
|---|---|---|---|---|---|
| 1 | `null` (no phase review yet) | — | *(skip — no review doc)* | *(skip — no review doc)* | Skip phase triage; proceed with phase planning using Phase Report only |
| 2 | `"approved"` | All exit criteria met | `"approved"` | `"advanced"` | Proceed to plan next phase normally |
| 3 | `"approved"` | Some exit criteria unmet | `"approved"` | `"advanced"` | Plan next phase; surface unmet criteria as explicit carry-forward tasks in Phase Plan |
| 4 | `"changes_requested"` | — | `"changes_requested"` | `"corrective_tasks_issued"` | Create corrective task(s) targeting integration issues from review; include review's Cross-Task Issues table in handoff context |
| 5 | `"rejected"` | — | `"rejected"` | `"halted"` | Write halt to state.json; do NOT produce a Phase Plan; signal Orchestrator to halt pipeline |

> **Note:** `phase_review_action` uses `"corrective_tasks_issued"` (plural) — a phase review can result in multiple corrective tasks. This is intentionally different from task-level `review_action` which uses `"corrective_task_issued"` (singular). Do NOT normalize these values.

## State Write Contract

The Tactical Planner is the **sole writer** of all triage fields in `state.json`. No other agent may write these fields.

### Task-Level Fields

After executing the task-level decision table, write to `state.json → execution.phases[N].tasks[M]`:

| Field | Value Source | Allowed Values |
|-------|-------------|----------------|
| `review_verdict` | Verbatim from Code Review frontmatter `verdict` field | `"approved"` \| `"changes_requested"` \| `"rejected"` \| `null` |
| `review_action` | Resolved from task-level decision table | `"advanced"` \| `"corrective_task_issued"` \| `"halted"` \| `null` |

### Phase-Level Fields

After executing the phase-level decision table, write to `state.json → execution.phases[N]`:

| Field | Value Source | Allowed Values |
|-------|-------------|----------------|
| `phase_review_verdict` | Verbatim from Phase Review frontmatter `verdict` field | `"approved"` \| `"changes_requested"` \| `"rejected"` \| `null` |
| `phase_review_action` | Resolved from phase-level decision table | `"advanced"` \| `"corrective_tasks_issued"` \| `"halted"` \| `null` |

### Verbatim Transcription Rule

`review_verdict` and `phase_review_verdict` values MUST be copied exactly from the Reviewer's frontmatter `verdict` field. The allowed values are:
- `"approved"`
- `"changes_requested"`
- `"rejected"`

**No casing normalization.** Do not convert to uppercase, lowercase, or title case.
**No mapping.** Do not translate verdict values (e.g., do not map `"changes_requested"` to `"needs_changes"`).
**No invention.** If the frontmatter `verdict` field contains a value not in the allowed set, report an error and halt (see Error Handling).

### Write Ordering

Verdict and action fields MUST be written to `state.json` BEFORE `task.handoff_doc` (when creating a task handoff) or before the Phase Plan entry (when creating a phase plan). The Planner must never write `handoff_doc` without first writing `review_verdict` and `review_action` when `review_doc` is non-null.

Correct order:
1. Write `review_verdict` and `review_action` (or `phase_review_verdict` and `phase_review_action`)
2. Write `handoff_doc` (or create Phase Plan entry)

### Immutability

Once written, verdict and action fields for a specific task or phase MUST NOT be overwritten by triage of a different task or phase. Each task's triage fields are indexed by `task_number` — the Planner writes to the specific task entry matching the task being triaged. Each phase's triage fields are indexed by `phase_number`.

## Error Handling

### Review Document Not Found

If the review document at the path stored in `state.json` cannot be read (file does not exist or is unreadable):
- Report error: `"review document not found at '{path}'"`
- Write the error to `state.json → errors.active_blockers`
- Halt the pipeline — do NOT skip triage silently
- Do NOT write verdict/action fields — leave them as `null`

### Invalid Verdict Value

If the `verdict` field in the review document's frontmatter contains a value not in the allowed enum set (`"approved"`, `"changes_requested"`, `"rejected"`):
- Report error: `"invalid verdict value '{value}' in review frontmatter at '{path}' — allowed values: approved, changes_requested, rejected"`
- Write the error to `state.json → errors.active_blockers`
- Halt the pipeline — do NOT proceed with triage
- Do NOT write verdict/action fields — leave them as `null`
