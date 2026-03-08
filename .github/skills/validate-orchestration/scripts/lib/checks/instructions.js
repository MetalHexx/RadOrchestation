'use strict';

const path = require('path');
const { listFiles, readFile } = require('../utils/fs-helpers');
const { extractFrontmatter } = require('../utils/frontmatter');

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY = 'instructions';

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Validate all .instructions.md files in .github/instructions/.
 * @param {string} basePath - Absolute path to workspace root (parent of .github/)
 * @param {object} context  - Mutable shared discovery context
 * @returns {Promise<Array<{category: string, name: string, status: string, message: string, detail?: object}>>}
 */
async function checkInstructions(basePath, context) {
  try {
    const results = [];
    const instrDir = path.join(basePath, '.github', 'instructions');

    // Discover instruction files
    const files = listFiles(instrDir, '.instructions.md');

    // Initialize context.instructions
    context.instructions = [];

    if (files.length === 0) {
      return results;
    }

    for (const filename of files) {
      let hasFails = false;

      // Read file content
      const content = readFile(path.join(instrDir, filename));
      if (content === null) {
        results.push({
          category: CATEGORY,
          name: filename,
          status: 'fail',
          message: 'Could not read file',
          detail: {
            expected: 'Readable instruction file',
            found: 'File could not be read'
          }
        });
        // Still push to context for cross-ref discovery
        context.instructions.push({ filename, frontmatter: null });
        continue;
      }

      // Extract frontmatter
      const { frontmatter } = extractFrontmatter(content);
      if (frontmatter === null) {
        results.push({
          category: CATEGORY,
          name: filename,
          status: 'fail',
          message: 'No valid frontmatter found',
          detail: {
            expected: 'Valid YAML frontmatter block',
            found: 'No parseable frontmatter'
          }
        });
        context.instructions.push({ filename, frontmatter: null });
        continue;
      }

      // Validate applyTo field — must be present and non-empty string
      if (!frontmatter.applyTo || (typeof frontmatter.applyTo === 'string' && frontmatter.applyTo.trim() === '')) {
        results.push({
          category: CATEGORY,
          name: filename,
          status: 'fail',
          message: 'Missing or empty required field: applyTo',
          detail: {
            expected: "non-empty 'applyTo' glob pattern",
            found: frontmatter.applyTo === undefined ? 'undefined' : `"${frontmatter.applyTo}"`
          }
        });
        hasFails = true;
      }

      // Push to context regardless of validation outcome
      context.instructions.push({ filename, frontmatter });

      // If all validations passed, emit pass result
      if (!hasFails) {
        results.push({
          category: CATEGORY,
          name: filename,
          status: 'pass',
          message: `Instruction file "${filename}" is valid`
        });
      }
    }

    return results;
  } catch (err) {
    return [
      {
        category: CATEGORY,
        name: 'instruction-check-error',
        status: 'fail',
        message: err.message,
        detail: {
          expected: 'No errors during instruction check',
          found: err.message,
        },
      }
    ];
  }
}

module.exports = checkInstructions;
