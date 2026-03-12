---
project: "RAINBOW-HELLO"
status: "draft"
author: "architect-agent"
created: "2026-03-11"
---

# RAINBOW-HELLO — Architecture

## Technical Overview

A zero-dependency Node.js 18+ CLI application that renders "HELLO WORLD" as large 5-row ASCII block art with per-letter rainbow coloring using raw ANSI 256-color escape codes. The codebase follows CommonJS (`require`/`module.exports`) with `'use strict'` in every file, `node:`-prefixed built-in imports, and JSDoc annotations — matching existing repository conventions. All source lives in `/sample-apps/RAINBOW_HELLO/`. Testing uses the built-in `node:test` runner and `node:assert` library with no external frameworks.

## System Layers

```
┌─────────────────────────┐
│     CLI Entry            │  index.js — shebang, orchestrates render, writes to stdout
├─────────────────────────┤
│     Application          │  lib/render.js — composes letters + colors into output lines
├─────────────────────────┤
│     Domain               │  lib/letters.js — ASCII art letter definitions (data)
│                          │  lib/colors.js  — rainbow palette, ANSI helpers, NO_COLOR
├─────────────────────────┤
│     Infrastructure       │  process.stdout, process.env (Node.js built-ins only)
└─────────────────────────┘
```

- **CLI Entry**: The thin `index.js` entry point. Imports the renderer, calls it, writes to stdout, exits.
- **Application**: `render.js` orchestrates the pipeline — takes words, fetches letter shapes, applies colors, assembles padded output lines.
- **Domain**: Pure data and pure functions. `letters.js` holds the hardcoded letter map. `colors.js` holds the rainbow palette, ANSI escape helpers, and `NO_COLOR` detection.
- **Infrastructure**: No custom infrastructure modules. The CLI interacts with `process.stdout.write()` and reads `process.env.NO_COLOR` — both Node.js built-ins accessed directly from the entry point and domain layer.

## Module Map

| Module | Layer | Path | Responsibility |
|--------|-------|------|---------------|
| `index.js` | CLI Entry | `sample-apps/RAINBOW_HELLO/index.js` | Shebang entry point. Imports `render`, calls `renderHelloWorld()`, writes result to stdout, exits with code 0. |
| `letters.js` | Domain | `sample-apps/RAINBOW_HELLO/lib/letters.js` | Exports `LETTERS` — a map of uppercase characters to 5-row string arrays (each row exactly 7 chars wide). Exports `LETTER_HEIGHT` and `LETTER_WIDTH` constants. |
| `colors.js` | Domain | `sample-apps/RAINBOW_HELLO/lib/colors.js` | Exports rainbow palette array, ANSI formatting helpers (`colorize`, `isColorEnabled`), and layout constants (`ANSI_RESET`, `BLOCK_CHAR`). |
| `render.js` | Application | `sample-apps/RAINBOW_HELLO/lib/render.js` | Exports `renderWord()` and `renderHelloWorld()`. Composes letter rows, applies per-letter color, pads for centering, joins into final output string. |

## Contracts & Interfaces

### letters.js — Letter Data Contract

```javascript
// sample-apps/RAINBOW_HELLO/lib/letters.js
'use strict';

/**
 * Fixed height of every letter in rows.
 * @type {number}
 */
const LETTER_HEIGHT = 5;

/**
 * Fixed width of every letter in columns (characters).
 * @type {number}
 */
const LETTER_WIDTH = 7;

/**
 * Map of uppercase letters to their ASCII art rows.
 * Each value is an array of exactly LETTER_HEIGHT strings,
 * each string exactly LETTER_WIDTH characters wide
 * (right-padded with spaces).
 *
 * Uses █ (U+2588 FULL BLOCK) for filled cells and space for empty cells.
 *
 * @type {Object<string, string[]>}
 */
const LETTERS = {
  // Keys: 'H', 'E', 'L', 'O', 'W', 'R', 'D'
  // Values: string[] of length 5, each string length 7
};

module.exports = { LETTERS, LETTER_HEIGHT, LETTER_WIDTH };
```

### colors.js — Color & ANSI Contract

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
function isColorEnabled() {}

/**
 * Wraps a string in an ANSI 256-color foreground escape sequence.
 * If color is disabled, returns the string unchanged.
 *
 * @param {string} text - The text to colorize
 * @param {number} colorIndex - The ANSI 256-color palette index (0–255)
 * @returns {string} The text wrapped in color codes, or plain text if color is disabled
 */
function colorize(text, colorIndex) {}

/**
 * Returns the rainbow color index for a given letter position.
 * Cycles through RAINBOW_COLORS using modulo.
 *
 * @param {number} position - The 0-based position of the letter in the sequence
 * @returns {number} The ANSI 256-color index for that position
 */
function getColorForPosition(position) {}

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

### render.js — Renderer Contract

```javascript
// sample-apps/RAINBOW_HELLO/lib/render.js
'use strict';

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
 * @returns {string[]} Array of LETTER_HEIGHT strings, each representing one
 *   output row for the word
 */
function renderWord(word, startColorIndex) {}

/**
 * Renders the full "HELLO WORLD" output as a single string ready to write
 * to stdout. Includes:
 * - 5 rows for "HELLO" (starting at rainbow position 0)
 * - 1 blank line
 * - 5 rows for "WORLD" (starting at rainbow position 5)
 * - A trailing ANSI reset (if color is enabled) and newline
 *
 * @returns {string} The complete rendered output string
 */
function renderHelloWorld() {}

module.exports = { renderWord, renderHelloWorld };
```

### index.js — CLI Entry Point Contract

```javascript
#!/usr/bin/env node
// sample-apps/RAINBOW_HELLO/index.js
'use strict';

/**
 * CLI entry point.
 * - Imports renderHelloWorld from lib/render.js
 * - Calls renderHelloWorld() to get the full output string
 * - Writes the result to process.stdout
 * - Exits with code 0
 *
 * No flags, no arguments, no interactive mode.
 */
```

## API Endpoints

Not applicable — this is a CLI application with no HTTP server or API surface.

## Dependencies

### External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| *(none)* | — | Zero external dependencies. Only Node.js built-in modules are used. |

### Internal Dependencies (module → module)

```
index.js → render.js → letters.js
                     → colors.js
```

Dependency detail:

| Consumer | Depends On | Imports |
|----------|-----------|---------|
| `index.js` | `lib/render.js` | `renderHelloWorld` |
| `lib/render.js` | `lib/letters.js` | `LETTERS`, `LETTER_HEIGHT` |
| `lib/render.js` | `lib/colors.js` | `colorize`, `getColorForPosition`, `isColorEnabled`, `LEFT_PADDING`, `LETTER_GAP`, `WORD_GAP_ROWS`, `ANSI_RESET` |
| `lib/colors.js` | *(none)* | Leaf module — no internal imports |
| `lib/letters.js` | *(none)* | Leaf module — no internal imports |

### Node.js Built-in Modules Used

| Module | Used By | Purpose |
|--------|---------|---------|
| `node:test` | Test files only | Test runner (`describe`, `it`) |
| `node:assert` | Test files only | Assertions (`strictEqual`, `deepStrictEqual`, `ok`, `match`) |
| `node:child_process` | `test/render.test.js` | Subprocess execution for CLI integration test |

> **Note**: The production source (`index.js`, `lib/*.js`) imports zero Node.js modules — it uses only `process.stdout.write()` and `process.env.NO_COLOR`, which are globals, not module imports.

## File Structure

```
sample-apps/RAINBOW_HELLO/
├── package.json              # name, version, bin, scripts.start, scripts.test, engines
├── index.js                  # CLI entry point (shebang, imports render, writes to stdout)
├── README.md                 # Usage instructions, sample output preview
├── lib/
│   ├── letters.js            # LETTERS map, LETTER_HEIGHT, LETTER_WIDTH constants
│   ├── colors.js             # RAINBOW_COLORS, ANSI helpers, isColorEnabled, layout constants
│   └── render.js             # renderWord(), renderHelloWorld() — composition logic
└── test/
    ├── letters.test.js       # Validates letter dimensions, character validity, required keys
    ├── colors.test.js        # Validates palette, colorize output, NO_COLOR behavior
    └── render.test.js        # Validates rendered output structure, line widths, color codes, CLI exit code
```

### package.json Shape

```json
{
  "name": "rainbow-hello",
  "version": "1.0.0",
  "description": "Display HELLO WORLD in rainbow ASCII art",
  "main": "index.js",
  "bin": {
    "rainbow-hello": "./index.js"
  },
  "scripts": {
    "start": "node index.js",
    "test": "node --test"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [],
  "license": "MIT"
}
```

> No `dependencies` or `devDependencies` fields. Zero external packages.

## Cross-Cutting Concerns

| Concern | Strategy |
|---------|----------|
| **Error handling** | Minimal — the CLI has no user input, no I/O, no async operations. If `process.stdout.write()` throws (broken pipe), the process exits with Node's default behavior. No try/catch needed in production code. |
| **Color suppression (`NO_COLOR`)** | `isColorEnabled()` checks `process.env.NO_COLOR !== undefined`. All color application flows through `colorize()`, which delegates to this check. Single point of control — no scattered env checks. |
| **Terminal reset** | `renderHelloWorld()` appends `ANSI_RESET` (`\x1b[0m`) to the end of output when color is enabled. Prevents color bleed into subsequent terminal output. |
| **Character encoding** | Uses U+2588 (FULL BLOCK `█`) which is safe in UTF-8 terminals. The source files must be saved as UTF-8. |
| **Logging** | None. The CLI has exactly one purpose: write the ASCII art to stdout and exit. No debug logging, no stderr output. |
| **State management** | None. The CLI is stateless — pure function from environment → stdout. |
| **Authentication** | Not applicable. |

## Data Flow

```
1. index.js calls renderHelloWorld()
       │
       ▼
2. render.js calls isColorEnabled()       ← colors.js (reads process.env.NO_COLOR)
       │
       ▼
3. render.js iterates words: ['HELLO', 'WORLD']
       │
       ├──► For each word, calls renderWord(word, startColorIndex)
       │       │
       │       ├──► For each letter in word:
       │       │       ├── Looks up LETTERS[letter]           ← letters.js
       │       │       └── Calls getColorForPosition(index)   ← colors.js
       │       │
       │       ├──► For each row (0..4):
       │       │       ├── Builds row: LEFT_PADDING + letter rows joined by LETTER_GAP
       │       │       └── Each letter's row content wrapped via colorize(rowText, colorIndex)
       │       │
       │       └──► Returns string[] (5 rows for the word)
       │
       ├──► Joins HELLO rows + blank line + WORLD rows
       ├──► Appends ANSI_RESET (if color enabled) + trailing newline
       └──► Returns complete output string
       │
       ▼
4. index.js writes output to process.stdout
5. Process exits with code 0
```

### Rainbow Color Assignment

Colors are assigned as a continuous sequence across both words:

| Position (0-based) | Letter | `RAINBOW_COLORS[pos % 7]` | Color |
|--------------------|--------|---------------------------|-------|
| 0 | H | 196 | Red |
| 1 | E | 208 | Orange |
| 2 | L | 226 | Yellow |
| 3 | L | 46 | Green |
| 4 | O | 51 | Cyan |
| 5 | W | 21 | Blue |
| 6 | O | 129 | Purple |
| 7 | R | 196 | Red |
| 8 | L | 208 | Orange |
| 9 | D | 226 | Yellow |

`renderHelloWorld()` calls `renderWord('HELLO', 0)` and `renderWord('WORLD', 5)` to achieve this continuous cycle.

## Testing Strategy

All tests use `node:test` and `node:assert`. Run with `npm test` (which executes `node --test`).

### Test Modules

| Test File | Module Under Test | What It Validates |
|-----------|-------------------|-------------------|
| `test/letters.test.js` | `lib/letters.js` | Every letter in `LETTERS` has exactly `LETTER_HEIGHT` rows; every row is exactly `LETTER_WIDTH` characters; all required letters (`H`, `E`, `L`, `O`, `W`, `R`, `D`) are present; rows contain only `█` and space characters. |
| `test/colors.test.js` | `lib/colors.js` | `RAINBOW_COLORS` has 7 entries; all values are integers 0–255; `getColorForPosition()` cycles correctly; `colorize()` wraps text in ANSI codes when color is enabled; `colorize()` returns plain text when `NO_COLOR` is set; `isColorEnabled()` returns `false` when `NO_COLOR` is defined. |
| `test/render.test.js` | `lib/render.js` + CLI | `renderWord()` returns exactly `LETTER_HEIGHT` rows; each rendered row (stripped of ANSI codes) is ≤ `TERMINAL_WIDTH` characters; `renderHelloWorld()` output contains ANSI color codes (color mode) or none (plain mode); CLI integration test: `execFileSync('node', ['index.js'])` exits with code 0 and produces non-empty stdout. |

### Key Test Patterns

- **ANSI stripping regex**: `/\x1b\[[0-9;]*m/g` — replace with `''` to get plain text for width measurement.
- **NO_COLOR testing**: Set `process.env.NO_COLOR = '1'` before calling functions, then `delete process.env.NO_COLOR` in cleanup. For subprocess tests, pass `{ env: { ...process.env, NO_COLOR: '1' } }`.
- **Integration test**: Use `require('node:child_process').execFileSync` to run `node index.js` as a subprocess and validate stdout + exit code.

## Phasing Recommendations

This project is small enough for a single phase. All modules are tightly coupled to the same output and can be built and tested together.

### Recommended: 1 Phase

**Phase 1 — Build & Test the Complete CLI**

- Create `package.json` and `README.md`
- Implement `lib/letters.js` with all 7 letter definitions (H, E, L, O, W, R, D)
- Implement `lib/colors.js` with palette, ANSI helpers, and `NO_COLOR` detection
- Implement `lib/render.js` with `renderWord()` and `renderHelloWorld()`
- Implement `index.js` CLI entry point
- Write all test files (`letters.test.js`, `colors.test.js`, `render.test.js`)
- Verify: `npm test` passes, `node index.js` produces correct rainbow output

**Exit criteria**: All tests pass (`npm test` exits 0), `node index.js` produces 11 lines of output, every line ≤ 80 characters, ANSI color codes present in default mode, absent when `NO_COLOR` is set.

> Phase count is advisory. The Tactical Planner may split this into multiple tasks within the single phase.
