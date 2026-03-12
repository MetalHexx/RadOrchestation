'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { LETTERS, LETTER_HEIGHT, LETTER_WIDTH } = require('../lib/letters');

/** The exact set of letters required for HELLO WORLD. */
const EXPECTED_KEYS = ['H', 'E', 'L', 'O', 'W', 'R', 'D'];

describe('letters', () => {
  describe('exports', () => {
    it('should export LETTERS as an object', () => {
      assert.equal(typeof LETTERS, 'object');
      assert.notEqual(LETTERS, null);
    });

    it('should export LETTER_HEIGHT equal to 5', () => {
      assert.equal(LETTER_HEIGHT, 5);
    });

    it('should export LETTER_WIDTH equal to 7', () => {
      assert.equal(LETTER_WIDTH, 7);
    });
  });

  describe('LETTERS keys', () => {
    it('should contain exactly 7 keys', () => {
      assert.equal(Object.keys(LETTERS).length, 7);
    });

    it('should contain exactly H, E, L, O, W, R, D', () => {
      const keys = Object.keys(LETTERS).sort();
      assert.deepStrictEqual(keys, [...EXPECTED_KEYS].sort());
    });
  });

  describe('letter dimensions and characters', () => {
    for (const key of EXPECTED_KEYS) {
      describe(`letter "${key}"`, () => {
        it(`should have exactly ${LETTER_HEIGHT} rows`, () => {
          assert.ok(Array.isArray(LETTERS[key]), `LETTERS.${key} should be an array`);
          assert.equal(LETTERS[key].length, LETTER_HEIGHT);
        });

        it(`should have every row exactly ${LETTER_WIDTH} characters long`, () => {
          for (let r = 0; r < LETTERS[key].length; r++) {
            assert.equal(
              LETTERS[key][r].length,
              LETTER_WIDTH,
              `LETTERS.${key} row ${r} length should be ${LETTER_WIDTH}, got ${LETTERS[key][r].length}`
            );
          }
        });

        it('should contain only █ (U+2588) and space characters', () => {
          for (let r = 0; r < LETTERS[key].length; r++) {
            for (const ch of LETTERS[key][r]) {
              assert.ok(
                ch === '\u2588' || ch === ' ',
                `LETTERS.${key} row ${r} contains invalid character: ${JSON.stringify(ch)}`
              );
            }
          }
        });
      });
    }
  });
});
