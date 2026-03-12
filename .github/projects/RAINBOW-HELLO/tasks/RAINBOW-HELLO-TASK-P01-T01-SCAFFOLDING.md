---
project: "RAINBOW-HELLO"
phase: 1
task: 1
title: "Project Scaffolding"
status: "pending"
skills_required: ["scaffolding"]
skills_optional: []
estimated_files: 8
---

# Project Scaffolding

## Objective

Create the `/sample-apps/RAINBOW_HELLO/` directory structure with `package.json`, placeholder source modules, and placeholder test files — establishing the project root that all subsequent tasks build upon.

## Context

This is the first task in a new Node.js CLI project. The project lives at `sample-apps/RAINBOW_HELLO/` relative to the repository root. It is a zero-dependency CLI app (Node.js 18+) that will eventually render "HELLO WORLD" in rainbow ASCII art. All source files use CommonJS (`require`/`module.exports`) with `'use strict'` at the top and JSDoc annotations. Tests use the built-in `node:test` runner and `node:assert` library — no external test frameworks.

## File Targets

| Action | Path | Notes |
|--------|------|-------|
| CREATE | `sample-apps/RAINBOW_HELLO/package.json` | Project manifest — zero dependencies |
| CREATE | `sample-apps/RAINBOW_HELLO/index.js` | CLI entry point placeholder |
| CREATE | `sample-apps/RAINBOW_HELLO/lib/letters.js` | Letter definitions module placeholder |
| CREATE | `sample-apps/RAINBOW_HELLO/lib/colors.js` | Color/ANSI module placeholder |
| CREATE | `sample-apps/RAINBOW_HELLO/lib/render.js` | Renderer module placeholder |
| CREATE | `sample-apps/RAINBOW_HELLO/test/letters.test.js` | Letters test placeholder |
| CREATE | `sample-apps/RAINBOW_HELLO/test/colors.test.js` | Colors test placeholder |
| CREATE | `sample-apps/RAINBOW_HELLO/test/render.test.js` | Render test placeholder |

## Implementation Steps

1. Create the directory `sample-apps/RAINBOW_HELLO/`.
2. Create `sample-apps/RAINBOW_HELLO/package.json` with the exact contents specified in the **Contracts & Interfaces** section below.
3. Create `sample-apps/RAINBOW_HELLO/index.js` as a placeholder with `'use strict'`, a JSDoc comment stating it is a placeholder CLI entry point, and an empty assignment: `// TODO: import render and write to stdout`.
4. Create `sample-apps/RAINBOW_HELLO/lib/letters.js` as a placeholder with `'use strict'`, a JSDoc `@module` comment, and `module.exports = {};`.
5. Create `sample-apps/RAINBOW_HELLO/lib/colors.js` as a placeholder with `'use strict'`, a JSDoc `@module` comment, and `module.exports = {};`.
6. Create `sample-apps/RAINBOW_HELLO/lib/render.js` as a placeholder with `'use strict'`, a JSDoc `@module` comment, and `module.exports = {};`.
7. Create `sample-apps/RAINBOW_HELLO/test/letters.test.js` with `'use strict'`, imports of `node:test` and `node:assert`, and a single passing test (`it('placeholder', () => { assert.ok(true); })`).
8. Create `sample-apps/RAINBOW_HELLO/test/colors.test.js` with `'use strict'`, imports of `node:test` and `node:assert`, and a single passing test (`it('placeholder', () => { assert.ok(true); })`).
9. Create `sample-apps/RAINBOW_HELLO/test/render.test.js` with `'use strict'`, imports of `node:test` and `node:assert`, and a single passing test (`it('placeholder', () => { assert.ok(true); })`).
10. Verify: run `npm test` from `sample-apps/RAINBOW_HELLO/` and confirm exit code 0.

## Contracts & Interfaces

### package.json — Exact Contents

```json
{
  "name": "rainbow-hello",
  "version": "1.0.0",
  "description": "CLI app displaying HELLO WORLD in rainbow ASCII art",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "test": "node --test test/*.test.js"
  },
  "keywords": ["cli", "ascii-art", "rainbow", "ansi"],
  "license": "MIT",
  "engines": { "node": ">=18.0.0" },
  "dependencies": {},
  "devDependencies": {}
}
```

### Placeholder Source File Template

Every placeholder source file (`index.js`, `lib/letters.js`, `lib/colors.js`, `lib/render.js`) must follow this pattern:

```javascript
'use strict';

/**
 * @module {module-name}
 * @description Placeholder — implementation coming in a later task.
 */

module.exports = {};
```

Replace `{module-name}` with the appropriate name: `index`, `letters`, `colors`, `render`.

For `index.js` specifically, use this form instead (no `module.exports` since it is the entry point):

```javascript
'use strict';

/**
 * @module index
 * @description Placeholder CLI entry point — implementation coming in a later task.
 */

// TODO: import render and write to stdout
```

### Placeholder Test File Template

Every placeholder test file must follow this pattern:

```javascript
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('{module-name} (placeholder)', () => {
  it('should pass placeholder test', () => {
    assert.ok(true, 'Placeholder test passes');
  });
});
```

Replace `{module-name}` with: `letters`, `colors`, `render`.

## Styles & Design Tokens

Not applicable for this scaffolding task.

## Test Requirements

- [ ] `npm test` runs from `sample-apps/RAINBOW_HELLO/` without crashing (exit code 0)
- [ ] All three test files are discovered and executed by the `node --test test/*.test.js` command
- [ ] Each placeholder test reports 1 passing test

## Acceptance Criteria

- [ ] Directory `sample-apps/RAINBOW_HELLO/` exists
- [ ] Directory `sample-apps/RAINBOW_HELLO/lib/` exists
- [ ] Directory `sample-apps/RAINBOW_HELLO/test/` exists
- [ ] `sample-apps/RAINBOW_HELLO/package.json` exists and is valid JSON
- [ ] `package.json` field `name` equals `"rainbow-hello"`
- [ ] `package.json` field `version` equals `"1.0.0"`
- [ ] `package.json` field `scripts.test` equals `"node --test test/*.test.js"`
- [ ] `package.json` field `scripts.start` equals `"node index.js"`
- [ ] `package.json` field `engines.node` equals `">=18.0.0"`
- [ ] `package.json` has `"dependencies": {}` (zero dependencies)
- [ ] `package.json` has `"devDependencies": {}` (zero dev dependencies)
- [ ] `sample-apps/RAINBOW_HELLO/index.js` exists and starts with `'use strict';`
- [ ] `sample-apps/RAINBOW_HELLO/lib/letters.js` exists and starts with `'use strict';`
- [ ] `sample-apps/RAINBOW_HELLO/lib/colors.js` exists and starts with `'use strict';`
- [ ] `sample-apps/RAINBOW_HELLO/lib/render.js` exists and starts with `'use strict';`
- [ ] `sample-apps/RAINBOW_HELLO/test/letters.test.js` exists and starts with `'use strict';`
- [ ] `sample-apps/RAINBOW_HELLO/test/colors.test.js` exists and starts with `'use strict';`
- [ ] `sample-apps/RAINBOW_HELLO/test/render.test.js` exists and starts with `'use strict';`
- [ ] Running `npm test` from `sample-apps/RAINBOW_HELLO/` exits with code 0
- [ ] All tests pass
- [ ] Build succeeds (no syntax errors in any file)

## Constraints

- Do NOT add any external dependencies — `dependencies` and `devDependencies` must both be empty objects
- Do NOT implement any real logic in placeholder files — only stubs
- Do NOT create a `README.md` — that is a later task
- Do NOT create a `bin` field in `package.json` — the entry point will be set up in a later task
- Do NOT use ES modules (`import`/`export`) — use CommonJS (`require`/`module.exports`) only
- Do NOT use any test framework other than the built-in `node:test` and `node:assert`
- All files must be saved as UTF-8
