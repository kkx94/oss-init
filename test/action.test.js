import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ACTION = join(PROJECT_ROOT, 'src', 'action.js')

function runAction(workspace, threshold = '80', inputPath = '.') {
  const files = mkdtempSync(join(tmpdir(), 'oss-init-action-output-'))
  const output = join(files, 'output.txt')
  const summary = join(files, 'summary.md')
  const result = spawnSync(process.execPath, [ACTION], {
    cwd: workspace,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_WORKSPACE: workspace,
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary,
      INPUT_PATH: inputPath,
      'INPUT_FAIL-BELOW': threshold,
    },
  })
  return { result, files, output, summary }
}

test('GitHub Action reports the repository score and writes a step summary', () => {
  const run = runAction(PROJECT_ROOT, '100')
  try {
    assert.equal(run.result.status, 0, run.result.stderr)
    assert.equal(readFileSync(run.output, 'utf8'), 'score=100\n')
    const summary = readFileSync(run.summary, 'utf8')
    assert.match(summary, /oss-init repository hygiene/)
    assert.match(summary, /Score: 100\/100/)
    assert.match(run.result.stdout, /scored 100\/100/)
  } finally {
    rmSync(run.files, { recursive: true, force: true })
  }
})

test('GitHub Action fails when the repository is below the configured threshold', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'oss-init-action-empty-'))
  const run = runAction(workspace, '80')
  try {
    assert.equal(run.result.status, 1)
    const output = readFileSync(run.output, 'utf8')
    const match = /^score=(\d+)\n$/.exec(output)
    assert.ok(match, `unexpected action output: ${output}`)
    assert.ok(Number(match[1]) < 80)
    assert.match(run.result.stderr, /below the required 80/)
    assert.match(run.result.stdout, /::error title=readme::/)
  } finally {
    rmSync(run.files, { recursive: true, force: true })
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('GitHub Action rejects an invalid threshold', () => {
  const run = runAction(PROJECT_ROOT, '101')
  try {
    assert.equal(run.result.status, 2)
    assert.match(run.result.stderr, /fail-below must be an integer from 0 to 100/)
  } finally {
    rmSync(run.files, { recursive: true, force: true })
  }
})

test('GitHub Action rejects paths outside the checked-out workspace', () => {
  const run = runAction(PROJECT_ROOT, '80', '..')
  try {
    assert.equal(run.result.status, 2)
    assert.match(run.result.stderr, /path must stay within GITHUB_WORKSPACE/)
  } finally {
    rmSync(run.files, { recursive: true, force: true })
  }
})

test('GitHub Action supports a nested non-ASCII repository path', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'oss-init-action-workspace-'))
  mkdirSync(join(workspace, '子项目'))
  const run = runAction(workspace, '0', '子项目')
  try {
    assert.equal(run.result.status, 0, run.result.stderr)
    assert.match(readFileSync(run.summary, 'utf8'), /Target: `子项目`/)
  } finally {
    rmSync(run.files, { recursive: true, force: true })
    rmSync(workspace, { recursive: true, force: true })
  }
})
