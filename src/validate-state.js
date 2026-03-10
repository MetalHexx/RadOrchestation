#!/usr/bin/env node
'use strict';

const { readFile } = require('../.github/skills/validate-orchestration/scripts/lib/utils/fs-helpers');
const { validateTransition } = require('./lib/state-validator');

/**
 * Parse CLI arguments for --current and --proposed flags.
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {{ current: string, proposed: string }}
 * @throws {Error} If --current or --proposed is missing
 */
function parseArgs(argv) {
  let current = null;
  let proposed = null;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--current' && i + 1 < argv.length) {
      current = argv[i + 1];
      i++;
    } else if (argv[i] === '--proposed' && i + 1 < argv.length) {
      proposed = argv[i + 1];
      i++;
    }
  }

  if (!current && !proposed) {
    throw new Error('Usage: validate-state --current <path> --proposed <path>\nMissing required flags: --current, --proposed');
  }
  if (!current) {
    throw new Error('Usage: validate-state --current <path> --proposed <path>\nMissing required flag: --current');
  }
  if (!proposed) {
    throw new Error('Usage: validate-state --current <path> --proposed <path>\nMissing required flag: --proposed');
  }

  return { current, proposed };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const currentRaw = readFile(args.current);
  if (currentRaw === null) {
    process.stderr.write(`[ERROR] validate-state: Cannot read current state file: ${args.current}\n`);
    process.exit(1);
  }

  const proposedRaw = readFile(args.proposed);
  if (proposedRaw === null) {
    process.stderr.write(`[ERROR] validate-state: Cannot read proposed state file: ${args.proposed}\n`);
    process.exit(1);
  }

  let currentObj;
  try {
    currentObj = JSON.parse(currentRaw);
  } catch (err) {
    process.stderr.write(`[ERROR] validate-state: Invalid JSON in ${args.current}: ${err.message}\n`);
    process.exit(1);
  }

  let proposedObj;
  try {
    proposedObj = JSON.parse(proposedRaw);
  } catch (err) {
    process.stderr.write(`[ERROR] validate-state: Invalid JSON in ${args.proposed}: ${err.message}\n`);
    process.exit(1);
  }

  const result = validateTransition(currentObj, proposedObj);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.valid ? 0 : 1);
}

if (require.main === module) {
  main().catch(err => {
    process.stderr.write(`[ERROR] validate-state: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { parseArgs };
