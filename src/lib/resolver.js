'use strict';

const {
  PIPELINE_TIERS, PLANNING_STATUSES, PLANNING_STEP_STATUSES,
  PHASE_STATUSES, TASK_STATUSES, REVIEW_VERDICTS, REVIEW_ACTIONS,
  PHASE_REVIEW_ACTIONS, SEVERITY_LEVELS, HUMAN_GATE_MODES, NEXT_ACTIONS
} = require('./constants');

// ─── Planning Step Order ────────────────────────────────────────────────────

/**
 * Ordered mapping of planning step keys to their spawn actions.
 * Steps are evaluated strictly in this order.
 * @type {ReadonlyArray<{key: string, action: string}>}
 */
const PLANNING_STEP_ORDER = [
  { key: 'research',     action: NEXT_ACTIONS.SPAWN_RESEARCH },
  { key: 'prd',          action: NEXT_ACTIONS.SPAWN_PRD },
  { key: 'design',       action: NEXT_ACTIONS.SPAWN_DESIGN },
  { key: 'architecture', action: NEXT_ACTIONS.SPAWN_ARCHITECTURE },
  { key: 'master_plan',  action: NEXT_ACTIONS.SPAWN_MASTER_PLAN }
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format a 0-based phase index as a zero-padded phase ID.
 * @param {number} phaseIndex - 0-based index
 * @returns {string} e.g. "P01"
 */
function formatPhaseId(phaseIndex) {
  return 'P' + String(phaseIndex + 1).padStart(2, '0');
}

/**
 * Format 0-based phase and task indices as a zero-padded task ID.
 * @param {number} phaseIndex - 0-based index
 * @param {number} taskIndex - 0-based index
 * @returns {string} e.g. "P01-T03"
 */
function formatTaskId(phaseIndex, taskIndex) {
  return formatPhaseId(phaseIndex) + '-T' + String(taskIndex + 1).padStart(2, '0');
}

/**
 * Construct a NextActionResult object with sensible defaults.
 * @param {string} action - One of NEXT_ACTIONS enum values
 * @param {Object} opts - Context fields
 * @param {string|null} [opts.tier] - Current pipeline tier
 * @param {number|null} [opts.phase_index] - 0-based phase index
 * @param {number|null} [opts.task_index] - 0-based task index
 * @param {string|null} [opts.phase_id] - e.g. "P01"
 * @param {string|null} [opts.task_id] - e.g. "P01-T03"
 * @param {string} [opts.details] - Explanation of resolution path
 * @returns {NextActionResult}
 */
function makeResult(action, opts) {
  return {
    action,
    context: {
      tier:        opts.tier        || null,
      phase_index: opts.phase_index ?? null,
      task_index:  opts.task_index  ?? null,
      phase_id:    opts.phase_id    || null,
      task_id:     opts.task_id     || null,
      details:     opts.details     || ''
    }
  };
}

// ─── Human Gate Mode Resolution ─────────────────────────────────────────────

/**
 * Resolve the effective human gate mode from config override or state fallback.
 * @param {StateJson} state - Parsed state.json
 * @param {OrchestratorConfig} [config] - Optional orchestration.yml config
 * @returns {string} One of HUMAN_GATE_MODES values
 */
function resolveHumanGateMode(state, config) {
  if (config && config.human_gates && config.human_gates.execution_mode) {
    return config.human_gates.execution_mode;
  }
  return (state.pipeline && state.pipeline.human_gate_mode) || HUMAN_GATE_MODES.ASK;
}

// ─── Planning Tier ──────────────────────────────────────────────────────────

/**
 * Resolve the next action within the planning tier.
 * Steps are evaluated in strict order: research → prd → design → architecture → master_plan.
 * @param {StateJson} state - Parsed state.json
 * @returns {NextActionResult}
 */
function resolvePlanning(state) {
  const steps = state.planning.steps;

  // Check each planning step in order; first incomplete step wins
  for (const step of PLANNING_STEP_ORDER) {
    if (steps[step.key].status !== PLANNING_STEP_STATUSES.COMPLETE) {
      return makeResult(step.action, {
        tier: PIPELINE_TIERS.PLANNING,
        details: 'Planning step "' + step.key + '" is not complete (status: ' + steps[step.key].status + ')'
      });
    }
  }

  // All steps complete — check human approval gate
  if (!state.planning.human_approved) {
    return makeResult(NEXT_ACTIONS.REQUEST_PLAN_APPROVAL, {
      tier: PIPELINE_TIERS.PLANNING,
      details: 'All planning steps complete; awaiting human approval of master plan'
    });
  }

  // All steps complete and approved — transition to execution
  return makeResult(NEXT_ACTIONS.TRANSITION_TO_EXECUTION, {
    tier: PIPELINE_TIERS.PLANNING,
    details: 'All planning steps complete and human-approved; transitioning to execution tier'
  });
}

// ─── Task Lifecycle ─────────────────────────────────────────────────────────

/**
 * Resolve the next action for a specific task within the execution tier.
 * Routes by task.status, then by sub-conditions within each status.
 * @param {Task} task - Current task object
 * @param {number} taskIndex - 0-based task index
 * @param {Phase} phase - Parent phase object
 * @param {number} phaseIndex - 0-based phase index
 * @param {string} humanGateMode - Resolved human gate mode
 * @param {Object} limits - state.limits with max_retries_per_task
 * @returns {NextActionResult}
 */
function resolveTaskLifecycle(task, taskIndex, phase, phaseIndex, humanGateMode, limits) {
  const phaseId = formatPhaseId(phaseIndex);
  const taskId = formatTaskId(phaseIndex, taskIndex);
  const baseOpts = {
    tier: PIPELINE_TIERS.EXECUTION,
    phase_index: phaseIndex,
    task_index: taskIndex,
    phase_id: phaseId,
    task_id: taskId
  };

  // ── not_started ───────────────────────────────────────────────────────
  if (task.status === TASK_STATUSES.NOT_STARTED) {
    if (!task.handoff_doc) {
      return makeResult(NEXT_ACTIONS.CREATE_TASK_HANDOFF, {
        ...baseOpts,
        details: 'Task ' + taskId + ' has no handoff document; creating task handoff'
      });
    }
    return makeResult(NEXT_ACTIONS.EXECUTE_TASK, {
      ...baseOpts,
      details: 'Task ' + taskId + ' has handoff document; spawning Coder to execute'
    });
  }

  // ── in_progress ───────────────────────────────────────────────────────
  if (task.status === TASK_STATUSES.IN_PROGRESS) {
    return makeResult(NEXT_ACTIONS.UPDATE_STATE_FROM_TASK, {
      ...baseOpts,
      details: 'Task ' + taskId + ' is in progress; checking Coder results and recording'
    });
  }

  // ── failed ────────────────────────────────────────────────────────────
  if (task.status === TASK_STATUSES.FAILED) {
    if (task.severity === SEVERITY_LEVELS.CRITICAL) {
      return makeResult(NEXT_ACTIONS.HALT_TASK_FAILED, {
        ...baseOpts,
        details: 'Task ' + taskId + ' failed with critical severity; halting immediately'
      });
    }
    if (task.retries >= limits.max_retries_per_task) {
      return makeResult(NEXT_ACTIONS.HALT_TASK_FAILED, {
        ...baseOpts,
        details: 'Task ' + taskId + ' failed and retry budget exhausted (' + task.retries + '/' + limits.max_retries_per_task + ')'
      });
    }
    return makeResult(NEXT_ACTIONS.CREATE_CORRECTIVE_HANDOFF, {
      ...baseOpts,
      details: 'Task ' + taskId + ' failed (minor) with retries available (' + task.retries + '/' + limits.max_retries_per_task + '); creating corrective handoff'
    });
  }

  // ── complete ──────────────────────────────────────────────────────────
  // IMPORTANT: Check review_verdict BEFORE review_doc (supports fast-track approval)
  if (task.status === TASK_STATUSES.COMPLETE) {
    // T7: review_verdict === 'approved'
    if (task.review_verdict === REVIEW_VERDICTS.APPROVED) {
      if (humanGateMode === HUMAN_GATE_MODES.TASK) {
        return makeResult(NEXT_ACTIONS.GATE_TASK, {
          ...baseOpts,
          details: 'Task ' + taskId + ' approved; human gate mode is "task" — requesting human gate'
        });
      }
      return makeResult(NEXT_ACTIONS.ADVANCE_TASK, {
        ...baseOpts,
        details: 'Task ' + taskId + ' approved; advancing to next task'
      });
    }

    // T8: review_verdict === 'changes_requested'
    if (task.review_verdict === REVIEW_VERDICTS.CHANGES_REQUESTED) {
      return makeResult(NEXT_ACTIONS.RETRY_FROM_REVIEW, {
        ...baseOpts,
        details: 'Task ' + taskId + ' review requested changes; creating corrective handoff from review'
      });
    }

    // T9: review_verdict === 'rejected'
    if (task.review_verdict === REVIEW_VERDICTS.REJECTED) {
      return makeResult(NEXT_ACTIONS.HALT_FROM_REVIEW, {
        ...baseOpts,
        details: 'Task ' + taskId + ' rejected by reviewer; halting from review'
      });
    }

    // T10: review_doc exists but no verdict yet → needs triage
    if (task.review_doc !== null && task.review_verdict === null) {
      return makeResult(NEXT_ACTIONS.TRIAGE_TASK, {
        ...baseOpts,
        details: 'Task ' + taskId + ' has review document but no verdict; triaging task'
      });
    }

    // T11: no review_doc and no verdict → needs code review
    if (task.review_doc === null && task.review_verdict === null) {
      return makeResult(NEXT_ACTIONS.SPAWN_CODE_REVIEWER, {
        ...baseOpts,
        details: 'Task ' + taskId + ' complete but no review; spawning code reviewer'
      });
    }
  }

  // ── halted ────────────────────────────────────────────────────────────
  if (task.status === TASK_STATUSES.HALTED) {
    return makeResult(NEXT_ACTIONS.DISPLAY_HALTED, {
      ...baseOpts,
      details: 'Task ' + taskId + ' is halted; displaying halt status'
    });
  }

  // Fallback for unknown task status (defensive)
  return makeResult(NEXT_ACTIONS.DISPLAY_HALTED, {
    ...baseOpts,
    details: 'Task ' + taskId + ' has unexpected status "' + task.status + '"; treating as halted'
  });
}

// ─── Phase Lifecycle ────────────────────────────────────────────────────────

/**
 * Resolve the next action for phase-level lifecycle (all tasks processed).
 * Entered when phase.current_task >= phase.tasks.length.
 * @param {Phase} phase - Current phase object
 * @param {number} phaseIndex - 0-based phase index
 * @param {string} humanGateMode - Resolved human gate mode
 * @returns {NextActionResult}
 */
function resolvePhaseLifecycle(phase, phaseIndex, humanGateMode) {
  const phaseId = formatPhaseId(phaseIndex);
  const baseOpts = {
    tier: PIPELINE_TIERS.EXECUTION,
    phase_index: phaseIndex,
    phase_id: phaseId
  };

  // P1: No phase report yet
  if (!phase.phase_report) {
    return makeResult(NEXT_ACTIONS.GENERATE_PHASE_REPORT, {
      ...baseOpts,
      details: 'Phase ' + phaseId + ' tasks complete; generating phase report'
    });
  }

  // P2: No phase review yet
  if (!phase.phase_review) {
    return makeResult(NEXT_ACTIONS.SPAWN_PHASE_REVIEWER, {
      ...baseOpts,
      details: 'Phase ' + phaseId + ' report exists; spawning phase reviewer'
    });
  }

  // P3: Review exists but no verdict
  if (phase.phase_review !== null && phase.phase_review_verdict === null) {
    return makeResult(NEXT_ACTIONS.TRIAGE_PHASE, {
      ...baseOpts,
      details: 'Phase ' + phaseId + ' review exists but no verdict; triaging phase'
    });
  }

  // P4: Phase review action is halted
  if (phase.phase_review_action === PHASE_REVIEW_ACTIONS.HALTED) {
    return makeResult(NEXT_ACTIONS.DISPLAY_HALTED, {
      ...baseOpts,
      details: 'Phase ' + phaseId + ' review action is halted; displaying halt status'
    });
  }

  // P5: Corrective tasks issued → re-plan
  if (phase.phase_review_action === PHASE_REVIEW_ACTIONS.CORRECTIVE_TASKS_ISSUED) {
    return makeResult(NEXT_ACTIONS.CREATE_PHASE_PLAN, {
      ...baseOpts,
      details: 'Phase ' + phaseId + ' needs corrective tasks; re-planning phase'
    });
  }

  // P6: Approved with phase gate mode
  if (phase.phase_review_verdict === REVIEW_VERDICTS.APPROVED && humanGateMode === HUMAN_GATE_MODES.PHASE) {
    return makeResult(NEXT_ACTIONS.GATE_PHASE, {
      ...baseOpts,
      details: 'Phase ' + phaseId + ' approved; human gate mode is "phase" — requesting human gate'
    });
  }

  // P7: Approved — advance phase
  if (phase.phase_review_verdict === REVIEW_VERDICTS.APPROVED) {
    return makeResult(NEXT_ACTIONS.ADVANCE_PHASE, {
      ...baseOpts,
      details: 'Phase ' + phaseId + ' approved; advancing to next phase'
    });
  }

  // Fallback (defensive)
  return makeResult(NEXT_ACTIONS.DISPLAY_HALTED, {
    ...baseOpts,
    details: 'Phase ' + phaseId + ' in unexpected state; treating as halted'
  });
}

// ─── Execution Tier ─────────────────────────────────────────────────────────

/**
 * Resolve the next action within the execution tier.
 * Routes by current phase, then delegates to task or phase lifecycle.
 * @param {StateJson} state - Parsed state.json
 * @param {string} humanGateMode - Resolved human gate mode
 * @returns {NextActionResult}
 */
function resolveExecution(state, humanGateMode) {
  const execution = state.execution;
  const phases = execution.phases;
  const currentPhaseIndex = execution.current_phase;
  const limits = state.limits;

  // 2a: All phases done → transition to review
  if (currentPhaseIndex >= phases.length) {
    return makeResult(NEXT_ACTIONS.TRANSITION_TO_REVIEW, {
      tier: PIPELINE_TIERS.EXECUTION,
      details: 'All phases complete (current_phase ' + currentPhaseIndex + ' >= ' + phases.length + ' phases); transitioning to review tier'
    });
  }

  const phase = phases[currentPhaseIndex];
  const phaseId = formatPhaseId(currentPhaseIndex);

  // 2b: Phase not started → create phase plan
  if (phase.status === PHASE_STATUSES.NOT_STARTED) {
    return makeResult(NEXT_ACTIONS.CREATE_PHASE_PLAN, {
      tier: PIPELINE_TIERS.EXECUTION,
      phase_index: currentPhaseIndex,
      phase_id: phaseId,
      details: 'Phase ' + phaseId + ' has not started; creating phase plan'
    });
  }

  // 2c: All tasks processed → phase lifecycle
  if (phase.current_task >= phase.tasks.length) {
    return resolvePhaseLifecycle(phase, currentPhaseIndex, humanGateMode);
  }

  // 2d: Route by current task
  const currentTaskIndex = phase.current_task;
  const task = phase.tasks[currentTaskIndex];
  return resolveTaskLifecycle(task, currentTaskIndex, phase, currentPhaseIndex, humanGateMode, limits);
}

// ─── Review Tier ────────────────────────────────────────────────────────────

/**
 * Resolve the next action within the review tier.
 * @param {StateJson} state - Parsed state.json
 * @returns {NextActionResult}
 */
function resolveReview(state) {
  const finalReview = state.final_review;

  // 3a: Final review not complete → spawn reviewer
  if (finalReview.status !== TASK_STATUSES.COMPLETE) {
    return makeResult(NEXT_ACTIONS.SPAWN_FINAL_REVIEWER, {
      tier: PIPELINE_TIERS.REVIEW,
      details: 'Final review status is "' + finalReview.status + '"; spawning final reviewer'
    });
  }

  // 3b: Final review complete but not human-approved
  if (!finalReview.human_approved) {
    return makeResult(NEXT_ACTIONS.REQUEST_FINAL_APPROVAL, {
      tier: PIPELINE_TIERS.REVIEW,
      details: 'Final review complete; awaiting human approval'
    });
  }

  // 3c: Final review complete and approved → transition to complete
  return makeResult(NEXT_ACTIONS.TRANSITION_TO_COMPLETE, {
    tier: PIPELINE_TIERS.REVIEW,
    details: 'Final review complete and human-approved; transitioning to complete'
  });
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * @typedef {Object} NextActionResult
 * @property {string} action - One of NEXT_ACTIONS enum values (35 possible values)
 * @property {Object} context
 * @property {string|null} context.tier - Current pipeline tier (PIPELINE_TIERS enum value)
 * @property {number|null} context.phase_index - 0-based index, null if not in execution tier
 * @property {number|null} context.task_index - 0-based index, null if not task-scoped
 * @property {string|null} context.phase_id - Human-readable e.g. "P01", null if N/A
 * @property {string|null} context.task_id - Human-readable e.g. "P01-T03", null if N/A
 * @property {string} context.details - Explanation of the resolution path taken
 */

/**
 * @typedef {Object} OrchestratorConfig
 * @property {Object} [human_gates]
 * @property {'ask'|'phase'|'task'|'autonomous'} [human_gates.execution_mode]
 * @property {Object} [projects]
 * @property {string} [projects.base_path]
 */

/**
 * Resolve the next action the Orchestrator should take.
 * Pure function: same inputs always produce same output.
 *
 * @param {StateJson|null|undefined} state - Parsed state.json object (null/undefined → init_project)
 * @param {OrchestratorConfig} [config] - Parsed orchestration.yml (optional)
 * @returns {NextActionResult}
 */
function resolveNextAction(state, config) {
  // 0a: No state → init project
  if (state == null) {
    return makeResult(NEXT_ACTIONS.INIT_PROJECT, {
      details: 'No state.json provided; initializing new project'
    });
  }

  const tier = state.pipeline.current_tier;

  // 0b: Halted
  if (tier === PIPELINE_TIERS.HALTED) {
    return makeResult(NEXT_ACTIONS.DISPLAY_HALTED, {
      tier: PIPELINE_TIERS.HALTED,
      details: 'Pipeline is halted; displaying blockers'
    });
  }

  // 0c: Complete
  if (tier === PIPELINE_TIERS.COMPLETE) {
    return makeResult(NEXT_ACTIONS.DISPLAY_COMPLETE, {
      tier: PIPELINE_TIERS.COMPLETE,
      details: 'Project is complete'
    });
  }

  // 1: Planning tier
  if (tier === PIPELINE_TIERS.PLANNING) {
    return resolvePlanning(state);
  }

  // 2: Execution tier
  if (tier === PIPELINE_TIERS.EXECUTION) {
    const humanGateMode = resolveHumanGateMode(state, config);
    return resolveExecution(state, humanGateMode);
  }

  // 3: Review tier
  if (tier === PIPELINE_TIERS.REVIEW) {
    return resolveReview(state);
  }

  // Fallback: unknown tier → treat as init
  return makeResult(NEXT_ACTIONS.INIT_PROJECT, {
    details: 'Unknown pipeline tier "' + tier + '"; defaulting to init_project'
  });
}

// ─── Exports ────────────────────────────────────────────────────────────────

module.exports = { resolveNextAction };
