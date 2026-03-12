---
project: "RAINBOW-HELLO"
phase: 1
title: "Core Domain Modules & Scaffolding"
status: "active"
total_tasks: 3
author: "tactical-planner-agent"
created: "2026-03-11"
---

# Phase 1: Core Domain Modules & Scaffolding

## Phase Goal

Create the project scaffolding and implement the two foundational domain modules (`letters.js`, `colors.js`) with full test coverage — establishing the data layer that Phase 2 builds upon.

## Inputs

| Source | Key Information Used |
|--------|---------------------|
| [Master Plan](../RAINBOW-HELLO-MASTER-PLAN.md) | Phase 1 scope and exit criteria |
| [Architecture](../RAINBOW-HELLO-ARCHITECTURE.md) | Module map, `letters.js` and `colors.js` contracts, file structure, `package.json` shape, testing strategy |
| [Design](../RAINBOW-HELLO-DESIGN.md) | ASCII art letter definitions (7×5 grids for H, E, L, O, W, R, D), layout tokens, color palette |
| [PRD](../RAINBOW-HELLO-PRD.md) | FR-3, FR-4, FR-5, FR-7, FR-11, FR-12, NFR-5, NFR-6, NFR-7, NFR-8 |

## Task Outline

| # | Task | Dependencies | Skills Required | Est. Files | Handoff Doc |
|---|------|-------------|-----------------|-----------|-------------|
| T01 | Project Scaffolding | — | `scaffolding` | 1 | [Link](../tasks/RAINBOW-HELLO-TASK-P01-T01-SCAFFOLDING.md) |
| T02 | Letter Definitions Module + Tests | T01 | `domain-module`, `testing` | 2 | [Link](../tasks/RAINBOW-HELLO-TASK-P01-T02-LETTERS.md) |
| T03 | Color & ANSI Module + Tests | T01 | `domain-module`, `testing` | 2 | [Link](../tasks/RAINBOW-HELLO-TASK-P01-T03-COLORS.md) |

### T01 — Project Scaffolding

**Objective**: Create the `/sample-apps/RAINBOW_HELLO/` directory tree and `package.json` so that subsequent tasks have a valid project root to work in.

**Deliverables**:
- `sample-apps/RAINBOW_HELLO/package.json` — name `rainbow-hello`, version `1.0.0`, `scripts.start` = `node index.js`, `scripts.test` = `node --test`, `engines.node` ≥ 18, zero `dependencies`
- `sample-apps/RAINBOW_HELLO/lib/` directory (empty, or with placeholder)
- `sample-apps/RAINBOW_HELLO/test/` directory (empty, or with placeholder)

**Acceptance Criteria**:
- `package.json` is valid JSON with all required fields (`name`, `version`, `description`, `main`, `bin`, `scripts.start`, `scripts.test`, `engines`)
- `package.json` has zero `dependencies` and zero `devDependencies`
- Folder structure matches Architecture file structure: `lib/`, `test/` exist
- All files follow repo conventions (`'use strict'` where applicable)

### T02 — Letter Definitions Module + Tests

**Objective**: Implement `lib/letters.js` with the 7 hardcoded ASCII art letter definitions (H, E, L, O, W, R, D) and write `test/letters.test.js` to fully validate letter shapes and dimensions.

**Deliverables**:
- `sample-apps/RAINBOW_HELLO/lib/letters.js` — exports `LETTERS` (object map), `LETTER_HEIGHT` (5), `LETTER_WIDTH` (7)
- `sample-apps/RAINBOW_HELLO/test/letters.test.js` — validates all 7 letters present, each has 5 rows, each row is 7 chars wide, rows contain only `█` and space

**Acceptance Criteria**:
- `LETTERS` object contains keys: `H`, `E`, `L`, `O`, `W`, `R`, `D` (all 7)
- Every letter is an array of exactly `LETTER_HEIGHT` (5) strings
- Every row string is exactly `LETTER_WIDTH` (7) characters long
- Every character in every row is either `█` (U+2588) or space
- `LETTER_HEIGHT` exported and equals `5`
- `LETTER_WIDTH` exported and equals `7`
- `node --test test/letters.test.js` exits with code 0
- File uses `'use strict'`, JSDoc annotations, CommonJS `module.exports`

### T03 — Color & ANSI Module + Tests

**Objective**: Implement `lib/colors.js` with the rainbow palette, ANSI 256-color helpers, `NO_COLOR` detection, and layout constants. Write `test/colors.test.js` to validate palette, colorize behavior, and `NO_COLOR` suppression.

**Deliverables**:
- `sample-apps/RAINBOW_HELLO/lib/colors.js` — exports `RAINBOW_COLORS`, `ANSI_RESET`, `BLOCK_CHAR`, `LETTER_GAP`, `LEFT_PADDING`, `TERMINAL_WIDTH`, `WORD_GAP_ROWS`, `isColorEnabled()`, `colorize()`, `getColorForPosition()`
- `sample-apps/RAINBOW_HELLO/test/colors.test.js` — validates palette length, value ranges, colorize wrapping, NO_COLOR suppression, getColorForPosition cycling

**Acceptance Criteria**:
- `RAINBOW_COLORS` is `[196, 208, 226, 46, 51, 21, 129]` (exactly 7 entries)
- `ANSI_RESET` equals `'\x1b[0m'`
- `BLOCK_CHAR` equals `'█'` (U+2588)
- `LETTER_GAP` equals `2`, `LEFT_PADDING` equals `18`, `TERMINAL_WIDTH` equals `80`, `WORD_GAP_ROWS` equals `1`
- `isColorEnabled()` returns `true` when `NO_COLOR` is not set, `false` when it is set (any value including empty string)
- `colorize(text, colorIndex)` wraps text in `\x1b[38;5;{colorIndex}m...text...\x1b[0m` when color is enabled
- `colorize(text, colorIndex)` returns plain text when `NO_COLOR` is set
- `getColorForPosition(pos)` returns `RAINBOW_COLORS[pos % 7]`
- `node --test test/colors.test.js` exits with code 0
- File uses `'use strict'`, JSDoc annotations, CommonJS `module.exports`

## Execution Order

```
T01 (Project Scaffolding)
 ├→ T02 (Letter Definitions — depends on T01)
 └→ T03 (Color & ANSI Module — depends on T01)  ← parallel-ready with T02
```

**Sequential execution order**: T01 → T02 → T03

*Note: T02 and T03 are parallel-ready (no mutual dependency — `letters.js` and `colors.js` are independent leaf modules) but will execute sequentially in v1.*

## Phase Exit Criteria

- [ ] `npm test` exits with code 0 (letters and colors tests pass)
- [ ] `lib/letters.js` exports `LETTERS`, `LETTER_HEIGHT`, `LETTER_WIDTH` with correct interfaces
- [ ] `lib/colors.js` exports `RAINBOW_COLORS`, `colorize`, `isColorEnabled`, `getColorForPosition`, and all layout constants
- [ ] Every letter in `LETTERS` is exactly 7 columns wide × 5 rows tall
- [ ] `package.json` has zero `dependencies`
- [ ] All source files follow repo conventions (`'use strict'`, JSDoc, CommonJS, `node:` imports in tests)
- [ ] All tasks complete with status `complete`
- [ ] Phase review passed
- [ ] Build passes (no syntax errors)
- [ ] All tests pass (`node --test` exits 0)

## Known Risks for This Phase

- **Hardcoded ASCII art alignment**: Letter shapes must be exactly 7×5; any dimension mismatch cascades to Phase 2 rendering bugs. Mitigated by strict dimension assertions in `letters.test.js`.
- **`█` encoding**: Source files must be saved as UTF-8 to preserve the full-block character. Mitigated by test that validates character content.
- **`NO_COLOR` edge case**: Empty string `""` must also trigger suppression. Mitigated by explicit test case in `colors.test.js`.
