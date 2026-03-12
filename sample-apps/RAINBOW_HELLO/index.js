#!/usr/bin/env node
'use strict';

/**
 * CLI entry point.
 * - Imports renderHelloWorld from lib/render.js
 * - Calls renderHelloWorld() to get the full output array
 * - Joins the array with newlines and writes to process.stdout
 * - Exits with code 0
 *
 * No flags, no arguments, no interactive mode.
 */

const { renderHelloWorld } = require('./lib/render');

const lines = renderHelloWorld();
process.stdout.write(lines.join('\n') + '\n');
