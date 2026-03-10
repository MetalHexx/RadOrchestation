---
applyTo: '**/state.json,**/*STATUS.md'
---

# State Management Rules

When working with `state.json` or `STATUS.md`:

## Sole Writer: Tactical Planner

Only the Tactical Planner agent may create, read-modify-write, or update these files. All other agents are read-only (or have no access at all).

## state.json Invariants

- **Never decrease retry counts** — they only go up
- **Never skip states** — tasks progress: `not_started` → `in_progress` → `complete` | `failed`
- **Only one task `in_progress` at a time** across the entire project
- **`planning.human_approved` must be `true`** before `current_tier` can transition to `"execution"`
- **Always update `project.updated`** timestamp on every write
- **Validate limits before advancing**: `phases.length <= limits.max_phases`, `phase.tasks.length <= limits.max_tasks_per_phase`, `task.retries <= limits.max_retries_per_task`

## STATUS.md Rules

- Keep it human-readable — this is what the user checks for progress
- Update after every significant event (task complete, phase advance, error, halt)
- Include: current tier, current phase/task, completion percentages, active blockers

## Pipeline Tiers

The pipeline has these tiers in order: `planning` → `execution` → `review` → `complete`

A pipeline can also be `halted` from any tier when a critical error occurs.

## Error Severity

Configured in `orchestration.yml`:
- **Critical** (pipeline halts): `build_failure`, `security_vulnerability`, `architectural_violation`, `data_loss_risk`
- **Minor** (auto-retry): `test_failure`, `lint_error`, `review_suggestion`, `missing_test_coverage`, `style_violation`

## Pre-Write Validation

The Tactical Planner MUST call `src/validate-state.js` before every `state.json` write. No exceptions.

### CLI Interface

```
node src/validate-state.js --current <current-state.json> --proposed <proposed-state.json>
```

| Flag | Required | Description |
|------|----------|-------------|
| `--current` | Yes | Path to the committed (current) `state.json` |
| `--proposed` | Yes | Path to the proposed (new) `state.json` |

### Output Format

The script emits JSON to stdout:

**On success** (exit code `0`):

```json
{
  "valid": true,
  "invariants_checked": 15
}
```

**On failure** (exit code `1`):

```json
{
  "valid": false,
  "invariants_checked": 15,
  "errors": [
    {
      "invariant": "V3",
      "message": "Task status transition not_started → complete is not allowed",
      "severity": "critical"
    }
  ]
}
```

### Required Workflow

Every `state.json` write in the Tactical Planner (Modes 2, 3, 4, and 5) must follow this sequence:

1. Prepare the proposed state as a complete JSON object
2. Write proposed state to a temporary file (e.g., `state.json.proposed`)
3. Call: `node src/validate-state.js --current <path-to-current-state.json> --proposed <path-to-temp-file>`
4. Parse JSON stdout: `result = JSON.parse(stdout)`
5. **If `result.valid === true`**: Commit — replace `state.json` with the proposed file
6. **If `result.valid === false`**: Do NOT commit the write. Record each entry from `result.errors` in `state.json → errors.active_blockers`. Halt the pipeline. Delete the temp file.

### Failure Behavior

On validation failure the Tactical Planner MUST:

- **NOT commit** the proposed `state.json` — the current state remains unchanged
- **Record each invariant violation** from `result.errors` into `errors.active_blockers`
- **Halt the pipeline** — set `pipeline.current_tier` to `"halted"`
- **Delete the temporary file** to avoid stale proposed states
- **Report the halt** in `STATUS.md` with the specific invariant violations
