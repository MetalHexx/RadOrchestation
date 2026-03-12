'use strict';

const { describe, it, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
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
} = require('../lib/colors');

/**
 * Ensure NO_COLOR is cleaned up after each test to avoid contamination.
 */
afterEach(() => {
  delete process.env.NO_COLOR;
});

describe('colors — RAINBOW_COLORS constant', () => {
  it('should be an array', () => {
    assert.ok(Array.isArray(RAINBOW_COLORS));
  });

  it('should contain exactly 7 entries', () => {
    assert.strictEqual(RAINBOW_COLORS.length, 7);
  });

  it('should match the expected palette values', () => {
    assert.deepStrictEqual(RAINBOW_COLORS, [196, 208, 226, 46, 51, 21, 129]);
  });

  it('should contain only integers in range 0–255', () => {
    for (const c of RAINBOW_COLORS) {
      assert.ok(Number.isInteger(c) && c >= 0 && c <= 255,
        `Expected integer in 0–255, got ${c}`);
    }
  });
});

describe('colors — string/layout constants', () => {
  it('ANSI_RESET equals \\x1b[0m', () => {
    assert.strictEqual(ANSI_RESET, '\x1b[0m');
  });

  it('BLOCK_CHAR equals █ (U+2588)', () => {
    assert.strictEqual(BLOCK_CHAR, '\u2588');
  });

  it('LETTER_GAP equals 2', () => {
    assert.strictEqual(LETTER_GAP, 2);
  });

  it('LEFT_PADDING equals 18', () => {
    assert.strictEqual(LEFT_PADDING, 18);
  });

  it('TERMINAL_WIDTH equals 80', () => {
    assert.strictEqual(TERMINAL_WIDTH, 80);
  });

  it('WORD_GAP_ROWS equals 1', () => {
    assert.strictEqual(WORD_GAP_ROWS, 1);
  });
});

describe('colors — isColorEnabled()', () => {
  it('should return true when NO_COLOR is not set', () => {
    delete process.env.NO_COLOR;
    assert.strictEqual(isColorEnabled(), true);
  });

  it('should return false when NO_COLOR is set to "1"', () => {
    process.env.NO_COLOR = '1';
    assert.strictEqual(isColorEnabled(), false);
  });

  it('should return false when NO_COLOR is empty string', () => {
    process.env.NO_COLOR = '';
    assert.strictEqual(isColorEnabled(), false);
  });
});

describe('colors — colorize()', () => {
  it('should wrap text with ANSI codes when color is enabled', () => {
    delete process.env.NO_COLOR;
    const result = colorize('X', 196);
    assert.strictEqual(result, '\x1b[38;5;196mX\x1b[0m');
  });

  it('should return plain text when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';
    const result = colorize('X', 196);
    assert.strictEqual(result, 'X');
  });
});

describe('colors — getColorForPosition()', () => {
  it('should return 196 for position 0', () => {
    assert.strictEqual(getColorForPosition(0), 196);
  });

  it('should return 129 for position 6', () => {
    assert.strictEqual(getColorForPosition(6), 129);
  });

  it('should wrap to 196 for position 7 (modulo cycling)', () => {
    assert.strictEqual(getColorForPosition(7), 196);
  });

  it('should return 226 for position 9 (9 % 7 = 2)', () => {
    assert.strictEqual(getColorForPosition(9), 226);
  });
});
