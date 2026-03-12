---
project: "RAINBOW-HELLO"
phase: 2
task: 1
title: "Renderer Module + Tests"
status: "pending"
skills_required: ["application-module", "testing"]
skills_optional: []
estimated_files: 2
---

# Renderer Module + Tests

## Objective

Replace the placeholder `lib/render.js` with the full renderer implementation that composes letter shapes from `letters.js` with rainbow colors from `colors.js` into padded, colorized ASCII art output lines. Replace the placeholder `test/render.test.js` with comprehensive tests covering output structure, line widths, color codes, NO_COLOR behavior, and CLI integration.

## Context

Phase 1 produced two domain modules: `lib/letters.js` (letter shape data) and `lib/colors.js` (rainbow palette, ANSI helpers, layout constants). Both are complete, tested, and reviewed. `lib/render.js` currently exports an empty object `{}` and `test/render.test.js` has a single placeholder assertion. This task replaces both with full implementations. The renderer is the composition layer — it imports from both domain modules and produces the final output consumed by the CLI entry point (`index.js`, a later task).

## File Targets

| Action | Path | Notes |
|--------|------|-------|
| MODIFY | `sample-apps/RAINBOW_HELLO/lib/render.js` | Replace placeholder with full `renderWord()` and `renderHelloWorld()` implementation |
| MODIFY | `sample-apps/RAINBOW_HELLO/test/render.test.js` | Replace placeholder with comprehensive render test suite |

## Implementation Steps

1. **Open `sample-apps/RAINBOW_HELLO/lib/render.js`** and replace the entire placeholder content with the implementation below.

2. **Import dependencies** at the top of `render.js`:
   ```javascript
   const { LETTERS, LETTER_HEIGHT } = require('./letters');
   const { colorize, getColorForPosition, isColorEnabled, ANSI_RESET, LEFT_PADDING, LETTER_GAP, WORD_GAP_ROWS } = require('./colors');
   ```

3. **Implement `renderWord(word, startColorIndex)`**:
   - Create a `padding` string of `LEFT_PADDING` (18) space characters.
   - Loop over each row index `r` from `0` to `LETTER_HEIGHT - 1` (0–4):
     - For each letter in `word`, get `LETTERS[letter][r]` — a 7-character string.
     - Get the ANSI color index: `getColorForPosition(startColorIndex + letterIndex)`.
     - Colorize the letter's row content: `colorize(LETTERS[letter][r], colorIndex)`.
     - Join the colorized letter segments with `' '.repeat(LETTER_GAP)` (2 spaces) between them.
     - Prepend `padding` to the joined row.
   - Return the array of `LETTER_HEIGHT` (5) row strings.

4. **Implement `renderHelloWorld()`**:
   - Call `renderWord('HELLO', 0)` → array of 5 strings.
   - Call `renderWord('WORLD', 5)` → array of 5 strings.
   - Build the result array: `[...helloRows, '', ...worldRows]` (the empty string is the blank separator line — `WORD_GAP_ROWS` = 1).
   - If `isColorEnabled()` is true, append `ANSI_RESET` to the last element of the array.
   - Return the array (11 elements total: 5 + 1 + 5).

5. **Export both functions**: `module.exports = { renderWord, renderHelloWorld };`

6. **Open `sample-apps/RAINBOW_HELLO/test/render.test.js`** and replace the entire placeholder content with the test suite below.

7. **Import test dependencies** in `render.test.js`:
   ```javascript
   const { describe, it, beforeEach, afterEach } = require('node:test');
   const assert = require('node:assert');
   const { renderWord, renderHelloWorld } = require('../lib/render');
   ```

8. **Write test cases** covering all acceptance criteria (see Test Requirements section below).

9. **Run `npm test`** from `sample-apps/RAINBOW_HELLO/` — all tests (letters, colors, render) must pass.

10. **Verify output manually**: Run `node -e "const r = require('./lib/render'); console.log(r.renderHelloWorld().join('\\n'))"` from the project root to visually confirm rainbow ASCII art output.

## Contracts & Interfaces

### letters.js — Imports Available

```javascript
// sample-apps/RAINBOW_HELLO/lib/letters.js — ACTUAL EXPORTS
const LETTER_HEIGHT = 5;   // Fixed height of every letter in rows
const LETTER_WIDTH = 7;    // Fixed width of every letter in columns

// Map of uppercase letters to their ASCII art rows.
// Keys: 'H', 'E', 'L', 'O', 'W', 'R', 'D'
// Values: string[] of length 5, each string exactly 7 characters wide.
// Uses █ (U+2588 FULL BLOCK) for filled cells and space for empty cells.
const LETTERS = {
  H: [
    '██   ██',  // row 0
    '██   ██',  // row 1
    '███████',  // row 2
    '██   ██',  // row 3
    '██   ██',  // row 4
  ],
  E: [
    '███████',
    '██     ',
    '█████  ',
    '██     ',
    '███████',
  ],
  L: [
    '██     ',
    '██     ',
    '██     ',
    '██     ',
    '███████',
  ],
  O: [
    ' █████ ',
    '██   ██',
    '██   ██',
    '██   ██',
    ' █████ ',
  ],
  W: [
    '██   ██',
    '██   ██',
    '██ █ ██',
    '███ ███',
    '██   ██',
  ],
  R: [
    '██████ ',
    '██   ██',
    '██████ ',
    '██  ██ ',
    '██   ██',
  ],
  D: [
    '██████ ',
    '██   ██',
    '██   ██',
    '██   ██',
    '██████ ',
  ],
};

module.exports = { LETTERS, LETTER_HEIGHT, LETTER_WIDTH };
```

### colors.js — Imports Available

```javascript
// sample-apps/RAINBOW_HELLO/lib/colors.js — ACTUAL EXPORTS

const RAINBOW_COLORS = [196, 208, 226, 46, 51, 21, 129];
// 7 rainbow colors: Red, Orange, Yellow, Green, Cyan, Blue, Purple

const ANSI_RESET = '\x1b[0m';    // Reset all terminal formatting
const BLOCK_CHAR = '\u2588';      // █ full block character
const LETTER_GAP = 2;             // Spaces between adjacent letters
const LEFT_PADDING = 18;          // Spaces before each row (centers 5-letter word in 80 cols)
const TERMINAL_WIDTH = 80;        // Target terminal width
const WORD_GAP_ROWS = 1;          // Blank lines between HELLO and WORLD

/**
 * @returns {boolean} true if ANSI color codes should be emitted.
 * Returns false if NO_COLOR env var is set (any value, including empty string).
 */
function isColorEnabled() {
  return !('NO_COLOR' in process.env);
}

/**
 * Wraps text in ANSI 256-color foreground escape sequence.
 * If color is disabled (NO_COLOR set), returns text unchanged.
 * @param {string} text - The text to colorize
 * @param {number} colorIndex - ANSI 256-color palette index (0-255)
 * @returns {string} Colorized text or plain text
 */
function colorize(text, colorIndex) {
  if (!isColorEnabled()) return text;
  return `\x1b[38;5;${colorIndex}m${text}\x1b[0m`;
}

/**
 * Returns the rainbow color index for a given letter position.
 * Cycles through RAINBOW_COLORS using modulo.
 * @param {number} position - 0-based position of the letter
 * @returns {number} ANSI 256-color index for that position
 */
function getColorForPosition(position) {
  return RAINBOW_COLORS[position % RAINBOW_COLORS.length];
}

module.exports = {
  RAINBOW_COLORS, ANSI_RESET, BLOCK_CHAR, LETTER_GAP,
  LEFT_PADDING, TERMINAL_WIDTH, WORD_GAP_ROWS,
  isColorEnabled, colorize, getColorForPosition,
};
```

### render.js — Contract to Implement

```javascript
// sample-apps/RAINBOW_HELLO/lib/render.js — TARGET CONTRACT
'use strict';

const { LETTERS, LETTER_HEIGHT } = require('./letters');
const { colorize, getColorForPosition, isColorEnabled, ANSI_RESET, LEFT_PADDING, LETTER_GAP, WORD_GAP_ROWS } = require('./colors');

/**
 * Renders a single word as an array of padded, optionally colorized strings —
 * one string per row of ASCII art.
 *
 * Each row is LEFT_PADDING spaces, then for each letter: the letter's row
 * content wrapped in color (if enabled), separated by LETTER_GAP spaces.
 *
 * @param {string} word - The uppercase word to render (e.g., 'HELLO')
 * @param {number} startColorIndex - The 0-based starting position in the
 *   rainbow cycle for the first letter of this word
 * @returns {string[]} Array of LETTER_HEIGHT (5) strings, each representing
 *   one output row for the word
 */
function renderWord(word, startColorIndex) {
  // Implementation here
}

/**
 * Renders the full "HELLO WORLD" output as an array of strings:
 * - 5 rows for "HELLO" (starting at rainbow position 0)
 * - 1 blank line (empty string)
 * - 5 rows for "WORLD" (starting at rainbow position 5)
 * - ANSI_RESET appended to the last element (if color enabled)
 *
 * @returns {string[]} Array of 11 strings representing the complete output
 */
function renderHelloWorld() {
  // Implementation here
}

module.exports = { renderWord, renderHelloWorld };
```

### Rainbow Color Assignment (inline reference)

Colors are assigned as a continuous sequence across both words:

| Position | Letter | `RAINBOW_COLORS[pos % 7]` | Color  |
|----------|--------|---------------------------|--------|
| 0        | H      | 196                       | Red    |
| 1        | E      | 208                       | Orange |
| 2        | L      | 226                       | Yellow |
| 3        | L      | 46                        | Green  |
| 4        | O      | 51                        | Cyan   |
| 5        | W      | 21                        | Blue   |
| 6        | O      | 129                       | Purple |
| 7        | R      | 196                       | Red    |
| 8        | L      | 208                       | Orange |
| 9        | D      | 226                       | Yellow |

`renderHelloWorld()` achieves this by calling `renderWord('HELLO', 0)` and `renderWord('WORLD', 5)`.

## Styles & Design Tokens

- **LEFT_PADDING**: `18` — spaces prepended to each row to center a 5-letter word in 80 columns. Calculation: `floor((80 - (5 × 7 + 4 × 2)) / 2) = 18`.
- **LETTER_GAP**: `2` — spaces between adjacent letters within a word.
- **WORD_GAP_ROWS**: `1` — number of blank lines between the HELLO block and the WORLD block.
- **LETTER_HEIGHT**: `5` — rows per letter.
- **LETTER_WIDTH**: `7` — columns per letter.
- **TERMINAL_WIDTH**: `80` — maximum output width in columns.
- **ANSI_RESET**: `\x1b[0m` — appended to end of output when color is enabled.
- **ANSI 256-color format**: `\x1b[38;5;{N}m` where N is the palette index.
- **ANSI stripping regex**: `/\x1b\[[0-9;]*m/g` — use in tests to strip color codes before measuring width.

## Test Requirements

- [ ] `renderWord('HELLO', 0)` returns an array of exactly 5 strings (LETTER_HEIGHT)
- [ ] `renderWord('WORLD', 5)` returns an array of exactly 5 strings
- [ ] Each rendered row from `renderWord`, stripped of ANSI codes via `/\x1b\[[0-9;]*m/g`, is ≤ 80 characters wide
- [ ] `renderHelloWorld()` returns an array of exactly 11 elements (5 HELLO + 1 blank + 5 WORLD)
- [ ] The blank line at index 5 of `renderHelloWorld()` output is an empty string (or whitespace-only)
- [ ] Color mode (default): rendered output contains ANSI 256-color escape sequences (`\x1b[38;5;`)
- [ ] Plain mode (`NO_COLOR=1`): rendered output contains zero ANSI escape sequences
- [ ] Color mode: the last element of `renderHelloWorld()` ends with `\x1b[0m` (ANSI reset)
- [ ] `renderWord` applies LEFT_PADDING (18 spaces) before each row — verify rows start with 18 spaces after stripping ANSI codes
- [ ] `renderWord` places LETTER_GAP (2 spaces) between adjacent letters
- [ ] Color cycling: `renderWord('WORLD', 5)` starts at rainbow position 5 (Blue = ANSI index 21) — verify first letter's ANSI code is `\x1b[38;5;21m`
- [ ] CLI integration: `execFileSync('node', ['index.js'], { cwd })` exits with code 0 and produces non-empty stdout (note: `index.js` is a stub — if this test is included, wrap in try/catch or skip if index.js is not yet implemented; alternatively, test only the module functions and defer CLI integration to T02)

### NO_COLOR Test Pattern

```javascript
// Set before test
process.env.NO_COLOR = '1';

// Call function under test
const result = renderWord('HELLO', 0);

// Assert no ANSI codes
const joined = result.join('');
assert.strictEqual(joined.includes('\x1b['), false, 'Should not contain ANSI codes when NO_COLOR is set');

// Cleanup after test
delete process.env.NO_COLOR;
```

## Acceptance Criteria

- [ ] `renderWord('HELLO', 0)` returns an array of exactly 5 strings
- [ ] `renderWord('WORLD', 5)` returns an array of exactly 5 strings
- [ ] `renderHelloWorld()` returns an array of exactly 11 elements
- [ ] Each rendered row, stripped of ANSI codes, is ≤ 80 characters wide
- [ ] Default mode: output contains ANSI 256-color escape sequences (`\x1b[38;5;`)
- [ ] `NO_COLOR=1` mode: output contains zero ANSI escape sequences
- [ ] Color mode: output ends with `\x1b[0m` (ANSI reset)
- [ ] Color cycling: WORLD starts at rainbow position 5 (first letter gets ANSI index 21)
- [ ] The blank line (index 5) in `renderHelloWorld()` output is empty or whitespace-only
- [ ] `node --test test/render.test.js` exits with code 0
- [ ] `npm test` passes all tests (letters + colors + render)
- [ ] Files use `'use strict'`, JSDoc annotations, CommonJS `module.exports`

## Constraints

- Do NOT modify `lib/letters.js` or `lib/colors.js` — they are complete and reviewed
- Do NOT modify `test/letters.test.js` or `test/colors.test.js`
- Do NOT modify `package.json` or `index.js`
- Do NOT add any external dependencies — use only Node.js built-ins (`node:test`, `node:assert`)
- Do NOT use `console.log` in `render.js` — the module returns data; the CLI entry point handles stdout
- Do NOT include CLI integration tests (spawning `node index.js`) — that belongs to T02. Only test the `renderWord` and `renderHelloWorld` module functions directly.
- Use `'use strict'` as the first statement in both files
- Use `node:` prefix for built-in module imports in test files
- Use JSDoc annotations on all exported functions
