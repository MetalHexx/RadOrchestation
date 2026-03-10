'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseArgs } = require('../src/validate-state.js');

// ─── Helpers ────────────────────────────────────────────────────────────────

const TMP_DIR = path.join(__dirname, '__tmp_validator_cli__');

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
          total_tasks: 1,
          tasks: [
            {
              task_number: 1,
              title: 'Task One',
              status: 'in_progress',
              handoff_doc: 'tasks/TASK-P01-T01.md',
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

function runCLI(args) {
  const script = path.resolve(__dirname, '..', 'src', 'validate-state.js');
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

describe('validate-state CLI', () => {

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
    it('returns current and proposed from argv', () => {
      const result = parseArgs(['--current', 'a.json', '--proposed', 'b.json']);
      assert.deepStrictEqual(result, { current: 'a.json', proposed: 'b.json' });
    });

    it('throws when argv is empty', () => {
      assert.throws(() => parseArgs([]), (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('--current'));
        return true;
      });
    });

    it('throws when --proposed is missing', () => {
      assert.throws(() => parseArgs(['--current', 'a.json']), (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('--proposed'));
        return true;
      });
    });

    it('throws when --current is missing', () => {
      assert.throws(() => parseArgs(['--proposed', 'b.json']), (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('--current'));
        return true;
      });
    });

    it('handles reversed flag order', () => {
      const result = parseArgs(['--proposed', 'b.json', '--current', 'a.json']);
      assert.deepStrictEqual(result, { current: 'a.json', proposed: 'b.json' });
    });
  });

  // ── require.main guard ──────────────────────────────────────────────────

  describe('require.main guard', () => {
    it('require does NOT execute main()', () => {
      // If main() ran on require, it would throw/exit since no args are passed.
      // The fact we got here without a crash proves the guard works.
      const mod = require('../src/validate-state.js');
      assert.strictEqual(typeof mod.parseArgs, 'function');
    });
  });

  // ── End-to-end tests ───────────────────────────────────────────────────

  describe('end-to-end', () => {
    it('exits 0 with valid JSON for a valid transition', () => {
      const current = makeValidState();
      const proposed = makeValidState();
      proposed.project.updated = '2026-01-01T13:00:00Z';

      const currentPath = writeJson('current-valid.json', current);
      const proposedPath = writeJson('proposed-valid.json', proposed);

      const { exitCode, stdout } = runCLI(['--current', currentPath, '--proposed', proposedPath]);
      assert.strictEqual(exitCode, 0);

      const result = JSON.parse(stdout);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.invariants_checked, 15);
    });

    it('exits 1 with valid:false for an invariant violation', () => {
      const current = makeValidState();
      const proposed = makeValidState();
      proposed.project.updated = '2026-01-01T13:00:00Z';
      // Violate V1: current_phase points beyond phases array
      proposed.execution.current_phase = 99;

      const currentPath = writeJson('current-v1.json', current);
      const proposedPath = writeJson('proposed-v1.json', proposed);

      const { exitCode, stdout } = runCLI(['--current', currentPath, '--proposed', proposedPath]);
      assert.strictEqual(exitCode, 1);

      const result = JSON.parse(stdout);
      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length > 0);
    });

    it('exits 1 with error on stderr when no flags provided', () => {
      const { exitCode, stderr } = runCLI([]);
      assert.strictEqual(exitCode, 1);
      assert.ok(stderr.includes('[ERROR] validate-state:'));
    });

    it('exits 1 with error on stderr for missing --current flag', () => {
      const { exitCode, stderr } = runCLI(['--proposed', 'x.json']);
      assert.strictEqual(exitCode, 1);
      assert.ok(stderr.includes('[ERROR] validate-state:'));
      assert.ok(stderr.includes('--current'));
    });

    it('exits 1 with error on stderr for unreadable file', () => {
      const proposedPath = writeJson('proposed-unreadable.json', makeValidState());
      const { exitCode, stderr } = runCLI(['--current', '/nonexistent/path.json', '--proposed', proposedPath]);
      assert.strictEqual(exitCode, 1);
      assert.ok(stderr.includes('[ERROR] validate-state: Cannot read current state file:'));
    });

    it('exits 1 with error on stderr for invalid JSON', () => {
      const badPath = path.join(TMP_DIR, 'bad.json');
      fs.writeFileSync(badPath, '{ not valid json !!!');
      const validPath = writeJson('current-for-badjson.json', makeValidState());

      const { exitCode, stderr } = runCLI(['--current', validPath, '--proposed', badPath]);
      assert.strictEqual(exitCode, 1);
      assert.ok(stderr.includes('[ERROR] validate-state: Invalid JSON in'));
    });
  });
});
