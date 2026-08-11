import { appendFileSync, existsSync, statSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { runChecks, score as calculateScore } from './checks.js'

const STATUS_MARK = {
  pass: '✅',
  warn: '⚠️',
  fail: '❌',
}

function escapeCommandData(value) {
  return String(value)
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A')
}

function escapeCommandProperty(value) {
  return escapeCommandData(value)
    .replaceAll(':', '%3A')
    .replaceAll(',', '%2C')
}

function parseThreshold(value) {
  const normalized = value.trim()
  if (!/^\d+$/.test(normalized)) {
    throw new Error('fail-below must be an integer from 0 to 100')
  }
  const threshold = Number(normalized)
  if (threshold > 100) {
    throw new Error('fail-below must be an integer from 0 to 100')
  }
  return threshold
}

function appendWorkflowFile(path, content) {
  if (!path) return
  appendFileSync(path, content, 'utf8')
}

function annotationFor(result) {
  if (result.status === 'pass') return ''
  const level = result.status === 'fail' ? 'error' : 'warning'
  const detail = result.detail ? `: ${result.detail}` : ''
  return `::${level} title=${escapeCommandProperty(result.id)}::${escapeCommandData(result.name + detail)}\n`
}

function summaryFor({ displayPath, results, hygieneScore, threshold }) {
  const lines = [
    '## oss-init repository hygiene',
    '',
    `Target: \`${displayPath.replaceAll('`', '\\`')}\``,
    '',
    '| Result | Check |',
    '|---|---|',
  ]
  for (const result of results) {
    const name = result.name.replaceAll('|', '\\|')
    lines.push(`| ${STATUS_MARK[result.status]} | ${name} |`)
  }
  lines.push(
    '',
    `**Score: ${hygieneScore}/100** (required: ${threshold}/100)`,
    '',
    'The score measures repository file presence and basic documentation quality. It is not a security, importance, or production-readiness certification.',
    '',
  )
  return lines.join('\n')
}

export function runAction(env = process.env) {
  const displayPath = env.INPUT_PATH?.trim() || '.'
  const threshold = parseThreshold(env['INPUT_FAIL-BELOW']?.trim() || '80')
  const workspace = resolve(env.GITHUB_WORKSPACE || process.cwd())
  const targetDir = resolve(workspace, displayPath)
  const fromWorkspace = relative(workspace, targetDir)
  if (fromWorkspace === '..' || fromWorkspace.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(fromWorkspace)) {
    throw new Error('path must stay within GITHUB_WORKSPACE')
  }
  if (!existsSync(targetDir) || !statSync(targetDir).isDirectory()) {
    throw new Error(`path does not identify a directory: ${displayPath}`)
  }
  const results = runChecks(targetDir)
  const hygieneScore = calculateScore(results)

  appendWorkflowFile(env.GITHUB_OUTPUT, `score=${hygieneScore}\n`)
  appendWorkflowFile(
    env.GITHUB_STEP_SUMMARY,
    summaryFor({ displayPath, results, hygieneScore, threshold }),
  )

  process.stdout.write(`oss-init: ${displayPath} scored ${hygieneScore}/100 (required: ${threshold}/100)\n`)
  for (const result of results) {
    const annotation = annotationFor(result)
    if (annotation) process.stdout.write(annotation)
  }

  if (hygieneScore < threshold) {
    process.stderr.write(`Repository hygiene score ${hygieneScore} is below the required ${threshold}.\n`)
    return 1
  }
  return 0
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = runAction()
  } catch (error) {
    process.stderr.write(`::error::${escapeCommandData(error.message)}\n`)
    process.exitCode = 2
  }
}
