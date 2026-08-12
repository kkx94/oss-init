import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  detectProjectLanguage,
  githubOwnerFromUrl,
  inferAdoptCiProfile,
  readExistingProjectMetadata,
  resolveAdoptLicense,
} from '../src/adopt-metadata.js'

test('extracts GitHub owners from common repository URL forms', () => {
  assert.equal(githubOwnerFromUrl('git+https://github.com/acme/demo.git'), 'acme')
  assert.equal(githubOwnerFromUrl('git@github.com:acme/demo.git'), 'acme')
  assert.equal(githubOwnerFromUrl('github:acme/demo'), 'acme')
  assert.equal(githubOwnerFromUrl('https://example.com/acme/demo'), '')
})

test('detects one project language and requires a choice for mixed repositories', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-meta-'))
  try {
    writeFileSync(join(dir, 'package.json'), '{}\n')
    assert.equal(detectProjectLanguage(dir), 'node')
    writeFileSync(join(dir, 'pyproject.toml'), '[project]\nname = "demo"\n')
    assert.throws(() => detectProjectLanguage(dir), /Both package.json and pyproject.toml/)
    assert.equal(detectProjectLanguage(dir, 'python'), 'python')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('reads package.json adoption metadata without changing the project', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-node-meta-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: '@acme/demo',
      description: 'Existing project',
      author: { name: 'A Maintainer' },
      license: 'MIT',
      repository: { url: 'git+https://github.com/acme/demo.git' },
    }))
    const metadata = readExistingProjectMetadata(dir, 'node')
    assert.equal(metadata.name, '@acme/demo')
    assert.equal(metadata.author, 'A Maintainer')
    assert.equal(metadata.githubUser, 'acme')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('reads PEP 621 metadata and recognizes an existing Apache license', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-python-meta-'))
  try {
    mkdirSync(join(dir, 'src'))
    writeFileSync(join(dir, 'pyproject.toml'), [
      '[project]',
      'name = "demo-pkg"',
      'description = "Existing Python project"',
      'license = "Apache-2.0"',
      'authors = [{ name = "Python Maintainer" }]',
      '',
      '[tool.pytest.ini_options]',
      'testpaths = ["tests"]',
      '',
    ].join('\n'))
    writeFileSync(join(dir, 'LICENSE'), 'Apache License\nVersion 2.0, January 2004\n')
    const metadata = readExistingProjectMetadata(dir, 'python')
    assert.equal(metadata.name, 'demo-pkg')
    assert.equal(metadata.description, 'Existing Python project')
    assert.equal(metadata.author, 'Python Maintainer')
    assert.deepEqual(resolveAdoptLicense(dir, metadata.license, null), {
      value: 'apache-2.0',
      id: 'Apache-2.0',
      title: 'Apache License 2.0',
      generate: false,
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('requires an explicit license when neither metadata nor a license file identifies one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-license-'))
  try {
    assert.throws(() => resolveAdoptLicense(dir, '', null), /No project license could be inferred/)
    assert.equal(resolveAdoptLicense(dir, '', 'mit').generate, true)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('does not replace an unsupported existing license declaration', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-license-expression-'))
  try {
    assert.throws(
      () => resolveAdoptLicense(dir, 'MIT OR Apache-2.0', null),
      /cannot safely generate/,
    )
    assert.throws(
      () => resolveAdoptLicense(dir, 'MIT OR Apache-2.0', 'mit'),
      /cannot safely generate|cannot override/,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('infers Node CI commands from scripts and package-manager evidence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-node-ci-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'demo',
      scripts: { test: 'node --test', lint: 'eslint .' },
      packageManager: 'pnpm@10.0.0',
    }))
    writeFileSync(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    const profile = inferAdoptCiProfile(dir, 'node', readExistingProjectMetadata(dir, 'node'))
    assert.deepEqual(profile, {
      ciInstallCommand: 'corepack enable && pnpm install --frozen-lockfile',
      ciTestCommand: 'pnpm test',
      ciLintStep: '      - run: pnpm run lint',
    })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('Node CI inference fails closed without tests or with conflicting lockfiles', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-node-ci-fail-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', scripts: {} }))
    assert.throws(
      () => inferAdoptCiProfile(dir, 'node', readExistingProjectMetadata(dir, 'node')),
      /requires a non-empty "test" script/,
    )
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', scripts: { test: 'node --test' } }))
    writeFileSync(join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    writeFileSync(join(dir, 'yarn.lock'), '# yarn lock\n')
    assert.throws(
      () => inferAdoptCiProfile(dir, 'node', readExistingProjectMetadata(dir, 'node')),
      /conflicting package-manager lockfiles/,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('does not require a frozen package-manager lockfile when none exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-node-ci-no-lock-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'demo',
      scripts: { test: 'node --test' },
      packageManager: 'yarn@4.1.0',
    }))
    const profile = inferAdoptCiProfile(dir, 'node', readExistingProjectMetadata(dir, 'node'))
    assert.equal(profile.ciInstallCommand, 'corepack enable && yarn install')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('infers Python pytest and unittest CI commands from repository evidence', () => {
  const pytestDir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-pytest-ci-'))
  const unittestDir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-unittest-ci-'))
  try {
    mkdirSync(join(pytestDir, 'tests'))
    writeFileSync(join(pytestDir, 'tests', 'test_demo.py'), 'def test_demo():\n    assert True\n')
    writeFileSync(join(pytestDir, 'pyproject.toml'), [
      '[project]',
      'name = "demo"',
      '',
      '[project.optional-dependencies]',
      'dev = ["pytest>=8"]',
      '',
    ].join('\n'))
    assert.deepEqual(
      inferAdoptCiProfile(pytestDir, 'python', readExistingProjectMetadata(pytestDir, 'python')),
      {
        ciInstallCommand: 'python -m pip install ".[dev]"',
        ciTestCommand: 'python -m pytest',
        ciLintStep: '',
      },
    )

    mkdirSync(join(unittestDir, 'test'))
    writeFileSync(join(unittestDir, 'test', 'test_demo.py'), [
      'import unittest',
      '',
      'class DemoTest(unittest.TestCase):',
      '    pass',
      '',
    ].join('\n'))
    writeFileSync(join(unittestDir, 'pyproject.toml'), '[project]\nname = "demo"\n')
    assert.equal(
      inferAdoptCiProfile(unittestDir, 'python', readExistingProjectMetadata(unittestDir, 'python')).ciTestCommand,
      'python -m unittest discover -s test',
    )
  } finally {
    rmSync(pytestDir, { recursive: true, force: true })
    rmSync(unittestDir, { recursive: true, force: true })
  }
})

test('Python CI inference fails closed without a recognizable test runner', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-python-ci-fail-'))
  try {
    mkdirSync(join(dir, 'tests'))
    writeFileSync(join(dir, 'tests', 'test_demo.py'), 'def check_something():\n    return True\n')
    writeFileSync(join(dir, 'pyproject.toml'), '[project]\nname = "demo"\n')
    assert.throws(
      () => inferAdoptCiProfile(dir, 'python', readExistingProjectMetadata(dir, 'python')),
      /could not confirm a runnable Python test setup/,
    )
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
