import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ADOPT_FLAG_DEFS, parseArgs } from '../args.js'
import {
  detectProjectLanguage,
  inferAdoptCiProfile,
  readExistingProjectMetadata,
  resolveAdoptLicense,
} from '../adopt-metadata.js'
import { createManifest, resolveContainedPath, sha256, writeManifestAtomic } from '../manifest.js'
import { deriveProjectIdentity, deriveTemplateValues } from '../project-identity.js'
import { render } from '../render.js'
import { dirExists, isWritable } from '../validate.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE_ROOT = join(__dirname, '..', 'templates')

export function adoptHelpText() {
  return [
    'oss-init adopt - Safely add open source maintenance files to an existing repository',
    '',
    'Usage:',
    '  oss-init adopt [target-dir] [options]',
    '',
    'Detects package.json or pyproject.toml, adds only missing community files,',
    'and records only those new files for future oss-init update runs. Existing',
    'files, source code, tests, and package metadata are never overwritten.',
    '',
    'Options:',
    '  --lang <node|python>       Resolve a repository containing both project types',
    '  --license <mit|apache-2.0> License to add when the project has none',
    '  --docs <en|zh|bilingual>   Language for a missing README (default: en)',
    '  --name <name>              Override a missing package/project name',
    '  --author <name>            Override the detected author',
    '  --github-user <login>      Override the detected GitHub login',
    '  --ci                       Add the standard CI workflow when missing',
    '  --publish                  Unsupported for adoption; exits without changes',
    '  --no-agents                Do not add AGENTS.md',
    '  --dry-run                  Preview additions without writing anything',
    '  --help, -h                 Show this help message',
    '  --version, -v              Show version',
    '',
    'Release workflows are intentionally not adopted because publishing configuration',
    'cannot be inferred safely. The --publish flag exits without changing the repository.',
    '',
    'Examples:',
    '  oss-init adopt . --dry-run',
    '  oss-init adopt ./existing-project --ci',
    '  oss-init adopt . --lang python --docs bilingual',
  ].join('\n')
}

export function runAdopt(argv, { version }) {
  const { options, positionals, errors } = parseArgs(argv, ADOPT_FLAG_DEFS)
  if (errors.length > 0 || positionals.length > 1) {
    const allErrors = [...errors]
    if (positionals.length > 1) allErrors.push('adopt accepts at most one target directory.')
    process.stderr.write(`${allErrors.join('\n')}\n\n${adoptHelpText()}\n`)
    return 1
  }
  if (options.publish) {
    process.stderr.write(
      'Cannot adopt a release workflow safely. Existing repositories use project-specific publishing credentials and release commands; --publish made no changes.\n',
    )
    return 1
  }

  const targetDir = resolve(positionals[0] ?? '.')
  if (!dirExists(targetDir)) {
    process.stderr.write(`Target directory not found: ${targetDir}\n`)
    return 1
  }
  if (existsSync(join(targetDir, '.oss-init.json'))) {
    process.stderr.write(
      `The repository already contains .oss-init.json. Use "oss-init update" to refresh its managed files.\n`,
    )
    return 1
  }
  if (!options['dry-run'] && !isWritable(targetDir)) {
    process.stderr.write(`Cannot write to "${targetDir}". Check permissions.\n`)
    return 1
  }

  let lang
  let metadata
  let license
  let identity
  let ciProfile = {}
  try {
    lang = detectProjectLanguage(targetDir, options.lang)
    metadata = readExistingProjectMetadata(targetDir, lang)
    const name = options.name || metadata.name
    if (!name) {
      throw new Error(
        `${lang === 'node' ? 'package.json' : 'pyproject.toml'} does not declare a project name. Re-run with --name <name>.`,
      )
    }
    identity = deriveProjectIdentity(name, lang)
    license = resolveAdoptLicense(targetDir, metadata.license, options.license)
    if (options.ci) ciProfile = inferAdoptCiProfile(targetDir, lang, metadata)
  } catch (error) {
    process.stderr.write(`Cannot adopt repository: ${error.message}\n`)
    return 1
  }

  const githubUser = options['github-user'] || metadata.githubUser || 'your-username'
  const author = options.author || metadata.author || metadata.gitAuthor || githubUser || 'your-name'
  const templateValues = deriveTemplateValues(identity, lang, { ci: options.ci, githubUser })
  const values = {
    name: identity.packageName || identity.pythonDistribution,
    ...identity,
    projectBase: identity.projectName,
    nameCamel: identity.jsIdentifier || identity.projectName,
    nameSnake: identity.pythonImport || identity.projectName.replace(/[-._~]+/g, '_'),
    description: metadata.description || `An existing ${lang} project adopted by oss-init.`,
    year: String(new Date().getFullYear()),
    author,
    githubUser,
    ...templateValues,
    ...ciProfile,
    license: license.value,
    licenseId: license.id,
    licenseTitle: license.title,
  }
  const templateOptions = {
    lang,
    license: license.value,
    docs: options.docs,
    ci: options.ci,
    publish: options.publish,
    agents: options.agents,
    mode: 'adopt',
  }

  const stagingDir = mkdtempSync(join(tmpdir(), 'oss-init-adopt-'))
  const created = []
  try {
    const result = render({
      templateRoot: TEMPLATE_ROOT,
      targetDir: stagingDir,
      values,
      docs: templateOptions.docs,
      ci: templateOptions.ci,
      publish: templateOptions.publish,
      agents: templateOptions.agents,
      lang,
      mode: 'adopt',
      skipLicense: !license.generate,
    })
    if (result.errors.length > 0) {
      for (const error of result.errors) process.stderr.write(`Error: ${error}\n`)
      return 1
    }

    const planned = []
    const protectedPaths = []
    for (const rel of result.filesWritten) {
      const targetPath = resolveContainedPath(targetDir, rel)
      if (existsSync(targetPath)) {
        protectedPaths.push(rel)
      } else {
        planned.push({
          rel,
          targetPath,
          content: readFileSync(resolveContainedPath(stagingDir, rel), 'utf8'),
        })
      }
    }

    if (!options['dry-run']) {
      for (const entry of planned) {
        mkdirSync(dirname(entry.targetPath), { recursive: true })
        try {
          writeFileSync(entry.targetPath, entry.content, { mode: 0o644, flag: 'wx' })
          created.push(entry)
        } catch (error) {
          if (error.code === 'EEXIST') {
            protectedPaths.push(entry.rel)
            continue
          }
          throw error
        }
      }

      const files = Object.fromEntries(created.map((entry) => [entry.rel, sha256(entry.content)]))
      const manifest = createManifest({
        generatorVersion: version,
        values,
        options: templateOptions,
        files,
        managedPaths: created.map((entry) => entry.rel),
        protectedPaths,
      })
      writeManifestAtomic(targetDir, manifest)
    }

    const adopted = options['dry-run'] ? planned.map((entry) => entry.rel) : created.map((entry) => entry.rel)
    const verb = options['dry-run'] ? 'Would adopt' : 'Adopted'
    process.stdout.write(`\n${verb} ${targetDir} with ${adopted.length} new managed file(s):\n`)
    for (const file of adopted) process.stdout.write(`  + ${file}\n`)
    if (adopted.length === 0) process.stdout.write('  (no community files were missing)\n')

    if (options['dry-run']) {
      process.stdout.write('\n(dry run — no project files or manifest were written)\n')
    } else {
      process.stdout.write('\nExisting files remain user-owned. Run "oss-init update --dry-run" before future refreshes.\n')
    }
    return 0
  } catch (error) {
    for (const entry of created.reverse()) {
      try {
        if (
          existsSync(entry.targetPath)
          && sha256(readFileSync(entry.targetPath, 'utf8')) === sha256(entry.content)
        ) {
          unlinkSync(entry.targetPath)
        }
      } catch {
        // Preserve anything that changed or cannot be safely verified during rollback.
      }
    }
    process.stderr.write(`Adoption failed and newly created files were rolled back: ${error.message}\n`)
    return 1
  } finally {
    rmSync(stagingDir, { recursive: true, force: true })
  }
}
