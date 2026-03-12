---
project: "RAINBOW-HELLO"
phase: 1
task: 2
title: "Letter Definitions Module + Tests"
status: "pending"
skills_required: ["domain-module", "testing"]
skills_optional: []
estimated_files: 2
---

# Letter Definitions Module + Tests

## Objective

Implement `lib/letters.js` with the 7 hardcoded ASCII art letter definitions (H, E, L, O, W, R, D) exported as a `LETTERS` map, plus `LETTER_HEIGHT` and `LETTER_WIDTH` constants. Replace the placeholder `test/letters.test.js` with comprehensive tests validating letter presence, dimensions, and character validity.

## Context

The project scaffolding is already in place at `sample-apps/RAINBOW_HELLO/`. The `lib/letters.js` file currently exports an empty object as a placeholder. The `test/letters.test.js` file has a single placeholder test. Both must be replaced with full implementations. This module is a leaf dependency — it imports nothing and is consumed by `lib/render.js` (a later task). All source files use CommonJS, `'use strict'`, and JSDoc. Tests use `node:test` and `node:assert` (Node.js 18+ built-ins).

## File Targets

| Action | Path | Notes |
|--------|------|-------|
| MODIFY | `sample-apps/RAINBOW_HELLO/lib/letters.js` | Replace placeholder with full letter definitions |
| MODIFY | `sample-apps/RAINBOW_HELLO/test/letters.test.js` | Replace placeholder with comprehensive tests |

## Implementation Steps

1. **Open `sample-apps/RAINBOW_HELLO/lib/letters.js`** and replace the entire placeholder content.

2. **Define constants** at the top of the file:
   - `LETTER_HEIGHT = 5`
   - `LETTER_WIDTH = 7`

3. **Define the `LETTERS` object** mapping each of the 7 uppercase characters (`H`, `E`, `L`, `O`, `W`, `R`, `D`) to an array of exactly 5 strings, each string exactly 7 characters wide. Use `█` (U+2588) for filled cells and space (` `) for empty cells. Right-pad every row to exactly 7 characters. See the **Letter Patterns** section below for exact definitions.

4. **Export** via `module.exports = { LETTERS, LETTER_HEIGHT, LETTER_WIDTH };`

5. **Open `sample-apps/RAINBOW_HELLO/test/letters.test.js`** and replace the entire placeholder content.

6. **Write tests** using `node:test` (`describe`, `it`) and `node:assert/strict`:
   - Test that `LETTERS` has exactly 7 keys: `H`, `E`, `L`, `O`, `W`, `R`, `D`
   - Test that `LETTER_HEIGHT` equals `5`
   - Test that `LETTER_WIDTH` equals `7`
   - For each letter, test it has exactly `LETTER_HEIGHT` (5) rows
   - For each letter, test every row is exactly `LETTER_WIDTH` (7) characters long
   - For each letter, test every row contains only `█` and ` ` characters

7. **Run `npm test`** from `sample-apps/RAINBOW_HELLO/` and confirm exit code 0.

## Contracts & Interfaces

The complete contract for `lib/letters.js`:

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

## Letter Patterns

Each letter is a 7-column × 5-row grid. Below are the exact patterns to implement. Every row MUST be exactly 7 characters. Use `█` (U+2588) for filled and ` ` (space) for empty. Right-pad shorter visual rows with spaces.

### H

```
Row 0: "██   ██"
Row 1: "██   ██"
Row 2: "███████"
Row 3: "██   ██"
Row 4: "██   ██"
```

### E

```
Row 0: "███████"
Row 1: "██     "
Row 2: "█████  "
Row 3: "██     "
Row 4: "███████"
```

### L

```
Row 0: "██     "
Row 1: "██     "
Row 2: "██     "
Row 3: "██     "
Row 4: "███████"
```

### O

```
Row 0: " █████ "
Row 1: "██   ██"
Row 2: "██   ██"
Row 3: "██   ██"
Row 4: " █████ "
```

### W

```
Row 0: "██   ██"
Row 1: "██   ██"
Row 2: "██ █ ██"
Row 3: "███ ███"
Row 4: "██   ██"
```

### R

```
Row 0: "██████ "
Row 1: "██   ██"
Row 2: "██████ "
Row 3: "██  ██ "
Row 4: "██   ██"
```

### D

```
Row 0: "██████ "
Row 1: "██   ██"
Row 2: "██   ██"
Row 3: "██   ██"
Row 4: "██████ "
```

## Styles & Design Tokens

- **Block character**: `█` (U+2588 FULL BLOCK) — the only non-space character in letter grids
- **Letter width**: `7` columns — every row must be exactly 7 characters
- **Letter height**: `5` rows — every letter must have exactly 5 rows
- **Encoding**: UTF-8 — source file must preserve the `█` character correctly

## Test Requirements

- [ ] `LETTERS` object contains exactly 7 keys
- [ ] The 7 keys are: `H`, `E`, `L`, `O`, `W`, `R`, `D`
- [ ] `LETTER_HEIGHT` is exported and equals `5`
- [ ] `LETTER_WIDTH` is exported and equals `7`
- [ ] Each letter value is an array of exactly 5 strings
- [ ] Each string in each letter array is exactly 7 characters long
- [ ] Every character in every row is either `█` (U+2588) or ` ` (space)
- [ ] All tests pass: `node --test test/letters.test.js` exits with code 0

## Acceptance Criteria

- [ ] `LETTERS` exports exactly 7 keys: `H`, `E`, `L`, `O`, `W`, `R`, `D`
- [ ] Every letter is an array of exactly `LETTER_HEIGHT` (5) strings
- [ ] Every row string is exactly `LETTER_WIDTH` (7) characters long
- [ ] Every character in every row is either `█` or ` ` (space)
- [ ] `LETTER_HEIGHT` is exported and equals `5`
- [ ] `LETTER_WIDTH` is exported and equals `7`
- [ ] `npm test` from `sample-apps/RAINBOW_HELLO/` exits with code 0
- [ ] `lib/letters.js` starts with `'use strict'`
- [ ] `test/letters.test.js` starts with `'use strict'`
- [ ] Both files use CommonJS (`require` / `module.exports`)
- [ ] JSDoc annotations present on `LETTERS`, `LETTER_HEIGHT`, `LETTER_WIDTH`
- [ ] Test file uses `node:test` and `node:assert` with `node:` prefix
- [ ] All tests pass
- [ ] No lint errors or syntax errors

## Constraints

- Do NOT import any external packages — zero dependencies
- Do NOT modify any files other than `lib/letters.js` and `test/letters.test.js`
- Do NOT add letters beyond H, E, L, O, W, R, D — exactly 7 letters
- Do NOT reference or import `lib/colors.js` or `lib/render.js` — this is a leaf module
- Do NOT use ES modules (`import`/`export`) — use CommonJS only
- Do NOT modify `package.json`
