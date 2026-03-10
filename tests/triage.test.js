'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { parseArgs } = require('../src/triage');

describe('triage CLI parseArgs', () => {
  it('parses valid args with task level', () => {
    const result = parseArgs(['--state', 'foo.json', '--level', 'task', '--project-dir', '/tmp']);
    assert.deepStrictEqual(result, { state: 'foo.json', level: 'task', projectDir: '/tmp' });
  });

  it('parses valid args with phase level', () => {
    const result = parseArgs(['--state', 'bar.json', '--level', 'phase', '--project-dir', '/data']);
    assert.deepStrictEqual(result, { state: 'bar.json', level: 'phase', projectDir: '/data' });
  });

  it('throws for missing --state flag', () => {
    assert.throws(
      () => parseArgs(['--level', 'task', '--project-dir', '/tmp']),
      (err) => {
        assert(err instanceof Error);
        assert(err.message.includes('--state'));
        return true;
      }
    );
  });

  it('throws for missing --level flag', () => {
    assert.throws(
      () => parseArgs(['--state', 'foo.json', '--project-dir', '/tmp']),
      (err) => {
        assert(err instanceof Error);
        assert(err.message.includes('--level'));
        return true;
      }
    );
  });

  it('throws for missing --project-dir flag', () => {
    assert.throws(
      () => parseArgs(['--state', 'foo.json', '--level', 'task']),
      (err) => {
        assert(err instanceof Error);
        assert(err.message.includes('--project-dir'));
        return true;
      }
    );
  });

  it('throws for invalid --level value', () => {
    assert.throws(
      () => parseArgs(['--state', 'foo.json', '--level', 'bogus', '--project-dir', '/tmp']),
      (err) => {
        assert(err instanceof Error);
        assert(err.message.includes('bogus'));
        return true;
      }
    );
  });

  it('require.main === module guard exists in source file', () => {
    const srcPath = path.join(__dirname, '..', 'src', 'triage.js');
    const content = fs.readFileSync(srcPath, 'utf8');
    assert(content.includes('require.main === module'), 'Expected require.main === module guard');
  });
});
