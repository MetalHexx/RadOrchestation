#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { readFile } = require('../.github/skills/validate-orchestration/scripts/lib/utils/fs-helpers');
const { extractFrontmatter } = require('../.github/skills/validate-orchestration/scripts/lib/utils/frontmatter');
const { executeTriage } = require('./lib/triage-engine');
const { TRIAGE_LEVELS } = require('./lib/constants');

/**
 * Parse CLI arguments for --state, --level, and --project-dir flags.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ state: string, level: 'task'|'phase', projectDir: string }}
 * @throws {Error} If --state, --level, or --project-dir is missing; or if --level is invalid
 */
function parseArgs(argv) {
  let state = null;
  let level = null;
  let projectDir = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--state' && i + 1 < argv.length) {
      state = argv[i + 1];
      i++;
    } else if (argv[i] === '--level' && i + 1 < argv.length) {
      level = argv[i + 1];
      i++;
    } else if (argv[i] === '--project-dir' && i + 1 < argv.length) {
      projectDir = argv[i + 1];
      i++;
    }
  }

  if (!state) {
    throw new Error('Usage: triage --state <path> --level <task|phase> --project-dir <path>\nMissing required flag: --state');
  }
  if (!level) {
    throw new Error('Usage: triage --state <path> --level <task|phase> --project-dir <path>\nMissing required flag: --level');
  }
  if (!projectDir) {
    throw new Error('Usage: triage --state <path> --level <task|phase> --project-dir <path>\nMissing required flag: --project-dir');
  }
  if (level !== TRIAGE_LEVELS.TASK && level !== TRIAGE_LEVELS.PHASE) {
    throw new Error(`Invalid --level value: '${level}'. Must be 'task' or 'phase'.`);
  }

  return { state, level, projectDir };
}

/**
 * Create a readDocument callback wired to real filesystem I/O.
 * @param {string} projectDir - Base directory for resolving relative document paths
 * @returns {function(string): { frontmatter: Record<string, any> | null, body: string } | null}
 */
function createReadDocument(projectDir) {
  return function readDocument(docPath) {
    const fullPath = path.resolve(projectDir, docPath);
    const content = readFile(fullPath);
    if (content === null) return null;
    return extractFrontmatter(content);
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Read state.json
  const stateRaw = readFile(args.state);
  if (stateRaw === null) {
    process.stderr.write(`[ERROR] triage: Cannot read state file: ${args.state}\n`);
    process.exit(1);
  }

  let stateObj;
  try {
    stateObj = JSON.parse(stateRaw);
  } catch (err) {
    process.stderr.write(`[ERROR] triage: Invalid JSON in ${args.state}: ${err.message}\n`);
    process.exit(1);
  }

  // Wire readDocument to filesystem
  const readDoc = createReadDocument(args.projectDir);

  // Execute triage
  const result = executeTriage(stateObj, args.level, readDoc);

  if (result.success === true) {
    // Apply verdict/action to in-memory state
    const phase = stateObj.execution.phases[stateObj.execution.current_phase];

    if (args.level === TRIAGE_LEVELS.TASK) {
      const task = phase.tasks[phase.current_task];
      task.review_verdict = result.verdict;
      task.review_action = result.action;
    } else {
      phase.phase_review_verdict = result.verdict;
      phase.phase_review_action = result.action;
    }

    // Update timestamp
    stateObj.project.updated = new Date().toISOString();

    // Write atomically
    fs.writeFileSync(args.state, JSON.stringify(stateObj, null, 2) + '\n');

    // Emit result to stdout
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exit(0);
  } else {
    // Do NOT modify state.json on failure
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    process.stderr.write(`[ERROR] triage: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { parseArgs, createReadDocument };
