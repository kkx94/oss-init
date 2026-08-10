import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'oss-init.js');

function cleanEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

function runCli(args, opts = {}) {
  return execFileSync(process.execPath, [BIN, ...args], {
    encoding: 'utf8',
    env: cleanEnv(),
    ...opts,
  });
}

test('--version prints the package version', () => {
  const out = runCli(['--version']);
  assert.match(out.trim(), /^\d+\.\d+\.\d+$/);
});

test('--help prints usage and exits 0', () => {
  const out = runCli(['--help']);
  assert.match(out, /Usage:/);
  assert.match(out, /--lang/);
});

test('unknown flag exits non-zero with a message', () => {
  assert.throws(
    () => runCli(['--nope']),
    (err) => {
      assert.match(err.stderr, /Unknown option: --nope/);
      return true;
    },
  );
});

test('python template reports coming-soon error', () => {
  assert.throws(
    () => runCli(['--lang', 'python', '--name', 'x']),
    (err) => {
      assert.match(err.stderr, /v0\.2/);
      return true;
    },
  );
});

test('invalid package name exits non-zero', () => {
  assert.throws(
    () => runCli(['--name', 'Not Valid']),
    (err) => {
      assert.match(err.stderr, /npm naming rules/);
      return true;
    },
  );
});

test('non-empty directory without --force exits non-zero', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-e2e-'));
  try {
    writeFileSync(join(dir, 'existing.txt'), 'x');
    assert.throws(
      () => runCli([dir, '--name', 'demo-app', '--lang', 'node', '--docs', 'en']),
      (err) => {
        assert.match(err.stderr, /not empty/);
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('full end-to-end generation succeeds and produces a usable project', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-e2e-'));
  try {
    const out = runCli([
      dir,
      '--name',
      'demo-app',
      '--lang',
      'node',
      '--docs',
      'bilingual',
      '--ci',
      '--publish',
    ]);
    assert.match(out, /Generated \d+ files/);
    for (const file of [
      'README.md',
      'README.zh-CN.md',
      'LICENSE',
      'CONTRIBUTING.md',
      'CODE_OF_CONDUCT.md',
      'SECURITY.md',
      'CHANGELOG.md',
      'package.json',
      '.gitignore',
      'src/index.js',
      'test/index.test.js',
      '.github/workflows/ci.yml',
      '.github/workflows/release.yml',
    ]) {
      assert.ok(existsSync(join(dir, file)), `expected ${file}`);
    }
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'demo-app');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('generated project passes its own tests', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-e2e-'));
  try {
    runCli([dir, '--name', 'demo-app', '--lang', 'node', '--docs', 'en']);
    const out = execFileSync(process.execPath, ['--test'], {
      cwd: dir,
      encoding: 'utf8',
      env: cleanEnv(),
    });
    assert.match(out, /pass/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});