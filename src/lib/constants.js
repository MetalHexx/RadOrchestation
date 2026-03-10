'use strict';

// ─── StateJson Type Definitions ─────────────────────────────────────────────

/**
 * @typedef {Object} StateJson
 * @property {Object} project
 * @property {string} project.name
 * @property {string} project.created - ISO 8601 timestamp
 * @property {string} project.updated - ISO 8601 timestamp
 * @property {Object} pipeline
 * @property {'planning'|'execution'|'review'|'complete'|'halted'} pipeline.current_tier
 * @property {'ask'|'phase'|'task'|'autonomous'} pipeline.human_gate_mode
 * @property {Object} planning
 * @property {'not_started'|'in_progress'|'complete'} planning.status
 * @property {Object} planning.steps
 * @property {PlanningStep} planning.steps.research
 * @property {PlanningStep} planning.steps.prd
 * @property {PlanningStep} planning.steps.design
 * @property {PlanningStep} planning.steps.architecture
 * @property {PlanningStep} planning.steps.master_plan
 * @property {boolean} planning.human_approved
 * @property {Object} execution
 * @property {'not_started'|'in_progress'|'complete'|'halted'} execution.status
 * @property {number} execution.current_phase - 0-based index into phases[]
 * @property {number} execution.total_phases
 * @property {Phase[]} execution.phases
 * @property {Object} final_review
 * @property {'not_started'|'in_progress'|'complete'|'failed'} final_review.status
 * @property {string|null} final_review.report_doc
 * @property {boolean} final_review.human_approved
 * @property {Object} errors
 * @property {number} errors.total_retries
 * @property {number} errors.total_halts
 * @property {string[]} errors.active_blockers
 * @property {Object} limits
 * @property {number} limits.max_phases
 * @property {number} limits.max_tasks_per_phase
 * @property {number} limits.max_retries_per_task
 */

/**
 * @typedef {Object} PlanningStep
 * @property {'not_started'|'in_progress'|'complete'|'failed'|'skipped'} status
 * @property {string|null} output - Relative path to output document
 */

/**
 * @typedef {Object} Phase
 * @property {number} phase_number - 1-based
 * @property {string} title
 * @property {'not_started'|'in_progress'|'complete'|'failed'|'halted'} status
 * @property {string|null} phase_doc
 * @property {number} current_task - 0-based index into tasks[]
 * @property {number} total_tasks
 * @property {Task[]} tasks
 * @property {string|null} phase_report
 * @property {boolean} human_approved
 * @property {string|null} phase_review
 * @property {'approved'|'changes_requested'|'rejected'|null} phase_review_verdict
 * @property {'advanced'|'corrective_tasks_issued'|'halted'|null} phase_review_action
 */

/**
 * @typedef {Object} Task
 * @property {number} task_number - 1-based
 * @property {string} title
 * @property {'not_started'|'in_progress'|'complete'|'failed'|'halted'} status
 * @property {string|null} handoff_doc
 * @property {string|null} report_doc
 * @property {number} retries
 * @property {string|null} last_error
 * @property {'minor'|'critical'|null} severity
 * @property {string|null} review_doc
 * @property {'approved'|'changes_requested'|'rejected'|null} review_verdict
 * @property {'advanced'|'corrective_task_issued'|'halted'|null} review_action
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

/**
 * @type {Readonly<{PLANNING: 'planning', EXECUTION: 'execution', REVIEW: 'review', COMPLETE: 'complete', HALTED: 'halted'}>}
 */
const PIPELINE_TIERS = Object.freeze({
  PLANNING: 'planning',
  EXECUTION: 'execution',
  REVIEW: 'review',
  COMPLETE: 'complete',
  HALTED: 'halted'
});

/**
 * @type {Readonly<{NOT_STARTED: 'not_started', IN_PROGRESS: 'in_progress', COMPLETE: 'complete'}>}
 */
const PLANNING_STATUSES = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete'
});

/**
 * @type {Readonly<{NOT_STARTED: 'not_started', IN_PROGRESS: 'in_progress', COMPLETE: 'complete', FAILED: 'failed', SKIPPED: 'skipped'}>}
 */
const PLANNING_STEP_STATUSES = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  FAILED: 'failed',
  SKIPPED: 'skipped'
});

/**
 * @type {Readonly<{NOT_STARTED: 'not_started', IN_PROGRESS: 'in_progress', COMPLETE: 'complete', FAILED: 'failed', HALTED: 'halted'}>}
 */
const PHASE_STATUSES = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  FAILED: 'failed',
  HALTED: 'halted'
});

/**
 * @type {Readonly<{NOT_STARTED: 'not_started', IN_PROGRESS: 'in_progress', COMPLETE: 'complete', FAILED: 'failed', HALTED: 'halted'}>}
 */
const TASK_STATUSES = Object.freeze({
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  FAILED: 'failed',
  HALTED: 'halted'
});

/**
 * @type {Readonly<{APPROVED: 'approved', CHANGES_REQUESTED: 'changes_requested', REJECTED: 'rejected'}>}
 */
const REVIEW_VERDICTS = Object.freeze({
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes_requested',
  REJECTED: 'rejected'
});

/**
 * Task-level review actions. Note: uses SINGULAR "corrective_task_issued".
 * @type {Readonly<{ADVANCED: 'advanced', CORRECTIVE_TASK_ISSUED: 'corrective_task_issued', HALTED: 'halted'}>}
 */
const REVIEW_ACTIONS = Object.freeze({
  ADVANCED: 'advanced',
  CORRECTIVE_TASK_ISSUED: 'corrective_task_issued',
  HALTED: 'halted'
});

/**
 * Phase-level review actions. Note: uses PLURAL "corrective_tasks_issued" —
 * intentionally different from task-level REVIEW_ACTIONS.
 * @type {Readonly<{ADVANCED: 'advanced', CORRECTIVE_TASKS_ISSUED: 'corrective_tasks_issued', HALTED: 'halted'}>}
 */
const PHASE_REVIEW_ACTIONS = Object.freeze({
  ADVANCED: 'advanced',
  CORRECTIVE_TASKS_ISSUED: 'corrective_tasks_issued',
  HALTED: 'halted'
});

/**
 * @type {Readonly<{MINOR: 'minor', CRITICAL: 'critical'}>}
 */
const SEVERITY_LEVELS = Object.freeze({
  MINOR: 'minor',
  CRITICAL: 'critical'
});

/**
 * @type {Readonly<{ASK: 'ask', PHASE: 'phase', TASK: 'task', AUTONOMOUS: 'autonomous'}>}
 */
const HUMAN_GATE_MODES = Object.freeze({
  ASK: 'ask',
  PHASE: 'phase',
  TASK: 'task',
  AUTONOMOUS: 'autonomous'
});

/**
 * @type {Readonly<{TASK: 'task', PHASE: 'phase'}>}
 */
const TRIAGE_LEVELS = Object.freeze({
  TASK: 'task',
  PHASE: 'phase'
});

/**
 * Complete closed enum of next-action values (35 values).
 * @type {Readonly<{
 *   INIT_PROJECT: 'init_project',
 *   DISPLAY_HALTED: 'display_halted',
 *   SPAWN_RESEARCH: 'spawn_research',
 *   SPAWN_PRD: 'spawn_prd',
 *   SPAWN_DESIGN: 'spawn_design',
 *   SPAWN_ARCHITECTURE: 'spawn_architecture',
 *   SPAWN_MASTER_PLAN: 'spawn_master_plan',
 *   REQUEST_PLAN_APPROVAL: 'request_plan_approval',
 *   TRANSITION_TO_EXECUTION: 'transition_to_execution',
 *   CREATE_PHASE_PLAN: 'create_phase_plan',
 *   CREATE_TASK_HANDOFF: 'create_task_handoff',
 *   EXECUTE_TASK: 'execute_task',
 *   UPDATE_STATE_FROM_TASK: 'update_state_from_task',
 *   CREATE_CORRECTIVE_HANDOFF: 'create_corrective_handoff',
 *   HALT_TASK_FAILED: 'halt_task_failed',
 *   SPAWN_CODE_REVIEWER: 'spawn_code_reviewer',
 *   UPDATE_STATE_FROM_REVIEW: 'update_state_from_review',
 *   TRIAGE_TASK: 'triage_task',
 *   HALT_TRIAGE_INVARIANT: 'halt_triage_invariant',
 *   RETRY_FROM_REVIEW: 'retry_from_review',
 *   HALT_FROM_REVIEW: 'halt_from_review',
 *   ADVANCE_TASK: 'advance_task',
 *   GATE_TASK: 'gate_task',
 *   GENERATE_PHASE_REPORT: 'generate_phase_report',
 *   SPAWN_PHASE_REVIEWER: 'spawn_phase_reviewer',
 *   UPDATE_STATE_FROM_PHASE_REVIEW: 'update_state_from_phase_review',
 *   TRIAGE_PHASE: 'triage_phase',
 *   HALT_PHASE_TRIAGE_INVARIANT: 'halt_phase_triage_invariant',
 *   GATE_PHASE: 'gate_phase',
 *   ADVANCE_PHASE: 'advance_phase',
 *   TRANSITION_TO_REVIEW: 'transition_to_review',
 *   SPAWN_FINAL_REVIEWER: 'spawn_final_reviewer',
 *   REQUEST_FINAL_APPROVAL: 'request_final_approval',
 *   TRANSITION_TO_COMPLETE: 'transition_to_complete',
 *   DISPLAY_COMPLETE: 'display_complete'
 * }>}
 */
const NEXT_ACTIONS = Object.freeze({
  INIT_PROJECT: 'init_project',
  DISPLAY_HALTED: 'display_halted',
  SPAWN_RESEARCH: 'spawn_research',
  SPAWN_PRD: 'spawn_prd',
  SPAWN_DESIGN: 'spawn_design',
  SPAWN_ARCHITECTURE: 'spawn_architecture',
  SPAWN_MASTER_PLAN: 'spawn_master_plan',
  REQUEST_PLAN_APPROVAL: 'request_plan_approval',
  TRANSITION_TO_EXECUTION: 'transition_to_execution',
  CREATE_PHASE_PLAN: 'create_phase_plan',
  CREATE_TASK_HANDOFF: 'create_task_handoff',
  EXECUTE_TASK: 'execute_task',
  UPDATE_STATE_FROM_TASK: 'update_state_from_task',
  CREATE_CORRECTIVE_HANDOFF: 'create_corrective_handoff',
  HALT_TASK_FAILED: 'halt_task_failed',
  SPAWN_CODE_REVIEWER: 'spawn_code_reviewer',
  UPDATE_STATE_FROM_REVIEW: 'update_state_from_review',
  TRIAGE_TASK: 'triage_task',
  HALT_TRIAGE_INVARIANT: 'halt_triage_invariant',
  RETRY_FROM_REVIEW: 'retry_from_review',
  HALT_FROM_REVIEW: 'halt_from_review',
  ADVANCE_TASK: 'advance_task',
  GATE_TASK: 'gate_task',
  GENERATE_PHASE_REPORT: 'generate_phase_report',
  SPAWN_PHASE_REVIEWER: 'spawn_phase_reviewer',
  UPDATE_STATE_FROM_PHASE_REVIEW: 'update_state_from_phase_review',
  TRIAGE_PHASE: 'triage_phase',
  HALT_PHASE_TRIAGE_INVARIANT: 'halt_phase_triage_invariant',
  GATE_PHASE: 'gate_phase',
  ADVANCE_PHASE: 'advance_phase',
  TRANSITION_TO_REVIEW: 'transition_to_review',
  SPAWN_FINAL_REVIEWER: 'spawn_final_reviewer',
  REQUEST_FINAL_APPROVAL: 'request_final_approval',
  TRANSITION_TO_COMPLETE: 'transition_to_complete',
  DISPLAY_COMPLETE: 'display_complete'
});

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = {
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
};
