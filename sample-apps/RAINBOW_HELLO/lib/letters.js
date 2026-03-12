'use strict';

/**
 * @module letters
 * @description Hardcoded ASCII art letter definitions for HELLO WORLD.
 */

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
  H: [
    '██   ██',
    '██   ██',
    '███████',
    '██   ██',
    '██   ██',
  ],
  E: [
    '███████',
    '██     ',
    '█████  ',
    '██     ',
    '███████',
  ],
  L: [
    '██     ',
    '██     ',
    '██     ',
    '██     ',
    '███████',
  ],
  O: [
    ' █████ ',
    '██   ██',
    '██   ██',
    '██   ██',
    ' █████ ',
  ],
  W: [
    '██   ██',
    '██   ██',
    '██ █ ██',
    '███ ███',
    '██   ██',
  ],
  R: [
    '██████ ',
    '██   ██',
    '██████ ',
    '██  ██ ',
    '██   ██',
  ],
  D: [
    '██████ ',
    '██   ██',
    '██   ██',
    '██   ██',
    '██████ ',
  ],
};

module.exports = { LETTERS, LETTER_HEIGHT, LETTER_WIDTH };
