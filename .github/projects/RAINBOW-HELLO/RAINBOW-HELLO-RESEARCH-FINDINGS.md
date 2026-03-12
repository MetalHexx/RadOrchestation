---
project: "RAINBOW-HELLO"
author: "research-agent"
created: "2026-03-11"
---

# RAINBOW-HELLO — Research Findings

## Research Scope

Investigated the existing workspace for Node.js patterns, CLI conventions, testing approaches, and file structure relevant to building a Node.js CLI app that displays "HELLO WORLD" in ASCII art with rainbow ANSI colors. Also researched external libraries (figlet, chalk) and ANSI color standards for cross-platform terminal support.

## Codebase Analysis

### Relevant Existing Code

| File/Module | Path | Relevance |
|-------------|------|-----------|
| Orchestration CLI scripts | `.github/orchestration/scripts/*.js` | Only existing Node.js code in the repo — demonstrates conventions (strict mode, JSDoc, `node:` prefixed imports) |
| Resolver library | `.github/orchestration/scripts/lib/resolver.js` | Example of a pure-function module with JSDoc and constants pattern |
| Test suite | `.github/orchestration/scripts/tests/*.test.js` | Uses `node:test` runner and `node:assert` — no external test framework |
| UI package.json | `ui/package.json` | Only existing `package.json` in the repo — Next.js app, not a CLI; no relevant CLI patterns to follow |
| Orchestration config | `.github/orchestration.yml` | Specifies Node.js v18+ as the baseline runtime version |

### Existing Patterns

- **`'use strict'` in every file**: All `.js` files in `.github/orchestration/scripts/` begin with `'use strict';`
- **`node:` prefixed built-in imports**: Tests use `require('node:test')`, `require('node:assert')`, `require('node:fs')`, `require('node:path')`, `require('node:child_process')`
- **JSDoc on every function**: Functions have `@param`, `@returns`, `@throws` annotations
- **Constants module**: Enums and constants extracted into a dedicated `constants.js` module
- **Shebang line**: CLI entry points use `#!/usr/bin/env node`
- **Zero-dependency philosophy**: The orchestration system explicitly avoids `npm install` — uses Node.js built-ins only. The README states: "No external services, no Docker, no npm install."
- **No `/sample-apps/` directory exists**: The target output path (`/sample-apps/RAINBOW_HELLO/`) will be a new top-level directory

### Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 18+ LTS | Established baseline in README and `orchestration.yml` |
| Test runner | `node:test` | Built-in (v18+) | Used by all 18 existing test files — `describe`, `it`, `before`, `after` |
| Assertions | `node:assert` | Built-in | `assert.strictEqual`, `assert.throws`, `assert.deepStrictEqual` |
| Package manager | npm | Bundled with Node | Only `ui/` has a `package.json`; orchestration scripts have none |
| Language | JavaScript (CommonJS) | ES2020+ | All existing scripts use `require()`/`module.exports`, not ESM |

## External Research

### ASCII Art Generation

| Option | Key Finding |
|--------|-------------|
| **figlet** (npm) | Most popular ASCII art text library. `figlet.textSync('HELLO WORLD')` generates multi-line ASCII art in 600+ fonts. ~180KB, zero deps. Fonts like "Banner", "Big", "Standard" produce 5–8 line tall text. Synchronous API available. |
| **Hardcoded ASCII art** | Custom letter arrays (each letter is 5 rows of strings). Full creative control over letter shapes; zero dependencies. Requires manual design of 26+ characters. |
| **Recommendation** | Hardcoded ASCII art aligns better with the repo's zero-dependency philosophy and keeps the project self-contained. A 5-row block font for A–Z, space, and punctuation is ~100 lines of code. Figlet is a viable fallback if letter design is too tedious. |

### ANSI Color Sequences

| Source | Key Finding |
|--------|-------------|
| **Raw ANSI escape codes** | `\x1b[31m` (red) through `\x1b[36m` (cyan) cover the basic 8 colors. 256-color mode (`\x1b[38;5;{n}m`) gives precise rainbow control. True-color (`\x1b[38;2;{r};{g};{b}m`) provides full RGB but requires modern terminals. |
| **Rainbow spectrum mapping** | A 7-color rainbow cycle is: red (196), orange (208), yellow (226), green (46), cyan (51), blue (21), purple/magenta (129). Using 256-color codes for consistent cross-terminal rendering. |
| **chalk** (npm) | Cross-platform color library. Auto-detects terminal color support, handles Windows conhost/PowerShell/CMD differences. v5 is ESM-only; **v4.1.2 is the last CommonJS version** — important since existing scripts use CommonJS. |
| **Windows terminal support** | Windows Terminal and PowerShell 7+ support ANSI natively. Older cmd.exe/conhost requires `ENABLE_VIRTUAL_TERMINAL_PROCESSING`. Node.js v18+ handles this via `process.stdout.hasColors()`. |
| **`process.stdout.hasColors()`** | Node.js built-in (v18+). Returns `true` if the terminal supports the given color depth. Can gate color output without chalk. |
| **`NO_COLOR` standard** | Convention (`no-color.org`): if `process.env.NO_COLOR` is set, CLI tools should suppress color output. Easy to implement: check env var before emitting ANSI codes. |

### Testing CLI Output

| Approach | Key Finding |
|----------|-------------|
| **`node:child_process` capture** | `execFileSync('node', ['index.js'])` captures stdout as a Buffer. Convert to string, assert on content. Used in existing orchestration tests. |
| **ANSI code validation** | Test for presence of `\x1b[` escape sequences in output. Regex: `/\x1b\[38;5;\d+m/` for 256-color codes. |
| **Strip-ANSI for content testing** | Replace `/\x1b\[[0-9;]*m/g` with `''` to get plain text, then assert on the ASCII art structure. No library needed — one regex. |
| **Module-level testing** | Export the color and art functions separately from the CLI entry point. Test functions in isolation (unit tests) rather than always subprocess-testing (slower). |

### Minimal CLI package.json

| Field | Key Finding |
|-------|-------------|
| **`name`** | `rainbow-hello` (lowercase, hyphenated per npm convention) |
| **`version`** | `1.0.0` |
| **`type`** | Omit (defaults to CommonJS, matching existing codebase pattern). Or set `"type": "commonjs"` explicitly. |
| **`main`** | `index.js` |
| **`bin`** | `{ "rainbow-hello": "./index.js" }` — enables `npx rainbow-hello` after install |
| **`scripts.start`** | `"node index.js"` — enables `npm start` |
| **`scripts.test`** | `"node --test"` — runs `node:test` runner on all `*.test.js` files (Node.js 18+ built-in) |
| **`engines`** | `{ "node": ">=18.0.0" }` — matches workspace baseline |

## Constraints Discovered

- **No `/sample-apps/` directory exists yet** — must create `/sample-apps/RAINBOW_HELLO/` as a new top-level folder. This is the first sample app in the repository.
- **Zero-dependency philosophy** — the rest of the repo uses no `npm install`. Using chalk or figlet introduces a dependency. Raw ANSI codes + hardcoded art keeps the project consistent with repo philosophy.
- **CommonJS, not ESM** — all existing `.js` files use `require()`/`module.exports`. If chalk v5 (ESM-only) is desired, it would break convention. Chalk v4 (CommonJS) is acceptable, or use raw ANSI codes.
- **Node.js v18+ baseline** — `node:test` runner, `process.stdout.hasColors()`, stable `node:` import prefixes all require v18+.
- **Windows terminal compatibility** — brainstorming doc asks about Windows support. Node.js v18+ on Windows Terminal/PowerShell 7 supports ANSI. Older cmd.exe may need `ENABLE_VIRTUAL_TERMINAL_PROCESSING`, but Node handles this.
- **Terminal width** — ASCII art "HELLO WORLD" at 5 rows tall, ~8 chars wide per letter × 10 letters + space = ~88 columns minimum. Standard 80-column terminals may clip. Consider: two-line layout ("HELLO" / "WORLD") or smaller font.

## Recommendations

- **Use hardcoded ASCII art** over figlet to maintain zero external dependencies — consistent with the repo's design principle #7: "Zero dependencies — Node.js built-ins only"
- **Use raw ANSI 256-color escape codes** (`\x1b[38;5;{n}m`) instead of chalk — gives precise rainbow colors without adding a dependency; `process.stdout.hasColors(256)` can gate color output
- **Respect `NO_COLOR` env var** — check `process.env.NO_COLOR` and suppress ANSI codes when set (industry standard)
- **Split "HELLO" and "WORLD" onto two lines** — keeps output under 80 columns for maximum terminal compatibility
- **Use CommonJS (`require`)** to match existing codebase patterns
- **Use `node:test` + `node:assert`** for testing — matches existing test suite conventions
- **Export core functions** (art data, color logic, render function) as modules for testability; keep `index.js` as a thin CLI entry point
- **Defer animation (Idea 2) to Phase 2** — brainstorming doc already flags this as optional; keeps v1 simple and single-phase
- **Target Node.js 18+ LTS** — aligns with repo baseline; enables `node:test`, `node:` prefixes, `hasColors()`
- **Recommended file structure**:
  ```
  sample-apps/RAINBOW_HELLO/
  ├── package.json          # Minimal: name, version, bin, scripts, engines
  ├── index.js              # CLI entry point (shebang, imports, runs render)
  ├── lib/
  │   ├── letters.js        # Hardcoded ASCII art letter definitions
  │   ├── colors.js         # Rainbow color sequence + ANSI helpers
  │   └── render.js         # Compose letters + colors → output string
  ├── test/
  │   ├── letters.test.js   # Letter shape validation
  │   ├── colors.test.js    # Color sequence + ANSI code tests
  │   └── render.test.js    # Full render output tests (with/without color)
  └── README.md             # Usage, screenshot, npm start instructions
  ```
