import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  MANIFEST_SCHEMA_VERSION,
  createManifest,
  parseAndValidateManifest,
  resolveContainedPath,
} from '../src/manifest.js';

const HASH = 'a'.repeat(64);

const VALUES = {
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

const OPTIONS = {
  lang: 'node',
  license: 'mit',
  docs: 'bilingual',
  ci: true,
  publish: false,
  agents: true,
};

function validManifest(overrides = {}) {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatorVersion: '0.3.1',
    values: VALUES,
    options: OPTIONS,
    files: { 'README.md': HASH },
    ...overrides,
  };
}

test('migrates a v0.2 legacy manifest to schema 1', () => {
  const result = parseAndValidateManifest(JSON.stringify({
    version: '0.2.0',
    values: {
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
    },
    options: OPTIONS,
    files: { 'README.md': HASH },
  }));
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.manifest.schemaVersion, 1);
  assert.equal(result.manifest.generatorVersion, '0.2.0');
  assert.equal(result.manifest.values.repoName, 'demo-app');
  assert.equal(result.manifest.values.jsIdentifier, 'demoApp');
  assert.equal('version' in result.manifest, false);
});

test('rejects a manifest whose files value is an array', () => {
  const result = parseAndValidateManifest(validManifest({ files: [] }));
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /files must be an object/);
});

test('rejects non-sha256 file hashes', () => {
  const result = parseAndValidateManifest(validManifest({ files: { 'README.md': 'whatever' } }));
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /files\["README\.md"\].*SHA-256/);
});

test('rejects unsupported schema versions and option values', () => {
  const unsupported = parseAndValidateManifest(validManifest({ schemaVersion: 99 }));
  assert.equal(unsupported.ok, false);
  assert.match(unsupported.errors.join('\n'), /Unsupported manifest schemaVersion 99/);

  const invalidOption = parseAndValidateManifest(validManifest({
    options: { ...OPTIONS, lang: 'ruby' },
  }));
  assert.equal(invalidOption.ok, false);
  assert.match(invalidOption.errors.join('\n'), /options\.lang/);
});

test('rejects unsafe relative paths and path-derived identity values', () => {
  const unsafePath = parseAndValidateManifest(validManifest({
    files: { '../escape.txt': HASH },
  }));
  assert.equal(unsafePath.ok, false);
  assert.match(unsafePath.errors.join('\n'), /files\["\.\.\/escape\.txt"\].*safe relative path/);

  const unsafeIdentity = parseAndValidateManifest(validManifest({
    options: { ...OPTIONS, lang: 'python' },
    values: {
      ...VALUES,
      name: 'demo-app',
      packageName: null,
      jsIdentifier: null,
      pythonDistribution: 'demo-app',
      pythonImport: '../../escape',
    },
  }));
  assert.equal(unsafeIdentity.ok, false);
  assert.match(unsafeIdentity.errors.join('\n'), /values\.pythonImport/);
});

test('uses the supplied installed generator version when constructing a manifest', () => {
  const manifest = createManifest({
    generatorVersion: '0.3.1',
    values: VALUES,
    options: OPTIONS,
    files: { 'README.md': HASH },
  });
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.generatorVersion, '0.3.1');
  assert.equal('version' in manifest, false);
});

test('resolveContainedPath accepts descendants and rejects cross-platform escapes', () => {
  const root = mkdtempSync(join(tmpdir(), 'oss-init-contained-'));
  try {
    assert.equal(resolveContainedPath(root, 'src/index.js'), join(root, 'src', 'index.js'));
    for (const rel of ['../escape', '/absolute', '\\server\\share', 'C:\\escape.txt', 'src/../../escape']) {
      assert.throws(() => resolveContainedPath(root, rel), /safe relative path|outside target directory/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
