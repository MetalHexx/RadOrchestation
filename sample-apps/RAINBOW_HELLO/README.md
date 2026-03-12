# Rainbow Hello

A zero-dependency Node.js CLI that prints "HELLO WORLD" in large ASCII block-art letters with rainbow ANSI 256-colors across an 80-column terminal. Each letter column cycles through a vivid rainbow palette (Red, Orange, Yellow, Green, Cyan, Blue, Purple), creating a colorful terminal greeting.

## Requirements

- **Node.js** >= 18.0.0
- **Zero external dependencies** — only Node.js built-in modules are used (for testing)

## Usage

Run directly with Node.js:

```bash
node index.js
```

Or use the npm start script:

```bash
npm start
```

## Plain Mode (NO_COLOR)

Setting the `NO_COLOR` environment variable (any value, including an empty string) disables all ANSI color codes, per the [no-color.org](https://no-color.org) standard. The output will use plain block characters with no escape sequences.

**Bash / Zsh:**

```bash
NO_COLOR=1 node index.js
```

**PowerShell:**

```powershell
$env:NO_COLOR="1"; node index.js
```

## Sample Output

The following is the plain-text (NO_COLOR) output:

```
                  ██   ██  ███████  ██       ██        █████
                  ██   ██  ██       ██       ██       ██   ██
                  ███████  █████    ██       ██       ██   ██
                  ██   ██  ██       ██       ██       ██   ██
                  ██   ██  ███████  ███████  ███████   █████

                  ██   ██   █████   ██████   ██       ██████
                  ██   ██  ██   ██  ██   ██  ██       ██   ██
                  ██ █ ██  ██   ██  ██████   ██       ██   ██
                  ███ ███  ██   ██  ██  ██   ██       ██   ██
                  ██   ██   █████   ██   ██  ███████  ██████
```

> **Note:** In a color-enabled terminal, each letter column appears in a different rainbow color (Red, Orange, Yellow, Green, Cyan, Blue, Purple cycle).

## Running Tests

Run the test suite with:

```bash
npm test
```

This executes `node --test test/*.test.js` using the Node.js built-in test runner.

## Project Structure

```
RAINBOW_HELLO/
├── index.js           # CLI entry point (shebang, stdout)
├── package.json       # npm metadata, scripts, engines
├── lib/
│   ├── colors.js      # Rainbow palette, ANSI helpers, layout constants
│   ├── letters.js     # ASCII art letter definitions (█ block chars)
│   └── render.js      # Composes letters + colors into output lines
└── test/
    ├── colors.test.js  # Color module unit tests
    ├── letters.test.js # Letter definitions unit tests
    └── render.test.js  # Renderer + CLI integration tests
```

---

Zero dependencies — only Node.js built-in modules are used (for testing).
