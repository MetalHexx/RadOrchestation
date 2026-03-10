'use strict';

/**
 * @file State Transition Validator
 * @description Pure validation engine for state.json transitions.
 * Checks all 15 documented invariants (V1–V15) and returns a structured ValidationResult.
 * Used by the Tactical Planner before every state.json write.
 *
 * No filesystem I/O — imports only from ./constants.js.
 */

const {
  PIPELINE_TIERS,
  TASK_STATUSES,
  SEVERITY_LEVELS
} = require('./constants.js');

// ─── Type Definitions ───────────────────────────────────────────────────────

/**
 * @typedef {Object} InvariantError
 * @property {string} invariant - "V1" through "V15"
 * @property {string} message - Human-readable description with field paths and values
 * @property {'critical'} severity - Always "critical"
 */

/**
 * @typedef {Object} ValidationPass
 * @property {true} valid
 * @property {15} invariants_checked - Always 15
 */

/**
 * @typedef {Object} ValidationFail
 * @property {false} valid
 * @property {15} invariants_checked - Always 15
 * @property {InvariantError[]} errors - One entry per violated invariant
 */

/**
 * @typedef {ValidationPass|ValidationFail} ValidationResult
 */

// ─── Allowed Task Status Transitions ────────────────────────────────────────

const ALLOWED_TASK_TRANSITIONS = {
  'not_started': ['in_progress'],
  'in_progress': ['complete', 'failed', 'halted'],
  'complete':    [],                // terminal
  'failed':      ['in_progress'],   // retry path
  'halted':      []                 // terminal
};

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Create an InvariantError object.
 * @param {string} invariant - "V1" through "V15"
 * @param {string} message - Human-readable description
 * @returns {InvariantError}
 */
function makeError(invariant, message) {
  return { invariant, message, severity: SEVERITY_LEVELS.CRITICAL };
}

// ─── Invariant Check Functions ──────────────────────────────────────────────

/**
 * V1 — current_phase index bounds
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV1(proposed) {
  const errors = [];
  const phases = proposed.execution.phases || [];
  const cp = proposed.execution.current_phase;
  if (phases.length === 0 && cp !== 0) {
    errors.push(makeError('V1', `current_phase (${cp}) is out of bounds for phases array of length ${phases.length}`));
  }
  if (phases.length > 0 && (cp < 0 || cp >= phases.length)) {
    errors.push(makeError('V1', `current_phase (${cp}) is out of bounds for phases array of length ${phases.length}`));
  }
  return errors;
}

/**
 * V2 — current_task index bounds
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV2(proposed) {
  const errors = [];
  const phases = proposed.execution.phases || [];
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const tasks = phase.tasks || [];
    const ct = phase.current_task;
    if (tasks.length === 0 && ct !== 0) {
      errors.push(makeError('V2', `Phase ${i} current_task (${ct}) is out of bounds for tasks array of length ${tasks.length}`));
    }
    if (tasks.length > 0 && (ct < 0 || ct >= tasks.length)) {
      errors.push(makeError('V2', `Phase ${i} current_task (${ct}) is out of bounds for tasks array of length ${tasks.length}`));
    }
  }
  return errors;
}

/**
 * V3 — retry limit
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV3(proposed) {
  const errors = [];
  const max = proposed.limits.max_retries_per_task;
  const phases = proposed.execution.phases || [];
  for (let pi = 0; pi < phases.length; pi++) {
    const tasks = phases[pi].tasks || [];
    for (let ti = 0; ti < tasks.length; ti++) {
      const task = tasks[ti];
      if (task.retries > max) {
        errors.push(makeError('V3', `Task P${pi + 1}-T${ti + 1} retries (${task.retries}) exceeds max_retries_per_task (${max})`));
      }
    }
  }
  return errors;
}

/**
 * V4 — max phases
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV4(proposed) {
  const errors = [];
  const phases = proposed.execution.phases || [];
  const max = proposed.limits.max_phases;
  if (phases.length > max) {
    errors.push(makeError('V4', `phases.length (${phases.length}) exceeds max_phases (${max})`));
  }
  return errors;
}

/**
 * V5 — max tasks per phase
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV5(proposed) {
  const errors = [];
  const max = proposed.limits.max_tasks_per_phase;
  const phases = proposed.execution.phases || [];
  for (let i = 0; i < phases.length; i++) {
    const tasks = phases[i].tasks || [];
    if (tasks.length > max) {
      errors.push(makeError('V5', `Phase ${i} tasks.length (${tasks.length}) exceeds max_tasks_per_phase (${max})`));
    }
  }
  return errors;
}

/**
 * V6 — single in_progress task
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV6(proposed) {
  const errors = [];
  const inProgress = [];
  const phases = proposed.execution.phases || [];
  for (let pi = 0; pi < phases.length; pi++) {
    const tasks = phases[pi].tasks || [];
    for (let ti = 0; ti < tasks.length; ti++) {
      if (tasks[ti].status === TASK_STATUSES.IN_PROGRESS) {
        inProgress.push(`P${pi + 1}-T${ti + 1}`);
      }
    }
  }
  if (inProgress.length > 1) {
    errors.push(makeError('V6', `Multiple tasks have status 'in_progress': ${inProgress.join(', ')}`));
  }
  return errors;
}

/**
 * V7 — human approval before execution
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV7(proposed) {
  const errors = [];
  if (proposed.pipeline.current_tier === PIPELINE_TIERS.EXECUTION && proposed.planning.human_approved !== true) {
    errors.push(makeError('V7', "current_tier is 'execution' but planning.human_approved is not true"));
  }
  return errors;
}

/**
 * V8 — task triage consistency
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV8(proposed) {
  const errors = [];
  const phases = proposed.execution.phases || [];
  for (let pi = 0; pi < phases.length; pi++) {
    const tasks = phases[pi].tasks || [];
    for (let ti = 0; ti < tasks.length; ti++) {
      const task = tasks[ti];
      if ((task.review_doc ?? null) !== null && (task.review_verdict ?? null) === null) {
        errors.push(makeError('V8', `Task P${pi + 1}-T${ti + 1} has review_doc but review_verdict is null (triage skipped)`));
      }
    }
  }
  return errors;
}

/**
 * V9 — phase triage consistency
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV9(proposed) {
  const errors = [];
  const phases = proposed.execution.phases || [];
  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    if ((phase.phase_review ?? null) !== null && (phase.phase_review_verdict ?? null) === null) {
      errors.push(makeError('V9', `Phase ${i} has phase_review but phase_review_verdict is null (triage skipped)`));
    }
  }
  return errors;
}

/**
 * V10 — null treatment / structural validation
 * Ensures required top-level keys exist in proposed state.
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV10(proposed) {
  const errors = [];
  const required = ['execution', 'pipeline', 'planning', 'limits'];
  for (const key of required) {
    if (proposed[key] == null) {
      errors.push(makeError('V10', `Required top-level key '${key}' is missing or null in proposed state`));
    }
  }
  return errors;
}

/**
 * Current-state structural guard for V11–V15.
 * Validates that `current` has the required nested objects before V11–V15 access them.
 * @param {Object} current
 * @returns {InvariantError[]}
 */
function checkCurrentStructure(current) {
  const errors = [];
  if (current == null) {
    errors.push(makeError('V11', 'current state is null or undefined'));
    return errors;
  }
  if (current.execution == null) {
    errors.push(makeError('V11', "current.execution is null or undefined — cannot evaluate V11–V15"));
  }
  if (current.project == null) {
    errors.push(makeError('V13', "current.project is null or undefined — cannot evaluate V13"));
  }
  return errors;
}

/**
 * V11 — retry monotonicity
 * @param {Object} current
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV11(current, proposed) {
  const errors = [];
  const currentPhases = current.execution.phases || [];
  const proposedPhases = proposed.execution.phases || [];
  for (let pi = 0; pi < Math.min(currentPhases.length, proposedPhases.length); pi++) {
    const currentTasks = currentPhases[pi].tasks || [];
    const proposedTasks = proposedPhases[pi].tasks || [];
    for (let ti = 0; ti < Math.min(currentTasks.length, proposedTasks.length); ti++) {
      const cur = currentTasks[ti].retries;
      const prop = proposedTasks[ti].retries;
      if (prop < cur) {
        errors.push(makeError('V11', `Task P${pi + 1}-T${ti + 1} retries decreased from ${cur} to ${prop}`));
      }
    }
  }
  return errors;
}

/**
 * V12 — task status transitions
 * @param {Object} current
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV12(current, proposed) {
  const errors = [];
  const currentPhases = current.execution.phases || [];
  const proposedPhases = proposed.execution.phases || [];
  for (let pi = 0; pi < Math.min(currentPhases.length, proposedPhases.length); pi++) {
    const currentTasks = currentPhases[pi].tasks || [];
    const proposedTasks = proposedPhases[pi].tasks || [];
    for (let ti = 0; ti < Math.min(currentTasks.length, proposedTasks.length); ti++) {
      const from = currentTasks[ti].status;
      const to = proposedTasks[ti].status;
      if (from === to) {
        continue;
      }
      const allowed = ALLOWED_TASK_TRANSITIONS[from];
      if (!allowed || !allowed.includes(to)) {
        errors.push(makeError('V12', `Task P${pi + 1}-T${ti + 1} invalid status transition: '${from}' → '${to}'`));
      }
    }
  }
  return errors;
}

/**
 * V13 — timestamp monotonicity
 * @param {Object} current
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV13(current, proposed) {
  const errors = [];
  const curTime = current.project.updated;
  const propTime = proposed.project.updated;
  if (propTime <= curTime) {
    errors.push(makeError('V13', `project.updated ('${propTime}') is not newer than current ('${curTime}')`));
  }
  return errors;
}

/**
 * V14 — write ordering (review_doc vs verdict/action)
 * @param {Object} current
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV14(current, proposed) {
  const errors = [];
  const currentPhases = current.execution.phases || [];
  const proposedPhases = proposed.execution.phases || [];
  for (let pi = 0; pi < Math.min(currentPhases.length, proposedPhases.length); pi++) {
    const currentTasks = currentPhases[pi].tasks || [];
    const proposedTasks = proposedPhases[pi].tasks || [];
    for (let ti = 0; ti < Math.min(currentTasks.length, proposedTasks.length); ti++) {
      const curTask = currentTasks[ti];
      const propTask = proposedTasks[ti];
      const docChanged = (curTask.review_doc ?? null) === null && (propTask.review_doc ?? null) !== null;
      const verdictChanged = (curTask.review_verdict ?? null) !== (propTask.review_verdict ?? null);
      const actionChanged = (curTask.review_action ?? null) !== (propTask.review_action ?? null);
      if (docChanged && (verdictChanged || actionChanged)) {
        errors.push(makeError('V14', `Task P${pi + 1}-T${ti + 1} review_doc and review_verdict/review_action changed in same write (write ordering violation)`));
      }
    }
  }
  return errors;
}

/**
 * V15 — cross-task immutability
 * @param {Object} current
 * @param {Object} proposed
 * @returns {InvariantError[]}
 */
function checkV15(current, proposed) {
  const errors = [];
  const changedTasks = [];
  const currentPhases = current.execution.phases || [];
  const proposedPhases = proposed.execution.phases || [];
  for (let pi = 0; pi < Math.min(currentPhases.length, proposedPhases.length); pi++) {
    const currentTasks = currentPhases[pi].tasks || [];
    const proposedTasks = proposedPhases[pi].tasks || [];
    for (let ti = 0; ti < Math.min(currentTasks.length, proposedTasks.length); ti++) {
      const curTask = currentTasks[ti];
      const propTask = proposedTasks[ti];
      const verdictChanged = (curTask.review_verdict ?? null) !== (propTask.review_verdict ?? null);
      const actionChanged = (curTask.review_action ?? null) !== (propTask.review_action ?? null);
      if (verdictChanged || actionChanged) {
        changedTasks.push(`P${pi + 1}-T${ti + 1}`);
      }
    }
  }
  if (changedTasks.length > 1) {
    errors.push(makeError('V15', `Multiple tasks had verdict/action changed in same write: ${changedTasks.join(', ')} (cross-task immutability violation)`));
  }
  return errors;
}

// ─── Main Validation Function ───────────────────────────────────────────────

/**
 * Validate a proposed state.json transition against all 15 documented invariants.
 * Pure function: compares current and proposed state objects.
 *
 * @param {StateJson} current - The current (committed) state.json object
 * @param {StateJson} proposed - The proposed (uncommitted) state.json object
 * @returns {ValidationResult}
 */
function validateTransition(current, proposed) {
  // V10 — structural validation (must run first)
  const v10Errors = checkV10(proposed);
  if (v10Errors.length > 0) {
    return { valid: false, invariants_checked: 15, errors: v10Errors };
  }

  const allErrors = [];

  // Proposed-only checks (V1–V9)
  allErrors.push(...checkV1(proposed));
  allErrors.push(...checkV2(proposed));
  allErrors.push(...checkV3(proposed));
  allErrors.push(...checkV4(proposed));
  allErrors.push(...checkV5(proposed));
  allErrors.push(...checkV6(proposed));
  allErrors.push(...checkV7(proposed));
  allErrors.push(...checkV8(proposed));
  allErrors.push(...checkV9(proposed));

  // Current-state structural guard (must pass before V11–V15)
  const currentGuardErrors = checkCurrentStructure(current);
  if (currentGuardErrors.length > 0) {
    allErrors.push(...currentGuardErrors);
    if (allErrors.length === 0) {
      return { valid: true, invariants_checked: 15 };
    }
    return { valid: false, invariants_checked: 15, errors: allErrors };
  }

  // Current→Proposed checks (V11–V15)
  allErrors.push(...checkV11(current, proposed));
  allErrors.push(...checkV12(current, proposed));
  allErrors.push(...checkV13(current, proposed));
  allErrors.push(...checkV14(current, proposed));
  allErrors.push(...checkV15(current, proposed));

  if (allErrors.length === 0) {
    return { valid: true, invariants_checked: 15 };
  }

  return { valid: false, invariants_checked: 15, errors: allErrors };
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = { validateTransition };
