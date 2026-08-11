import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const cliPath = join(projectRoot, 'bin', 'oss-init.js')
const workspace = mkdtempSync(join(tmpdir(), 'oss-init-demo-'))

function printable(command, args) {
  return [command, ...args]
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(' ')
}

function execute(command, args, { cwd = workspace, display = null, env = {} } = {}) {
  process.stdout.write(`$ ${display ?? printable(command, args)}\n`)
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
  })
  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
      .replaceAll(workspace, '<demo-workspace>')
    throw new Error(`${display ?? printable(command, args)} failed\n${output}`)
  }
  return result.stdout
}

function runCli(args, options = {}) {
  return execute(process.execPath, [cliPath, ...args], {
    ...options,
    display: `oss-init ${printable('', args).trim()}`,
  })
}

function findPython() {
  const candidates = process.platform === 'win32'
    ? [
        { command: 'python', prefix: [] },
        { command: 'py', prefix: ['-3'] },
      ]
    : [
        { command: 'python3', prefix: [] },
        { command: 'python', prefix: [] },
      ]

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, [...candidate.prefix, '--version'], {
      encoding: 'utf8',
    })
    if (result.status === 0) return candidate
  }
  throw new Error('Python 3 is required to run the full Node.js + Python demo.')
}

function verifyScore(target) {
  const output = runCli(['check', target, '--json'])
  const report = JSON.parse(output)
  if (report.score !== 100) {
    const gaps = report.results
      .filter((result) => result.status !== 'pass')
      .map((result) => `${result.id}=${result.status}`)
      .join(', ')
    throw new Error(
      `${target} received an unexpected hygiene score of ${report.score}/100 (${gaps})`,
    )
  }
  process.stdout.write(`✓ ${target} hygiene audit passed (100/100)\n\n`)
}

try {
  process.stdout.write('oss-init end-to-end demo (all files are temporary)\n\n')

  runCli([
    'init',
    'node-demo',
    '--lang',
    'node',
    '--docs',
    'bilingual',
    '--ci',
    '--name',
    '@demo/node-demo',
    '--author',
    'Demo Maintainer',
    '--github-user',
    'demo-user',
  ])
  process.stdout.write('✓ Scaffolded a bilingual Node.js repository\n\n')

  execute(process.execPath, ['--test'], {
    cwd: join(workspace, 'node-demo'),
    display: 'node --test  # inside node-demo',
  })
  process.stdout.write('✓ Generated Node.js tests passed\n\n')
  verifyScore('node-demo')

  runCli(['update', 'node-demo', '--dry-run'])
  process.stdout.write('✓ Safe refresh preview completed without changing files\n\n')

  runCli([
    'init',
    'python-demo',
    '--lang',
    'python',
    '--docs',
    'bilingual',
    '--ci',
    '--author',
    'Demo Maintainer',
    '--github-user',
    'demo-user',
  ])
  process.stdout.write('✓ Scaffolded a bilingual Python repository\n\n')

  const python = findPython()
  execute(python.command, [...python.prefix, '-m', 'unittest', 'discover', '-s', 'tests'], {
    cwd: join(workspace, 'python-demo'),
    display: 'PYTHONPATH=src python -m unittest discover -s tests  # inside python-demo',
    env: { PYTHONPATH: join(workspace, 'python-demo', 'src') },
  })
  process.stdout.write('✓ Generated Python tests passed\n\n')
  verifyScore('python-demo')

  process.stdout.write('✓ End-to-end demo passed\n')
} catch (error) {
  process.stderr.write(`\nDemo failed: ${error.message}\n`)
  process.exitCode = 1
} finally {
  rmSync(workspace, { recursive: true, force: true })
}
