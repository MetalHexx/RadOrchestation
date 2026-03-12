---
project: "RAINBOW-HELLO"
phase: 1
task: 3
title: "Color & ANSI Module + Tests"
status: "pending"
skills_required: ["domain-module", "testing"]
skills_optional: []
estimated_files: 2
---

# Color & ANSI Module + Tests

## Objective

Implement `lib/colors.js` with the 7-color rainbow palette, ANSI 256-color formatting helpers, `NO_COLOR` environment detection, and layout constants. Write `test/colors.test.js` to fully validate palette values, colorize behavior, `NO_COLOR` suppression, and color cycling.

## Context

This is a leaf domain module with no internal dependencies — it does not import any other project module. The renderer (`lib/render.js`, built in a later task) will consume all exports from this module. The project uses zero external dependencies; tests use the built-in `node:test` runner and `node:assert`. The existing `lib/colors.js` and `test/colors.test.js` are placeholders that must be replaced entirely.

## File Targets

| Action | Path | Notes |
|--------|------|-------|
| MODIFY | `sample-apps/RAINBOW_HELLO/lib/colors.js` | Replace placeholder with full implementation |
| MODIFY | `sample-apps/RAINBOW_HELLO/test/colors.test.js` | Replace placeholder with comprehensive tests |

## Implementation Steps

1. **Open `sample-apps/RAINBOW_HELLO/lib/colors.js`** and replace the entire placeholder content with the full module implementation below.

2. **Define constants** at the top of `colors.js`:
   - `RAINBOW_COLORS = [196, 208, 226, 46, 51, 21, 129]` — 7 ANSI 256-color codes (Red, Orange, Yellow, Green, Cyan, Blue, Purple)
   - `ANSI_RESET = '\x1b[0m'` — terminal reset sequence
   - `BLOCK_CHAR = '\u2588'` — full block character (█)
   - `LETTER_GAP = 2` — spaces between adjacent letters in a word
   - `LEFT_PADDING = 18` — spaces to left-pad for centering in 80-col terminal
   - `TERMINAL_WIDTH = 80` — target terminal width
   - `WORD_GAP_ROWS = 1` — blank lines between HELLO and WORLD blocks

3. **Implement `isColorEnabled()`**: Return `false` if `'NO_COLOR' in process.env` (the key exists with any value, including empty string `""`), `true` otherwise. Per the `no-color.org` standard.

4. **Implement `colorize(text, colorIndex)`**: If `isColorEnabled()` returns `true`, wrap text in `\x1b[38;5;${colorIndex}m` + text + `\x1b[0m`. If color is disabled, return the text unchanged.

5. **Implement `getColorForPosition(position)`**: Return `RAINBOW_COLORS[position % RAINBOW_COLORS.length]`.

6. **Export all** via `module.exports`: `RAINBOW_COLORS`, `ANSI_RESET`, `BLOCK_CHAR`, `LETTER_GAP`, `LEFT_PADDING`, `TERMINAL_WIDTH`, `WORD_GAP_ROWS`, `isColorEnabled`, `colorize`, `getColorForPosition`.

7. **Open `sample-apps/RAINBOW_HELLO/test/colors.test.js`** and replace the entire placeholder content with comprehensive tests.

8. **Write tests** covering every export and edge case (see Test Requirements below).

9. **Run `node --test test/colors.test.js`** from `sample-apps/RAINBOW_HELLO/` and confirm all tests pass with exit code 0.

10. **Run `npm test`** from `sample-apps/RAINBOW_HELLO/` to confirm the full test suite (including `letters.test.js`) still passes.

## Contracts & Interfaces

The complete contract for `lib/colors.js` — all exports must match exactly:

```javascript
// sample-apps/RAINBOW_HELLO/lib/colors.js
'use strict';

/**
 * The 7-color rainbow palette as ANSI 256-color indices.
 * Order: Red, Orange, Yellow, Green, Cyan, Blue, Purple.
 * @type {number[]}
 */
const RAINBOW_COLORS = [196, 208, 226, 46, 51, 21, 129];

/**
 * ANSI escape sequence to reset all terminal formatting.
 * @type {string}
 */
const ANSI_RESET = '\x1b[0m';

/**
 * The full-block character used for filled cells in letter art.
 * @type {string}
 */
const BLOCK_CHAR = '\u2588';

/**
 * Number of spaces between adjacent letters in a word.
 * @type {number}
 */
const LETTER_GAP = 2;

/**
 * Left padding (spaces) to center a 5-letter word in an 80-column terminal.
 * Calculation: floor((80 - (5 * 7 + 4 * 2)) / 2) = 18
 * @type {number}
 */
const LEFT_PADDING = 18;

/**
 * Target terminal width in columns.
 * @type {number}
 */
const TERMINAL_WIDTH = 80;

/**
 * Number of blank lines between the HELLO block and the WORLD block.
 * @type {number}
 */
const WORD_GAP_ROWS = 1;

/**
 * Determines whether color output is enabled.
 * Returns false if the NO_COLOR environment variable is set (any value,
 * including empty string), per the no-color.org standard.
 *
 * @returns {boolean} true if ANSI color codes should be emitted
 */
function isColorEnabled() {
  return !('NO_COLOR' in process.env);
}

/**
 * Wraps a string in an ANSI 256-color foreground escape sequence.
 * If color is disabled, returns the string unchanged.
 *
 * @param {string} text - The text to colorize
 * @param {number} colorIndex - The ANSI 256-color palette index (0-255)
 * @returns {string} The text wrapped in color codes, or plain text if color is disabled
 */
function colorize(text, colorIndex) {
  if (!isColorEnabled()) {
    return text;
  }
  return `\x1b[38;5;${colorIndex}m${text}${ANSI_RESET}`;
}

/**
 * Returns the rainbow color index for a given letter position.
 * Cycles through RAINBOW_COLORS using modulo.
 *
 * @param {number} position - The 0-based position of the letter in the sequence
 * @returns {number} The ANSI 256-color index for that position
 */
function getColorForPosition(position) {
  return RAINBOW_COLORS[position % RAINBOW_COLORS.length];
}

module.exports = {
  RAINBOW_COLORS,
  ANSI_RESET,
  BLOCK_CHAR,
  LETTER_GAP,
  LEFT_PADDING,
  TERMINAL_WIDTH,
  WORD_GAP_ROWS,
  isColorEnabled,
  colorize,
  getColorForPosition,
};
```

The renderer (built in a later task) will import these exports:

```javascript
const {
  colorize,
  getColorForPosition,
  isColorEnabled,
  LEFT_PADDING,
  LETTER_GAP,
  WORD_GAP_ROWS,
  ANSI_RESET,
} = require('./colors');
```

## Styles & Design Tokens

### Color Palette — Rainbow Cycle (ANSI 256-Color)

| Position | Color Name | ANSI Code | Escape Sequence |
|----------|-----------|-----------|-----------------|
| 0 | Red | 196 | `\x1b[38;5;196m` |
| 1 | Orange | 208 | `\x1b[38;5;208m` |
| 2 | Yellow | 226 | `\x1b[38;5;226m` |
| 3 | Green | 46 | `\x1b[38;5;46m` |
| 4 | Cyan | 51 | `\x1b[38;5;51m` |
| 5 | Blue | 21 | `\x1b[38;5;21m` |
| 6 | Purple | 129 | `\x1b[38;5;129m` |

### Layout Constants

| Token | Type | Value | Usage |
|-------|------|-------|-------|
| `LETTER_GAP` | `number` | `2` | Spaces between adjacent letters in a word |
| `LEFT_PADDING` | `number` | `18` | Left-padding spaces for centering: `floor((80 - 43) / 2)` |
| `TERMINAL_WIDTH` | `number` | `80` | Target terminal column width |
| `WORD_GAP_ROWS` | `number` | `1` | Blank lines between HELLO and WORLD |
| `BLOCK_CHAR` | `string` | `'\u2588'` (`█`) | Fill character for letter art |
| `ANSI_RESET` | `string` | `'\x1b[0m'` | Terminal formatting reset sequence |

### NO_COLOR Standard (no-color.org)

- Check: `'NO_COLOR' in process.env`
- If the `NO_COLOR` environment variable exists (any value — `"1"`, `""`, `"false"`, anything), all ANSI escape codes are suppressed
- `isColorEnabled()` returns `false`
- `colorize()` returns plain text (no escape sequences)

## Test Requirements

All tests use `node:test` (`describe`, `it`) and `node:assert/strict`. Import the module under test with `require('../lib/colors')`.

- [ ] **RAINBOW_COLORS is an array of exactly 7 numbers**: `assert.ok(Array.isArray(RAINBOW_COLORS))`, `assert.strictEqual(RAINBOW_COLORS.length, 7)`
- [ ] **RAINBOW_COLORS values match**: `assert.deepStrictEqual(RAINBOW_COLORS, [196, 208, 226, 46, 51, 21, 129])`
- [ ] **Every color code is an integer in range 0–255**: Loop and assert `Number.isInteger(c) && c >= 0 && c <= 255`
- [ ] **ANSI_RESET equals `'\x1b[0m'`**: `assert.strictEqual(ANSI_RESET, '\x1b[0m')`
- [ ] **BLOCK_CHAR equals `'█'` (U+2588)**: `assert.strictEqual(BLOCK_CHAR, '\u2588')`
- [ ] **LETTER_GAP equals 2**: `assert.strictEqual(LETTER_GAP, 2)`
- [ ] **LEFT_PADDING equals 18**: `assert.strictEqual(LEFT_PADDING, 18)`
- [ ] **TERMINAL_WIDTH equals 80**: `assert.strictEqual(TERMINAL_WIDTH, 80)`
- [ ] **WORD_GAP_ROWS equals 1**: `assert.strictEqual(WORD_GAP_ROWS, 1)`
- [ ] **isColorEnabled() returns true by default**: Delete `NO_COLOR` from `process.env` first, then assert `isColorEnabled() === true`
- [ ] **isColorEnabled() returns false when NO_COLOR is set to '1'**: Set `process.env.NO_COLOR = '1'`, assert `isColorEnabled() === false`, then clean up
- [ ] **isColorEnabled() returns false when NO_COLOR is empty string**: Set `process.env.NO_COLOR = ''`, assert `isColorEnabled() === false`, then clean up
- [ ] **colorize() wraps text with ANSI codes when color enabled**: Delete `NO_COLOR`, call `colorize('X', 196)`, assert result equals `'\x1b[38;5;196mX\x1b[0m'`
- [ ] **colorize() returns plain text when NO_COLOR is set**: Set `NO_COLOR`, call `colorize('X', 196)`, assert result equals `'X'`
- [ ] **getColorForPosition(0) returns 196**: `assert.strictEqual(getColorForPosition(0), 196)`
- [ ] **getColorForPosition(6) returns 129**: `assert.strictEqual(getColorForPosition(6), 129)`
- [ ] **getColorForPosition(7) wraps to 196**: `assert.strictEqual(getColorForPosition(7), 196)` — verifies modulo cycling
- [ ] **getColorForPosition(9) returns 226**: Position 9 % 7 = 2, `RAINBOW_COLORS[2]` = 226

**Important**: Tests that modify `process.env.NO_COLOR` must restore the original state in a cleanup step (delete the key after each test) to avoid contaminating other tests.

## Acceptance Criteria

- [ ] `RAINBOW_COLORS` is `[196, 208, 226, 46, 51, 21, 129]` — exactly 7 entries
- [ ] `ANSI_RESET` equals `'\x1b[0m'`
- [ ] `BLOCK_CHAR` equals `'█'` (U+2588)
- [ ] `LETTER_GAP` equals `2`
- [ ] `LEFT_PADDING` equals `18`
- [ ] `TERMINAL_WIDTH` equals `80`
- [ ] `WORD_GAP_ROWS` equals `1`
- [ ] `isColorEnabled()` returns `true` when `NO_COLOR` is not set, `false` when it is set (any value including `""`)
- [ ] `colorize(text, colorIndex)` wraps text in `\x1b[38;5;{colorIndex}m...text...\x1b[0m` when color is enabled
- [ ] `colorize(text, colorIndex)` returns plain text when `NO_COLOR` is set
- [ ] `getColorForPosition(pos)` returns `RAINBOW_COLORS[pos % 7]` — correct modulo cycling
- [ ] `node --test test/colors.test.js` exits with code 0 (all tests pass)
- [ ] `npm test` exits with code 0 (full suite passes, including `letters.test.js`)
- [ ] File uses `'use strict'` as the first statement
- [ ] All exports have JSDoc annotations
- [ ] CommonJS `module.exports` format (no ES modules)
- [ ] No external dependencies imported
- [ ] Test file uses `node:test` and `node:assert` with `node:` prefix

## Constraints

- Do NOT import any external dependencies — zero `require()` calls in `colors.js` production code
- Do NOT use `process.stdout.hasColors()` — `NO_COLOR` env var is the sole gating mechanism
- Do NOT modify any files outside `lib/colors.js` and `test/colors.test.js`
- Do NOT modify `package.json`, `lib/letters.js`, `test/letters.test.js`, or any other file
- Do NOT use ES module syntax (`import`/`export`) — use CommonJS only
- Do NOT add any runtime logging or `console.log` statements in production code
- Do NOT check `NO_COLOR` value — only check for key existence (`'NO_COLOR' in process.env`)
