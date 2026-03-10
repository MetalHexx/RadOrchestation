'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateTransition } = require('../src/lib/state-validator.js');

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
      phases: [
        {
          phase_number: 1,
          title: 'Phase One',
          status: 'in_progress',
          phase_doc: 'phases/PHASE-01.md',
          current_task: 0,
          total_tasks: 2,
          tasks: [
            {
              task_number: 1,
              title: 'Task One',
              status: 'complete',
              handoff_doc: 'tasks/TASK-P01-T01.md',
              report_doc: 'reports/REPORT-P01-T01.md',
              retries: 0,
              last_error: null,
              severity: null,
              review_doc: 'tasks/REVIEW-P01-T01.md',
              review_verdict: 'approved',
              review_action: 'advanced'
            },
            {
              task_number: 2,
              title: 'Task Two',
              status: 'not_started',
              handoff_doc: null,
              report_doc: null,
              retries: 0,
              last_error: null,
              severity: null,
              review_doc: null,
              review_verdict: null,
              review_action: null
            }
          ],
          phase_report: null,
          human_approved: false,
          phase_review: null,
          phase_review_verdict: null,
          phase_review_action: null
        }
      ]
    },
    final_review: {
      status: 'not_started',
      report_doc: null,
      human_approved: false
    },
    errors: {
      total_retries: 0,
      total_halts: 0,
      active_blockers: []
    },
    limits: {
      max_phases: 10,
      max_tasks_per_phase: 8,
      max_retries_per_task: 2
    }
  };
}

function makeBaseStatePair() {
  const current = makeBaseState();
  const proposed = makeBaseState();
  proposed.project.updated = '2026-01-01T13:00:00Z'; // newer than current
  return { current, proposed };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('state-validator', () => {

  // ── V1 — current_phase index bounds ─────────────────────────────────────

  describe('V1 — current_phase index bounds', () => {
    it('passes when current_phase is a valid index', () => {
      const { current, proposed } = makeBaseStatePair();
      // proposed already has current_phase=0 with 1 phase
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when current_phase is out of bounds', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.execution.current_phase = 5; // only 1 phase exists
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v1Error = result.errors.find(e => e.invariant === 'V1');
      assert.ok(v1Error, 'Expected V1 error');
      assert.strictEqual(v1Error.severity, 'critical');
    });

    it('passes when phases is empty and current_phase is 0', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.execution.phases = [];
      proposed.execution.current_phase = 0;
      const result = validateTransition(current, proposed);
      // Only V1 should pass; other invariants like V12 may not fire since no overlapping tasks
      const v1Error = (result.errors || []).find(e => e.invariant === 'V1');
      assert.strictEqual(v1Error, undefined, 'V1 should not fire when phases empty and current_phase=0');
    });

    it('fails when phases is empty and current_phase is non-zero', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.execution.phases = [];
      proposed.execution.current_phase = 1;
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      const v1Error = result.errors.find(e => e.invariant === 'V1');
      assert.ok(v1Error, 'Expected V1 error');
      assert.strictEqual(v1Error.severity, 'critical');
    });
  });

  // ── V2 — current_task index bounds ──────────────────────────────────────

  describe('V2 — current_task index bounds', () => {
    it('passes when current_task is a valid index per phase', () => {
      const { current, proposed } = makeBaseStatePair();
      // Base state already has current_task=0 with 2 tasks
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when current_task is out of bounds', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.execution.phases[0].current_task = 10; // only 2 tasks
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v2Error = result.errors.find(e => e.invariant === 'V2');
      assert.ok(v2Error, 'Expected V2 error');
      assert.strictEqual(v2Error.severity, 'critical');
    });
  });

  // ── V3 — retry limit ───────────────────────────────────────────────────

  describe('V3 — retry limit', () => {
    it('passes when retries are within limit', () => {
      const { current, proposed } = makeBaseStatePair();
      // retries=0 by default, max=2
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when retries exceed limit', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.execution.phases[0].tasks[0].retries = 5; // max is 2
      // Also bump current to avoid V11 monotonicity violation
      current.execution.phases[0].tasks[0].retries = 5;
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v3Error = result.errors.find(e => e.invariant === 'V3');
      assert.ok(v3Error, 'Expected V3 error');
      assert.strictEqual(v3Error.severity, 'critical');
    });
  });

  // ── V4 — max phases ────────────────────────────────────────────────────

  describe('V4 — max phases', () => {
    it('passes when phases count is within limit', () => {
      const { current, proposed } = makeBaseStatePair();
      // 1 phase, max=10
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when phases exceed limit', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.limits.max_phases = 1;
      // Add a second phase to exceed limit
      const secondPhase = JSON.parse(JSON.stringify(proposed.execution.phases[0]));
      secondPhase.phase_number = 2;
      secondPhase.title = 'Phase Two';
      secondPhase.tasks[0].status = 'not_started';
      secondPhase.tasks[0].review_doc = null;
      secondPhase.tasks[0].review_verdict = null;
      secondPhase.tasks[0].review_action = null;
      proposed.execution.phases.push(secondPhase);
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v4Error = result.errors.find(e => e.invariant === 'V4');
      assert.ok(v4Error, 'Expected V4 error');
      assert.strictEqual(v4Error.severity, 'critical');
    });
  });

  // ── V5 — max tasks per phase ───────────────────────────────────────────

  describe('V5 — max tasks per phase', () => {
    it('passes when tasks per phase are within limit', () => {
      const { current, proposed } = makeBaseStatePair();
      // 2 tasks, max=8
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when tasks exceed limit per phase', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.limits.max_tasks_per_phase = 1; // only allow 1 task but we have 2
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v5Error = result.errors.find(e => e.invariant === 'V5');
      assert.ok(v5Error, 'Expected V5 error');
      assert.strictEqual(v5Error.severity, 'critical');
    });
  });

  // ── V6 — single in_progress task ───────────────────────────────────────

  describe('V6 — single in_progress task', () => {
    it('passes when zero or one task is in_progress', () => {
      const { current, proposed } = makeBaseStatePair();
      // No tasks are in_progress in base state (one complete, one not_started)
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when two tasks are in_progress', () => {
      const { current, proposed } = makeBaseStatePair();
      // Set both tasks to in_progress
      proposed.execution.phases[0].tasks[0].status = 'in_progress';
      proposed.execution.phases[0].tasks[1].status = 'in_progress';
      // Match current to avoid V12 issues
      current.execution.phases[0].tasks[0].status = 'in_progress';
      current.execution.phases[0].tasks[1].status = 'in_progress';
      // Fix task 0 to not have review_doc issue (task in_progress shouldn't have review)
      // Actually V8 checks review_doc != null && review_verdict == null
      // Task 0 has review_doc and review_verdict already set, so V8 is fine
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v6Error = result.errors.find(e => e.invariant === 'V6');
      assert.ok(v6Error, 'Expected V6 error');
      assert.strictEqual(v6Error.severity, 'critical');
    });
  });

  // ── V7 — human approval before execution ───────────────────────────────

  describe('V7 — human approval before execution', () => {
    it('passes when execution tier has human_approved=true', () => {
      const { current, proposed } = makeBaseStatePair();
      // Base state: tier=execution, human_approved=true
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when execution tier has human_approved=false', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.planning.human_approved = false;
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v7Error = result.errors.find(e => e.invariant === 'V7');
      assert.ok(v7Error, 'Expected V7 error');
      assert.strictEqual(v7Error.severity, 'critical');
    });

    it('passes when tier is planning and human_approved=false', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.pipeline.current_tier = 'planning';
      proposed.planning.human_approved = false;
      current.pipeline.current_tier = 'planning';
      current.planning.human_approved = false;
      const result = validateTransition(current, proposed);
      // V7 only fires when tier is execution
      const v7Error = (result.errors || []).find(e => e.invariant === 'V7');
      assert.strictEqual(v7Error, undefined, 'V7 should not fire when tier is planning');
    });
  });

  // ── V8 — task triage consistency ───────────────────────────────────────

  describe('V8 — task triage consistency', () => {
    it('passes when review_doc and verdict are both set or both null', () => {
      const { current, proposed } = makeBaseStatePair();
      // Task 1: both set. Task 2: both null. Already valid.
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when review_doc is set but review_verdict is null', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.execution.phases[0].tasks[1].review_doc = 'tasks/REVIEW-P01-T02.md';
      proposed.execution.phases[0].tasks[1].review_verdict = null;
      // Also set current to match to avoid V14 (doc changed from null with no verdict change is fine for V14,
      // but we need to set current.review_doc to null so doc changed)
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v8Error = result.errors.find(e => e.invariant === 'V8');
      assert.ok(v8Error, 'Expected V8 error');
      assert.strictEqual(v8Error.severity, 'critical');
    });
  });

  // ── V9 — phase triage consistency ──────────────────────────────────────

  describe('V9 — phase triage consistency', () => {
    it('passes when phase_review and phase_review_verdict are both set or both null', () => {
      const { current, proposed } = makeBaseStatePair();
      // Both null in base state
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when phase_review is set but phase_review_verdict is null', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.execution.phases[0].phase_review = 'PHASE-REVIEW-01.md';
      proposed.execution.phases[0].phase_review_verdict = null;
      // Set current to match so we don't trigger other issues
      current.execution.phases[0].phase_review = 'PHASE-REVIEW-01.md';
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v9Error = result.errors.find(e => e.invariant === 'V9');
      assert.ok(v9Error, 'Expected V9 error');
      assert.strictEqual(v9Error.severity, 'critical');
    });
  });

  // ── V10 — null treatment / structural validation ───────────────────────

  describe('V10 — null treatment / structural validation', () => {
    it('passes when all required keys are present', () => {
      const { current, proposed } = makeBaseStatePair();
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails with structured error when proposed.limits is null', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.limits = null;
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v10Error = result.errors.find(e => e.invariant === 'V10');
      assert.ok(v10Error, 'Expected V10 error');
      assert.ok(v10Error.message.includes('limits'), 'Message should mention limits');
      assert.strictEqual(v10Error.severity, 'critical');
    });

    it('fails with structured error when proposed.execution is deleted', () => {
      const { current, proposed } = makeBaseStatePair();
      delete proposed.execution;
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v10Error = result.errors.find(e => e.invariant === 'V10');
      assert.ok(v10Error, 'Expected V10 error');
      assert.ok(v10Error.message.includes('execution'), 'Message should mention execution');
      assert.strictEqual(v10Error.severity, 'critical');
    });

    it('short-circuits — V1–V9 errors do not appear when V10 fails', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.execution = null;
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      const invariants = result.errors.map(e => e.invariant);
      assert.ok(invariants.includes('V10'), 'Expected V10 error');
      assert.ok(!invariants.includes('V1'), 'V1 should not appear when V10 short-circuits');
      assert.ok(!invariants.includes('V3'), 'V3 should not appear when V10 short-circuits');
    });
  });

  // ── V11 — retry monotonicity ───────────────────────────────────────────

  describe('V11 — retry monotonicity', () => {
    it('passes when retries stayed same or increased', () => {
      const { current, proposed } = makeBaseStatePair();
      // Both have retries=0
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when retries decreased', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[0].retries = 2;
      proposed.execution.phases[0].tasks[0].retries = 1; // decreased
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v11Error = result.errors.find(e => e.invariant === 'V11');
      assert.ok(v11Error, 'Expected V11 error');
      assert.strictEqual(v11Error.severity, 'critical');
    });
  });

  // ── V12 — task status transitions ──────────────────────────────────────

  describe('V12 — task status transitions', () => {
    // Valid transitions
    it('passes for not_started → in_progress', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[1].status = 'not_started';
      proposed.execution.phases[0].tasks[1].status = 'in_progress';
      const result = validateTransition(current, proposed);
      // V6 may fire if another task is also in_progress; task[0] is 'complete' so fine
      const v12Error = (result.errors || []).find(e => e.invariant === 'V12');
      assert.strictEqual(v12Error, undefined, 'V12 should not fire for not_started → in_progress');
    });

    it('passes for in_progress → complete', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[1].status = 'in_progress';
      proposed.execution.phases[0].tasks[1].status = 'complete';
      const result = validateTransition(current, proposed);
      const v12Error = (result.errors || []).find(e => e.invariant === 'V12');
      assert.strictEqual(v12Error, undefined, 'V12 should not fire for in_progress → complete');
    });

    it('passes for in_progress → failed', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[1].status = 'in_progress';
      proposed.execution.phases[0].tasks[1].status = 'failed';
      const result = validateTransition(current, proposed);
      const v12Error = (result.errors || []).find(e => e.invariant === 'V12');
      assert.strictEqual(v12Error, undefined, 'V12 should not fire for in_progress → failed');
    });

    it('passes for failed → in_progress (retry)', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[1].status = 'failed';
      proposed.execution.phases[0].tasks[1].status = 'in_progress';
      const result = validateTransition(current, proposed);
      const v12Error = (result.errors || []).find(e => e.invariant === 'V12');
      assert.strictEqual(v12Error, undefined, 'V12 should not fire for failed → in_progress');
    });

    it('passes for in_progress → halted', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[1].status = 'in_progress';
      proposed.execution.phases[0].tasks[1].status = 'halted';
      const result = validateTransition(current, proposed);
      const v12Error = (result.errors || []).find(e => e.invariant === 'V12');
      assert.strictEqual(v12Error, undefined, 'V12 should not fire for in_progress → halted');
    });

    // Invalid transitions
    it('fails for not_started → complete (skip)', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[1].status = 'not_started';
      proposed.execution.phases[0].tasks[1].status = 'complete';
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v12Error = result.errors.find(e => e.invariant === 'V12');
      assert.ok(v12Error, 'Expected V12 error for not_started → complete');
      assert.strictEqual(v12Error.severity, 'critical');
    });

    it('fails for complete → in_progress (terminal)', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[0].status = 'complete';
      proposed.execution.phases[0].tasks[0].status = 'in_progress';
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v12Error = result.errors.find(e => e.invariant === 'V12');
      assert.ok(v12Error, 'Expected V12 error for complete → in_progress');
      assert.strictEqual(v12Error.severity, 'critical');
    });

    it('fails for not_started → failed (skip)', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[1].status = 'not_started';
      proposed.execution.phases[0].tasks[1].status = 'failed';
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v12Error = result.errors.find(e => e.invariant === 'V12');
      assert.ok(v12Error, 'Expected V12 error for not_started → failed');
      assert.strictEqual(v12Error.severity, 'critical');
    });
  });

  // ── V13 — timestamp monotonicity ───────────────────────────────────────

  describe('V13 — timestamp monotonicity', () => {
    it('passes when proposed.updated is newer than current.updated', () => {
      const { current, proposed } = makeBaseStatePair();
      // proposed.updated is already newer via makeBaseStatePair
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('fails when proposed.updated is same as current.updated', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.project.updated = current.project.updated; // same timestamp
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v13Error = result.errors.find(e => e.invariant === 'V13');
      assert.ok(v13Error, 'Expected V13 error');
      assert.strictEqual(v13Error.severity, 'critical');
    });

    it('fails when proposed.updated is older than current.updated', () => {
      const { current, proposed } = makeBaseStatePair();
      proposed.project.updated = '2025-01-01T00:00:00Z'; // older
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v13Error = result.errors.find(e => e.invariant === 'V13');
      assert.ok(v13Error, 'Expected V13 error');
      assert.strictEqual(v13Error.severity, 'critical');
    });
  });

  // ── V14 — write ordering ──────────────────────────────────────────────

  describe('V14 — write ordering', () => {
    it('passes when review_doc changes without verdict/action change', () => {
      const { current, proposed } = makeBaseStatePair();
      // Task 2: review_doc null→set, but verdict stays null (doc-only change)
      current.execution.phases[0].tasks[1].review_doc = null;
      current.execution.phases[0].tasks[1].review_verdict = null;
      current.execution.phases[0].tasks[1].review_action = null;
      proposed.execution.phases[0].tasks[1].review_doc = 'tasks/REVIEW-P01-T02.md';
      proposed.execution.phases[0].tasks[1].review_verdict = null;
      proposed.execution.phases[0].tasks[1].review_action = null;
      const result = validateTransition(current, proposed);
      // V8 will fire (review_doc set but verdict null), but V14 should NOT fire
      const v14Error = (result.errors || []).find(e => e.invariant === 'V14');
      assert.strictEqual(v14Error, undefined, 'V14 should not fire for doc-only change');
    });

    it('fails when review_doc AND review_verdict change in the same write', () => {
      const { current, proposed } = makeBaseStatePair();
      // Task 2: review_doc null→set AND review_verdict null→approved in same write
      current.execution.phases[0].tasks[1].review_doc = null;
      current.execution.phases[0].tasks[1].review_verdict = null;
      current.execution.phases[0].tasks[1].review_action = null;
      proposed.execution.phases[0].tasks[1].review_doc = 'tasks/REVIEW-P01-T02.md';
      proposed.execution.phases[0].tasks[1].review_verdict = 'approved';
      proposed.execution.phases[0].tasks[1].review_action = null;
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v14Error = result.errors.find(e => e.invariant === 'V14');
      assert.ok(v14Error, 'Expected V14 error');
      assert.strictEqual(v14Error.severity, 'critical');
    });

    it('fails when review_doc AND review_action change in the same write', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution.phases[0].tasks[1].review_doc = null;
      current.execution.phases[0].tasks[1].review_verdict = null;
      current.execution.phases[0].tasks[1].review_action = null;
      proposed.execution.phases[0].tasks[1].review_doc = 'tasks/REVIEW-P01-T02.md';
      proposed.execution.phases[0].tasks[1].review_verdict = null;
      proposed.execution.phases[0].tasks[1].review_action = 'advanced';
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      const v14Error = result.errors.find(e => e.invariant === 'V14');
      assert.ok(v14Error, 'Expected V14 error');
      assert.strictEqual(v14Error.severity, 'critical');
    });
  });

  // ── V15 — cross-task immutability ─────────────────────────────────────

  describe('V15 — cross-task immutability', () => {
    it('passes when only one task verdict/action changed', () => {
      const { current, proposed } = makeBaseStatePair();
      // Change only task 2's verdict from null to approved
      current.execution.phases[0].tasks[1].review_verdict = null;
      current.execution.phases[0].tasks[1].review_action = null;
      proposed.execution.phases[0].tasks[1].review_verdict = 'approved';
      proposed.execution.phases[0].tasks[1].review_action = 'advanced';
      // Task 1 stays the same (approved/advanced in both)
      const result = validateTransition(current, proposed);
      const v15Error = (result.errors || []).find(e => e.invariant === 'V15');
      assert.strictEqual(v15Error, undefined, 'V15 should not fire for single-task change');
    });

    it('fails when two tasks verdict/action changed in same write', () => {
      const { current, proposed } = makeBaseStatePair();
      // Change task 1's verdict
      current.execution.phases[0].tasks[0].review_verdict = null;
      current.execution.phases[0].tasks[0].review_action = null;
      proposed.execution.phases[0].tasks[0].review_verdict = 'approved';
      proposed.execution.phases[0].tasks[0].review_action = 'advanced';
      // Change task 2's verdict too
      current.execution.phases[0].tasks[1].review_verdict = null;
      current.execution.phases[0].tasks[1].review_action = null;
      proposed.execution.phases[0].tasks[1].review_verdict = 'approved';
      proposed.execution.phases[0].tasks[1].review_action = 'advanced';
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.invariants_checked, 15);
      const v15Error = result.errors.find(e => e.invariant === 'V15');
      assert.ok(v15Error, 'Expected V15 error');
      assert.strictEqual(v15Error.severity, 'critical');
    });
  });

  // ── V11–V15 current-state null guards ───────────────────────────────────

  describe('V11–V15 current-state null guards', () => {
    it('returns structured error when current.execution is null', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution = null;
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      const guardError = result.errors.find(e => e.invariant === 'V11');
      assert.ok(guardError, 'Expected V11 guard error for null current.execution');
      assert.ok(guardError.message.includes('current.execution'), 'Message should reference current.execution');
    });

    it('returns structured error when current.project is null', () => {
      const { current, proposed } = makeBaseStatePair();
      current.project = null;
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, false);
      const guardError = result.errors.find(e => e.invariant === 'V13');
      assert.ok(guardError, 'Expected V13 guard error for null current.project');
      assert.ok(guardError.message.includes('current.project'), 'Message should reference current.project');
    });

    it('returns structured error when current is null', () => {
      const proposed = makeBaseState();
      proposed.project.updated = '2026-01-01T13:00:00Z';
      const result = validateTransition(null, proposed);
      assert.strictEqual(result.valid, false);
      const guardError = result.errors.find(e => e.invariant === 'V11');
      assert.ok(guardError, 'Expected V11 guard error for null current');
      assert.ok(guardError.message.includes('null'), 'Message should mention null');
    });

    it('does not throw TypeError when current.execution.phases is missing', () => {
      const { current, proposed } = makeBaseStatePair();
      current.execution = { status: 'in_progress', current_phase: 0, total_phases: 0 };
      // current.execution exists but has no .phases — V11 should handle gracefully
      // checkV11 uses `current.execution.phases || []` so it already handles this
      const result = validateTransition(current, proposed);
      // Should not throw — structured result expected
      assert.strictEqual(typeof result.valid, 'boolean');
    });
  });

  // ── Baseline validation ────────────────────────────────────────────────

  describe('baseline', () => {
    it('makeBaseStatePair passes all invariants by default', () => {
      const { current, proposed } = makeBaseStatePair();
      const result = validateTransition(current, proposed);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });
  });

});
