#!/usr/bin/env node
'use strict';

const { readFile, exists } = require('../.github/skills/validate-orchestration/scripts/lib/utils/fs-helpers');
const { parseYaml } = require('../.github/skills/validate-orchestration/scripts/lib/utils/yaml-parser');
const { resolveNextAction } = require('./lib/resolver');

/**
 * Parse CLI arguments for --state and --config flags.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ state: string, config: string|null }}
 * @throws {Error} If --state is missing
 */
function parseArgs(argv) {
  let state = null;
  let config = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--state' && i + 1 < argv.length) {
      state = argv[i + 1];
      i++;
    } else if (argv[i] === '--config' && i + 1 < argv.length) {
      config = argv[i + 1];
      i++;
    }
  }

  if (!state) {
    throw new Error('Usage: next-action --state <path> [--config <path>]\nMissing required flag: --state');
  }

  return { state, config };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // If state file does not exist, this is a new project — return init_project
  if (!exists(args.state)) {
    const result = resolveNextAction(null);
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    process.exit(0);
  }

  const stateRaw = readFile(args.state);
  if (stateRaw === null) {
    process.stderr.write(`[ERROR] next-action: Cannot read state file: ${args.state}\n`);
    process.exit(1);
  }

  let stateObj;
  try {
    stateObj = JSON.parse(stateRaw);
  } catch (err) {
    process.stderr.write(`[ERROR] next-action: Invalid JSON in ${args.state}: ${err.message}\n`);
    process.exit(1);
  }

  let configObj;
  if (args.config && exists(args.config)) {
    const configRaw = readFile(args.config);
    if (configRaw !== null) {
      configObj = parseYaml(configRaw);
    }
  }

  const result = resolveNextAction(stateObj, configObj);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

if (require.main === module) {
  main().catch(err => {
    process.stderr.write(`[ERROR] next-action: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { parseArgs };
