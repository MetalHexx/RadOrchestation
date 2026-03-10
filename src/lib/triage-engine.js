'use strict';

const {
  REVIEW_VERDICTS,
  REVIEW_ACTIONS,
  PHASE_REVIEW_ACTIONS,
  SEVERITY_LEVELS,
  TRIAGE_LEVELS
} = require('./constants');

// ─── Valid Verdict Set ──────────────────────────────────────────────────────

const VALID_VERDICTS = new Set([
  REVIEW_VERDICTS.APPROVED,
  REVIEW_VERDICTS.CHANGES_REQUESTED,
  REVIEW_VERDICTS.REJECTED
]);

// ─── Result Builders ────────────────────────────────────────────────────────

/**
 * Build a TriageError result object.
 * @param {'task'|'phase'} level
 * @param {string} error
 * @param {'DOCUMENT_NOT_FOUND'|'INVALID_VERDICT'|'IMMUTABILITY_VIOLATION'|'INVALID_STATE'|'INVALID_LEVEL'} errorCode
 * @param {number} phaseIndex - 0-based
 * @param {number|null} taskIndex - 0-based, null for phase-level
 * @returns {TriageError}
 */
function makeError(level, error, errorCode, phaseIndex, taskIndex) {
  return {
    success: false,
    level,
    error,
    error_code: errorCode,
    phase_index: phaseIndex,
    task_index: taskIndex
  };
}

/**
 * Build a TriageSuccess result object.
 * @param {'task'|'phase'} level
 * @param {'approved'|'changes_requested'|'rejected'|null} verdict
 * @param {string|null} action
 * @param {number} phaseIndex - 0-based
 * @param {number|null} taskIndex - 0-based, null for phase-level
 * @param {number} rowMatched - 1-indexed decision table row number
 * @param {string} details - Human-readable explanation
 * @returns {TriageSuccess}
 */
function makeSuccess(level, verdict, action, phaseIndex, taskIndex, rowMatched, details) {
  return {
    success: true,
    level,
    verdict,
    action,
    phase_index: phaseIndex,
    task_index: taskIndex,
    row_matched: rowMatched,
    details
  };
}

// ─── Retry Budget Helper ────────────────────────────────────────────────────

/**
 * Check retry budget for Row 10 logic.
 * Named function for readability and targeted testability.
 *
 * If task.retries < limits.max_retries_per_task AND task.severity === 'minor'
 * → return 'corrective_task_issued'.
 * Otherwise (critical severity, retries at/above max, null severity) → return 'halted'.
 *
 * @param {import('./constants').Task} task - The current task object from state.json
 * @param {Object} limits - The limits object from state.json
 * @param {number} limits.max_retries_per_task
 * @returns {'corrective_task_issued'|'halted'} The resolved action
 */
function checkRetryBudget(task, limits) {
  if (
    task.severity === SEVERITY_LEVELS.MINOR &&
    task.retries < limits.max_retries_per_task
  ) {
    return REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED;
  }
  return REVIEW_ACTIONS.HALTED;
}

// ─── Task-Level Decision Table (11 Rows) ────────────────────────────────────

/**
 * Evaluate the 11-row task-level decision table.
 * First-match-wins evaluation order.
 *
 * @param {import('./constants').StateJson} state
 * @param {import('./constants').Phase} phase
 * @param {import('./constants').Task} task
 * @param {ReadDocumentFn} readDocument
 * @returns {TriageResult}
 */
function triageTask(state, phase, task, readDocument) {
  const phaseIndex = state.execution.current_phase;
  const taskIndex = phase.current_task;

  // ── Read task report (required) ──
  const taskReport = readDocument(task.report_doc);
  if (!taskReport) {
    return makeError(
      TRIAGE_LEVELS.TASK,
      `Task report not found: ${task.report_doc}`,
      'DOCUMENT_NOT_FOUND',
      phaseIndex,
      taskIndex
    );
  }

  const reportFm = taskReport.frontmatter || {};
  const reportStatus = reportFm.status;
  const hasDeviations = Boolean(
    reportFm.has_deviations !== undefined
      ? reportFm.has_deviations
      : reportFm.deviations
  );
  const deviationType = reportFm.deviation_type || null;

  // ── Read code review if present ──
  let verdict = null;
  if (task.review_doc) {
    const codeReview = readDocument(task.review_doc);
    if (!codeReview) {
      return makeError(
        TRIAGE_LEVELS.TASK,
        `Code review not found: ${task.review_doc}`,
        'DOCUMENT_NOT_FOUND',
        phaseIndex,
        taskIndex
      );
    }
    const reviewFm = codeReview.frontmatter || {};
    verdict = reviewFm.verdict;

    // Validate verdict value
    if (!VALID_VERDICTS.has(verdict)) {
      return makeError(
        TRIAGE_LEVELS.TASK,
        `Invalid verdict in code review: '${verdict}'`,
        'INVALID_VERDICT',
        phaseIndex,
        taskIndex
      );
    }
  }

  // ── Row 1: complete, no deviations, no review — skip triage ──
  if (reportStatus === 'complete' && !hasDeviations && !task.review_doc) {
    return makeSuccess(
      TRIAGE_LEVELS.TASK, null, null,
      phaseIndex, taskIndex, 1,
      'Row 1: complete, no deviations, no review — skip triage'
    );
  }

  // ── Row 2: complete, no deviations, approved — advance ──
  if (
    reportStatus === 'complete' && !hasDeviations &&
    task.review_doc && verdict === REVIEW_VERDICTS.APPROVED
  ) {
    return makeSuccess(
      TRIAGE_LEVELS.TASK, REVIEW_VERDICTS.APPROVED, REVIEW_ACTIONS.ADVANCED,
      phaseIndex, taskIndex, 2,
      'Row 2: complete, no deviations, approved — advance'
    );
  }

  // ── Row 3: complete, minor deviations, approved — advance ──
  if (
    reportStatus === 'complete' && hasDeviations &&
    deviationType === 'minor' && verdict === REVIEW_VERDICTS.APPROVED
  ) {
    return makeSuccess(
      TRIAGE_LEVELS.TASK, REVIEW_VERDICTS.APPROVED, REVIEW_ACTIONS.ADVANCED,
      phaseIndex, taskIndex, 3,
      'Row 3: complete, minor deviations, approved — advance'
    );
  }

  // ── Row 4: complete, architectural deviations, approved — advance ──
  if (
    reportStatus === 'complete' && hasDeviations &&
    deviationType === 'architectural' && verdict === REVIEW_VERDICTS.APPROVED
  ) {
    return makeSuccess(
      TRIAGE_LEVELS.TASK, REVIEW_VERDICTS.APPROVED, REVIEW_ACTIONS.ADVANCED,
      phaseIndex, taskIndex, 4,
      'Row 4: complete, architectural deviations, approved — advance'
    );
  }

  // ── Row 5: complete, changes requested — corrective task ──
  if (
    reportStatus === 'complete' && task.review_doc &&
    verdict === REVIEW_VERDICTS.CHANGES_REQUESTED
  ) {
    return makeSuccess(
      TRIAGE_LEVELS.TASK, REVIEW_VERDICTS.CHANGES_REQUESTED, REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED,
      phaseIndex, taskIndex, 5,
      'Row 5: complete, changes requested — corrective task'
    );
  }

  // ── Row 6: complete, rejected — halt ──
  if (
    reportStatus === 'complete' && task.review_doc &&
    verdict === REVIEW_VERDICTS.REJECTED
  ) {
    return makeSuccess(
      TRIAGE_LEVELS.TASK, REVIEW_VERDICTS.REJECTED, REVIEW_ACTIONS.HALTED,
      phaseIndex, taskIndex, 6,
      'Row 6: complete, rejected — halt'
    );
  }

  // ── Row 7: partial, no review — skip triage ──
  if (reportStatus === 'partial' && !task.review_doc) {
    return makeSuccess(
      TRIAGE_LEVELS.TASK, null, null,
      phaseIndex, taskIndex, 7,
      'Row 7: partial, no review — skip triage'
    );
  }

  // ── Row 8: partial, changes requested — corrective task ──
  if (
    reportStatus === 'partial' && task.review_doc &&
    verdict === REVIEW_VERDICTS.CHANGES_REQUESTED
  ) {
    return makeSuccess(
      TRIAGE_LEVELS.TASK, REVIEW_VERDICTS.CHANGES_REQUESTED, REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED,
      phaseIndex, taskIndex, 8,
      'Row 8: partial, changes requested — corrective task'
    );
  }

  // ── Row 9: partial, rejected — halt ──
  if (
    reportStatus === 'partial' && task.review_doc &&
    verdict === REVIEW_VERDICTS.REJECTED
  ) {
    return makeSuccess(
      TRIAGE_LEVELS.TASK, REVIEW_VERDICTS.REJECTED, REVIEW_ACTIONS.HALTED,
      phaseIndex, taskIndex, 9,
      'Row 9: partial, rejected — halt'
    );
  }

  // ── Rows 10–11: failed — use checkRetryBudget ──
  if (reportStatus === 'failed') {
    const budgetAction = checkRetryBudget(task, state.limits);
    // Verdict sourcing: transcribe from review if review_doc exists, else null
    const failedVerdict = task.review_doc ? verdict : null;

    if (budgetAction === REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED) {
      // Row 10: failed, minor severity, retries available — corrective task
      return makeSuccess(
        TRIAGE_LEVELS.TASK, failedVerdict, REVIEW_ACTIONS.CORRECTIVE_TASK_ISSUED,
        phaseIndex, taskIndex, 10,
        'Row 10: failed, minor severity, retries available — corrective task'
      );
    }

    // Row 11: failed, critical severity or retries exhausted — halt
    return makeSuccess(
      TRIAGE_LEVELS.TASK, failedVerdict, REVIEW_ACTIONS.HALTED,
      phaseIndex, taskIndex, 11,
      'Row 11: failed, critical severity or retries exhausted — halt'
    );
  }

  // ── No row matched — defensive fallback ──
  return makeError(
    TRIAGE_LEVELS.TASK,
    `No decision table row matched for report_status='${reportStatus}'`,
    'INVALID_STATE',
    phaseIndex,
    taskIndex
  );
}

// ─── Phase-Level Decision Table (5 Rows) ────────────────────────────────────

/**
 * Evaluate the 5-row phase-level decision table.
 * First-match-wins evaluation order.
 *
 * @param {import('./constants').StateJson} state
 * @param {import('./constants').Phase} phase
 * @param {ReadDocumentFn} readDocument
 * @returns {TriageResult}
 */
function triagePhase(state, phase, readDocument) {
  const phaseIndex = state.execution.current_phase;

  // ── Row 1: no phase review — skip triage ──
  if (!phase.phase_review) {
    return makeSuccess(
      TRIAGE_LEVELS.PHASE, null, null,
      phaseIndex, null, 1,
      'Phase Row 1: no phase review — skip triage'
    );
  }

  // ── Read phase review (required when phase.phase_review is set) ──
  const phaseReview = readDocument(phase.phase_review);
  if (!phaseReview) {
    return makeError(
      TRIAGE_LEVELS.PHASE,
      `Phase review not found: ${phase.phase_review}`,
      'DOCUMENT_NOT_FOUND',
      phaseIndex,
      null
    );
  }

  const reviewFm = phaseReview.frontmatter || {};
  const verdict = reviewFm.verdict;

  // Validate verdict value
  if (!VALID_VERDICTS.has(verdict)) {
    return makeError(
      TRIAGE_LEVELS.PHASE,
      `Invalid verdict in phase review: '${verdict}'`,
      'INVALID_VERDICT',
      phaseIndex,
      null
    );
  }

  // Determine exit criteria status for Row 2 vs Row 3 distinction.
  // If exit_criteria_met is unavailable or ambiguous, default to Row 2 (all met).
  const exitCriteriaMet = reviewFm.exit_criteria_met;
  const allExitCriteriaMet =
    exitCriteriaMet === true ||
    exitCriteriaMet === 'all' ||
    exitCriteriaMet === undefined ||
    exitCriteriaMet === null;

  // ── Row 2: approved, all exit criteria met — advance ──
  if (verdict === REVIEW_VERDICTS.APPROVED && allExitCriteriaMet) {
    return makeSuccess(
      TRIAGE_LEVELS.PHASE, REVIEW_VERDICTS.APPROVED, PHASE_REVIEW_ACTIONS.ADVANCED,
      phaseIndex, null, 2,
      'Phase Row 2: approved, all exit criteria met — advance'
    );
  }

  // ── Row 3: approved, some exit criteria unmet — advance with carry-forward ──
  if (verdict === REVIEW_VERDICTS.APPROVED && !allExitCriteriaMet) {
    return makeSuccess(
      TRIAGE_LEVELS.PHASE, REVIEW_VERDICTS.APPROVED, PHASE_REVIEW_ACTIONS.ADVANCED,
      phaseIndex, null, 3,
      'Phase Row 3: approved, some exit criteria unmet — advance with carry-forward'
    );
  }

  // ── Row 4: changes requested — corrective tasks ──
  if (verdict === REVIEW_VERDICTS.CHANGES_REQUESTED) {
    return makeSuccess(
      TRIAGE_LEVELS.PHASE, REVIEW_VERDICTS.CHANGES_REQUESTED, PHASE_REVIEW_ACTIONS.CORRECTIVE_TASKS_ISSUED,
      phaseIndex, null, 4,
      'Phase Row 4: changes requested — corrective tasks'
    );
  }

  // ── Row 5: rejected — halt ──
  if (verdict === REVIEW_VERDICTS.REJECTED) {
    return makeSuccess(
      TRIAGE_LEVELS.PHASE, REVIEW_VERDICTS.REJECTED, PHASE_REVIEW_ACTIONS.HALTED,
      phaseIndex, null, 5,
      'Phase Row 5: rejected — halt'
    );
  }

  // Defensive fallback (should not reach here since verdict is validated above)
  return makeError(
    TRIAGE_LEVELS.PHASE,
    `No phase decision table row matched for verdict='${verdict}'`,
    'INVALID_STATE',
    phaseIndex,
    null
  );
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * @callback ReadDocumentFn
 * @param {string} docPath - Absolute or project-relative path to the document
 * @returns {{ frontmatter: Record<string, any> | null, body: string } | null}
 *   Returns parsed document with frontmatter and body, or null if not found.
 */

/**
 * @typedef {Object} TriageSuccess
 * @property {true} success
 * @property {'task'|'phase'} level
 * @property {'approved'|'changes_requested'|'rejected'|null} verdict
 * @property {'advanced'|'corrective_task_issued'|'halted'|null} action - Task-level uses REVIEW_ACTIONS enum
 * @property {number} phase_index - 0-based
 * @property {number|null} task_index - 0-based, null for phase-level
 * @property {number} row_matched - 1-indexed decision table row number
 * @property {string} details - Human-readable explanation of why this row matched
 */

/**
 * @typedef {Object} TriageError
 * @property {false} success
 * @property {'task'|'phase'} level
 * @property {string} error - Structured error message
 * @property {'DOCUMENT_NOT_FOUND'|'INVALID_VERDICT'|'IMMUTABILITY_VIOLATION'|'INVALID_STATE'|'INVALID_LEVEL'} error_code
 * @property {number} phase_index - 0-based
 * @property {number|null} task_index - 0-based, null for phase-level
 */

/**
 * @typedef {TriageSuccess|TriageError} TriageResult
 */

/**
 * Execute triage for the current task or phase.
 * Pure function with dependency injection for document reading.
 * Does NOT write to state.json — returns the resolved verdict/action.
 *
 * @param {import('./constants').StateJson} state - Parsed state.json object
 * @param {'task'|'phase'} level - Which decision table to evaluate
 * @param {ReadDocumentFn} readDocument - Injected callback for reading documents
 * @returns {TriageResult}
 */
function executeTriage(state, level, readDocument) {
  // ── Validate level ──
  if (level !== TRIAGE_LEVELS.TASK && level !== TRIAGE_LEVELS.PHASE) {
    return {
      success: false,
      level: level || 'unknown',
      error: `Invalid triage level: '${level}'. Must be 'task' or 'phase'.`,
      error_code: 'INVALID_LEVEL',
      phase_index: -1,
      task_index: null
    };
  }

  // ── Validate state ──
  if (!state || !state.execution || !state.execution.phases) {
    return makeError(
      level,
      'Invalid state: missing execution.phases',
      'INVALID_STATE',
      -1,
      null
    );
  }

  // ── Resolve current phase ──
  const phase = state.execution.phases[state.execution.current_phase];
  if (!phase) {
    return makeError(
      level,
      `Invalid state: phase at index ${state.execution.current_phase} not found`,
      'INVALID_STATE',
      state.execution.current_phase,
      null
    );
  }

  const phaseIndex = state.execution.current_phase;

  if (level === TRIAGE_LEVELS.TASK) {
    // ── Resolve current task ──
    const task = phase.tasks && phase.tasks[phase.current_task];
    if (!task) {
      return makeError(
        level,
        `Invalid state: task at index ${phase.current_task} not found in phase ${phaseIndex}`,
        'INVALID_STATE',
        phaseIndex,
        phase.current_task
      );
    }

    const taskIndex = phase.current_task;

    // ── Immutability check: task verdict/action must be null ──
    if (task.review_verdict !== null || task.review_action !== null) {
      return makeError(
        level,
        `Immutability violation: task ${taskIndex} already has review_verdict='${task.review_verdict}' or review_action='${task.review_action}'`,
        'IMMUTABILITY_VIOLATION',
        phaseIndex,
        taskIndex
      );
    }

    return triageTask(state, phase, task, readDocument);
  }

  // ── Phase-level: immutability check ──
  if (phase.phase_review_verdict !== null || phase.phase_review_action !== null) {
    return makeError(
      level,
      `Immutability violation: phase ${phaseIndex} already has phase_review_verdict='${phase.phase_review_verdict}' or phase_review_action='${phase.phase_review_action}'`,
      'IMMUTABILITY_VIOLATION',
      phaseIndex,
      null
    );
  }

  return triagePhase(state, phase, readDocument);
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  executeTriage,
  checkRetryBudget
};
