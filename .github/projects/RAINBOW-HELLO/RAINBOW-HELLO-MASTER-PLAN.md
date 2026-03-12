---
project: "RAINBOW-HELLO"
status: "draft"
author: "architect-agent"
created: "2026-03-11"
---

# RAINBOW-HELLO — Master Plan

## Executive Summary

RAINBOW-HELLO is a zero-dependency Node.js 18+ CLI application that displays "HELLO WORLD" as large, 5-row-tall ASCII block art with per-letter rainbow coloring using raw ANSI 256-color escape codes. The project exercises the full orchestration pipeline end-to-end while delivering a visually striking, shareable terminal output. All source lives in `/sample-apps/RAINBOW_HELLO/` — a new top-level directory in the repository. The codebase follows the repository's existing CommonJS conventions (`'use strict'`, `node:`-prefixed imports, JSDoc annotations) with the built-in `node:test` runner for testing and absolutely no external dependencies.

## Source Documents

| Document | Path | Status |
|----------|------|--------|
| Brainstorming | [RAINBOW-HELLO-BRAINSTORMING.md](.github/projects/RAINBOW-HELLO/RAINBOW-HELLO-BRAINSTORMING.md) | ✅ |
| Research Findings | [RAINBOW-HELLO-RESEARCH-FINDINGS.md](.github/projects/RAINBOW-HELLO/RAINBOW-HELLO-RESEARCH-FINDINGS.md) | ✅ |
| PRD | [RAINBOW-HELLO-PRD.md](.github/projects/RAINBOW-HELLO/RAINBOW-HELLO-PRD.md) | ✅ |
| Design | [RAINBOW-HELLO-DESIGN.md](.github/projects/RAINBOW-HELLO/RAINBOW-HELLO-DESIGN.md) | ✅ |
| Architecture | [RAINBOW-HELLO-ARCHITECTURE.md](.github/projects/RAINBOW-HELLO/RAINBOW-HELLO-ARCHITECTURE.md) | ✅ |

## Key Requirements (from PRD)

Curated P0 functional requirements and critical non-functional requirements that drive phasing. See the full PRD for the complete list.

- **FR-1**: Display "HELLO" in large ASCII art letters (≥3 rows tall) as the first output block
- **FR-2**: Display "WORLD" in large ASCII art letters as a second block below "HELLO"
- **FR-3**: Each letter rendered in a distinct rainbow color (red → orange → yellow → green → cyan → blue → purple, cycling)
- **FR-4**: Use ANSI 256-color escape codes — no external color library
- **FR-5**: All ASCII art letter definitions hardcoded in source (no external ASCII art library)
- **FR-6**: Reset terminal colors after output (`\x1b[0m`) to prevent color bleed
- **NFR-5**: Zero external runtime dependencies — only Node.js built-in modules permitted
- **NFR-8**: All source files follow repo conventions: `'use strict'`, `node:`-prefixed imports, JSDoc, CommonJS

## Key Technical Decisions (from Architecture)

- **CommonJS module format**: All files use `require()`/`module.exports` — matches existing repo scripts; avoids ESM-only library pitfalls
- **Zero dependencies**: No `npm install` required; raw ANSI escape codes replace chalk, hardcoded letter arrays replace figlet
- **4-module structure**: `index.js` (entry) → `lib/render.js` (composition) → `lib/letters.js` + `lib/colors.js` (domain data/helpers) — minimal but testable
- **ANSI 256-color palette**: 7-color rainbow cycle `[196, 208, 226, 46, 51, 21, 129]` gives consistent cross-terminal results
- **Continuous color cycling**: Colors assigned per-letter across both words as positions 0–9, wrapping via `pos % 7`; WORLD starts at position 5 (not 0)
- **`node:test` + `node:assert`**: Built-in test runner; 3 test files mirror the 3 library modules

## Key Design Constraints (from Design)

- **Letter grid**: Every letter exactly 7 columns wide × 5 rows tall, using `█` (U+2588) for filled cells, right-padded with spaces
- **Layout**: 18-space left padding centers each 43-column word in an 80-column terminal; 1 blank line separates HELLO and WORLD
- **80-column limit**: Every output line ≤ 80 characters (61 actual: 18 padding + 43 content)
- **`NO_COLOR` detection**: If `process.env.NO_COLOR` is defined (any value, including empty string), suppress all ANSI codes — per no-color.org standard
- **Static output only**: No animation, no blinking — a single synchronous render-and-exit
- **7 unique letters only**: H, E, L, O, W, R, D — the minimum set required for "HELLO WORLD"

## Phase Outline

### Phase 1: Core Domain Modules & Scaffolding

**Goal**: Create the project scaffolding and implement the two foundational domain modules (`letters.js`, `colors.js`) with full test coverage — establishing the data layer that Phase 2 builds upon.

**Scope**:
- Create project scaffolding (`package.json`, folder structure under `/sample-apps/RAINBOW_HELLO/`) — refs: [FR-11](RAINBOW-HELLO-PRD.md#functional-requirements), [FR-12](RAINBOW-HELLO-PRD.md#functional-requirements)
- Implement `lib/letters.js` with 7 hardcoded letter definitions (H, E, L, O, W, R, D) — refs: [FR-5](RAINBOW-HELLO-PRD.md#functional-requirements), [letters.js contract](RAINBOW-HELLO-ARCHITECTURE.md#letterjs--letter-data-contract)
- Implement `lib/colors.js` with rainbow palette, ANSI helpers, `NO_COLOR` detection — refs: [FR-3](RAINBOW-HELLO-PRD.md#functional-requirements), [FR-4](RAINBOW-HELLO-PRD.md#functional-requirements), [FR-7](RAINBOW-HELLO-PRD.md#functional-requirements), [colors.js contract](RAINBOW-HELLO-ARCHITECTURE.md#colorsjs--color--ansi-contract)
- Write `test/letters.test.js` and `test/colors.test.js` — refs: [NFR-6](RAINBOW-HELLO-PRD.md#non-functional-requirements), [NFR-7](RAINBOW-HELLO-PRD.md#non-functional-requirements), [Testing Strategy](RAINBOW-HELLO-ARCHITECTURE.md#testing-strategy)

**Exit Criteria**:
- [ ] `npm test` exits with code 0 (letters and colors tests pass)
- [ ] `lib/letters.js` exports `LETTERS`, `LETTER_HEIGHT`, `LETTER_WIDTH` with correct interfaces
- [ ] `lib/colors.js` exports `RAINBOW_COLORS`, `colorize`, `isColorEnabled`, `getColorForPosition`, and all layout constants
- [ ] Every letter in `LETTERS` is exactly 7 columns wide × 5 rows tall
- [ ] `package.json` has zero `dependencies`
- [ ] All source files follow repo conventions (`'use strict'`, JSDoc, CommonJS, `node:` imports in tests)

**Phase Doc**: [phases/RAINBOW-HELLO-PHASE-01-CORE-DOMAIN.md](.github/projects/RAINBOW-HELLO/phases/RAINBOW-HELLO-PHASE-01-CORE-DOMAIN.md) *(created at execution time)*

---

### Phase 2: Renderer, CLI Entry Point & Documentation

**Goal**: Build the application and CLI layers on top of the Phase 1 domain modules, add the renderer test, create documentation, and deliver a fully working CLI — ready to run via `node index.js` or `npm start`.

**Scope**:
- Implement `lib/render.js` with `renderWord()` and `renderHelloWorld()` — refs: [FR-1](RAINBOW-HELLO-PRD.md#functional-requirements), [FR-2](RAINBOW-HELLO-PRD.md#functional-requirements), [FR-6](RAINBOW-HELLO-PRD.md#functional-requirements), [render.js contract](RAINBOW-HELLO-ARCHITECTURE.md#renderjs--renderer-contract)
- Implement `index.js` CLI entry point — refs: [FR-8](RAINBOW-HELLO-PRD.md#functional-requirements), [FR-11](RAINBOW-HELLO-PRD.md#functional-requirements), [index.js contract](RAINBOW-HELLO-ARCHITECTURE.md#indexjs--cli-entry-point-contract)
- Write `test/render.test.js` — refs: [NFR-6](RAINBOW-HELLO-PRD.md#non-functional-requirements), [NFR-7](RAINBOW-HELLO-PRD.md#non-functional-requirements), [Testing Strategy](RAINBOW-HELLO-ARCHITECTURE.md#testing-strategy)
- Create `README.md` with usage instructions and sample output — refs: [FR-10](RAINBOW-HELLO-PRD.md#functional-requirements)

**Exit Criteria**:
- [ ] `npm test` exits with code 0 (all tests pass — letters, colors, and render)
- [ ] `node index.js` produces exactly 11 lines of output (5 HELLO + 1 blank + 5 WORLD)
- [ ] Every output line, stripped of ANSI codes, is ≤ 80 characters wide
- [ ] ANSI 256-color escape codes are present in default-mode output
- [ ] ANSI escape codes are absent when `NO_COLOR=1` is set
- [ ] `README.md` documents usage (`node index.js`, `npm start`) and shows sample output
- [ ] All source files follow repo conventions (`'use strict'`, JSDoc, CommonJS, `node:` imports in tests)

**Phase Doc**: [phases/RAINBOW-HELLO-PHASE-02-RENDERER-CLI-DOCS.md](.github/projects/RAINBOW-HELLO/phases/RAINBOW-HELLO-PHASE-02-RENDERER-CLI-DOCS.md) *(created at execution time)*

---

## Execution Constraints

- **Max phases**: 10 (from orchestration.yml — this project uses 2)
- **Max tasks per phase**: 8 (from orchestration.yml — expect 2–3 tasks per phase)
- **Max retries per task**: 2
- **Git strategy**: Single branch, sequential commits (`[orch]` prefix)
- **Human gates**: After planning (this document) and after final review

## Risk Register

| # | Risk | Impact | Mitigation | Owner |
|---|------|--------|------------|-------|
| 1 | Hardcoded ASCII art letters look misaligned or inconsistent across shapes | Med | Define a strict 7×5 grid for every letter; enforce exact dimensions in `letters.test.js` | Coder + Reviewer |
| 2 | ANSI 256-color codes render slightly differently across terminal emulators | Low | Use well-known standard palette indices (196, 208, 226, 46, 51, 21, 129); accept minor variation | Coder |
| 3 | Output exceeds 80 columns if letter widths drift | Med | Automated test strips ANSI codes and asserts every line ≤ 80 chars (FR-9) | Coder |
| 4 | Developers on legacy terminals see garbled escape codes | Low | `NO_COLOR` support provides a clean fallback; README documents terminal requirements | Coder |
| 5 | `█` (U+2588) renders incorrectly on terminals without UTF-8 support | Low | Modern terminals universally support UTF-8; document requirement in README | Coder |

## Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Functional completeness | All P0 and P1 functional requirements met | Each FR verified by automated test or review checklist |
| Test pass rate | 100% of tests pass | `npm test` exits with code 0 |
| Zero dependencies | 0 entries in `dependencies` in `package.json` | Inspect `package.json` |
| Terminal fit | Every output line ≤ 80 characters | Automated test strips ANSI and measures line length |
| Pipeline exercise | Project completes full multi-phase orchestration pipeline (plan → execute → review across 2 phases) | All pipeline documents produced; both phases marked complete in `state.json` |
