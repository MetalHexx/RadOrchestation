'use strict';

/**
 * @module render
 * @description Composes letter shapes from letters.js with rainbow colors
 * from colors.js into padded, colorized ASCII art output lines.
 */

const { LETTERS, LETTER_HEIGHT } = require('./letters');
const {
  colorize,
  getColorForPosition,
  isColorEnabled,
  ANSI_RESET,
  LEFT_PADDING,
  LETTER_GAP,
  WORD_GAP_ROWS,
} = require('./colors');

/**
 * Renders a single word as an array of padded, optionally colorized strings —
 * one string per row of ASCII art.
 *
 * Each row is LEFT_PADDING spaces, then for each letter: the letter's row
 * content wrapped in color (if enabled), separated by LETTER_GAP spaces.
 *
 * @param {string} word - The uppercase word to render (e.g., 'HELLO')
 * @param {number} startColorIndex - The 0-based starting position in the
 *   rainbow cycle for the first letter of this word
 * @returns {string[]} Array of LETTER_HEIGHT (5) strings, each representing
 *   one output row for the word
 */
function renderWord(word, startColorIndex) {
  const padding = ' '.repeat(LEFT_PADDING);
  const gap = ' '.repeat(LETTER_GAP);
  const rows = [];

  for (let r = 0; r < LETTER_HEIGHT; r++) {
    const segments = [];
    for (let i = 0; i < word.length; i++) {
      const letter = word[i];
      const colorIndex = getColorForPosition(startColorIndex + i);
      segments.push(colorize(LETTERS[letter][r], colorIndex));
    }
    rows.push(padding + segments.join(gap));
  }

  return rows;
}

/**
 * Renders the full "HELLO WORLD" output as an array of strings:
 * - 5 rows for "HELLO" (starting at rainbow position 0)
 * - 1 blank line (empty string)
 * - 5 rows for "WORLD" (starting at rainbow position 5)
 * - ANSI_RESET appended to the last element (if color enabled)
 *
 * @returns {string[]} Array of 11 strings representing the complete output
 */
function renderHelloWorld() {
  const helloRows = renderWord('HELLO', 0);
  const worldRows = renderWord('WORLD', 5);
  const result = [...helloRows, ...Array(WORD_GAP_ROWS).fill(''), ...worldRows];

  if (isColorEnabled()) {
    result[result.length - 1] += ANSI_RESET;
  }

  return result;
}

module.exports = { renderWord, renderHelloWorld };
