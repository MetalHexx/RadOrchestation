'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { resolveNextAction } = require('../src/lib/resolver.js');
const {
  PIPELINE_TIERS, PLANNING_STEP_STATUSES, PHASE_STATUSES, TASK_STATUSES,
  REVIEW_VERDICTS, REVIEW_ACTIONS, PHASE_REVIEW_ACTIONS,
  SEVERITY_LEVELS, HUMAN_GATE_MODES, NEXT_ACTIONS
} = require('../src/lib/constants.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeBaseState() {
  return {
    project: {
      name: 'TEST-PROJECT',
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-01T12:00:00Z'
    },
    pipeline: {
      current_tier: 'execution',
      human_gate_mode: 'autonomous'
    },
    planning: {
      status: 'complete',
      steps: {
        research:      { status: 'complete', output: 'RESEARCH.md' },
        prd:           { status: 'complete', output: 'PRD.md' },
        design:        { status: 'complete', output: 'DESIGN.md' },
        architecture:  { status: 'complete', output: 'ARCHITECTURE.md' },
        master_plan:   { status: 'complete', output: 'MASTER-PLAN.md' }
      },
      human_approved: true
    },
    execution: {
      status: 'in_progress',
      current_phase: 0,
      total_phases: 1,
      phases: [{
        phase_number: 1,
        title: 'Phase One',
        status: 'in_progress',
        phase_doc: 'phases/PHASE-01.md',
        current_task: 0,
        total_tasks: 2,
        tasks: [
          {
            task_number: 1, title: 'Task One',
            status: 'not_started', handoff_doc: null,
            report_doc: null, retries: 0,
            last_error: null, severity: null,
            review_doc: null, review_verdict: null, review_action: null
          },
          {
            task_number: 2, title: 'Task Two',
            status: 'not_started', handoff_doc: null,
            report_doc: null, retries: 0,
            last_error: null, severity: null,
            review_doc: null, review_verdict: null, review_action: null
          }
        ],
        phase_report: null,
        human_approved: false,
        phase_review: null,
        phase_review_verdict: null,
        phase_review_action: null
      }]
    },
    final_review: {
      status: 'not_started',
      report_doc: null,
      human_approved: false
    },
    errors: { total_retries: 0, total_halts: 0, active_blockers: [] },
    limits: { max_phases: 10, max_tasks_per_phase: 8, max_retries_per_task: 2 }
  };
}

/**
 * Return a planning-tier state with all steps at the given statuses.
 * @param {Object} [overrides] - Per-step status overrides (e.g. { prd: 'not_started' })
 * @returns {Object}
 */
function makePlanningState(overrides) {
  const s = makeBaseState();
  s.pipeline.current_tier = PIPELINE_TIERS.PLANNING;
  s.planning.status = 'in_progress';
  s.planning.human_approved = false;
  const defaults = {
    research: 'not_started', prd: 'not_started', design: 'not_started',
    architecture: 'not_started', master_plan: 'not_started'
  };
  const merged = { ...defaults, ...overrides };
  for (const key of Object.keys(merged)) {
    s.planning.steps[key].status = merged[key];
    s.planning.steps[key].output = merged[key] === 'complete' ? key.toUpperCase() + '.md' : null;
  }
  return s;
}

/**
 * Return a state with all phase tasks pointing past end (phase lifecycle).
 * current_task = tasks.length so we enter resolvePhaseLifecycle.
 */
function makePhaseLifecycleState() {
  const s = makeBaseState();
  const phase = s.execution.phases[0];
  // Mark all tasks complete so phase lifecycle is entered
  for (const t of phase.tasks) {
    t.status = 'complete';
    t.handoff_doc = 'tasks/HANDOFF.md';
    t.report_doc = 'reports/REPORT.md';
    t.review_doc = 'tasks/REVIEW.md';
    t.review_verdict = 'approved';
    t.review_action = 'advanced';
  }
  phase.current_task = phase.tasks.length; // past all tasks
  return s;
}

// ─── Setup / Terminal Tier ──────────────────────────────────────────────────

describe('Setup / Terminal tier', () => {
  it('S1a: null state → INIT_PROJECT', () => {
    const result = resolveNextAction(null);
    assert.strictEqual(result.action, NEXT_ACTIONS.INIT_PROJECT);
    assert.strictEqual(result.context.tier, null);
  });

  it('S1b: undefined state → INIT_PROJECT', () => {
    const result = resolveNextAction(undefined);
    assert.strictEqual(result.action, NEXT_ACTIONS.INIT_PROJECT);
  });

  it('S2: halted tier → DISPLAY_HALTED', () => {
    const s = makeBaseState();
    s.pipeline.current_tier = PIPELINE_TIERS.HALTED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.DISPLAY_HALTED);
    assert.strictEqual(result.context.tier, PIPELINE_TIERS.HALTED);
  });

  it('S3: complete tier → DISPLAY_COMPLETE', () => {
    const s = makeBaseState();
    s.pipeline.current_tier = PIPELINE_TIERS.COMPLETE;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.DISPLAY_COMPLETE);
    assert.strictEqual(result.context.tier, PIPELINE_TIERS.COMPLETE);
  });

  it('S4: unknown tier → INIT_PROJECT (fallback)', () => {
    const s = makeBaseState();
    s.pipeline.current_tier = 'garbage';
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.INIT_PROJECT);
  });
});

// ─── Planning Tier ──────────────────────────────────────────────────────────

describe('Planning tier', () => {
  it('PL1: research not complete → SPAWN_RESEARCH', () => {
    const s = makePlanningState({ research: 'not_started' });
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.SPAWN_RESEARCH);
    assert.strictEqual(result.context.tier, PIPELINE_TIERS.PLANNING);
  });

  it('PL2: prd not complete → SPAWN_PRD', () => {
    const s = makePlanningState({ research: 'complete', prd: 'not_started' });
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.SPAWN_PRD);
  });

  it('PL3: design not complete → SPAWN_DESIGN', () => {
    const s = makePlanningState({
      research: 'complete', prd: 'complete', design: 'not_started'
    });
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.SPAWN_DESIGN);
  });

  it('PL4: architecture not complete → SPAWN_ARCHITECTURE', () => {
    const s = makePlanningState({
      research: 'complete', prd: 'complete', design: 'complete',
      architecture: 'not_started'
    });
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.SPAWN_ARCHITECTURE);
  });

  it('PL5: master_plan not complete → SPAWN_MASTER_PLAN', () => {
    const s = makePlanningState({
      research: 'complete', prd: 'complete', design: 'complete',
      architecture: 'complete', master_plan: 'not_started'
    });
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.SPAWN_MASTER_PLAN);
  });

  it('PL6: all steps complete, human_approved false → REQUEST_PLAN_APPROVAL', () => {
    const s = makePlanningState({
      research: 'complete', prd: 'complete', design: 'complete',
      architecture: 'complete', master_plan: 'complete'
    });
    // human_approved is false by default in makePlanningState
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.REQUEST_PLAN_APPROVAL);
  });

  it('PL7: all steps complete, human_approved true → TRANSITION_TO_EXECUTION', () => {
    const s = makePlanningState({
      research: 'complete', prd: 'complete', design: 'complete',
      architecture: 'complete', master_plan: 'complete'
    });
    s.planning.human_approved = true;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.TRANSITION_TO_EXECUTION);
  });
});

// ─── Execution — Task Lifecycle ─────────────────────────────────────────────

describe('Execution — task lifecycle', () => {
  it('T1: not_started, no handoff_doc → CREATE_TASK_HANDOFF', () => {
    const s = makeBaseState();
    // Task 0 is already not_started with handoff_doc=null
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.CREATE_TASK_HANDOFF);
    assert.strictEqual(result.context.tier, PIPELINE_TIERS.EXECUTION);
    assert.strictEqual(result.context.phase_index, 0);
    assert.strictEqual(result.context.task_index, 0);
    assert.strictEqual(result.context.phase_id, 'P01');
    assert.strictEqual(result.context.task_id, 'P01-T01');
  });

  it('T2: not_started, has handoff_doc → EXECUTE_TASK', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.EXECUTE_TASK);
    assert.strictEqual(result.context.task_id, 'P01-T01');
  });

  it('T3: in_progress → UPDATE_STATE_FROM_TASK', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.IN_PROGRESS;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.UPDATE_STATE_FROM_TASK);
  });

  it('T4: failed + critical severity → HALT_TASK_FAILED', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.FAILED;
    s.execution.phases[0].tasks[0].severity = SEVERITY_LEVELS.CRITICAL;
    s.execution.phases[0].tasks[0].retries = 0;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.HALT_TASK_FAILED);
  });

  it('T5: failed + retries exhausted → HALT_TASK_FAILED', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.FAILED;
    s.execution.phases[0].tasks[0].severity = SEVERITY_LEVELS.MINOR;
    s.execution.phases[0].tasks[0].retries = 2; // equals max_retries_per_task
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.HALT_TASK_FAILED);
  });

  it('T6: failed + minor + retries available → CREATE_CORRECTIVE_HANDOFF', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.FAILED;
    s.execution.phases[0].tasks[0].severity = SEVERITY_LEVELS.MINOR;
    s.execution.phases[0].tasks[0].retries = 1;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.CREATE_CORRECTIVE_HANDOFF);
  });

  it('T7: complete + approved + autonomous gate → ADVANCE_TASK', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.COMPLETE;
    s.execution.phases[0].tasks[0].review_verdict = REVIEW_VERDICTS.APPROVED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.ADVANCE_TASK);
  });

  it('T8: complete + approved + task gate → GATE_TASK', () => {
    const s = makeBaseState();
    s.pipeline.human_gate_mode = HUMAN_GATE_MODES.TASK;
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.COMPLETE;
    s.execution.phases[0].tasks[0].review_verdict = REVIEW_VERDICTS.APPROVED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.GATE_TASK);
  });

  it('T9: complete + changes_requested → RETRY_FROM_REVIEW', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.COMPLETE;
    s.execution.phases[0].tasks[0].review_doc = 'tasks/REVIEW.md';
    s.execution.phases[0].tasks[0].review_verdict = REVIEW_VERDICTS.CHANGES_REQUESTED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.RETRY_FROM_REVIEW);
  });

  it('T10: complete + rejected → HALT_FROM_REVIEW', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.COMPLETE;
    s.execution.phases[0].tasks[0].review_doc = 'tasks/REVIEW.md';
    s.execution.phases[0].tasks[0].review_verdict = REVIEW_VERDICTS.REJECTED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.HALT_FROM_REVIEW);
  });

  it('T11: complete + review_doc exists + no verdict → TRIAGE_TASK', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.COMPLETE;
    s.execution.phases[0].tasks[0].review_doc = 'tasks/REVIEW.md';
    s.execution.phases[0].tasks[0].review_verdict = null;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.TRIAGE_TASK);
  });

  it('T12: complete + no review_doc + no verdict → SPAWN_CODE_REVIEWER', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.COMPLETE;
    s.execution.phases[0].tasks[0].review_doc = null;
    s.execution.phases[0].tasks[0].review_verdict = null;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.SPAWN_CODE_REVIEWER);
  });

  it('T13: halted → DISPLAY_HALTED', () => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.HALTED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.DISPLAY_HALTED);
    assert.strictEqual(result.context.task_id, 'P01-T01');
  });
});

// ─── Execution — Phase Lifecycle ────────────────────────────────────────────

describe('Execution — phase lifecycle', () => {
  it('E1: current_phase >= phases.length → TRANSITION_TO_REVIEW', () => {
    const s = makeBaseState();
    s.execution.current_phase = 1; // only 1 phase (index 0), so 1 >= length
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.TRANSITION_TO_REVIEW);
    assert.strictEqual(result.context.tier, PIPELINE_TIERS.EXECUTION);
  });

  it('E2: phase.status === not_started → CREATE_PHASE_PLAN', () => {
    const s = makeBaseState();
    s.execution.phases[0].status = PHASE_STATUSES.NOT_STARTED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.CREATE_PHASE_PLAN);
    assert.strictEqual(result.context.phase_id, 'P01');
  });

  it('P1: all tasks done, no phase_report → GENERATE_PHASE_REPORT', () => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = null;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.GENERATE_PHASE_REPORT);
    assert.strictEqual(result.context.phase_id, 'P01');
  });

  it('P2: phase_report exists, no phase_review → SPAWN_PHASE_REVIEWER', () => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-REPORT-P01.md';
    s.execution.phases[0].phase_review = null;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.SPAWN_PHASE_REVIEWER);
  });

  it('P3: phase_review exists, no verdict → TRIAGE_PHASE', () => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-REPORT-P01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-P01.md';
    s.execution.phases[0].phase_review_verdict = null;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.TRIAGE_PHASE);
  });

  it('P4: phase_review_action halted → DISPLAY_HALTED', () => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-REPORT-P01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-P01.md';
    s.execution.phases[0].phase_review_verdict = REVIEW_VERDICTS.REJECTED;
    s.execution.phases[0].phase_review_action = PHASE_REVIEW_ACTIONS.HALTED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.DISPLAY_HALTED);
  });

  it('P5: phase_review_action corrective_tasks_issued → CREATE_PHASE_PLAN', () => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-REPORT-P01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-P01.md';
    s.execution.phases[0].phase_review_verdict = REVIEW_VERDICTS.CHANGES_REQUESTED;
    s.execution.phases[0].phase_review_action = PHASE_REVIEW_ACTIONS.CORRECTIVE_TASKS_ISSUED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.CREATE_PHASE_PLAN);
  });

  it('P6: approved + phase gate → GATE_PHASE', () => {
    const s = makePhaseLifecycleState();
    s.pipeline.human_gate_mode = HUMAN_GATE_MODES.PHASE;
    s.execution.phases[0].phase_report = 'reports/PHASE-REPORT-P01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-P01.md';
    s.execution.phases[0].phase_review_verdict = REVIEW_VERDICTS.APPROVED;
    s.execution.phases[0].phase_review_action = PHASE_REVIEW_ACTIONS.ADVANCED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.GATE_PHASE);
  });

  it('P7: approved + autonomous gate → ADVANCE_PHASE', () => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-REPORT-P01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-P01.md';
    s.execution.phases[0].phase_review_verdict = REVIEW_VERDICTS.APPROVED;
    s.execution.phases[0].phase_review_action = PHASE_REVIEW_ACTIONS.ADVANCED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.ADVANCE_PHASE);
  });
});

// ─── Review Tier ────────────────────────────────────────────────────────────

describe('Review tier', () => {
  it('R1: final_review not complete → SPAWN_FINAL_REVIEWER', () => {
    const s = makeBaseState();
    s.pipeline.current_tier = PIPELINE_TIERS.REVIEW;
    s.final_review.status = 'not_started';
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.SPAWN_FINAL_REVIEWER);
    assert.strictEqual(result.context.tier, PIPELINE_TIERS.REVIEW);
  });

  it('R2: final_review complete, not human_approved → REQUEST_FINAL_APPROVAL', () => {
    const s = makeBaseState();
    s.pipeline.current_tier = PIPELINE_TIERS.REVIEW;
    s.final_review.status = 'complete';
    s.final_review.human_approved = false;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.REQUEST_FINAL_APPROVAL);
  });

  it('R3: final_review complete + human_approved → TRANSITION_TO_COMPLETE', () => {
    const s = makeBaseState();
    s.pipeline.current_tier = PIPELINE_TIERS.REVIEW;
    s.final_review.status = 'complete';
    s.final_review.human_approved = true;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.TRANSITION_TO_COMPLETE);
  });
});

// ─── Config Override ────────────────────────────────────────────────────────

describe('Config override — human gate mode', () => {
  it('config.human_gates.execution_mode overrides state gate mode', () => {
    // State says autonomous, config says task → task should win
    const s = makeBaseState();
    s.pipeline.human_gate_mode = HUMAN_GATE_MODES.AUTONOMOUS;
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.COMPLETE;
    s.execution.phases[0].tasks[0].review_verdict = REVIEW_VERDICTS.APPROVED;
    const config = { human_gates: { execution_mode: HUMAN_GATE_MODES.TASK } };
    const result = resolveNextAction(s, config);
    assert.strictEqual(result.action, NEXT_ACTIONS.GATE_TASK);
  });

  it('falls back to state.pipeline.human_gate_mode when config omitted', () => {
    const s = makeBaseState();
    s.pipeline.human_gate_mode = HUMAN_GATE_MODES.TASK;
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.COMPLETE;
    s.execution.phases[0].tasks[0].review_verdict = REVIEW_VERDICTS.APPROVED;
    const result = resolveNextAction(s);
    assert.strictEqual(result.action, NEXT_ACTIONS.GATE_TASK);
  });

  it('falls back to state gate mode when config lacks human_gates field', () => {
    const s = makeBaseState();
    s.pipeline.human_gate_mode = HUMAN_GATE_MODES.TASK;
    s.execution.phases[0].tasks[0].status = TASK_STATUSES.COMPLETE;
    s.execution.phases[0].tasks[0].review_verdict = REVIEW_VERDICTS.APPROVED;
    const config = { projects: { base_path: '.github/projects/' } };
    const result = resolveNextAction(s, config);
    assert.strictEqual(result.action, NEXT_ACTIONS.GATE_TASK);
  });

  it('config phase gate applies to phase lifecycle', () => {
    const s = makePhaseLifecycleState();
    s.pipeline.human_gate_mode = HUMAN_GATE_MODES.AUTONOMOUS;
    s.execution.phases[0].phase_report = 'reports/PHASE-REPORT-P01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-P01.md';
    s.execution.phases[0].phase_review_verdict = REVIEW_VERDICTS.APPROVED;
    s.execution.phases[0].phase_review_action = PHASE_REVIEW_ACTIONS.ADVANCED;
    const config = { human_gates: { execution_mode: HUMAN_GATE_MODES.PHASE } };
    const result = resolveNextAction(s, config);
    assert.strictEqual(result.action, NEXT_ACTIONS.GATE_PHASE);
  });
});

// ─── Result Shape ───────────────────────────────────────────────────────────

describe('NextActionResult shape', () => {
  it('result has action and context with all required fields', () => {
    const result = resolveNextAction(null);
    assert.ok(typeof result.action === 'string');
    assert.ok(typeof result.context === 'object');
    assert.ok('tier' in result.context);
    assert.ok('phase_index' in result.context);
    assert.ok('task_index' in result.context);
    assert.ok('phase_id' in result.context);
    assert.ok('task_id' in result.context);
    assert.ok('details' in result.context);
  });

  it('execution task result includes phase and task IDs', () => {
    const s = makeBaseState();
    const result = resolveNextAction(s);
    assert.strictEqual(result.context.phase_id, 'P01');
    assert.strictEqual(result.context.task_id, 'P01-T01');
    assert.strictEqual(result.context.phase_index, 0);
    assert.strictEqual(result.context.task_index, 0);
  });

  it('details is a non-empty string', () => {
    const result = resolveNextAction(null);
    assert.ok(typeof result.context.details === 'string');
    assert.ok(result.context.details.length > 0);
  });
});

// ─── Orchestrator-Managed Actions — Negative Tests ──────────────────────────

describe('Orchestrator-managed actions — negative tests', () => {
  // Build a comprehensive set of representative states covering all resolution branches
  const representativeStates = [];

  // 1. null state → INIT_PROJECT
  representativeStates.push(null);

  // 2. Halted tier
  (() => {
    const s = makeBaseState();
    s.pipeline.current_tier = 'halted';
    representativeStates.push(s);
  })();

  // 3. Complete tier
  (() => {
    const s = makeBaseState();
    s.pipeline.current_tier = 'complete';
    representativeStates.push(s);
  })();

  // 4. Planning tier with incomplete step
  representativeStates.push(makePlanningState({ research: 'not_started' }));

  // 5. Planning tier with all steps complete, not approved
  (() => {
    const s = makePlanningState({
      research: 'complete', prd: 'complete', design: 'complete',
      architecture: 'complete', master_plan: 'complete'
    });
    s.planning.human_approved = false;
    representativeStates.push(s);
  })();

  // 6. Execution tier with not_started task (no handoff)
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'not_started';
    s.execution.phases[0].tasks[0].handoff_doc = null;
    representativeStates.push(s);
  })();

  // 7. Execution tier with not_started task (has handoff)
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'not_started';
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    representativeStates.push(s);
  })();

  // 8. Execution tier with in_progress task
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'in_progress';
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    representativeStates.push(s);
  })();

  // 9. Execution tier with failed task (critical)
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'failed';
    s.execution.phases[0].tasks[0].severity = 'critical';
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    s.execution.phases[0].tasks[0].retries = 3;
    representativeStates.push(s);
  })();

  // 10. Execution tier with failed task (minor, retries available)
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'failed';
    s.execution.phases[0].tasks[0].severity = 'minor';
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    s.execution.phases[0].tasks[0].retries = 0;
    representativeStates.push(s);
  })();

  // 11. Execution tier with complete task (approved)
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'complete';
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    s.execution.phases[0].tasks[0].report_doc = 'reports/REPORT.md';
    s.execution.phases[0].tasks[0].review_doc = 'tasks/REVIEW.md';
    s.execution.phases[0].tasks[0].review_verdict = 'approved';
    s.execution.phases[0].tasks[0].review_action = 'advanced';
    representativeStates.push(s);
  })();

  // 12. Execution tier with complete task (changes_requested)
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'complete';
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    s.execution.phases[0].tasks[0].report_doc = 'reports/REPORT.md';
    s.execution.phases[0].tasks[0].review_doc = 'tasks/REVIEW.md';
    s.execution.phases[0].tasks[0].review_verdict = 'changes_requested';
    s.execution.phases[0].tasks[0].review_action = 'retry_task';
    representativeStates.push(s);
  })();

  // 13. Execution tier with complete task (rejected)
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'complete';
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    s.execution.phases[0].tasks[0].report_doc = 'reports/REPORT.md';
    s.execution.phases[0].tasks[0].review_doc = 'tasks/REVIEW.md';
    s.execution.phases[0].tasks[0].review_verdict = 'rejected';
    s.execution.phases[0].tasks[0].review_action = 'halt_task';
    representativeStates.push(s);
  })();

  // 14. Execution tier with complete task (review_doc set, no verdict)
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'complete';
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    s.execution.phases[0].tasks[0].report_doc = 'reports/REPORT.md';
    s.execution.phases[0].tasks[0].review_doc = 'tasks/REVIEW.md';
    s.execution.phases[0].tasks[0].review_verdict = null;
    s.execution.phases[0].tasks[0].review_action = null;
    representativeStates.push(s);
  })();

  // 15. Execution tier with complete task (no review_doc, no verdict)
  (() => {
    const s = makeBaseState();
    s.execution.phases[0].tasks[0].status = 'complete';
    s.execution.phases[0].tasks[0].handoff_doc = 'tasks/HANDOFF.md';
    s.execution.phases[0].tasks[0].report_doc = 'reports/REPORT.md';
    s.execution.phases[0].tasks[0].review_doc = null;
    s.execution.phases[0].tasks[0].review_verdict = null;
    s.execution.phases[0].tasks[0].review_action = null;
    representativeStates.push(s);
  })();

  // 16. Phase lifecycle: no phase_report
  (() => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = null;
    representativeStates.push(s);
  })();

  // 17. Phase lifecycle: phase_report, no phase_review
  (() => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-01.md';
    s.execution.phases[0].phase_review = null;
    representativeStates.push(s);
  })();

  // 18. Phase lifecycle: phase_review, no verdict
  (() => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-01.md';
    s.execution.phases[0].phase_review_verdict = null;
    s.execution.phases[0].phase_review_action = null;
    representativeStates.push(s);
  })();

  // 19. Phase lifecycle: approved + advanced
  (() => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-01.md';
    s.execution.phases[0].phase_review_verdict = 'approved';
    s.execution.phases[0].phase_review_action = 'advanced';
    s.execution.phases[0].human_approved = false;
    representativeStates.push(s);
  })();

  // 20. Phase lifecycle: halted
  (() => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-01.md';
    s.execution.phases[0].phase_review_verdict = 'rejected';
    s.execution.phases[0].phase_review_action = 'halt_phase';
    representativeStates.push(s);
  })();

  // 21. Phase lifecycle: corrective_tasks_issued
  (() => {
    const s = makePhaseLifecycleState();
    s.execution.phases[0].phase_report = 'reports/PHASE-01.md';
    s.execution.phases[0].phase_review = 'reports/PHASE-REVIEW-01.md';
    s.execution.phases[0].phase_review_verdict = 'changes_requested';
    s.execution.phases[0].phase_review_action = 'corrective_tasks_issued';
    representativeStates.push(s);
  })();

  // 22. Review tier: not complete
  (() => {
    const s = makeBaseState();
    s.pipeline.current_tier = 'review';
    s.final_review.status = 'not_started';
    representativeStates.push(s);
  })();

  // 23. Review tier: complete, not approved
  (() => {
    const s = makeBaseState();
    s.pipeline.current_tier = 'review';
    s.final_review.status = 'complete';
    s.final_review.human_approved = false;
    representativeStates.push(s);
  })();

  // 24. Review tier: complete + approved
  (() => {
    const s = makeBaseState();
    s.pipeline.current_tier = 'review';
    s.final_review.status = 'complete';
    s.final_review.human_approved = true;
    representativeStates.push(s);
  })();

  it('never emits UPDATE_STATE_FROM_REVIEW', () => {
    for (const state of representativeStates) {
      const result = resolveNextAction(state);
      assert.notStrictEqual(result.action, NEXT_ACTIONS.UPDATE_STATE_FROM_REVIEW,
        'resolver must not emit UPDATE_STATE_FROM_REVIEW, got it for state: ' +
        (state === null ? 'null' : state.pipeline.current_tier));
    }
  });

  it('never emits HALT_TRIAGE_INVARIANT', () => {
    for (const state of representativeStates) {
      const result = resolveNextAction(state);
      assert.notStrictEqual(result.action, NEXT_ACTIONS.HALT_TRIAGE_INVARIANT,
        'resolver must not emit HALT_TRIAGE_INVARIANT, got it for state: ' +
        (state === null ? 'null' : state.pipeline.current_tier));
    }
  });

  it('never emits UPDATE_STATE_FROM_PHASE_REVIEW', () => {
    for (const state of representativeStates) {
      const result = resolveNextAction(state);
      assert.notStrictEqual(result.action, NEXT_ACTIONS.UPDATE_STATE_FROM_PHASE_REVIEW,
        'resolver must not emit UPDATE_STATE_FROM_PHASE_REVIEW, got it for state: ' +
        (state === null ? 'null' : state.pipeline.current_tier));
    }
  });

  it('never emits HALT_PHASE_TRIAGE_INVARIANT', () => {
    for (const state of representativeStates) {
      const result = resolveNextAction(state);
      assert.notStrictEqual(result.action, NEXT_ACTIONS.HALT_PHASE_TRIAGE_INVARIANT,
        'resolver must not emit HALT_PHASE_TRIAGE_INVARIANT, got it for state: ' +
        (state === null ? 'null' : state.pipeline.current_tier));
    }
  });
});
