'use strict';

/**
 * The 7-color rainbow palette as ANSI 256-color indices.
 * Order: Red, Orange, Yellow, Green, Cyan, Blue, Purple.
 * @type {number[]}
 */
const RAINBOW_COLORS = [196, 208, 226, 46, 51, 21, 129];

/**
 * ANSI escape sequence to reset all terminal formatting.
 * @type {string}
 */
const ANSI_RESET = '\x1b[0m';

/**
 * The full-block character used for filled cells in letter art.
 * @type {string}
 */
const BLOCK_CHAR = '\u2588';

/**
 * Number of spaces between adjacent letters in a word.
 * @type {number}
 */
const LETTER_GAP = 2;

/**
 * Left padding (spaces) to center a 5-letter word in an 80-column terminal.
 * Calculation: floor((80 - (5 * 7 + 4 * 2)) / 2) = 18
 * @type {number}
 */
const LEFT_PADDING = 18;

/**
 * Target terminal width in columns.
 * @type {number}
 */
const TERMINAL_WIDTH = 80;

/**
 * Number of blank lines between the HELLO block and the WORLD block.
 * @type {number}
 */
const WORD_GAP_ROWS = 1;

/**
 * Determines whether color output is enabled.
 * Returns false if the NO_COLOR environment variable is set (any value,
 * including empty string), per the no-color.org standard.
 *
 * @returns {boolean} true if ANSI color codes should be emitted
 */
function isColorEnabled() {
  return !('NO_COLOR' in process.env);
}

/**
 * Wraps a string in an ANSI 256-color foreground escape sequence.
 * If color is disabled, returns the string unchanged.
 *
 * @param {string} text - The text to colorize
 * @param {number} colorIndex - The ANSI 256-color palette index (0-255)
 * @returns {string} The text wrapped in color codes, or plain text if color is disabled
 */
function colorize(text, colorIndex) {
  if (!isColorEnabled()) {
    return text;
  }
  return `\x1b[38;5;${colorIndex}m${text}${ANSI_RESET}`;
}

/**
 * Returns the rainbow color index for a given letter position.
 * Cycles through RAINBOW_COLORS using modulo.
 *
 * @param {number} position - The 0-based position of the letter in the sequence
 * @returns {number} The ANSI 256-color index for that position
 */
function getColorForPosition(position) {
  return RAINBOW_COLORS[position % RAINBOW_COLORS.length];
}

module.exports = {
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
};
