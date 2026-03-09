# Agents

The orchestration system uses 9 specialized agents, each with a defined role, scoped tool access, and strict write permissions. Agents communicate through structured markdown documents — never through shared memory or message passing.

## Agent Overview

| Agent | Role | Writes |
|-------|------|--------|
| **Brainstormer** | Collaborative ideation with the human | `BRAINSTORMING.md` |
| **Orchestrator** | Pipeline coordination — spawns agents, reads state | Nothing (read-only) |
| **Research** | Codebase and context exploration | `RESEARCH-FINDINGS.md` |
| **Product Manager** | Requirements definition | `PRD.md` |
| **UX Designer** | Interface and interaction design | `DESIGN.md` |
| **Architect** | System architecture and master planning | `ARCHITECTURE.md`, `MASTER-PLAN.md` |
| **Tactical Planner** | Task breakdown, state management, triage | `state.json`, `STATUS.md`, phase plans, task handoffs, phase reports |
| **Coder** | Code implementation | Source code, tests, `TASK-REPORT.md` |
| **Reviewer** | Code and phase review | `CODE-REVIEW.md`, `PHASE-REVIEW.md` |

## Design Constraints

### Sole Writer Policy

Every document type has exactly one agent that may create or modify it. This eliminates write conflicts and makes the system's data flow explicit and traceable.

### Read-Only Orchestrator

The Orchestrator coordinates the entire pipeline but **never writes files**. It reads `state.json` to determine the current pipeline position, invokes the [Next-Action Resolver](scripts.md) to get deterministic routing, and spawns the appropriate agent. This separation ensures the Orchestrator can't accidentally corrupt project state.

### Self-Contained Coder

The Coder agent reads **only its Task Handoff document** — a single file containing everything needed to complete the task: inlined contracts, interfaces, design tokens, acceptance criteria, and file targets. The Coder never reads the PRD, Architecture, or Design documents directly. This ensures tasks are atomic and reproducible.

### Tactical Planner as State Authority

Only the Tactical Planner writes `state.json` and `STATUS.md`. Before every write, it runs the [State Transition Validator](scripts.md) to check all 15 invariants. If validation fails, the write is rejected and the error is recorded in `errors.active_blockers`.

---

## Agent Details

### Brainstormer

**Purpose:** Collaboratively explore and refine project ideas before entering the pipeline.

The Brainstormer works directly with the human in a conversational loop — asking probing questions, exploring trade-offs, identifying scope boundaries, and converging on a well-defined concept. It operates outside the main pipeline and is entirely optional.

**Output:** `BRAINSTORMING.md` — validated ideas, scope boundaries, target users, and problem statements.

**Skills:** `brainstorm`

---

### Orchestrator

**Purpose:** Read project state and coordinate the pipeline by spawning the right agent at the right time.

The Orchestrator is the entry point for all project interactions. It reads `state.json`, calls the [Next-Action Resolver](scripts.md) to determine the next action deterministically, and spawns the appropriate agent. It also manages a runtime `triage_attempts` counter to prevent infinite triage loops.

**Output:** None — strictly read-only.

**Skills:** None (coordination only)

---

### Research

**Purpose:** Explore the codebase, documentation, and external sources to gather technical context.

The Research agent analyzes the existing project structure, technology stack, patterns, and constraints. If a `BRAINSTORMING.md` exists, it uses that as input context.

**Output:** `RESEARCH-FINDINGS.md` — codebase analysis, technology inventory, patterns discovered, constraints, and recommendations.

**Skills:** `research-codebase`

---

### Product Manager

**Purpose:** Create a Product Requirements Document from research findings.

Translates technical research and brainstorming output into structured requirements with numbered items (FR-1, NFR-1) for cross-referencing throughout the pipeline.

**Output:** `PRD.md` — problem statement, goals, user stories, functional requirements, non-functional requirements, risks, and success metrics.

**Skills:** `create-prd`

---

### UX Designer

**Purpose:** Create a UX Design document from the PRD.

Defines user flows, component layouts, interaction states, responsive behavior, accessibility requirements, and design tokens.

**Output:** `DESIGN.md` — user flows, layout specifications, component definitions, states, breakpoints, and accessibility requirements.

**Skills:** `create-design`

---

### Architect

**Purpose:** Define system architecture and synthesize all planning documents into a Master Plan.

The Architect reads Research, PRD, and Design to produce the technical architecture — system layers, module map, API contracts, database schemas, interfaces, and dependency graphs. It then synthesizes all planning documents into a Master Plan with phased execution.

**Output:** `ARCHITECTURE.md`, `MASTER-PLAN.md`

**Skills:** `create-architecture`, `create-master-plan`

---

### Tactical Planner

**Purpose:** Break phases into tasks, manage pipeline state, and execute triage decisions.

The Tactical Planner is the most operationally complex agent. It operates in multiple modes:

1. **Initialize** — create project state and `STATUS.md`
2. **Update state** — advance tasks, phases, and tiers based on reports and reviews
3. **Phase triage** — call the [Triage Executor](scripts.md) for phase-level review decisions
4. **Task triage** — call the Triage Executor for task-level review decisions
5. **Phase planning** — break a phase into tasks with dependencies and execution order
6. **Task handoffs** — create self-contained coding instructions for the Coder
7. **Phase reports** — aggregate task results and assess exit criteria

Before every `state.json` write, the Tactical Planner calls the [State Transition Validator](scripts.md) to ensure all invariants are satisfied.

**Output:** `state.json`, `STATUS.md`, phase plans, task handoffs, phase reports

**Skills:** `create-phase-plan`, `create-task-handoff`, `generate-task-report`, `generate-phase-report`, `triage-report`, `run-tests`

---

### Coder

**Purpose:** Execute coding tasks from self-contained Task Handoff documents.

Reads a single Task Handoff, implements the code changes, writes tests, runs the build, and produces a Task Report documenting what was done, what changed, and any deviations or discoveries.

**Output:** Source code, tests, `TASK-REPORT.md`

**Skills:** `generate-task-report`, `run-tests`

---

### Reviewer

**Purpose:** Review code changes and entire phases against planning documents.

The Reviewer operates at three levels:
- **Code review** — evaluates individual task output against PRD, architecture, and design
- **Phase review** — assesses cross-task integration, module consistency, and exit criteria
- **Final review** — comprehensive project-level review before completion

Reviews produce structured verdicts: `approved`, `changes_requested`, or `rejected`, with severity classifications that determine whether the pipeline auto-retries or halts.

**Output:** `CODE-REVIEW.md`, `PHASE-REVIEW.md`

**Skills:** `review-code`, `review-phase`

---

## Adding New Agents

The system includes a `create-agent` meta-skill for scaffolding new agents. New agents follow the same pattern:

1. Define the agent in `.github/agents/{name}.agent.md` with frontmatter declaring tools, subagents, and skills
2. Assign write permissions to specific document types
3. Add the agent to the Orchestrator's subagent list if it participates in the pipeline
4. Run the [validation tool](validation.md) to verify cross-references

See [Skills](skills.md) for the `create-agent` and `create-skill` meta-skills.
