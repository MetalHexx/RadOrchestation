'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseArgs } = require('../src/next-action.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

const TMP_DIR = path.join(__dirname, '__tmp_next_action_cli__');

function makeValidState() {
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
              status: 'not_started',
              handoff_doc: null,
              report_doc: null,
              retries: 0,
              last_error: null,
              severity: null,
              review_doc: null,
              review_verdict: null,
              review_action: null
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

function writeJson(filename, obj) {
  fs.writeFileSync(path.join(TMP_DIR, filename), JSON.stringify(obj, null, 2));
  return path.join(TMP_DIR, filename);
}

function writeText(filename, content) {
  fs.writeFileSync(path.join(TMP_DIR, filename), content);
  return path.join(TMP_DIR, filename);
}

function runCLI(args) {
  const script = path.resolve(__dirname, '..', 'src', 'next-action.js');
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      exitCode: err.status,
      stdout: err.stdout || '',
      stderr: err.stderr || ''
    };
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('next-action CLI', () => {

  before(() => {
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }
  });

  after(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  // ── parseArgs unit tests ────────────────────────────────────────────────

  describe('parseArgs', () => {
    it('returns state and null config when only --state provided', () => {
      const result = parseArgs(['--state', 'path.json']);
      assert.deepStrictEqual(result, { state: 'path.json', config: null });
    });

    it('returns state and config when both flags provided', () => {
      const result = parseArgs(['--state', 'path.json', '--config', 'config.yml']);
      assert.deepStrictEqual(result, { state: 'path.json', config: 'config.yml' });
    });

    it('handles reversed flag order', () => {
      const result = parseArgs(['--config', 'config.yml', '--state', 'path.json']);
      assert.deepStrictEqual(result, { state: 'path.json', config: 'config.yml' });
    });

    it('throws when argv is empty', () => {
      assert.throws(() => parseArgs([]), (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('--state'));
        return true;
      });
    });

    it('throws when --state is missing but --config is present', () => {
      assert.throws(() => parseArgs(['--config', 'config.yml']), (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('--state'));
        return true;
      });
    });
  });

  // ── require.main guard ──────────────────────────────────────────────────

  describe('require.main guard', () => {
    it('require does NOT execute main()', () => {
      const mod = require('../src/next-action.js');
      assert.strictEqual(typeof mod.parseArgs, 'function');
    });
  });

  // ── End-to-end tests ───────────────────────────────────────────────────

  describe('end-to-end', () => {
    it('emits valid JSON with action and context for a valid state file', () => {
      const statePath = writeJson('state-valid.json', makeValidState());
      const { exitCode, stdout } = runCLI(['--state', statePath]);
      assert.strictEqual(exitCode, 0);

      const result = JSON.parse(stdout);
      assert.ok(typeof result.action === 'string', 'result should have action string');
      assert.ok(result.context !== undefined, 'result should have context');
      assert.ok('tier' in result.context, 'context should have tier');
      assert.ok('phase_index' in result.context, 'context should have phase_index');
      assert.ok('task_index' in result.context, 'context should have task_index');
      assert.ok('phase_id' in result.context, 'context should have phase_id');
      assert.ok('task_id' in result.context, 'context should have task_id');
      assert.ok('details' in result.context, 'context should have details');
    });

    it('emits init_project JSON and exits 0 when state file does not exist', () => {
      const nonexistent = path.join(TMP_DIR, 'does-not-exist.json');
      const { exitCode, stdout } = runCLI(['--state', nonexistent]);
      assert.strictEqual(exitCode, 0);

      const result = JSON.parse(stdout);
      assert.strictEqual(result.action, 'init_project');
      assert.strictEqual(result.context.tier, null);
      assert.strictEqual(result.context.phase_index, null);
      assert.strictEqual(result.context.task_index, null);
      assert.strictEqual(result.context.phase_id, null);
      assert.strictEqual(result.context.task_id, null);
      assert.ok(result.context.details.length > 0);
    });

    it('exits 1 with error on stderr when no flags provided', () => {
      const { exitCode, stderr } = runCLI([]);
      assert.strictEqual(exitCode, 1);
      assert.ok(stderr.includes('[ERROR] next-action:'));
      assert.ok(stderr.includes('--state'));
    });

    it('exits 1 with error on stderr for invalid JSON in state file', () => {
      const badPath = writeText('bad-state.json', '{ not valid json !!!');
      const { exitCode, stderr } = runCLI(['--state', badPath]);
      assert.strictEqual(exitCode, 1);
      assert.ok(stderr.includes('[ERROR] next-action: Invalid JSON in'));
    });

    it('works with optional --config flag pointing to a valid YAML file', () => {
      const statePath = writeJson('state-with-config.json', makeValidState());
      const configPath = writeText('config.yml', [
        'human_gates:',
        '  execution_mode: autonomous',
        ''
      ].join('\n'));

      const { exitCode, stdout } = runCLI(['--state', statePath, '--config', configPath]);
      assert.strictEqual(exitCode, 0);

      const result = JSON.parse(stdout);
      assert.ok(typeof result.action === 'string');
      assert.ok(result.context !== undefined);
    });

    it('works when --config points to a nonexistent file (config is optional)', () => {
      const statePath = writeJson('state-noconfig.json', makeValidState());
      const { exitCode, stdout } = runCLI(['--state', statePath, '--config', '/nonexistent/config.yml']);
      assert.strictEqual(exitCode, 0);

      const result = JSON.parse(stdout);
      assert.ok(typeof result.action === 'string');
    });

    it('produces correct action for a state in planning tier', () => {
      const state = makeValidState();
      state.pipeline.current_tier = 'planning';
      state.planning.status = 'in_progress';
      state.planning.steps.research.status = 'not_started';
      state.planning.steps.research.output = null;
      state.planning.steps.prd.status = 'not_started';
      state.planning.steps.prd.output = null;
      state.planning.steps.design.status = 'not_started';
      state.planning.steps.design.output = null;
      state.planning.steps.architecture.status = 'not_started';
      state.planning.steps.architecture.output = null;
      state.planning.steps.master_plan.status = 'not_started';
      state.planning.steps.master_plan.output = null;
      state.planning.human_approved = false;
      state.execution.status = 'not_started';
      state.execution.current_phase = null;
      state.execution.total_phases = 0;
      state.execution.phases = [];

      const statePath = writeJson('state-planning.json', state);
      const { exitCode, stdout } = runCLI(['--state', statePath]);
      assert.strictEqual(exitCode, 0);

      const result = JSON.parse(stdout);
      assert.strictEqual(result.action, 'spawn_research');
      assert.strictEqual(result.context.tier, 'planning');
    });
  });
});
