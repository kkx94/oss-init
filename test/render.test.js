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
  nameCamel: 'demoApp',
  nameSnake: 'demo_app',
  description: 'A demo project.',
  year: '2026',
  author: 'Demo Author',
  githubUser: 'demo-user',
  license: 'mit',
  licenseId: 'MIT',
  licenseTitle: 'MIT License',
};

function renderToTemp(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-render-'));
  const result = render({
    templateRoot: TEMPLATE_ROOT,
    targetDir: dir,
    values: { ...BASE_VALUES, ...overrides },
    docs: 'bilingual',
    ci: true,
    publish: true,
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
    assert.match(readme, /特性/);
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
      values: { ...BASE_VALUES, name: 'my-cool-lib', nameSnake: 'my_cool_lib' },
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

test('render refuses a placeholder-derived destination outside the target directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-render-safe-'));
  const escapedName = `oss-init-escaped-${basename(dir)}`;
  const escaped = join(dirname(dir), escapedName);
  try {
    assert.throws(
      () => render({
        templateRoot: TEMPLATE_ROOT,
        targetDir: dir,
        values: { ...BASE_VALUES, nameSnake: `../../${escapedName}` },
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
