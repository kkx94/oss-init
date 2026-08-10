import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
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
    assert.match(out, /Score:\s+\d+\s*\/\s*100/);
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