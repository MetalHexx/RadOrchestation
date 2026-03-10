'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { executeTriage, checkRetryBudget } = require('../src/lib/triage-engine.js');
const {
  REVIEW_VERDICTS,
  REVIEW_ACTIONS,
  PHASE_REVIEW_ACTIONS,
  SEVERITY_LEVELS,
  TRIAGE_LEVELS
} = require('../src/lib/constants.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Returns a minimal valid state.json object with one in_progress phase
 * containing one complete task with report_doc set.
 */
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
        research:     { status: 'complete', output: 'RESEARCH.md' },
        prd:          { status: 'complete', output: 'PRD.md' },
        design:       { status: 'complete', output: 'DESIGN.md' },
        architecture: { status: 'complete', output: 'ARCHITECTURE.md' },
        master_plan:  { status: 'complete', output: 'MASTER-PLAN.md' }
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
        total_tasks: 1,
        tasks: [{
          task_number: 1,
          title: 'Task One',
          status: 'complete',
          handoff_doc: 'tasks/TASK-01.md',
          report_doc: 'reports/TASK-REPORT-01.md',
          retries: 0,
          last_error: null,
          severity: null,
          review_doc: null,
          review_verdict: null,
          review_action: null
        }],
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
 * Creates a mock readDocument callback from a path→document map.
 * @param {Record<string, {frontmatter: Record<string,any>, body: string}>} docMap
 * @returns {function(string): {frontmatter: Record<string,any>, body: string}|null}
 */
function mockReadDocument(docMap) {
  return (path) => docMap[path] || null;
}

// ─── Task-Level Decision Table ──────────────────────────────────────────────

describe('Task-Level Decision Table', () => {

  it('Row 1: complete, no deviations, no review — skip triage', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = null;
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete', has_deviations: false },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, null);
    assert.strictEqual(result.action, null);
    assert.strictEqual(result.row_matched, 1);
  });

  it('Row 2: complete, no deviations, approved — advance', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete', has_deviations: false },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'approved' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.APPROVED);
    assert.strictEqual(result.action, REVIEW_ACTIONS.ADVANCED);
    assert.strictEqual(result.row_matched, 2);
  });

  it('Row 3: complete, minor deviations, approved — advance', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete', has_deviations: true, deviation_type: 'minor' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'approved' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.APPROVED);
    assert.strictEqual(result.action, REVIEW_ACTIONS.ADVANCED);
    assert.strictEqual(result.row_matched, 3);
  });

  it('Row 4: complete, architectural deviations, approved — advance', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete', has_deviations: true, deviation_type: 'architectural' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'approved' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.APPROVED);
    assert.strictEqual(result.action, REVIEW_ACTIONS.ADVANCED);
    assert.strictEqual(result.row_matched, 4);
  });

  it('Row 5: complete, changes requested — corrective task', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'changes_requested' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.CHANGES_REQUESTED);
    assert.strictEqual(result.action, REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED);
    assert.strictEqual(result.row_matched, 5);
  });

  it('Row 6: complete, rejected — halt', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'rejected' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.REJECTED);
    assert.strictEqual(result.action, REVIEW_ACTIONS.HALTED);
    assert.strictEqual(result.row_matched, 6);
  });

  it('Row 7: partial, no review — skip triage', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = null;
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'partial' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, null);
    assert.strictEqual(result.action, null);
    assert.strictEqual(result.row_matched, 7);
  });

  it('Row 8: partial, changes requested — corrective task', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'partial' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'changes_requested' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.CHANGES_REQUESTED);
    assert.strictEqual(result.action, REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED);
    assert.strictEqual(result.row_matched, 8);
  });

  it('Row 9: partial, rejected — halt', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'partial' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'rejected' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.REJECTED);
    assert.strictEqual(result.action, REVIEW_ACTIONS.HALTED);
    assert.strictEqual(result.row_matched, 9);
  });

  it('Row 10: failed, minor severity, retries available — corrective task (no review doc)', () => {
    const state = makeBaseState();
    const task = state.execution.phases[0].tasks[0];
    task.review_doc = null;
    task.severity = SEVERITY_LEVELS.MINOR;
    task.retries = 0;
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'failed' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, null);
    assert.strictEqual(result.action, REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED);
    assert.strictEqual(result.row_matched, 10);
  });

  it('Row 10: failed, minor severity, retries available — verdict sourced from review doc', () => {
    const state = makeBaseState();
    const task = state.execution.phases[0].tasks[0];
    task.review_doc = 'reviews/REVIEW-01.md';
    task.severity = SEVERITY_LEVELS.MINOR;
    task.retries = 0;
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'failed' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'changes_requested' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.CHANGES_REQUESTED);
    assert.strictEqual(result.action, REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED);
    assert.strictEqual(result.row_matched, 10);
  });

  it('Row 11: failed, critical severity — halt', () => {
    const state = makeBaseState();
    const task = state.execution.phases[0].tasks[0];
    task.review_doc = null;
    task.severity = SEVERITY_LEVELS.CRITICAL;
    task.retries = 0;
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'failed' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, null);
    assert.strictEqual(result.action, REVIEW_ACTIONS.HALTED);
    assert.strictEqual(result.row_matched, 11);
  });

  it('Row 11: failed, minor severity, retries exhausted — halt', () => {
    const state = makeBaseState();
    const task = state.execution.phases[0].tasks[0];
    task.review_doc = null;
    task.severity = SEVERITY_LEVELS.MINOR;
    task.retries = 2; // at max (max_retries_per_task = 2)
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'failed' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.action, REVIEW_ACTIONS.HALTED);
    assert.strictEqual(result.row_matched, 11);
  });

  it('Row 11: failed, null severity — halt', () => {
    const state = makeBaseState();
    const task = state.execution.phases[0].tasks[0];
    task.review_doc = null;
    task.severity = null;
    task.retries = 0;
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'failed' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.action, REVIEW_ACTIONS.HALTED);
    assert.strictEqual(result.row_matched, 11);
  });
});

// ─── checkRetryBudget ───────────────────────────────────────────────────────

describe('checkRetryBudget', () => {

  it('minor severity, retries 0, max 2 → corrective_task_issued', () => {
    const result = checkRetryBudget(
      { severity: SEVERITY_LEVELS.MINOR, retries: 0 },
      { max_retries_per_task: 2 }
    );
    assert.strictEqual(result, REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED);
  });

  it('minor severity, retries 1, max 2 → corrective_task_issued', () => {
    const result = checkRetryBudget(
      { severity: SEVERITY_LEVELS.MINOR, retries: 1 },
      { max_retries_per_task: 2 }
    );
    assert.strictEqual(result, REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED);
  });

  it('minor severity, retries 2, max 2 → halted (at max)', () => {
    const result = checkRetryBudget(
      { severity: SEVERITY_LEVELS.MINOR, retries: 2 },
      { max_retries_per_task: 2 }
    );
    assert.strictEqual(result, REVIEW_ACTIONS.HALTED);
  });

  it('minor severity, retries 3, max 2 → halted (above max)', () => {
    const result = checkRetryBudget(
      { severity: SEVERITY_LEVELS.MINOR, retries: 3 },
      { max_retries_per_task: 2 }
    );
    assert.strictEqual(result, REVIEW_ACTIONS.HALTED);
  });

  it('critical severity, retries 0, max 2 → halted', () => {
    const result = checkRetryBudget(
      { severity: SEVERITY_LEVELS.CRITICAL, retries: 0 },
      { max_retries_per_task: 2 }
    );
    assert.strictEqual(result, REVIEW_ACTIONS.HALTED);
  });

  it('null severity, retries 0, max 2 → halted', () => {
    const result = checkRetryBudget(
      { severity: null, retries: 0 },
      { max_retries_per_task: 2 }
    );
    assert.strictEqual(result, REVIEW_ACTIONS.HALTED);
  });
});

// ─── Phase-Level Decision Table ─────────────────────────────────────────────

describe('Phase-Level Decision Table', () => {

  it('Phase Row 1: no phase review — skip triage', () => {
    const state = makeBaseState();
    state.execution.phases[0].phase_review = null;
    const reader = mockReadDocument({});
    const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, null);
    assert.strictEqual(result.action, null);
    assert.strictEqual(result.row_matched, 1);
  });

  it('Phase Row 2: approved, exit_criteria_met true — advance', () => {
    const state = makeBaseState();
    state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
    const reader = mockReadDocument({
      'reviews/PHASE-REVIEW-01.md': {
        frontmatter: { verdict: 'approved', exit_criteria_met: true },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.APPROVED);
    assert.strictEqual(result.action, PHASE_REVIEW_ACTIONS.ADVANCED);
    assert.strictEqual(result.row_matched, 2);
  });

  it('Phase Row 3: approved, exit_criteria_met partial — advance with carry-forward', () => {
    const state = makeBaseState();
    state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
    const reader = mockReadDocument({
      'reviews/PHASE-REVIEW-01.md': {
        frontmatter: { verdict: 'approved', exit_criteria_met: 'partial' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.APPROVED);
    assert.strictEqual(result.action, PHASE_REVIEW_ACTIONS.ADVANCED);
    assert.strictEqual(result.row_matched, 3);
  });

  it('Phase Row 4: changes requested — corrective tasks (plural)', () => {
    const state = makeBaseState();
    state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
    const reader = mockReadDocument({
      'reviews/PHASE-REVIEW-01.md': {
        frontmatter: { verdict: 'changes_requested' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.CHANGES_REQUESTED);
    assert.strictEqual(result.action, PHASE_REVIEW_ACTIONS.CORRECTIVE_TASKS_ISSUED);
    assert.strictEqual(result.row_matched, 4);
  });

  it('Phase Row 5: rejected — halt', () => {
    const state = makeBaseState();
    state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
    const reader = mockReadDocument({
      'reviews/PHASE-REVIEW-01.md': {
        frontmatter: { verdict: 'rejected' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.verdict, REVIEW_VERDICTS.REJECTED);
    assert.strictEqual(result.action, PHASE_REVIEW_ACTIONS.HALTED);
    assert.strictEqual(result.row_matched, 5);
  });
});

// ─── Error Cases ────────────────────────────────────────────────────────────

describe('Error Cases', () => {

  it('DOCUMENT_NOT_FOUND: task report missing', () => {
    const state = makeBaseState();
    const reader = mockReadDocument({}); // report path not in map
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'DOCUMENT_NOT_FOUND');
  });

  it('DOCUMENT_NOT_FOUND: code review missing', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete' },
        body: ''
      }
      // review doc not in map
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'DOCUMENT_NOT_FOUND');
  });

  it('DOCUMENT_NOT_FOUND: phase review missing', () => {
    const state = makeBaseState();
    state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
    const reader = mockReadDocument({}); // phase review not in map
    const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'DOCUMENT_NOT_FOUND');
  });

  it('INVALID_VERDICT: unrecognized task-level verdict', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'bogus' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'INVALID_VERDICT');
  });

  it('INVALID_VERDICT: unrecognized phase-level verdict', () => {
    const state = makeBaseState();
    state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
    const reader = mockReadDocument({
      'reviews/PHASE-REVIEW-01.md': {
        frontmatter: { verdict: 'bogus' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'INVALID_VERDICT');
  });

  it('IMMUTABILITY_VIOLATION: task already has review_verdict', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_verdict = 'approved';
    const reader = mockReadDocument({});
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'IMMUTABILITY_VIOLATION');
  });

  it('IMMUTABILITY_VIOLATION: phase already has phase_review_verdict', () => {
    const state = makeBaseState();
    state.execution.phases[0].phase_review_verdict = 'approved';
    const reader = mockReadDocument({});
    const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'IMMUTABILITY_VIOLATION');
  });

  it('INVALID_LEVEL: bad level string', () => {
    const state = makeBaseState();
    const reader = mockReadDocument({});
    const result = executeTriage(state, 'bogus', reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'INVALID_LEVEL');
  });

  it('INVALID_STATE: null state', () => {
    const reader = mockReadDocument({});
    const result = executeTriage(null, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'INVALID_STATE');
  });

  it('INVALID_STATE: missing execution.phases', () => {
    const reader = mockReadDocument({});
    const result = executeTriage({ execution: {} }, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error_code, 'INVALID_STATE');
  });
});

// ─── Edge Cases ─────────────────────────────────────────────────────────────

describe('Edge Cases', () => {

  it('deviations frontmatter fallback: truthy "deviations" field triggers has_deviations', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete', deviations: true, deviation_type: 'minor' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'approved' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.success, true);
    // Should match Row 3 (minor deviations) via fallback "deviations" field
    assert.strictEqual(result.row_matched, 3);
  });

  describe('exit_criteria_met variants → Row 2 (all met)', () => {

    it('exit_criteria_met: true → Row 2', () => {
      const state = makeBaseState();
      state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
      const reader = mockReadDocument({
        'reviews/PHASE-REVIEW-01.md': {
          frontmatter: { verdict: 'approved', exit_criteria_met: true },
          body: ''
        }
      });
      const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
      assert.strictEqual(result.row_matched, 2);
    });

    it('exit_criteria_met: "all" → Row 2', () => {
      const state = makeBaseState();
      state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
      const reader = mockReadDocument({
        'reviews/PHASE-REVIEW-01.md': {
          frontmatter: { verdict: 'approved', exit_criteria_met: 'all' },
          body: ''
        }
      });
      const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
      assert.strictEqual(result.row_matched, 2);
    });

    it('exit_criteria_met: undefined → Row 2 (default)', () => {
      const state = makeBaseState();
      state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
      const reader = mockReadDocument({
        'reviews/PHASE-REVIEW-01.md': {
          frontmatter: { verdict: 'approved' }, // exit_criteria_met absent
          body: ''
        }
      });
      const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
      assert.strictEqual(result.row_matched, 2);
    });

    it('exit_criteria_met: null → Row 2 (default)', () => {
      const state = makeBaseState();
      state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
      const reader = mockReadDocument({
        'reviews/PHASE-REVIEW-01.md': {
          frontmatter: { verdict: 'approved', exit_criteria_met: null },
          body: ''
        }
      });
      const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
      assert.strictEqual(result.row_matched, 2);
    });
  });

  describe('exit_criteria_met variants → Row 3 (partial)', () => {

    it('exit_criteria_met: false → Row 3', () => {
      const state = makeBaseState();
      state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
      const reader = mockReadDocument({
        'reviews/PHASE-REVIEW-01.md': {
          frontmatter: { verdict: 'approved', exit_criteria_met: false },
          body: ''
        }
      });
      const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
      assert.strictEqual(result.row_matched, 3);
    });

    it('exit_criteria_met: "partial" → Row 3', () => {
      const state = makeBaseState();
      state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
      const reader = mockReadDocument({
        'reviews/PHASE-REVIEW-01.md': {
          frontmatter: { verdict: 'approved', exit_criteria_met: 'partial' },
          body: ''
        }
      });
      const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
      assert.strictEqual(result.row_matched, 3);
    });
  });

  it('Task Row 5 action is singular corrective_task_issued', () => {
    const state = makeBaseState();
    state.execution.phases[0].tasks[0].review_doc = 'reviews/REVIEW-01.md';
    const reader = mockReadDocument({
      'reports/TASK-REPORT-01.md': {
        frontmatter: { status: 'complete' },
        body: ''
      },
      'reviews/REVIEW-01.md': {
        frontmatter: { verdict: 'changes_requested' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.TASK, reader);
    assert.strictEqual(result.action, 'corrective_task_issued');
    assert.notStrictEqual(result.action, 'corrective_tasks_issued');
  });

  it('Phase Row 4 action is plural corrective_tasks_issued', () => {
    const state = makeBaseState();
    state.execution.phases[0].phase_review = 'reviews/PHASE-REVIEW-01.md';
    const reader = mockReadDocument({
      'reviews/PHASE-REVIEW-01.md': {
        frontmatter: { verdict: 'changes_requested' },
        body: ''
      }
    });
    const result = executeTriage(state, TRIAGE_LEVELS.PHASE, reader);
    assert.strictEqual(result.action, 'corrective_tasks_issued');
    assert.notStrictEqual(result.action, 'corrective_task_issued');
  });
});
