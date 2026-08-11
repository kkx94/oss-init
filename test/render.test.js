import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render } from '../src/render.js';

const TEMPLATE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'templates');

const BASE_VALUES = {
  name: 'demo-app',
  packageName: 'demo-app',
  projectName: 'demo-app',
  projectBase: 'demo-app',
  repoName: 'demo-app',
  jsIdentifier: 'demoApp',
  pythonDistribution: null,
  pythonImport: null,
  nameCamel: 'demoApp',
  nameSnake: 'demo_app',
  description: 'A demo project.',
  year: '2026',
  author: 'Demo Author',
  githubUser: 'demo-user',
  license: 'mit',
  licenseId: 'MIT',
  licenseTitle: 'MIT License',
  generatorRepoUrl: 'https://github.com/kkx94/oss-init',
  primaryLanguage: 'JavaScript',
  runtimeSummary: 'Node.js >= 22 (ES modules)',
  installCommand: 'npm install',
  testCommand: 'npm test',
  codeFenceLanguage: 'js',
  usageExample: "import { add } from './src/index.js';\n\nconsole.log(add(1, 2));",
  ciBadge: '![CI](https://github.com/demo-user/demo-app/actions/workflows/ci.yml/badge.svg)',
  ciSummary: 'GitHub Actions CI included',
};

function renderToTemp(overrides = {}, renderOverrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-render-'));
  const result = render({
    templateRoot: TEMPLATE_ROOT,
    targetDir: dir,
    values: { ...BASE_VALUES, ...overrides },
    docs: 'bilingual',
    ci: true,
    publish: true,
    lang: 'node',
    ...renderOverrides,
  });
  return { dir, result };
}

function collectFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out;
}

test('renders all expected files with no errors', () => {
  const { dir, result } = renderToTemp();
  try {
    assert.deepEqual(result.errors, []);
    const expected = [
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
    ];
    for (const file of expected) {
      assert.ok(existsSync(join(dir, file)), `expected ${file} to exist`);
    }
    assert.ok(result.filesWritten.length >= expected.length);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('no placeholder tokens survive in any output file', () => {
  const { dir, result } = renderToTemp();
  try {
    assert.deepEqual(result.errors, []);
    for (const file of collectFiles(dir)) {
      const content = readFileSync(file, 'utf8');
      assert.doesNotMatch(content, /{{\s*[a-zA-Z0-9_-]+\s*}}/, `placeholder left in ${file}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('docs=en skips the Chinese README', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-render-'));
  try {
    render({
      templateRoot: TEMPLATE_ROOT,
      targetDir: dir,
      values: BASE_VALUES,
      docs: 'en',
      ci: false,
      publish: false,
    });
    assert.ok(existsSync(join(dir, 'README.md')));
    assert.equal(existsSync(join(dir, 'README.zh-CN.md')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('docs=zh writes Chinese content as the main README', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-render-'));
  try {
    render({
      templateRoot: TEMPLATE_ROOT,
      targetDir: dir,
      values: BASE_VALUES,
      docs: 'zh',
      ci: false,
      publish: false,
    });
    const readme = readFileSync(join(dir, 'README.md'), 'utf8');
    assert.match(readme, /已包含的基础能力/);
    assert.equal(existsSync(join(dir, 'README.zh-CN.md')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ci/publish disabled skips workflows but keeps issue templates', () => {
  const { dir, result } = renderToTemp();
  try {
    rmSync(dir, { recursive: true, force: true });
    const newDir = mkdtempSync(join(tmpdir(), 'oss-init-render-'));
    const res = render({
      templateRoot: TEMPLATE_ROOT,
      targetDir: newDir,
      values: BASE_VALUES,
      docs: 'bilingual',
      ci: false,
      publish: false,
    });
    assert.deepEqual(res.errors, []);
    assert.equal(existsSync(join(newDir, '.github', 'workflows')), false);
    assert.ok(existsSync(join(newDir, '.github', 'ISSUE_TEMPLATE', 'bug_report.yml')));
    assert.ok(existsSync(join(newDir, '.github', 'PULL_REQUEST_TEMPLATE.md')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('apache-2.0 license renders with title', () => {
  const { dir, result } = renderToTemp({ license: 'apache-2.0', licenseId: 'Apache-2.0', licenseTitle: 'Apache License 2.0' });
  try {
    assert.deepEqual(result.errors, []);
    const license = readFileSync(join(dir, 'LICENSE'), 'utf8');
    assert.match(license, /Apache License/);
    assert.doesNotMatch(license, /MIT License/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('values are substituted into files', () => {
  const { dir } = renderToTemp();
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'demo-app');
    assert.equal(pkg.license, 'MIT');
    const license = readFileSync(join(dir, 'LICENSE'), 'utf8');
    assert.match(license, /Demo Author/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('missing template value is reported as an error', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-render-'));
  try {
    const result = render({
      templateRoot: TEMPLATE_ROOT,
      targetDir: dir,
      values: { ...BASE_VALUES, license: undefined },
      docs: 'bilingual',
      ci: false,
      publish: false,
    });
    assert.ok(result.errors.length > 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('python template renders with snake_case package paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-render-'));
  try {
    const result = render({
      templateRoot: TEMPLATE_ROOT,
      targetDir: dir,
      values: {
        ...BASE_VALUES,
        name: 'my-cool-lib',
        packageName: null,
        projectName: 'my-cool-lib',
        projectBase: 'my-cool-lib',
        repoName: 'my-cool-lib',
        jsIdentifier: null,
        pythonDistribution: 'my-cool-lib',
        pythonImport: 'my_cool_lib',
        nameCamel: 'my-cool-lib',
        nameSnake: 'my_cool_lib',
        primaryLanguage: 'Python',
        runtimeSummary: 'Python >= 3.10',
        installCommand: 'python -m pip install -e ".[dev]"',
        testCommand: 'python -m unittest discover -s tests',
        codeFenceLanguage: 'python',
        usageExample: 'from my_cool_lib import add\n\nprint(add(1, 2))',
      },
      docs: 'en',
      ci: true,
      publish: true,
      lang: 'python',
    });
    assert.deepEqual(result.errors, []);
    assert.ok(existsSync(join(dir, 'pyproject.toml')));
    assert.ok(existsSync(join(dir, 'src', 'my_cool_lib', '__init__.py')));
    assert.ok(existsSync(join(dir, 'tests', 'test_my_cool_lib.py')));
    assert.equal(existsSync(join(dir, 'package.json')), false);
    const pyproject = readFileSync(join(dir, 'pyproject.toml'), 'utf8');
    assert.match(pyproject, /my_cool_lib/);
    assert.doesNotMatch(pyproject, /\{\{/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rendered templates use the real generator and repository identities', () => {
  const { dir, result } = renderToTemp({
    name: '@scope/my-lib',
    packageName: '@scope/my-lib',
    projectName: 'my-lib',
    projectBase: 'my-lib',
    repoName: 'my-lib',
    jsIdentifier: 'myLib',
    nameCamel: 'myLib',
    nameSnake: 'my_lib',
    ciBadge: '![CI](https://github.com/demo-user/my-lib/actions/workflows/ci.yml/badge.svg)',
  });
  try {
    assert.deepEqual(result.errors, []);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    assert.equal(pkg.name, '@scope/my-lib');
    assert.equal(pkg.repository.url, 'git+https://github.com/demo-user/my-lib.git');
    const allText = collectFiles(dir).map((file) => readFileSync(file, 'utf8')).join('\n');
    assert.match(allText, /https:\/\/github\.com\/kkx94\/oss-init/);
    assert.doesNotMatch(allText, /github\.com\/oss-init\/oss-init/);
    assert.doesNotMatch(allText, /github\.com\/demo-user\/@scope\/my-lib/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('rendered text contains no stale claims or encoding corruption', () => {
  const { dir } = renderToTemp();
  try {
    const allText = collectFiles(dir).map((file) => readFileSync(file, 'utf8')).join('\n');
    assert.doesNotMatch(allText, /branch tax|Score:\s*100|production-grade|Actively maintained/);
    assert.doesNotMatch(allText, /\uFFFD|鈥|鐗|鑴/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('generated Node workflows use maintained runtimes and fail closed', () => {
  const { dir } = renderToTemp();
  try {
    const ci = readFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'utf8');
    const release = readFileSync(join(dir, '.github', 'workflows', 'release.yml'), 'utf8');
    assert.match(ci, /node-version: \[22\.x, 24\.x\]/);
    assert.match(ci, /windows-latest/);
    assert.match(ci, /name: CI/);
    assert.match(release, /npm publish --access public --provenance/);
    assert.match(release, /npm view/);
    assert.doesNotMatch(release, /if:\s*env\.NODE_AUTH_TOKEN\s*!=/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('generated Python metadata, docs, and CI use Python identities', () => {
  const pythonValues = {
    ...BASE_VALUES,
    name: 'my.cool-lib',
    packageName: null,
    projectName: 'my.cool-lib',
    projectBase: 'my.cool-lib',
    repoName: 'my.cool-lib',
    jsIdentifier: null,
    pythonDistribution: 'my.cool-lib',
    pythonImport: 'my_cool_lib',
    nameCamel: 'my.cool-lib',
    nameSnake: 'my_cool_lib',
    primaryLanguage: 'Python',
    runtimeSummary: 'Python >= 3.10',
    installCommand: 'python -m pip install -e ".[dev]"',
    testCommand: 'python -m unittest discover -s tests',
    codeFenceLanguage: 'python',
    usageExample: 'from my_cool_lib import add\n\nprint(add(1, 2))',
  };
  const { dir, result } = renderToTemp(pythonValues, { lang: 'python' });
  try {
    assert.deepEqual(result.errors, []);
    const pyproject = readFileSync(join(dir, 'pyproject.toml'), 'utf8');
    const readme = readFileSync(join(dir, 'README.md'), 'utf8');
    const ci = readFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'utf8');
    assert.match(pyproject, /name = "my\.cool-lib"/);
    assert.match(pyproject, /packages = \["src\/my_cool_lib"\]/);
    assert.match(pyproject, /github\.com\/demo-user\/my\.cool-lib/);
    assert.match(readme, /Python >= 3\.10/);
    assert.match(readme, /from my_cool_lib import add/);
    assert.doesNotMatch(readme, /Node\.js/);
    assert.match(ci, /windows-latest/);
    assert.match(ci, /name: CI/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('render refuses a placeholder-derived destination outside the target directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-render-safe-'));
  const escapedName = `oss-init-escaped-${basename(dir)}`;
  const escaped = join(dirname(dir), escapedName);
  try {
    assert.throws(
      () => render({
        templateRoot: TEMPLATE_ROOT,
        targetDir: dir,
        values: { ...BASE_VALUES, pythonImport: `../../${escapedName}` },
        docs: 'en',
        ci: false,
        publish: false,
        lang: 'python',
      }),
      /safe relative path|outside target directory/,
    );
    assert.equal(existsSync(escaped), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(escaped, { recursive: true, force: true });
  }
});
