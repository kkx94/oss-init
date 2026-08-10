import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  defaultNameFor,
  dirExists,
  dirIsEmpty,
  isValidName,
  validateName,
} from '../src/validate.js';

test('accepts valid npm package names', () => {
  for (const name of ['my-app', 'oss-init', 'a', 'pkg.name', 'hello_world', '@scope/pkg']) {
    assert.ok(isValidName(name), `expected ${name} to be valid`);
  }
});

test('rejects invalid package names', () => {
  for (const name of ['MyApp', 'UPPER', 'has space', '', 'no_underscores_at_all?', '💥']) {
    assert.equal(isValidName(name), false, `expected ${name} to be invalid`);
  }
});

test('validateName returns error details', () => {
  const result = validateName('MyApp');
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
});

test('defaultNameFor lowercases and sanitizes directory names', () => {
  assert.equal(defaultNameFor('/tmp/My Cool App'), 'my-cool-app');
  assert.equal(defaultNameFor('/tmp/hello_world'), 'hello_world');
});

test('dirExists detects directories', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-'));
  try {
    assert.equal(dirExists(dir), true);
    assert.equal(dirExists(join(dir, 'nope')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('dirIsEmpty detects non-empty directories', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-'));
  try {
    assert.equal(dirIsEmpty(dir), true);
    writeFileSync(join(dir, 'file.txt'), 'x');
    assert.equal(dirIsEmpty(dir), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
