---
project: "RAINBOW-HELLO"
phase: 2
task: 2
title: "CLI Entry Point"
status: "pending"
skills_required: ["cli-entry"]
skills_optional: []
estimated_files: 1
---

# CLI Entry Point

## Objective

Replace the placeholder `index.js` with the actual CLI entry point that imports `renderHelloWorld()` from the renderer module, writes the rainbow ASCII art output to stdout, and exits cleanly.

## Context

The project lives at `sample-apps/RAINBOW_HELLO/`. Phase 1 built the domain modules (`lib/letters.js`, `lib/colors.js`). Task P02-T01 implemented the renderer (`lib/render.js`) which exports `renderHelloWorld()` — it returns an array of 11 strings (5 HELLO rows + 1 blank line + 5 WORLD rows). The current `index.js` is a placeholder stub with only `'use strict'` and a TODO comment. You will replace it with the full CLI entry point.

## File Targets

| Action | Path | Notes |
|--------|------|-------|
| MODIFY | `sample-apps/RAINBOW_HELLO/index.js` | Replace placeholder stub with full CLI entry point |

## Implementation Steps

1. Open `sample-apps/RAINBOW_HELLO/index.js` and replace all existing content.
2. Add the shebang line `#!/usr/bin/env node` as the very first line.
3. Add `'use strict';` on the next line.
4. Add a JSDoc block describing the module (see Contracts section below for the exact contract).
5. Import `renderHelloWorld` from `./lib/render` using CommonJS `require()`.
6. Call `renderHelloWorld()` — it returns an array of 11 strings.
7. Join the array with `'\n'` and write the result to `process.stdout.write()`.
8. Append a trailing newline (`'\n'`) so the terminal prompt doesn't appear on the last output line.
9. Verify manually: run `node index.js` from `sample-apps/RAINBOW_HELLO/` — expect 11 lines of rainbow ASCII art.
10. Verify manually: run with `NO_COLOR=1 node index.js` — expect 11 lines of plain ASCII art (no ANSI escape codes).

## Contracts & Interfaces

The `renderHelloWorld` function from `lib/render.js` has this exact signature and behavior:

```javascript
// sample-apps/RAINBOW_HELLO/lib/render.js

/**
 * Renders the full "HELLO WORLD" output as an array of strings:
 * - 5 rows for "HELLO" (starting at rainbow position 0)
 * - 1 blank line (empty string)
 * - 5 rows for "WORLD" (starting at rainbow position 5)
 * - ANSI_RESET appended to the last element (if color enabled)
 *
 * @returns {string[]} Array of 11 strings representing the complete output
 */
function renderHelloWorld() { /* ... */ }

module.exports = { renderWord, renderHelloWorld };
```

The `index.js` contract from the architecture:

```javascript
#!/usr/bin/env node
// sample-apps/RAINBOW_HELLO/index.js
'use strict';

/**
 * CLI entry point.
 * - Imports renderHelloWorld from lib/render.js
 * - Calls renderHelloWorld() to get the full output array
 * - Joins the array with newlines and writes to process.stdout
 * - Exits with code 0
 *
 * No flags, no arguments, no interactive mode.
 */
```

**Key details:**
- `renderHelloWorld()` returns `string[]` (array of 11 strings), NOT a single string
- Join with `'\n'` before writing to stdout
- Add a trailing `'\n'` after the joined string
- Use `process.stdout.write()` (not `console.log`, which would add an extra newline)
- The function handles ANSI colors internally — `index.js` does NOT need to import or manage colors
- When `NO_COLOR` env var is set, `renderHelloWorld()` automatically returns plain (uncolored) output

## Styles & Design Tokens

Not applicable — this is a CLI entry point with no visual styling of its own. All color/layout handling is in `lib/render.js` and `lib/colors.js`.

## Test Requirements

No new test file is created for this task. The existing test suite (`test/render.test.js`) already validates `renderHelloWorld()` output. Manual verification steps:

- [ ] `node index.js` (from `sample-apps/RAINBOW_HELLO/`) produces visible rainbow-colored output
- [ ] `NO_COLOR=1 node index.js` produces plain text output (no ANSI escape codes visible)
- [ ] Output has exactly 11 lines (count with `node index.js | find /c /v ""` on Windows or `node index.js | wc -l` on Unix)
- [ ] `npm test` (from `sample-apps/RAINBOW_HELLO/`) passes all 65 tests (letters: 24, colors: 21, render: 20)

## Acceptance Criteria

- [ ] `node index.js` runs successfully and exits with code 0
- [ ] Output is exactly 11 lines (5 HELLO + 1 blank + 5 WORLD)
- [ ] ANSI 256-color escape codes are present in default-mode output
- [ ] `NO_COLOR=1 node index.js` produces output with zero ANSI escape sequences
- [ ] File starts with `#!/usr/bin/env node` shebang line
- [ ] File uses `'use strict';`
- [ ] File has a JSDoc comment block describing purpose
- [ ] File uses CommonJS `require()` (not ES module `import`)
- [ ] `npm test` exits with code 0 — all existing tests still pass
- [ ] No new dependencies added to `package.json`

## Constraints

- Do NOT modify any file other than `sample-apps/RAINBOW_HELLO/index.js`
- Do NOT add new test files — existing render tests cover the output
- Do NOT use `console.log()` — use `process.stdout.write()` to avoid double newlines
- Do NOT add CLI argument parsing, flags, or interactive prompts — this is a zero-argument CLI
- Do NOT import `colors.js` or `letters.js` directly — only import from `./lib/render`
- Do NOT add any dependencies to `package.json`
