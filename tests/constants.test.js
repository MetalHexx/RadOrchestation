'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ─── Test Helpers ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    results.push({ name, status: 'pass' });
  } catch (err) {
    failed++;
    results.push({ name, status: 'fail', error: err.message });
    console.error(`  FAIL: ${name}\n        ${err.message}`);
  }
}

// ─── Load Module ────────────────────────────────────────────────────────────

const constants = require('../src/lib/constants');

const {
  PIPELINE_TIERS,
  PLANNING_STATUSES,
  PLANNING_STEP_STATUSES,
  PHASE_STATUSES,
  TASK_STATUSES,
  REVIEW_VERDICTS,
  REVIEW_ACTIONS,
  PHASE_REVIEW_ACTIONS,
  SEVERITY_LEVELS,
  HUMAN_GATE_MODES,
  TRIAGE_LEVELS,
  NEXT_ACTIONS
} = constants;

const ALL_ENUMS = [
  'PIPELINE_TIERS',
  'PLANNING_STATUSES',
  'PLANNING_STEP_STATUSES',
  'PHASE_STATUSES',
  'TASK_STATUSES',
  'REVIEW_VERDICTS',
  'REVIEW_ACTIONS',
  'PHASE_REVIEW_ACTIONS',
  'SEVERITY_LEVELS',
  'HUMAN_GATE_MODES',
  'TRIAGE_LEVELS',
  'NEXT_ACTIONS'
];

// ─── Export Tests ───────────────────────────────────────────────────────────

test('All 12 enums are exported and not undefined', () => {
  for (const name of ALL_ENUMS) {
    assert.ok(constants[name] !== undefined, `${name} should be exported`);
    assert.ok(typeof constants[name] === 'object', `${name} should be an object`);
  }
  assert.strictEqual(ALL_ENUMS.length, 12);
});

test('No extra exports beyond the 12 enums', () => {
  const exportedKeys = Object.keys(constants);
  assert.strictEqual(exportedKeys.length, 12, `Expected 12 exports, got ${exportedKeys.length}`);
  for (const name of ALL_ENUMS) {
    assert.ok(exportedKeys.includes(name), `${name} should be exported`);
  }
});

// ─── Frozen Tests ───────────────────────────────────────────────────────────

test('All 12 enums are frozen (Object.isFrozen)', () => {
  for (const name of ALL_ENUMS) {
    assert.ok(Object.isFrozen(constants[name]), `${name} should be frozen`);
  }
});

// ─── PIPELINE_TIERS ─────────────────────────────────────────────────────────

test('PIPELINE_TIERS has exact keys and values', () => {
  assert.deepStrictEqual(PIPELINE_TIERS, {
    PLANNING: 'planning',
    EXECUTION: 'execution',
    REVIEW: 'review',
    COMPLETE: 'complete',
    HALTED: 'halted'
  });
});

// ─── PLANNING_STATUSES ──────────────────────────────────────────────────────

test('PLANNING_STATUSES has exact keys and values', () => {
  assert.deepStrictEqual(PLANNING_STATUSES, {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETE: 'complete'
  });
});

// ─── PLANNING_STEP_STATUSES ─────────────────────────────────────────────────

test('PLANNING_STEP_STATUSES has exact keys and values', () => {
  assert.deepStrictEqual(PLANNING_STEP_STATUSES, {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETE: 'complete',
    FAILED: 'failed',
    SKIPPED: 'skipped'
  });
});

// ─── PHASE_STATUSES ─────────────────────────────────────────────────────────

test('PHASE_STATUSES has exact keys and values', () => {
  assert.deepStrictEqual(PHASE_STATUSES, {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETE: 'complete',
    FAILED: 'failed',
    HALTED: 'halted'
  });
});

// ─── TASK_STATUSES ──────────────────────────────────────────────────────────

test('TASK_STATUSES has exact keys and values', () => {
  assert.deepStrictEqual(TASK_STATUSES, {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETE: 'complete',
    FAILED: 'failed',
    HALTED: 'halted'
  });
});

// ─── REVIEW_VERDICTS ────────────────────────────────────────────────────────

test('REVIEW_VERDICTS has exact keys and values', () => {
  assert.deepStrictEqual(REVIEW_VERDICTS, {
    APPROVED: 'approved',
    CHANGES_REQUESTED: 'changes_requested',
    REJECTED: 'rejected'
  });
});

// ─── REVIEW_ACTIONS (singular) ──────────────────────────────────────────────

test('REVIEW_ACTIONS has exact keys and values (singular corrective_task_issued)', () => {
  assert.deepStrictEqual(REVIEW_ACTIONS, {
    ADVANCED: 'advanced',
    CORRECTIVE_TASK_ISSUED: 'corrective_task_issued',
    HALTED: 'halted'
  });
});

test('REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED equals corrective_task_issued (singular)', () => {
  assert.strictEqual(REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED, 'corrective_task_issued');
});

// ─── PHASE_REVIEW_ACTIONS (plural) ──────────────────────────────────────────

test('PHASE_REVIEW_ACTIONS has exact keys and values (plural corrective_tasks_issued)', () => {
  assert.deepStrictEqual(PHASE_REVIEW_ACTIONS, {
    ADVANCED: 'advanced',
    CORRECTIVE_TASKS_ISSUED: 'corrective_tasks_issued',
    HALTED: 'halted'
  });
});

test('PHASE_REVIEW_ACTIONS.CORRECTIVE_TASKS_ISSUED equals corrective_tasks_issued (plural)', () => {
  assert.strictEqual(PHASE_REVIEW_ACTIONS.CORRECTIVE_TASKS_ISSUED, 'corrective_tasks_issued');
});

// ─── Singular vs Plural distinction ─────────────────────────────────────────

test('REVIEW_ACTIONS and PHASE_REVIEW_ACTIONS have no accidental value overlap on corrective', () => {
  const taskLevel = REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED;
  const phaseLevel = PHASE_REVIEW_ACTIONS.CORRECTIVE_TASKS_ISSUED;
  assert.notStrictEqual(taskLevel, phaseLevel,
    'Task-level (singular) and phase-level (plural) corrective values must differ');
});

test('No accidental value overlap between REVIEW_ACTIONS and PHASE_REVIEW_ACTIONS value sets', () => {
  const taskValues = new Set(Object.values(REVIEW_ACTIONS));
  const phaseValues = new Set(Object.values(PHASE_REVIEW_ACTIONS));
  // 'advanced' and 'halted' are shared intentionally, but the corrective ones must differ
  assert.ok(!taskValues.has('corrective_tasks_issued'),
    'REVIEW_ACTIONS should not contain plural form');
  assert.ok(!phaseValues.has('corrective_task_issued'),
    'PHASE_REVIEW_ACTIONS should not contain singular form');
});

// ─── SEVERITY_LEVELS ────────────────────────────────────────────────────────

test('SEVERITY_LEVELS has exact keys and values', () => {
  assert.deepStrictEqual(SEVERITY_LEVELS, {
    MINOR: 'minor',
    CRITICAL: 'critical'
  });
});

// ─── HUMAN_GATE_MODES ───────────────────────────────────────────────────────

test('HUMAN_GATE_MODES has exact keys and values', () => {
  assert.deepStrictEqual(HUMAN_GATE_MODES, {
    ASK: 'ask',
    PHASE: 'phase',
    TASK: 'task',
    AUTONOMOUS: 'autonomous'
  });
});

// ─── TRIAGE_LEVELS ──────────────────────────────────────────────────────────

test('TRIAGE_LEVELS has exact keys and values', () => {
  assert.deepStrictEqual(TRIAGE_LEVELS, {
    TASK: 'task',
    PHASE: 'phase'
  });
});

// ─── NEXT_ACTIONS ───────────────────────────────────────────────────────────

test('NEXT_ACTIONS contains exactly 35 key-value pairs', () => {
  const keys = Object.keys(NEXT_ACTIONS);
  assert.strictEqual(keys.length, 35, `Expected 35 entries, got ${keys.length}`);
});

test('NEXT_ACTIONS has all expected values', () => {
  const expectedValues = [
    'init_project', 'display_halted', 'spawn_research', 'spawn_prd',
    'spawn_design', 'spawn_architecture', 'spawn_master_plan',
    'request_plan_approval', 'transition_to_execution', 'create_phase_plan',
    'create_task_handoff', 'execute_task', 'update_state_from_task',
    'create_corrective_handoff', 'halt_task_failed', 'spawn_code_reviewer',
    'update_state_from_review', 'triage_task', 'halt_triage_invariant',
    'retry_from_review', 'halt_from_review', 'advance_task', 'gate_task',
    'generate_phase_report', 'spawn_phase_reviewer',
    'update_state_from_phase_review', 'triage_phase',
    'halt_phase_triage_invariant', 'gate_phase', 'advance_phase',
    'transition_to_review', 'spawn_final_reviewer', 'request_final_approval',
    'transition_to_complete', 'display_complete'
  ];
  const actualValues = Object.values(NEXT_ACTIONS);
  assert.strictEqual(actualValues.length, expectedValues.length);
  for (const v of expectedValues) {
    assert.ok(actualValues.includes(v), `Missing value: ${v}`);
  }
});

// ─── Key Convention Tests ───────────────────────────────────────────────────

test('All enum keys are SCREAMING_SNAKE_CASE', () => {
  const screamingSnake = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;
  for (const name of ALL_ENUMS) {
    for (const key of Object.keys(constants[name])) {
      assert.ok(screamingSnake.test(key),
        `${name}.${key} is not SCREAMING_SNAKE_CASE`);
    }
  }
});

test('All enum values are lowercase snake_case strings', () => {
  const lowerSnake = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
  for (const name of ALL_ENUMS) {
    for (const [key, value] of Object.entries(constants[name])) {
      assert.strictEqual(typeof value, 'string',
        `${name}.${key} should be a string`);
      assert.ok(lowerSnake.test(value),
        `${name}.${key} = "${value}" is not lowercase snake_case`);
    }
  }
});

// ─── Source File Tests ──────────────────────────────────────────────────────

test('Source file has zero require() statements (leaf module)', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'constants.js'), 'utf8');
  const requireMatches = src.match(/\brequire\s*\(/g);
  assert.strictEqual(requireMatches, null,
    `Expected zero require() calls, found ${requireMatches ? requireMatches.length : 0}`);
});

test("'use strict' is the first statement in the file", () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'constants.js'), 'utf8');
  assert.ok(src.startsWith("'use strict'"),
    "File should start with 'use strict'");
});

test('Source file contains JSDoc @typedef for StateJson', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'constants.js'), 'utf8');
  assert.ok(src.includes('@typedef {Object} StateJson'),
    'Missing @typedef for StateJson');
});

test('Source file contains JSDoc @typedef for PlanningStep', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'constants.js'), 'utf8');
  assert.ok(src.includes('@typedef {Object} PlanningStep'),
    'Missing @typedef for PlanningStep');
});

test('Source file contains JSDoc @typedef for Phase', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'constants.js'), 'utf8');
  assert.ok(src.includes('@typedef {Object} Phase'),
    'Missing @typedef for Phase');
});

test('Source file contains JSDoc @typedef for Task', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'constants.js'), 'utf8');
  assert.ok(src.includes('@typedef {Object} Task'),
    'Missing @typedef for Task');
});

test('Source file contains JSDoc @type Readonly annotations for each enum', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'lib', 'constants.js'), 'utf8');
  // Count occurrences of @type {Readonly<
  const readonlyMatches = src.match(/@type\s*\{Readonly</g);
  assert.ok(readonlyMatches, 'Expected @type {Readonly<...>} annotations');
  assert.strictEqual(readonlyMatches.length, 12,
    `Expected 12 @type Readonly annotations, found ${readonlyMatches.length}`);
});

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\nconstants  pass ${passed}  fail ${failed}  tests ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
