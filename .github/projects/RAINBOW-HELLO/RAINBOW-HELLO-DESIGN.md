---
project: "RAINBOW-HELLO"
status: "draft"
author: "ux-designer-agent"
created: "2026-03-11"
---

# RAINBOW-HELLO — Design

## Design Overview

This design specifies the terminal output experience for a CLI that displays "HELLO WORLD" in large, colorful ASCII block art. The interaction model is zero-input: the user runs a single command (`node index.js`) and receives a static, visually striking output of two centered words rendered in a 5-row-tall block font with a rainbow color gradient cycling across each letter. The "interface" is the terminal viewport itself — 80 columns wide, ~12 rows of output.

## User Flows

### UF-1: Run CLI and See Rainbow Output

```
User runs `node index.js` → CLI detects color support → CLI renders ASCII art with ANSI 256-color codes → "HELLO" (line 1) and "WORLD" (line 2) appear in rainbow colors → CLI exits (code 0)
```

The primary (and only) user flow. No prompts, no flags, no interaction. Output appears instantly (<200ms) and the process exits.

### UF-2: Run CLI with NO_COLOR

```
User sets NO_COLOR=1 → User runs `node index.js` → CLI detects NO_COLOR env var → CLI renders ASCII art without any ANSI escape codes → Plain block art appears → CLI exits (code 0)
```

Fallback flow for accessibility or piping. Output is identical in structure but contains zero ANSI escape sequences.

### UF-3: Run Tests

```
User runs `npm test` → node:test runner executes all *.test.js files → Tests validate letter shapes, color sequences, render output, NO_COLOR behavior → Results printed → Exit code 0 (all pass)
```

Developer verification flow. Not a visual design concern but included for completeness.

## Layout & Components

### Terminal Output Layout

**Viewport**: 80 columns × ~12 rows (content area)

The output is a fixed, non-interactive terminal render. There are no breakpoints — the design targets a single canonical width of 80 columns.

| Region | Component | Description |
|--------|-----------|-------------|
| Row 1–5 | `HELLO` word block | 5-row ASCII art rendering of "HELLO", horizontally centered |
| Row 6 | Blank line | Single empty line separating the two words |
| Row 7–11 | `WORLD` word block | 5-row ASCII art rendering of "WORLD", horizontally centered |

**Centering calculation**:
- Each letter: 7 columns wide
- Gap between letters: 2 spaces
- Word width: 5 letters × 7 + 4 gaps × 2 = **43 columns**
- Left padding: `floor((80 − 43) / 2)` = **18 spaces**
- Total line width: 18 + 43 = **61 columns** (well within 80-column limit)

### New Components

These are logical rendering components — source modules, not UI widgets.

| Component | Props / Inputs | Design Tokens | Description |
|-----------|---------------|---------------|-------------|
| `LetterMap` | letter (char) | Block character (`█`), letter width (7), letter height (5) | Hardcoded map of uppercase letters to 5-row string arrays. Each letter is exactly 7 columns wide and 5 rows tall, using `█` (U+2588) for filled cells and space for empty cells. |
| `ColorCycle` | index (number) | Rainbow palette (7 ANSI 256-color codes) | Returns the ANSI 256-color code for a given letter position, cycling through the 7-color rainbow sequence. |
| `WordRenderer` | word (string), startColorIndex (number), useColor (boolean) | Padding (18 spaces), gap (2 spaces) | Composes a word from `LetterMap` entries, applies per-letter color via `ColorCycle`, and pads to center within 80 columns. |

## ASCII Art Letter Definitions

Each letter is rendered on a 7-column × 5-row grid using the full block character `█` (U+2588 FULL BLOCK). Spaces fill empty cells. All letters are exactly 7 characters wide to ensure uniform spacing.

### Letter: H

```
██   ██
██   ██
███████
██   ██
██   ██
```

### Letter: E

```
███████
██
█████
██
███████
```

### Letter: L

```
██
██
██
██
███████
```

### Letter: O

```
 █████
██   ██
██   ██
██   ██
 █████
```

### Letter: W

```
██   ██
██   ██
██ █ ██
███ ███
██   ██
```

### Letter: R

```
██████
██   ██
██████
██  ██
██   ██
```

### Letter: D

```
██████
██   ██
██   ██
██   ██
██████
```

> **Implementation note**: Each row of each letter MUST be exactly 7 characters wide, right-padded with spaces where necessary. This uniformity is critical for alignment. The definitions above show the visual shape; the code must pad shorter rows (e.g., `"██"` becomes `"██     "` — 7 chars total).

## Design Tokens Used

"Design tokens" for a CLI are the color codes, character constants, and layout measurements that define the visual output.

### Color Palette — Rainbow Cycle

| Token | ANSI 256-Color Index | Escape Sequence | Swatch | Usage |
|-------|---------------------|-----------------|--------|-------|
| `COLOR_RED` | 196 | `\x1b[38;5;196m` | Red | Letter position 1 (H), 8 (R) |
| `COLOR_ORANGE` | 208 | `\x1b[38;5;208m` | Orange | Letter position 2 (E), 9 (L) |
| `COLOR_YELLOW` | 226 | `\x1b[38;5;226m` | Yellow | Letter position 3 (L), 10 (D) |
| `COLOR_GREEN` | 46 | `\x1b[38;5;46m` | Green | Letter position 4 (L) |
| `COLOR_CYAN` | 51 | `\x1b[38;5;51m` | Cyan | Letter position 5 (O) |
| `COLOR_BLUE` | 21 | `\x1b[38;5;21m` | Blue | Letter position 6 (W) |
| `COLOR_PURPLE` | 129 | `\x1b[38;5;129m` | Purple | Letter position 7 (O) |
| `RESET` | — | `\x1b[0m` | — | Emitted after every colored letter and at the end of output |

The cycle order is: **Red → Orange → Yellow → Green → Cyan → Blue → Purple → Red → ...** (7 colors, repeating).

### Layout Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `LETTER_WIDTH` | `7` | Fixed column width per letter (characters) |
| `LETTER_HEIGHT` | `5` | Fixed row height per letter (rows) |
| `LETTER_GAP` | `2` | Spaces between adjacent letters in a word |
| `WORD_COLUMNS` | `43` | Total columns per word (5 × 7 + 4 × 2) |
| `TERMINAL_WIDTH` | `80` | Target terminal width |
| `LEFT_PADDING` | `18` | Spaces before first letter: `floor((80 − 43) / 2)` |
| `BLOCK_CHAR` | `█` (U+2588) | The single character used for filled cells in letter art |
| `WORD_GAP_ROWS` | `1` | Blank lines between "HELLO" and "WORLD" blocks |

## Rainbow Color Mapping

Colors are assigned per-letter across both words as a continuous sequence:

| Position | Letter | Color Token | ANSI Code | Visual |
|----------|--------|-------------|-----------|--------|
| 1 | H | `COLOR_RED` | 196 | 🔴 |
| 2 | E | `COLOR_ORANGE` | 208 | 🟠 |
| 3 | L | `COLOR_YELLOW` | 226 | 🟡 |
| 4 | L | `COLOR_GREEN` | 46 | 🟢 |
| 5 | O | `COLOR_CYAN` | 51 | 🔵 |
| 6 | W | `COLOR_BLUE` | 21 | 🔵 |
| 7 | O | `COLOR_PURPLE` | 129 | 🟣 |
| 8 | R | `COLOR_RED` | 196 | 🔴 |
| 9 | L | `COLOR_ORANGE` | 208 | 🟠 |
| 10 | D | `COLOR_YELLOW` | 226 | 🟡 |

The color index for letter at position `i` (0-based) is: `RAINBOW[i % 7]`.

## States & Interactions

Since this is a non-interactive CLI with static output, "states" correspond to the two output modes.

| State | Trigger | Visual Treatment |
|-------|---------|-----------------|
| **Color mode** (default) | `NO_COLOR` env var is NOT set | Full rainbow ANSI 256-color output. Each letter wrapped in `\x1b[38;5;{n}m...` with `\x1b[0m` reset after each letter. |
| **Plain mode** | `NO_COLOR` env var IS set (any value, including empty string `""`) | Identical ASCII art structure but with zero ANSI escape sequences. Raw `█` characters only. Output is monochrome (terminal default foreground). |
| **Post-output** | After final row is printed | A final `\x1b[0m` reset code is emitted (in color mode) to prevent color bleed into subsequent terminal output. In plain mode, no reset is needed. |

### Detection Logic

```
IF process.env.NO_COLOR is defined (any value)  →  Plain mode
ELSE                                              →  Color mode
```

> Per the `no-color.org` standard, the presence of the `NO_COLOR` variable (even if empty) triggers suppression. Do NOT check `process.stdout.hasColors()` as a gate — `NO_COLOR` takes precedence.

## Visual Mockup — Color Mode

Below is a text representation of the expected output. Each letter is shown in its assigned color. In the actual terminal, ANSI escape codes produce the colors.

```
                  ██   ██  ███████  ██       ██       ██████
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

**Color overlay** (letter → color):
- Row 1 word "HELLO": H=Red, E=Orange, L=Yellow, L=Green, O=Cyan
- Row 2 word "WORLD": W=Blue, O=Purple, R=Red, L=Orange, D=Yellow

### Visual Mockup — Plain Mode (NO_COLOR)

Identical structure to the above, but with no ANSI escape codes. All `█` characters render in the terminal's default foreground color.

## Accessibility

| Requirement | Implementation |
|-------------|---------------|
| **Color suppression (NO_COLOR)** | When `NO_COLOR` env var is set, all ANSI color codes are omitted. Output is plain ASCII art in the terminal's default color. This allows screen readers and accessibility tools to process the output without escape code interference. |
| **Screen reader compatibility** | The ASCII art is decorative. Users relying on screen readers will hear the block characters read aloud, which is not meaningful — this is an acceptable limitation for a visual demo tool. No alt-text mechanism exists in CLI output. |
| **Color contrast** | The ANSI 256-color palette indices chosen (196, 208, 226, 46, 51, 21, 129) all produce high-saturation colors that provide strong contrast against both dark and light terminal backgrounds. Yellow (226) on white backgrounds is the weakest combination — acceptable for decorative output. |
| **No flashing or animation** | The output is static. No blinking, scrolling, or animation that could trigger photosensitive conditions. (Animation is explicitly deferred to a future phase per NG-1.) |
| **Terminal reset** | `\x1b[0m` is emitted after output to prevent color from bleeding into subsequent terminal operations, which could create accessibility issues for later commands. |

## Responsive Behavior

Terminal "responsiveness" means behavior at different terminal widths. Since this is a fixed-width CLI output, there are no dynamic breakpoints.

| Terminal Width | Behavior |
|----------------|----------|
| **≥ 80 columns** (standard) | Output renders as designed — centered with 18-char left padding. Full visual fidelity. |
| **< 80 columns** (narrow) | Lines may wrap at the terminal edge, breaking the visual layout. This is **accepted and not mitigated** — the design targets 80-column terminals per FR-9. No dynamic detection or reflow is implemented. |
| **> 80 columns** (wide) | Output appears left-of-center. The 18-char padding is fixed, not calculated from actual terminal width. This is acceptable — the art remains visually coherent. |

## Output Structure Summary

```
Total output rows:  11  (5 for HELLO + 1 blank + 5 for WORLD)
Max line width:     61 characters  (18 padding + 43 content)
Characters used:    █ (U+2588) and space
Color codes:        ANSI 256-color (\x1b[38;5;Nm) — 7 distinct colors
Reset code:         \x1b[0m after each letter and at end of output
NO_COLOR behavior:  Omit all \x1b[...m sequences; output plain art
Exit code:          0
```

## Design System Additions

This project introduces no reusable design system — it is a standalone CLI demo. However, the following constants should be defined as a `colors.js` module for testability:

| Type | Name | Value | Rationale |
|------|------|-------|-----------|
| Constant | `RAINBOW_COLORS` | `[196, 208, 226, 46, 51, 21, 129]` | The 7-color ANSI 256 rainbow palette, ordered red→purple |
| Constant | `ANSI_FG_256` | `(n) => \x1b[38;5;${n}m` | Template for 256-color foreground escape sequence |
| Constant | `ANSI_RESET` | `\x1b[0m` | Terminal color reset sequence |
| Constant | `BLOCK_CHAR` | `█` (U+2588) | The fill character for letter art |
| Constant | `LETTER_WIDTH` | `7` | Uniform column width per letter |
| Constant | `LETTER_GAP` | `2` | Spaces between letters in a word |
| Constant | `LEFT_PADDING` | `18` | Centering padding for 80-column terminal |
