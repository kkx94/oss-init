import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts', 'verify-release.js');

function fixture(pkg) {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-release-'));
  const path = join(dir, 'package.json');
  writeFileSync(path, JSON.stringify(pkg) + '\n');
  return { dir, path };
}

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

test('accepts a tag that matches the package version and identity', () => {
  const { dir, path } = fixture({ name: '@kkx94/oss-init', version: '0.3.1' });
  try {
    const result = run(['v0.3.1', '--package', path]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /@kkx94\/oss-init@0\.3\.1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects a tag that does not match package.version', () => {
  const { dir, path } = fixture({ name: '@kkx94/oss-init', version: '0.3.1' });
  try {
    const result = run(['v0.3.0', '--package', path]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not match package version/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects a package with the wrong npm identity', () => {
  const { dir, path } = fixture({ name: 'oss-init', version: '0.3.1' });
  try {
    const result = run(['v0.3.1', '--package', path]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expected @kkx94\/oss-init/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects a missing tag argument', () => {
  const result = run([]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Usage:/);
});
