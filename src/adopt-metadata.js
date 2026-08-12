import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function readJson(path, label) {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${label} root must be an object`)
    }
    return value
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${error.message}`)
  }
}

function tomlString(section, key) {
  const match = section.match(new RegExp(`^\\s*${key}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|'[^']*')\\s*(?:#.*)?$`, 'm'))
  if (!match) return ''
  if (match[1].startsWith("'")) return match[1].slice(1, -1)
  try {
    return JSON.parse(match[1])
  } catch {
    return ''
  }
}

function projectSection(raw) {
  const lines = raw.split(/\r?\n/)
  const start = lines.findIndex((line) => /^\s*\[project\]\s*(?:#.*)?$/.test(line))
  if (start === -1) return ''
  const section = []
  for (const line of lines.slice(start + 1)) {
    if (/^\s*\[[^\]]+\]\s*(?:#.*)?$/.test(line)) break
    section.push(line)
  }
  return section.join('\n')
}

function pythonAuthor(section) {
  const authors = section.match(/^\s*authors\s*=\s*\[([\s\S]*?)\]\s*(?:#.*)?$/m)?.[1] ?? ''
  return authors.match(/\bname\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/)?.slice(1).find(Boolean) ?? ''
}

function packageAuthor(author) {
  if (typeof author === 'string') return author.replace(/\s*<[^>]+>\s*$/, '').trim()
  if (author && typeof author.name === 'string') return author.name.trim()
  return ''
}

function repositoryUrl(repository) {
  if (typeof repository === 'string') return repository
  if (repository && typeof repository.url === 'string') return repository.url
  return ''
}

function packageScripts(scripts) {
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts)) return {}
  return Object.fromEntries(
    Object.entries(scripts).filter(([, command]) => typeof command === 'string' && command.trim() !== ''),
  )
}

function nodeCiProfile(targetDir, metadata) {
  if (!metadata.scripts.test) {
    throw new Error('adopt --ci requires a non-empty "test" script in package.json.')
  }

  const lockManagers = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['package-lock.json', 'npm'],
    ['npm-shrinkwrap.json', 'npm'],
  ].filter(([name]) => existsSync(join(targetDir, name))).map(([, manager]) => manager)
  const uniqueLockManagers = [...new Set(lockManagers)]
  if (uniqueLockManagers.length > 1) {
    throw new Error(`adopt --ci found conflicting package-manager lockfiles: ${uniqueLockManagers.join(', ')}.`)
  }

  const declared = metadata.packageManager.toLowerCase()
  const declaredManager = ['npm', 'pnpm', 'yarn']
    .find((manager) => declared === manager || declared.startsWith(`${manager}@`)) ?? ''
  if (declared && !declaredManager) {
    throw new Error(`adopt --ci does not support the declared package manager ${JSON.stringify(metadata.packageManager)}.`)
  }
  if (declaredManager && uniqueLockManagers[0] && declaredManager !== uniqueLockManagers[0]) {
    throw new Error(
      `adopt --ci found packageManager ${declaredManager}, but the lockfile belongs to ${uniqueLockManagers[0]}.`,
    )
  }

  const manager = declaredManager || uniqueLockManagers[0] || 'npm'
  const hasSelectedLock = uniqueLockManagers[0] === manager
  const yarnMajor = Number.parseInt(metadata.packageManager.match(/^yarn@(\d+)/i)?.[1] ?? '', 10)
  const installCommand = manager === 'pnpm'
    ? `corepack enable && pnpm install${hasSelectedLock ? ' --frozen-lockfile' : ''}`
    : manager === 'yarn'
      ? `corepack enable && yarn install${hasSelectedLock ? ` --${existsSync(join(targetDir, '.yarnrc.yml')) || yarnMajor >= 2 ? 'immutable' : 'frozen-lockfile'}` : ''}`
      : uniqueLockManagers[0] === 'npm'
        ? 'npm ci'
        : 'npm install'
  return {
    ciInstallCommand: installCommand,
    ciTestCommand: `${manager} test`,
    ciLintStep: metadata.scripts.lint ? `      - run: ${manager} run lint` : '',
  }
}

function tomlArray(section, key) {
  return section.match(new RegExp(`^\\s*${key}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*(?:#.*)?$`, 'm'))?.[1] ?? ''
}

function requirementNames(value) {
  return [...value.matchAll(/(?:"((?:[^"\\]|\\.)*)"|'([^']*)')/g)]
    .map((match) => (match[1] ?? match[2] ?? '').match(/^\s*([A-Za-z0-9_.-]+)/)?.[1]?.toLowerCase())
}

function optionalPytestExtra(raw) {
  const lines = raw.split(/\r?\n/)
  const start = lines.findIndex((line) => /^\s*\[project\.optional-dependencies\]\s*(?:#.*)?$/.test(line))
  if (start === -1) return ''
  const section = []
  for (const line of lines.slice(start + 1)) {
    if (/^\s*\[[^\]]+\]\s*(?:#.*)?$/.test(line)) break
    section.push(line)
  }
  const candidates = []
  for (const match of section.join('\n').matchAll(/^\s*([A-Za-z0-9_.-]+)\s*=\s*\[([\s\S]*?)\]\s*(?:#.*)?$/gm)) {
    if (requirementNames(match[2]).includes('pytest')) candidates.push(match[1])
  }
  return ['test', 'tests', 'dev'].find((name) => candidates.includes(name)) ?? candidates[0] ?? ''
}

function requirementFileWithPytest(targetDir) {
  for (const name of ['requirements-test.txt', 'requirements-dev.txt', 'requirements.txt']) {
    const path = join(targetDir, name)
    if (!existsSync(path) || !lstatSync(path).isFile()) continue
    if (/^\s*pytest(?:\s|[<>=!~;\[]|$)/im.test(readFileSync(path, 'utf8'))) return name
  }
  return ''
}

function pythonTestFiles(targetDir) {
  for (const testRoot of ['tests', 'test']) {
    const root = join(targetDir, testRoot)
    if (!existsSync(root) || !lstatSync(root).isDirectory()) continue
    const files = []
    const pending = [root]
    let entriesVisited = 0
    while (pending.length > 0 && entriesVisited < 1000) {
      const current = pending.pop()
      for (const entry of readdirSync(current, { withFileTypes: true })) {
        entriesVisited += 1
        const path = join(current, entry.name)
        if (entry.isDirectory()) pending.push(path)
        if (entry.isFile() && /^(?:test.*|.*_test)\.py$/.test(entry.name)) files.push(path)
        if (entriesVisited >= 1000) break
      }
    }
    if (files.length > 0) return { root: testRoot, files }
  }
  return { root: '', files: [] }
}

function pythonCiProfile(targetDir, metadata) {
  const tests = pythonTestFiles(targetDir)
  if (tests.files.length === 0) {
    throw new Error('adopt --ci requires Python tests under tests/ or test/.')
  }

  const directPytest = requirementNames(tomlArray(metadata.projectSection, 'dependencies')).includes('pytest')
  const pytestExtra = optionalPytestExtra(metadata.rawProject)
  const pytestRequirements = requirementFileWithPytest(targetDir)
  const pytestConfigured = /^\s*\[tool\.pytest(?:\.|\])/m.test(metadata.rawProject)
    || existsSync(join(targetDir, 'pytest.ini'))
    || existsSync(join(targetDir, 'conftest.py'))
  if (directPytest || pytestExtra || pytestRequirements) {
    const ciInstallCommand = pytestExtra
      ? `python -m pip install ".[${pytestExtra}]"`
      : pytestRequirements
        ? `python -m pip install -r ${pytestRequirements} && python -m pip install .`
        : 'python -m pip install .'
    return {
      ciInstallCommand,
      ciTestCommand: 'python -m pytest',
      ciLintStep: '',
    }
  }

  const unittestDetected = tests.files.some((path) => {
    const text = readFileSync(path, 'utf8').slice(0, 256 * 1024)
    return /(?:^|\n)\s*(?:from\s+unittest\s+import|import\s+unittest\b)|\bunittest\.TestCase\b/.test(text)
  })
  if (unittestDetected && !pytestConfigured) {
    return {
      ciInstallCommand: 'python -m pip install .',
      ciTestCommand: `python -m unittest discover -s ${tests.root}`,
      ciLintStep: '',
    }
  }
  throw new Error(
    'adopt --ci could not confirm a runnable Python test setup. Declare pytest in project dependencies, an optional extra, or a requirements file; otherwise use unittest tests.',
  )
}

export function githubOwnerFromUrl(value) {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
    .replace(/^git\+/, '')
    .replace(/^github:/, 'https://github.com/')
    .replace(/^git@github\.com:/, 'https://github.com/')
  return normalized.match(/^https?:\/\/github\.com\/([^/]+)\/[^/]+(?:\.git)?\/?$/i)?.[1] ?? ''
}

function gitValue(targetDir, args) {
  try {
    return execFileSync('git', ['-C', targetDir, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

export function detectProjectLanguage(targetDir, explicitLanguage = null) {
  const hasNode = existsSync(join(targetDir, 'package.json'))
  const hasPython = existsSync(join(targetDir, 'pyproject.toml'))
  if (explicitLanguage) {
    const exists = explicitLanguage === 'node' ? hasNode : hasPython
    if (!exists) {
      throw new Error(
        `${explicitLanguage === 'node' ? 'package.json' : 'pyproject.toml'} was not found in the target directory.`,
      )
    }
    return explicitLanguage
  }
  if (hasNode && hasPython) {
    throw new Error('Both package.json and pyproject.toml were found. Re-run with --lang node or --lang python.')
  }
  if (hasNode) return 'node'
  if (hasPython) return 'python'
  throw new Error('No package.json or pyproject.toml was found. adopt requires an existing Node.js or Python project.')
}

export function readExistingProjectMetadata(targetDir, lang) {
  let metadata
  if (lang === 'node') {
    const pkg = readJson(join(targetDir, 'package.json'), 'package.json')
    metadata = {
      name: typeof pkg.name === 'string' ? pkg.name : '',
      description: typeof pkg.description === 'string' ? pkg.description.trim() : '',
      author: packageAuthor(pkg.author),
      license: typeof pkg.license === 'string' ? pkg.license.trim() : '',
      repository: repositoryUrl(pkg.repository),
      packageManager: typeof pkg.packageManager === 'string' ? pkg.packageManager.trim() : '',
      scripts: packageScripts(pkg.scripts),
    }
  } else {
    let raw
    try {
      raw = readFileSync(join(targetDir, 'pyproject.toml'), 'utf8')
    } catch (error) {
      throw new Error(`Unable to read pyproject.toml: ${error.message}`)
    }
    const project = projectSection(raw)
    if (!project) throw new Error('pyproject.toml must contain a [project] table.')
    metadata = {
      name: tomlString(project, 'name'),
      description: tomlString(project, 'description'),
      author: pythonAuthor(project),
      license: tomlString(project, 'license'),
      repository: '',
      projectSection: project,
      rawProject: raw,
    }
  }

  const remote = gitValue(targetDir, ['config', '--get', 'remote.origin.url'])
  return {
    ...metadata,
    gitAuthor: gitValue(targetDir, ['config', '--get', 'user.name']),
    githubUser: githubOwnerFromUrl(metadata.repository) || githubOwnerFromUrl(remote),
  }
}

export function inferAdoptCiProfile(targetDir, lang, metadata) {
  return lang === 'node'
    ? nodeCiProfile(targetDir, metadata)
    : pythonCiProfile(targetDir, metadata)
}

function normalizeLicense(value) {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'mit') return { value: 'mit', id: 'MIT', title: 'MIT License' }
  if (normalized === 'apache-2.0' || normalized === 'apache 2.0') {
    return { value: 'apache-2.0', id: 'Apache-2.0', title: 'Apache License 2.0' }
  }
  if (/^[a-z0-9][a-z0-9.+-]*$/i.test(value.trim())) {
    return { value: value.trim(), id: value.trim(), title: `${value.trim()} license` }
  }
  return null
}

function licenseFromFile(targetDir) {
  const path = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'].map((name) => join(targetDir, name)).find(existsSync)
  if (!path) return { exists: false, license: null }
  const text = readFileSync(path, 'utf8').slice(0, 64 * 1024)
  if (/permission is hereby granted, free of charge/i.test(text)) {
    return { exists: true, license: normalizeLicense('MIT') }
  }
  if (/apache license\s*(?:\n|\r|.){0,80}version 2\.0/i.test(text)) {
    return { exists: true, license: normalizeLicense('Apache-2.0') }
  }
  return {
    exists: true,
    license: { value: 'NOASSERTION', id: 'NOASSERTION', title: 'existing project license' },
  }
}

export function resolveAdoptLicense(targetDir, declaredLicense, explicitLicense) {
  const declared = typeof declaredLicense === 'string' ? declaredLicense.trim() : ''
  const fromMetadata = declared ? normalizeLicense(declared) : null
  const fromFile = licenseFromFile(targetDir)
  if (declared && !fromMetadata && !fromFile.exists) {
    throw new Error(
      `The project declares ${JSON.stringify(declared)}, but oss-init cannot safely generate that license. Add the matching LICENSE file first.`,
    )
  }
  if (
    fromMetadata
    && fromFile.exists
    && fromFile.license.id !== 'NOASSERTION'
    && fromMetadata.id !== fromFile.license.id
  ) {
    throw new Error(
      `Project metadata declares ${fromMetadata.id}, but the existing LICENSE appears to be ${fromFile.license.id}.`,
    )
  }
  if (explicitLicense) {
    const selected = normalizeLicense(explicitLicense)
    if (declared && !fromMetadata) {
      throw new Error(
        `--license ${explicitLicense} cannot override the existing project license declaration ${JSON.stringify(declared)}.`,
      )
    }
    if (fromMetadata && fromMetadata.id !== selected.id) {
      throw new Error(
        `--license ${explicitLicense} conflicts with the project metadata license ${declaredLicense}.`,
      )
    }
    if (fromFile.exists && fromFile.license.id === 'NOASSERTION' && !fromMetadata) {
      throw new Error(
        'An existing LICENSE file could not be identified. Declare its SPDX identifier in project metadata instead of overriding it.',
      )
    }
    if (fromFile.exists && fromFile.license.id !== selected.id) {
      throw new Error(
        `--license ${explicitLicense} conflicts with the existing ${fromFile.license.id} LICENSE file.`,
      )
    }
    return { ...selected, generate: !fromFile.exists }
  }
  if (fromMetadata) {
    if (!fromFile.exists && !['MIT', 'Apache-2.0'].includes(fromMetadata.id)) {
      throw new Error(
        `The project declares ${fromMetadata.id}, but oss-init cannot generate that license text. Add the LICENSE file first.`,
      )
    }
    return { ...fromMetadata, generate: !fromFile.exists }
  }
  if (fromFile.exists) return { ...fromFile.license, generate: false }
  throw new Error('No project license could be inferred. Re-run with --license mit or --license apache-2.0.')
}
