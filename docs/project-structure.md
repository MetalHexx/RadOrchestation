# Project Structure

This page documents the file layout, naming conventions, document types, and state management model.

## Workspace Layout

```
.github/
├── agents/                    # 9 agent definitions
│   ├── orchestrator.agent.md
│   ├── brainstormer.agent.md
│   ├── research.agent.md
│   ├── product-manager.agent.md
│   ├── ux-designer.agent.md
│   ├── architect.agent.md
│   ├── tactical-planner.agent.md
│   ├── coder.agent.md
│   └── reviewer.agent.md
├── skills/                    # 17 skill bundles
│   ├── brainstorm/
│   ├── research-codebase/
│   ├── create-prd/
│   ├── create-design/
│   ├── create-architecture/
│   ├── create-master-plan/
│   ├── create-phase-plan/
│   ├── create-task-handoff/
│   ├── generate-task-report/
│   ├── generate-phase-report/
│   ├── run-tests/
│   ├── review-code/
│   ├── review-phase/
│   ├── triage-report/
│   ├── create-agent/
│   ├── create-skill/
│   └── validate-orchestration/
├── instructions/              # Scoped instruction files
│   ├── project-docs.instructions.md
│   └── state-management.instructions.md
├── prompts/                   # Utility prompt files
│   ├── configure-system.prompt.md
│   └── execute-plan.prompt.md
├── orchestration.yml          # System configuration
├── copilot-instructions.md    # Workspace-level instructions (always loaded)
└── projects/                  # Project artifacts (path configurable)
    └── {PROJECT-NAME}/
        └── ...
src/
├── lib/
│   ├── constants.js           # Shared enums (pipeline tiers, statuses, actions)
│   ├── resolver.js            # Next-Action Resolver (pure function)
│   └── state-validator.js     # State Transition Validator (15 invariants)
├── validate-state.js          # State Validator CLI entry point
├── next-action.js             # Next-Action Resolver CLI entry point
└── triage.js                  # Triage Executor CLI entry point
tests/
└── ...                        # Test files for all scripts and utilities
```

## Project Folder Structure

Each project gets its own subfolder under the configured `base_path` (default: `.github/projects/`):

```
{PROJECT-NAME}/
├── state.json                 # Pipeline state (sole writer: Tactical Planner)
├── STATUS.md                  # Human-readable progress summary
├── BRAINSTORMING.md           # Optional ideation output
├── {NAME}-RESEARCH-FINDINGS.md
├── {NAME}-PRD.md
├── {NAME}-DESIGN.md
├── {NAME}-ARCHITECTURE.md
├── {NAME}-MASTER-PLAN.md
├── phases/
│   ├── {NAME}-PHASE-01-{TITLE}.md
│   └── {NAME}-PHASE-02-{TITLE}.md
├── tasks/
│   ├── {NAME}-TASK-P01-T01-{TITLE}.md
│   ├── {NAME}-TASK-P01-T02-{TITLE}.md
│   └── ...
└── reports/
    ├── {NAME}-TASK-REPORT-P01-T01.md
    ├── {NAME}-TASK-REPORT-P01-T02.md
    ├── CODE-REVIEW-P01-T01.md
    ├── {NAME}-PHASE-REPORT-P01.md
    └── PHASE-REVIEW-P01.md
```

## Naming Conventions

### Project Files

Project files use `SCREAMING-CASE` with the project name as a prefix:

| Pattern | Example |
|---------|---------|
| `{NAME}-PRD.md` | `MYAPP-PRD.md` |
| `{NAME}-DESIGN.md` | `MYAPP-DESIGN.md` |
| `{NAME}-PHASE-{NN}-{TITLE}.md` | `MYAPP-PHASE-01-CORE-API.md` |
| `{NAME}-TASK-P{NN}-T{NN}-{TITLE}.md` | `MYAPP-TASK-P01-T03-AUTH.md` |
| `{NAME}-TASK-REPORT-P{NN}-T{NN}.md` | `MYAPP-TASK-REPORT-P01-T03.md` |
| `{NAME}-PHASE-REPORT-P{NN}.md` | `MYAPP-PHASE-REPORT-P01.md` |
| `CODE-REVIEW-P{NN}-T{NN}.md` | `CODE-REVIEW-P01-T03.md` |

### System Files

| Component | Convention | Example |
|-----------|-----------|---------|
| Agents | lowercase with hyphens | `orchestrator.agent.md` |
| Skills | lowercase with hyphens | `.github/skills/create-prd/` |
| Instructions | lowercase with hyphens | `state-management.instructions.md` |
| Prompts | lowercase with hyphens | `configure-system.prompt.md` |

## Document Types

### Planning Documents

| Document | Sole Writer | Contents |
|----------|-------------|----------|
| `BRAINSTORMING.md` | Brainstormer | Validated ideas, scope boundaries, problem statements |
| `RESEARCH-FINDINGS.md` | Research | Codebase analysis, patterns, constraints, tech inventory |
| `PRD.md` | Product Manager | Problem statement, user stories, requirements (FR-/NFR-), risks, metrics |
| `DESIGN.md` | UX Designer | User flows, layouts, components, states, breakpoints, accessibility |
| `ARCHITECTURE.md` | Architect | System layers, module map, contracts, APIs, schemas, dependency graph |
| `MASTER-PLAN.md` | Architect | Executive summary, phase outlines, exit criteria, risk register |

### Execution Documents

| Document | Sole Writer | Contents |
|----------|-------------|----------|
| `PHASE-PLAN.md` | Tactical Planner | Task breakdown, dependencies, execution order, acceptance criteria |
| `TASK-HANDOFF.md` | Tactical Planner | Self-contained coding instructions with inlined contracts and requirements |
| `TASK-REPORT.md` | Coder | Changed files, test results, deviations, discoveries |
| `PHASE-REPORT.md` | Tactical Planner | Aggregated results, exit criteria assessment, carry-forward items |
| `CODE-REVIEW.md` | Reviewer | Verdict, checklist, issues, severity classification |
| `PHASE-REVIEW.md` | Reviewer | Cross-task integration assessment, exit criteria verification |

### State Files

| File | Sole Writer | Purpose |
|------|-------------|---------|
| `state.json` | Tactical Planner | Machine-readable pipeline state |
| `STATUS.md` | Tactical Planner | Human-readable progress summary |

## State Management

### `state.json` Schema

The state file tracks the complete pipeline position:

```jsonc
{
  "project": { "name": "...", "created": "...", "updated": "..." },
  "pipeline": { "current_tier": "execution", "human_gate_mode": "ask" },
  "planning": {
    "status": "complete",
    "steps": {
      "research": { "status": "complete", "output": "..." },
      "prd": { "status": "complete", "output": "..." },
      "design": { "status": "complete", "output": "..." },
      "architecture": { "status": "complete", "output": "..." },
      "master_plan": { "status": "complete", "output": "..." }
    },
    "human_approved": true
  },
  "execution": {
    "current_phase": 0,
    "total_phases": 3,
    "phases": [
      {
        "phase_number": 1,
        "status": "in_progress",
        "current_task": 0,
        "tasks": [
          { "status": "complete", "retries": 0 },
          { "status": "in_progress", "retries": 0 }
        ]
      }
    ]
  },
  "limits": { "max_phases": 10, "max_tasks_per_phase": 8, "max_retries_per_task": 2 },
  "errors": { "total_retries": 0, "total_halts": 0, "active_blockers": [] }
}
```

### Invariants

The [State Transition Validator](scripts.md) checks 15 invariants (V1–V15) before every write:

- **Task transitions** — tasks progress linearly (`not_started` → `in_progress` → `complete` | `failed`)
- **Single active task** — only one task `in_progress` across the entire project
- **Planning gate** — `planning.human_approved` must be `true` before `current_tier` can be `execution`
- **Limit enforcement** — phase count, task count, and retry count must stay within configured limits
- **Timestamp monotonicity** — `project.updated` must never decrease
- **Retry monotonicity** — retry counts never decrease
- **Write ordering** — verdict/action fields follow required sequencing
- **Immutability** — completed task fields cannot be modified

See [Deterministic Scripts](scripts.md) for the full invariant catalog.

## Scoped Instructions

Instruction files use `applyTo` glob patterns to load context-specific rules only when Copilot is working with matching files:

| File | Applies To | Rules |
|------|-----------|-------|
| `project-docs.instructions.md` | `.github/projects/**` | Naming conventions, file ownership (sole writer policy), document quality standards |
| `state-management.instructions.md` | `**/state.json`, `**/*STATUS.md` | State invariants, sole writer enforcement, pipeline tier ordering |

## Prompt Files

Prompt files provide utility workflows accessible via `/` commands in Copilot:

| Prompt | Command | Purpose |
|--------|---------|---------|
| `configure-system.prompt.md` | `/configure-system` | Create or update `orchestration.yml`, scan for stale path references |
| `execute-plan.prompt.md` | `/execute-plan` | Approve a Master Plan and begin execution |
