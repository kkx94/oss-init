import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256 } from '../src/commands/init.js';

const BIN = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'oss-init.js');
const PACKAGE_VERSION = JSON.parse(readFileSync(join(dirname(BIN), '..', 'package.json'), 'utf8')).version;

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

test('generated Chinese documentation passes the same hygiene audit', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-zh-'));
  try {
    runCli([dir, '--name', 'demo-app', '--lang', 'node', '--docs', 'zh', '--ci']);
    const report = JSON.parse(runCli(['check', dir, '--json']));
    assert.equal(report.score, 100);
    assert.equal(report.results.every((result) => result.status === 'pass'), true);
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

test('generated Python project passes its own native tests', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-py-native-'));
  try {
    runCli([dir, '--name', 'demo-pkg', '--lang', 'python', '--docs', 'en']);
    execFileSync('python', ['-m', 'unittest', 'discover', '-s', 'tests'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...cleanEnv(), PYTHONPATH: join(dir, 'src') },
    });
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

test('scoped Node package generates valid unscoped repository metadata', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-scoped-'));
  try {
    runCli([
      dir,
      '--name',
      '@scope/my-lib',
      '--lang',
      'node',
      '--docs',
      'en',
      '--github-user',
      'octocat',
    ]);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    const manifest = JSON.parse(readFileSync(join(dir, '.oss-init.json'), 'utf8'));
    assert.equal(pkg.name, '@scope/my-lib');
    assert.equal(manifest.values.repoName, 'my-lib');
    assert.equal(manifest.values.jsIdentifier, 'myLib');
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

test('Python rejects npm scope syntax before writing project files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-py-scope-'));
  try {
    assert.throws(
      () => runCli([dir, '--name', '@scope/my-lib', '--lang', 'python', '--docs', 'en']),
      (err) => {
        assert.match(err.stderr, /Python project names cannot use npm scoped syntax/);
        return true;
      },
    );
    assert.deepEqual(readdirSync(dir), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Python normalizes distribution separators into a safe import package', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-py-name-'));
  try {
    runCli([dir, '--name', 'my.cool-lib', '--lang', 'python', '--docs', 'en']);
    assert.ok(existsSync(join(dir, 'src', 'my_cool_lib', '__init__.py')));
    assert.ok(existsSync(join(dir, 'tests', 'test_my_cool_lib.py')));
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

test('adopt adds only missing maintenance files and preserves an existing Node project', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-node-'))
  try {
    const packageText = JSON.stringify({
      name: '@acme/existing-app',
      version: '8.2.0',
      description: 'A real existing application',
      author: 'Existing Maintainer <maintainer@example.test>',
      license: 'MIT',
      repository: 'https://github.com/acme/existing-app',
      scripts: { test: 'node --test' },
    }, null, 2) + '\n'
    const readme = '# Existing application\n\nKeep this user-authored documentation exactly.\n'
    writeFileSync(join(dir, 'package.json'), packageText)
    writeFileSync(join(dir, 'README.md'), readme)

    const out = runCli(['adopt', dir, '--ci'])
    assert.match(out, /Adopted .* with \d+ new managed file/)
    assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), packageText)
    assert.equal(readFileSync(join(dir, 'README.md'), 'utf8'), readme)
    assert.ok(existsSync(join(dir, '.github', 'workflows', 'ci.yml')))
    const workflow = readFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'utf8')
    assert.match(workflow, /- run: npm install/)
    assert.match(workflow, /- run: npm test/)
    assert.doesNotMatch(workflow, /npm run lint/)
    assert.equal(existsSync(join(dir, 'src', 'index.js')), false)
    assert.equal(existsSync(join(dir, 'test', 'index.test.js')), false)

    const manifest = JSON.parse(readFileSync(join(dir, '.oss-init.json'), 'utf8'))
    assert.equal(manifest.schemaVersion, 3)
    assert.equal(manifest.options.mode, 'adopt')
    assert.equal(manifest.values.name, '@acme/existing-app')
    assert.equal(manifest.values.githubUser, 'acme')
    assert.equal(manifest.values.author, 'Existing Maintainer')
    assert.equal(manifest.managedPaths.includes('package.json'), false)
    assert.equal(manifest.managedPaths.includes('README.md'), false)
    assert.equal(manifest.protectedPaths.includes('README.md'), true)
    assert.deepEqual(Object.keys(manifest.files).sort(), [...manifest.managedPaths].sort())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('adopt --ci fails closed when the existing project has no confirmed test command', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-ci-fail-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'existing-app', license: 'MIT' }) + '\n')
    assert.throws(
      () => runCli(['adopt', dir, '--ci']),
      (error) => {
        assert.match(error.stderr, /requires a non-empty "test" script/)
        return true
      },
    )
    assert.deepEqual(readdirSync(dir), ['package.json'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('adopt --publish is rejected before writing any files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-publish-fail-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'existing-app', license: 'MIT' }) + '\n')
    assert.throws(
      () => runCli(['adopt', dir, '--publish']),
      (error) => {
        assert.match(error.stderr, /Cannot adopt a release workflow safely/)
        return true
      },
    )
    assert.deepEqual(readdirSync(dir), ['package.json'])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('adopt --dry-run is read-only and reports the planned additions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-dry-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'existing-app' }) + '\n')
    const before = readdirSync(dir)
    const out = runCli(['adopt', dir, '--license', 'mit', '--dry-run'])
    assert.match(out, /Would adopt/)
    assert.match(out, /dry run/)
    assert.deepEqual(readdirSync(dir), before)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('adopt supports an existing Python project without replacing pyproject.toml or source', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-python-'))
  try {
    const pyproject = [
      '[project]',
      'name = "existing-pkg"',
      'description = "Existing Python project"',
      'license = "Apache-2.0"',
      'authors = [{ name = "Python Maintainer" }]',
      '',
    ].join('\n')
    writeFileSync(join(dir, 'pyproject.toml'), pyproject)
    mkdirSync(join(dir, 'src', 'custom_pkg'), { recursive: true })
    const source = 'VALUE = 42\n'
    writeFileSync(join(dir, 'src', 'custom_pkg', '__init__.py'), source)
    writeFileSync(join(dir, 'LICENSE'), 'Apache License\nVersion 2.0, January 2004\n')

    runCli(['adopt', dir, '--no-agents'])
    assert.equal(readFileSync(join(dir, 'pyproject.toml'), 'utf8'), pyproject)
    assert.equal(readFileSync(join(dir, 'src', 'custom_pkg', '__init__.py'), 'utf8'), source)
    assert.equal(existsSync(join(dir, 'src', 'existing_pkg', '__init__.py')), false)
    assert.equal(existsSync(join(dir, 'AGENTS.md')), false)
    const manifest = JSON.parse(readFileSync(join(dir, '.oss-init.json'), 'utf8'))
    assert.equal(manifest.options.lang, 'python')
    assert.equal(manifest.managedPaths.includes('LICENSE'), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('adopt --ci derives pytest commands without overwriting an existing Python project', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-python-ci-'))
  try {
    const pyproject = [
      '[project]',
      'name = "existing-pkg"',
      'license = "MIT"',
      '',
      '[project.optional-dependencies]',
      'test = ["pytest>=8"]',
      '',
    ].join('\n')
    writeFileSync(join(dir, 'pyproject.toml'), pyproject)
    mkdirSync(join(dir, 'tests'))
    writeFileSync(join(dir, 'tests', 'test_existing.py'), 'def test_existing():\n    assert True\n')

    runCli(['adopt', dir, '--ci', '--no-agents'])
    assert.equal(readFileSync(join(dir, 'pyproject.toml'), 'utf8'), pyproject)
    assert.equal(readFileSync(join(dir, 'tests', 'test_existing.py'), 'utf8'), 'def test_existing():\n    assert True\n')
    const workflow = readFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'utf8')
    assert.match(workflow, /python -m pip install "\.\[test\]"/)
    assert.match(workflow, /python -m pytest/)
    assert.doesNotMatch(workflow, /unittest|\[dev\]/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('adopt requires explicit language for mixed repositories and refuses a second adoption', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-mixed-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'mixed-repo', license: 'MIT' }) + '\n')
    writeFileSync(join(dir, 'pyproject.toml'), '[project]\nname = "mixed-repo"\nlicense = "MIT"\n')
    assert.throws(
      () => runCli(['adopt', dir]),
      (error) => {
        assert.match(error.stderr, /Both package.json and pyproject.toml/)
        return true
      },
    )
    runCli(['adopt', dir, '--lang', 'node'])
    assert.throws(
      () => runCli(['adopt', dir, '--lang', 'node']),
      (error) => {
        assert.match(error.stderr, /already contains \.oss-init\.json/)
        return true
      },
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('update after adopt never starts managing pre-existing source or package metadata', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-update-'))
  try {
    const packageText = JSON.stringify({ name: 'existing-app', license: 'MIT' }, null, 2) + '\n'
    writeFileSync(join(dir, 'package.json'), packageText)
    runCli(['adopt', dir])
    const before = JSON.parse(readFileSync(join(dir, '.oss-init.json'), 'utf8'))
    runCli(['update', dir, '--force'])
    const after = JSON.parse(readFileSync(join(dir, '.oss-init.json'), 'utf8'))
    assert.equal(readFileSync(join(dir, 'package.json'), 'utf8'), packageText)
    assert.equal(existsSync(join(dir, 'src', 'index.js')), false)
    assert.equal(after.managedPaths.includes('package.json'), false)
    assert.equal(after.managedPaths.includes('src/index.js'), false)
    assert.deepEqual(after.managedPaths.sort(), before.managedPaths.sort())
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('update after adopt permanently protects later user-created template collisions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-future-collision-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'existing-app', license: 'MIT' }) + '\n')
    runCli(['adopt', dir])
    const manifestPath = join(dir, '.oss-init.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    const collision = '.gitattributes'
    delete manifest.files[collision]
    manifest.managedPaths = manifest.managedPaths.filter((path) => path !== collision)
    manifest.protectedPaths = manifest.protectedPaths.filter((path) => path !== collision)
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    writeFileSync(join(dir, collision), 'user-created-after-adoption\n')

    runCli(['update', dir, '--force'])
    assert.equal(readFileSync(join(dir, collision), 'utf8'), 'user-created-after-adoption\n')
    const updated = JSON.parse(readFileSync(manifestPath, 'utf8'))
    assert.equal(updated.protectedPaths.includes(collision), true)
    assert.equal(updated.managedPaths.includes(collision), false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

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
    const existingReadme = '# empty-repo\n\nA bare repo. A bare repo. A bare repo.\n';
    writeFileSync(join(dir, 'README.md'), existingReadme);
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
    assert.equal(readFileSync(join(dir, 'README.md'), 'utf8'), existingReadme);
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
    assert.equal(manifest.schemaVersion, 3);
    assert.equal(manifest.generatorVersion, PACKAGE_VERSION);
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
    manifest.managedPaths.push(path);
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
    manifest.managedPaths.push(path);
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

test('update reports corrupted manifest JSON without rendering', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  try {
    writeFileSync(join(dir, 'README.md'), '# not related\n');
    writeFileSync(join(dir, '.oss-init.json'), '{ this is not valid json }}}');
    assert.throws(
      () => runCli(['update', dir]),
      (err) => {
        assert.match(err.stderr, /Invalid \.oss-init\.json/);
        return true;
      },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update validates manifest structure before mutating target files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-schema-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en']);
    const manifestPath = join(dir, '.oss-init.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const readmeBefore = readFileSync(join(dir, 'README.md'), 'utf8');
    manifest.files = [];
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    assert.throws(
      () => runCli(['update', dir, '--force']),
      (err) => {
        assert.match(err.stderr, /files must be an object/);
        return true;
      },
    );
    assert.equal(readFileSync(join(dir, 'README.md'), 'utf8'), readmeBefore);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update rewrites the manifest with the installed generator version', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-version-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en']);
    const manifestPath = join(dir, '.oss-init.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.schemaVersion = 1;
    manifest.generatorVersion = '0.2.0';
    delete manifest.managedPaths;
    delete manifest.protectedPaths;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    runCli(['update', dir]);
    const rewritten = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(rewritten.schemaVersion, 3);
    assert.equal(rewritten.generatorVersion, PACKAGE_VERSION);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('update removes its temporary directory after a filesystem failure', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-update-cleanup-'));
  const controlledTemp = mkdtempSync(join(tmpdir(), 'oss-init-update-tmp-root-'));
  try {
    runCli([dir, '--name', 'demo-app', '--docs', 'en']);
    const manifestPath = join(dir, '.oss-init.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    mkdirSync(join(dir, 'retired-directory'));
    manifest.files['retired-directory'] = 'a'.repeat(64);
    manifest.managedPaths.push('retired-directory');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    assert.throws(() => runCli(['update', dir], {
      env: { ...cleanEnv(), TEMP: controlledTemp, TMP: controlledTemp },
    }));
    assert.deepEqual(readdirSync(controlledTemp), []);
    assert.ok(existsSync(join(dir, 'retired-directory')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(controlledTemp, { recursive: true, force: true });
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

test('--template snapshots portable overrides and update reuses them safely', () => {
  const customRoot = mkdtempSync(join(tmpdir(), 'oss-init-cli-custom-'));
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-cli-custom-target-'));
  try {
    mkdirSync(join(customRoot, 'common'), { recursive: true });
    mkdirSync(join(customRoot, 'node'), { recursive: true });
    writeFileSync(join(customRoot, 'common', 'README.md.tpl'), '# {{projectName}}\n\nOrganization baseline.\n');
    writeFileSync(join(customRoot, 'node', 'NOTICE.md.tpl'), 'Owner: {{author}}\n');

    runCli([
      dir,
      '--name',
      'demo-app',
      '--docs',
      'en',
      '--author',
      'Example Org',
      '--template',
      customRoot,
    ]);
    assert.equal(readFileSync(join(dir, 'README.md'), 'utf8'), '# demo-app\n\nOrganization baseline.\n');
    assert.equal(readFileSync(join(dir, 'NOTICE.md'), 'utf8'), 'Owner: Example Org\n');

    const manifestPath = join(dir, '.oss-init.json');
    const manifestText = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestText);
    assert.equal(manifest.schemaVersion, 3);
    assert.equal(manifest.customTemplates['node/NOTICE.md.tpl'], 'Owner: {{author}}\n');
    assert.equal(manifestText.includes(customRoot), false, 'manifest must not store the machine-specific template path');

    rmSync(customRoot, { recursive: true, force: true });
    rmSync(join(dir, 'NOTICE.md'));
    const added = runCli(['update', dir]);
    assert.match(added, /Added 1 new file/);
    assert.equal(readFileSync(join(dir, 'NOTICE.md'), 'utf8'), 'Owner: Example Org\n');

    writeFileSync(join(dir, 'NOTICE.md'), 'User-owned notice\n');
    const skipped = runCli(['update', dir]);
    assert.match(skipped, /Skipped.*modified/);
    assert.equal(readFileSync(join(dir, 'NOTICE.md'), 'utf8'), 'User-owned notice\n');
    runCli(['update', dir, '--force']);
    assert.equal(readFileSync(join(dir, 'NOTICE.md'), 'utf8'), 'Owner: Example Org\n');
  } finally {
    rmSync(customRoot, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--template reports missing values before writing project files', () => {
  const customRoot = mkdtempSync(join(tmpdir(), 'oss-init-cli-custom-invalid-'));
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-cli-custom-invalid-target-'));
  try {
    mkdirSync(join(customRoot, 'common'), { recursive: true });
    writeFileSync(join(customRoot, 'common', 'NOTICE.md.tpl'), 'Team: {{organization}}\n');
    assert.throws(
      () => runCli([dir, '--name', 'demo-app', '--docs', 'en', '--template', customRoot]),
      (error) => {
        assert.match(error.stderr, /organization/);
        assert.match(error.stderr, /common\/NOTICE\.md\.tpl/);
        return true;
      },
    );
    assert.deepEqual(readdirSync(dir), []);
  } finally {
    rmSync(customRoot, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--template rejects placeholder-derived path escape without writing outside the target', () => {
  const customRoot = mkdtempSync(join(tmpdir(), 'oss-init-cli-custom-escape-'));
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-cli-custom-escape-target-'));
  const escaped = join(dirname(dir), 'oss-init-custom-escaped.txt');
  try {
    mkdirSync(join(customRoot, 'node'), { recursive: true });
    writeFileSync(join(customRoot, 'node', '{{author}}.tpl'), 'outside\n');
    assert.throws(
      () => runCli([
        dir,
        '--name',
        'demo-app',
        '--docs',
        'en',
        '--author',
        '../../oss-init-custom-escaped.txt',
        '--template',
        customRoot,
      ]),
      (error) => {
        assert.match(error.stderr, /safe relative path|outside target directory/);
        return true;
      },
    );
    assert.equal(existsSync(escaped), false);
  } finally {
    rmSync(customRoot, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
    rmSync(escaped, { force: true });
  }
});

test('--template supports a non-ASCII Python template directory and dry-run stays read-only', () => {
  const customRoot = mkdtempSync(join(tmpdir(), '组织模板-'));
  const previewDir = mkdtempSync(join(tmpdir(), 'oss-init-cli-custom-preview-'));
  const targetDir = mkdtempSync(join(tmpdir(), 'oss-init-cli-custom-python-'));
  try {
    mkdirSync(join(customRoot, 'python'), { recursive: true });
    writeFileSync(join(customRoot, 'python', 'ORGANIZATION.md.tpl'), 'Import {{pythonImport}}\n');
    const preview = runCli([
      previewDir,
      '--name',
      'demo-pkg',
      '--lang',
      'python',
      '--docs',
      'en',
      '--template',
      customRoot,
      '--dry-run',
    ]);
    assert.match(preview, /ORGANIZATION\.md/);
    assert.deepEqual(readdirSync(previewDir), []);

    runCli([
      targetDir,
      '--name',
      'demo-pkg',
      '--lang',
      'python',
      '--docs',
      'en',
      '--template',
      customRoot,
    ]);
    assert.equal(readFileSync(join(targetDir, 'ORGANIZATION.md'), 'utf8'), 'Import demo_pkg\n');
    assert.ok(existsSync(join(targetDir, 'pyproject.toml')));
  } finally {
    rmSync(customRoot, { recursive: true, force: true });
    rmSync(previewDir, { recursive: true, force: true });
    rmSync(targetDir, { recursive: true, force: true });
  }
});
