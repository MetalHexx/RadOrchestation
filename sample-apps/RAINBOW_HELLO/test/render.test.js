'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { renderWord, renderHelloWorld } = require('../lib/render');
const { LETTERS, LETTER_HEIGHT } = require('../lib/letters');
const { ANSI_RESET, LEFT_PADDING, LETTER_GAP } = require('../lib/colors');

/** Strips all ANSI escape sequences from a string. */
const stripAnsi = (str) => str.replace(/\x1b\[[0-9;]*m/g, '');

describe('renderWord', () => {
  describe('with color enabled (default)', () => {
    beforeEach(() => { delete process.env.NO_COLOR; });

    it('returns an array of exactly LETTER_HEIGHT (5) strings for HELLO', () => {
      const result = renderWord('HELLO', 0);
      assert.strictEqual(result.length, LETTER_HEIGHT);
      for (const row of result) {
        assert.strictEqual(typeof row, 'string');
      }
    });

    it('returns an array of exactly LETTER_HEIGHT (5) strings for WORLD', () => {
      const result = renderWord('WORLD', 5);
      assert.strictEqual(result.length, LETTER_HEIGHT);
      for (const row of result) {
        assert.strictEqual(typeof row, 'string');
      }
    });

    it('each row stripped of ANSI codes is <= 80 characters wide', () => {
      const hello = renderWord('HELLO', 0);
      const world = renderWord('WORLD', 5);
      for (const row of [...hello, ...world]) {
        const stripped = stripAnsi(row);
        assert.ok(
          stripped.length <= 80,
          `Row width ${stripped.length} exceeds 80: "${stripped}"`
        );
      }
    });

    it('applies LEFT_PADDING (18 spaces) before each row', () => {
      const result = renderWord('HELLO', 0);
      const expectedPadding = ' '.repeat(LEFT_PADDING);
      for (const row of result) {
        const stripped = stripAnsi(row);
        assert.ok(
          stripped.startsWith(expectedPadding),
          `Row should start with ${LEFT_PADDING} spaces: "${stripped.slice(0, 25)}..."`
        );
      }
    });

    it('places LETTER_GAP (2 spaces) between adjacent letters', () => {
      // In NO_COLOR mode we can predictably verify the exact row content
      process.env.NO_COLOR = '1';
      const result = renderWord('HELLO', 0);
      const gap = ' '.repeat(LETTER_GAP);
      const padding = ' '.repeat(LEFT_PADDING);

      for (let r = 0; r < LETTER_HEIGHT; r++) {
        const expected = padding + [
          LETTERS.H[r],
          LETTERS.E[r],
          LETTERS.L[r],
          LETTERS.L[r],
          LETTERS.O[r],
        ].join(gap);
        assert.strictEqual(result[r], expected, `Row ${r} mismatch`);
      }
      delete process.env.NO_COLOR;
    });

    it('output contains ANSI 256-color escape sequences', () => {
      const result = renderWord('HELLO', 0);
      const joined = result.join('');
      assert.ok(
        joined.includes('\x1b[38;5;'),
        'Should contain ANSI 256-color codes'
      );
    });

    it('color cycling: WORLD at startColorIndex 5 starts with Blue (ANSI 21)', () => {
      const result = renderWord('WORLD', 5);
      // First letter W should be colorized with position 5 → ANSI index 21
      assert.ok(
        result[0].includes('\x1b[38;5;21m'),
        'First letter of WORLD should use ANSI color 21 (Blue)'
      );
    });
  });

  describe('with NO_COLOR set', () => {
    beforeEach(() => { process.env.NO_COLOR = '1'; });
    afterEach(() => { delete process.env.NO_COLOR; });

    it('output contains zero ANSI escape sequences', () => {
      const result = renderWord('HELLO', 0);
      const joined = result.join('');
      assert.strictEqual(
        joined.includes('\x1b['),
        false,
        'Should not contain ANSI codes when NO_COLOR is set'
      );
    });

    it('still returns correct structure (5 rows)', () => {
      const result = renderWord('HELLO', 0);
      assert.strictEqual(result.length, LETTER_HEIGHT);
    });

    it('stripped row width is exactly 18 + 5*7 + 4*2 = 61 for a 5-letter word', () => {
      const result = renderWord('HELLO', 0);
      for (const row of result) {
        assert.strictEqual(
          row.length,
          LEFT_PADDING + 5 * 7 + 4 * LETTER_GAP,
          `Expected row length 61, got ${row.length}`
        );
      }
    });
  });
});

describe('renderHelloWorld', () => {
  describe('with color enabled (default)', () => {
    beforeEach(() => { delete process.env.NO_COLOR; });

    it('returns an array of exactly 11 elements', () => {
      const result = renderHelloWorld();
      assert.strictEqual(result.length, 11);
    });

    it('blank line at index 5 is an empty string', () => {
      const result = renderHelloWorld();
      assert.strictEqual(result[5], '');
    });

    it('first 5 elements are the HELLO rows', () => {
      const result = renderHelloWorld();
      for (let i = 0; i < 5; i++) {
        const stripped = stripAnsi(result[i]);
        assert.ok(stripped.length > 0, `Row ${i} should not be empty`);
      }
    });

    it('last 5 elements are the WORLD rows', () => {
      const result = renderHelloWorld();
      for (let i = 6; i < 11; i++) {
        const stripped = stripAnsi(result[i]);
        assert.ok(stripped.length > 0, `Row ${i} should not be empty`);
      }
    });

    it('output contains ANSI 256-color escape sequences', () => {
      const result = renderHelloWorld();
      const joined = result.join('');
      assert.ok(
        joined.includes('\x1b[38;5;'),
        'Should contain ANSI 256-color codes'
      );
    });

    it('last element ends with ANSI_RESET', () => {
      const result = renderHelloWorld();
      const last = result[result.length - 1];
      assert.ok(
        last.endsWith(ANSI_RESET),
        `Last element should end with ANSI_RESET, got: "...${last.slice(-20)}"`
      );
    });

    it('each rendered row stripped of ANSI is <= 80 characters', () => {
      const result = renderHelloWorld();
      for (let i = 0; i < result.length; i++) {
        if (i === 5) continue; // skip blank line
        const stripped = stripAnsi(result[i]);
        assert.ok(
          stripped.length <= 80,
          `Row ${i} width ${stripped.length} exceeds 80`
        );
      }
    });
  });

  describe('with NO_COLOR set', () => {
    beforeEach(() => { process.env.NO_COLOR = '1'; });
    afterEach(() => { delete process.env.NO_COLOR; });

    it('returns 11 elements with no ANSI codes', () => {
      const result = renderHelloWorld();
      assert.strictEqual(result.length, 11);
      const joined = result.join('');
      assert.strictEqual(
        joined.includes('\x1b['),
        false,
        'Should not contain ANSI codes when NO_COLOR is set'
      );
    });

    it('does not append ANSI_RESET to last element', () => {
      const result = renderHelloWorld();
      const last = result[result.length - 1];
      assert.strictEqual(
        last.includes(ANSI_RESET),
        false,
        'Last element should not contain ANSI_RESET when NO_COLOR is set'
      );
    });

    it('blank line at index 5 is still an empty string', () => {
      const result = renderHelloWorld();
      assert.strictEqual(result[5], '');
    });
  });
});
