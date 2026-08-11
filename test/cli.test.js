import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256 } from '../src/commands/init.js';

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

test('python template now scaffolds a working Python project', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-py-'));
  try {
    const out = runCli([dir, '--name', 'my-cool-lib', '--lang', 'python', '--docs', 'en', '--ci']);
    assert.match(out, /Generated \d+ files/);
    assert.ok(existsSync(join(dir, 'pyproject.toml')));
    assert.ok(existsSync(join(dir, 'src', 'my_cool_lib', '__init__.py')));
    assert.ok(existsSync(join(dir, 'tests', 'test_my_cool_lib.py')));
    assert.ok(existsSync(join(dir, '.github', 'workflows', 'ci.yml')));
    assert.equal(existsSync(join(dir, 'package.json')), false);
    assert.equal(existsSync(join(dir, 'src', 'index.js')), false);
    const pyproject = readFileSync(join(dir, 'pyproject.toml'), 'utf8');
    assert.match(pyproject, /requires-python/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('python template path placeholders are fully replaced', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-py-'));
  try {
    runCli([dir, '--name', 'demo-pkg', '--lang', 'python', '--docs', 'en']);
    const init = readFileSync(join(dir, 'src', 'demo_pkg', '__init__.py'), 'utf8');
    assert.doesNotMatch(init, /\{\{/);
    const test = readFileSync(join(dir, 'tests', 'test_demo_pkg.py'), 'utf8');
    assert.doesNotMatch(test, /\{\{/);
    assert.match(test, /from demo_pkg import/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
      'AGENTS.md',
      'package.json',
      '.gitignore',
      'src/index.js',
      'test/index.test.js',
      '.github/workflows/ci.yml',
      '.github/workflows/release.yml',
      '.github/ISSUE_TEMPLATE/bug_report.yml',
      '.github/PULL_REQUEST_TEMPLATE.md',
    ]) {
      assert.ok(existsSync(join(dir, file)), `expected ${file}`);
    }
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'demo-app');
    const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
    assert.match(agents, /AGENTS\.md/);
    assert.match(agents, /kkx94|your-username/);
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

test('interactive wizard answers drive a full generation', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-e2e-'));
  try {
    const child = spawn(process.execPath, [BIN, dir], {
      env: cleanEnv(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      stdout += d;
    });
    child.stderr.on('data', (d) => {
      stderr += d;
    });
    const answers = ['demo-app', '1', '1', '3', 'y', 'y'];
    const writeAnswer = (i) => {
      if (i < answers.length) {
        child.stdin.write(`${answers[i]}\n`);
        setTimeout(() => writeAnswer(i + 1), 150);
      } else {
        child.stdin.end();
      }
    };
    setTimeout(() => writeAnswer(0), 300);

    const code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('close', resolve);
    });

    assert.equal(code, 0, `stdout: ${stdout}\nstderr: ${stderr}`);
    assert.match(stdout, /Generated \d+ files/);
    assert.match(stdout, /README\.zh-CN\.md/);
    assert.ok(existsSync(join(dir, 'package.json')));
    assert.ok(existsSync(join(dir, '.github', 'workflows', 'ci.yml')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--no-agents skips AGENTS.md', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-e2e-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en', '--no-agents']);
    assert.equal(existsSync(join(dir, 'AGENTS.md')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--dry-run previews files without writing anything', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-dry-'));
  try {
    const out = runCli([dir, '--name', 'demo-app', '--docs', 'en', '--ci', '--dry-run']);
    assert.match(out, /Would generate \d+ files/);
    assert.match(out, /dry run/);
    assert.equal(existsSync(join(dir, 'README.md')), false);
    assert.equal(existsSync(join(dir, 'package.json')), false);
    assert.equal(existsSync(join(dir, '.github', 'workflows', 'ci.yml')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--init subcommand works the same as default', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-e2e-'));
  try {
    const out = runCli(['init', dir, '--name', 'demo-app', '--docs', 'en']);
    assert.match(out, /Generated \d+ files/);
    assert.ok(existsSync(join(dir, 'README.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('check command scores the repo and prints the score', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-e2e-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en', '--ci']);
    const out = runCli(['check', dir]);
    assert.match(out, /Hygiene score:\s+\d+\s*\/\s*100/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('check --json outputs valid JSON with results', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-e2e-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en', '--ci']);
    const out = runCli(['check', dir, '--json']);
    const parsed = JSON.parse(out);
    assert.equal(typeof parsed.score, 'number');
    assert.ok(Array.isArray(parsed.results));
    assert.ok(parsed.results.length >= 15);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('check --fix generates missing community files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-check-fix-'));
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'empty-repo' }) + '\n');
    writeFileSync(join(dir, 'README.md'), '# empty-repo\n\nA bare repo. A bare repo. A bare repo.\n');
    assert.equal(existsSync(join(dir, 'LICENSE')), false);
    try {
      runCli(['check', dir, '--fix']);
    } catch (e) {
      if (!/Generated/.test(e.stdout || '')) {
        throw e;
      }
    }
    assert.ok(existsSync(join(dir, 'LICENSE')), 'fix should generate LICENSE');
    assert.ok(existsSync(join(dir, 'CONTRIBUTING.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('oss-init repository checks itself at a high score', () => {
  const repoDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  const out = runCli(['check', repoDir, '--quiet']);
  assert.match(out, /scored \d+\/100/);
  const m = out.match(/scored (\d+)\/100/);
  assert.ok(Number(m[1]) >= 80, `self-check should be >= 80, got ${m[1]}`);
});

test('update writes a .oss-init.json manifest on init', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en', '--ci']);
    assert.ok(existsSync(join(dir, '.oss-init.json')), 'manifest should exist');
    const manifest = JSON.parse(readFileSync(join(dir, '.oss-init.json'), 'utf8'));
    assert.equal(manifest.values.name, 'demo-app');
    assert.equal(manifest.options.lang, 'node');
    assert.ok(Object.keys(manifest.files).length > 10);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update is a no-op when nothing changed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en', '--ci']);
    const out = runCli(['update', dir]);
    assert.match(out, /already up to date/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update skips user-modified files without --force', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en']);
    const readme = readFileSync(join(dir, 'README.md'), 'utf8');
    writeFileSync(join(dir, 'README.md'), readme + '\n\n## Custom\n\nUser edit.\n');
    const out = runCli(['update', dir]);
    assert.match(out, /Skipped.*modified/);
    assert.match(out, /README\.md/);
    const after = readFileSync(join(dir, 'README.md'), 'utf8');
    assert.match(after, /## Custom/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update --force overwrites user-modified files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en']);
    const readme = readFileSync(join(dir, 'README.md'), 'utf8');
    writeFileSync(join(dir, 'README.md'), readme + '\n\n## Custom\n\nUser edit.\n');
    runCli(['update', dir, '--force']);
    const after = readFileSync(join(dir, 'README.md'), 'utf8');
    assert.doesNotMatch(after, /## Custom/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update without manifest fails with a helpful message', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    writeFileSync(join(dir, 'README.md'), '# not an oss-init project\n');
    assert.throws(
      () => runCli(['update', dir]),
      (err) => {
        assert.match(err.stderr, /No \.oss-init\.json found/);
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update --dry-run previews without writing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en']);
    const before = readFileSync(join(dir, 'LICENSE'), 'utf8');
    runCli(['update', dir, '--dry-run', '--force']);
    const after = readFileSync(join(dir, 'LICENSE'), 'utf8');
    assert.equal(after, before, 'dry-run should not change files');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update preserves user-modified retired files without --force', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en', '--ci']);
    const manifestPath = join(dir, '.oss-init.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const path = 'bench/no-longer-generated.txt';
    mkdirSync(join(dir, 'bench'), { recursive: true });
    writeFileSync(join(dir, path), 'manual retired file\n');
    manifest.files[path] = sha256('manual retired file\n');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    writeFileSync(join(dir, path), 'user edited the retired file\n');
    const out = runCli(['update', dir]);
    assert.match(out, /retired file\(s\) you have modified/);
    assert.ok(existsSync(join(dir, path)), 'retired file should be preserved without --force');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update --force removes user-modified retired files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en', '--ci']);
    const manifestPath = join(dir, '.oss-init.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const path = 'old/retired.txt';
    const content = 'retired content\n';
    mkdirSync(join(dir, 'old'), { recursive: true });
    writeFileSync(join(dir, path), content);
    manifest.files[path] = sha256(content);
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    writeFileSync(join(dir, path), 'user changed it\n');
    runCli(['update', dir, '--force']);
    assert.equal(existsSync(join(dir, path)), false, '--force should remove retired file even if user modified');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update rejects manifest paths that escape the target directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en']);
    const manifestPath = join(dir, '.oss-init.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const sneaky = '../escape.txt';
    const sneakyAbs = resolve(join(dir, sneaky));
    manifest.files[sneaky] = 'whatever';
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    assert.throws(
      () => runCli(['update', dir]),
      (err) => {
        assert.match(err.stderr, /escape the target directory/);
        assert.match(err.stderr, /\.\.\/escape\.txt/);
        return true;
      },
    );
    assert.equal(existsSync(sneakyAbs), false, 'no file outside the repo should be touched');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update handles a corrupted manifest by treating it as missing', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    writeFileSync(join(dir, 'README.md'), '# not related\n');
    writeFileSync(join(dir, '.oss-init.json'), '{ this is not valid json }}}');
    assert.throws(
      () => runCli(['update', dir]),
      (err) => {
        assert.match(err.stderr, /No \.oss-init\.json found/);
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--dry-run does not write the manifest', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en', '--dry-run']);
    assert.equal(existsSync(join(dir, '.oss-init.json')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});