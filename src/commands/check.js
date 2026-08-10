import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { execSync } from 'node:child_process';
import { parseArgs, CHECK_FLAG_DEFS } from '../args.js';
import { runChecks, score, MAX_SCORE } from '../checks.js';
import { render } from '../render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = join(__dirname, '..', 'templates');

export function checkHelpText() {
  return [
    'oss-init check - Audit a repository for open source best practices',
    '',
    'Usage:',
    '  oss-init check [target-dir] [options]',
    '',
    'Scores the repository against 17 rules covering community files,',
    'documentation quality, and CI configuration. Reports a 0-100 score',
    'and per-rule results.',
    '',
    'Options:',
    '  --json     Output results as JSON (for CI integration)',
    '  --fix      Generate any missing community files from oss-init templates',
    '  --quiet    Only print summary, no per-rule list',
    '  --help, -h    Show this help message',
    '  --version, -v Show version',
    '',
    'Examples:',
    '  oss-init check                                 # audit current directory',
    '  oss-init check ./other-repo --json             # JSON output',
    '  oss-init check --fix                           # patch missing files in place',
  ].join('\n');
}

function gitConfig(key) {
  try {
    return execSync(`git config --get ${key}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

const STATUS_GLYPH = { pass: '\u2713', warn: '\u26a0', fail: '\u2717' };

const STATUS_COLOR = {
  pass: '\x1b[32m',
  warn: '\x1b[33m',
  fail: '\x1b[31m',
};
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

function colorize(status) {
  return `${STATUS_COLOR[status]}${STATUS_GLYPH[status]}${RESET}`;
}

function shouldUseColor() {
  if (process.env.NO_COLOR) return false;
  return process.stdout.isTTY;
}

function missingFilesForFix(results) {
  const map = new Set([
    'readme',
    'license',
    'contributing',
    'codeOfConduct',
    'security',
    'changelog',
    'gitignore',
    'issueTemplates',
    'prTemplate',
    'ci',
  ]);
  return results.filter((r) => r.status !== 'pass' && map.has(r.id));
}

export function runCheck(argv, { version }) {
  const { options, positionals, errors } = parseArgs(argv, CHECK_FLAG_DEFS);

  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n\n`);
    process.stderr.write(`${checkHelpText()}\n`);
    return 1;
  }

  const targetDir = resolve(positionals[0] ?? '.');

  const results = runChecks(targetDir);
  const s = score(results);

  if (options.fix) {
    const missing = missingFilesForFix(results);
    if (missing.length === 0) {
      if (!options.quiet) process.stdout.write('No missing community files to generate.\n');
    } else {
      const nameGuess = guessName(targetDir);
      const values = {
        name: nameGuess,
        nameCamel: nameGuess.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
        description: `A project, scaffolded with oss-init.`,
        year: String(new Date().getFullYear()),
        author: gitConfig('user.name') || nameGuess,
        githubUser: gitConfig('user.name') || 'your-username',
        license: 'mit',
        licenseId: 'MIT',
        licenseTitle: 'MIT License',
      };
      const lang = existsSync(join(targetDir, 'pyproject.toml')) && !existsSync(join(targetDir, 'package.json'))
        ? 'python'
        : 'node';
      const renderResult = render({
        templateRoot: TEMPLATE_ROOT,
        targetDir,
        values,
        docs: 'en',
        ci: missing.some((r) => r.id === 'ci'),
        publish: false,
        agents: false,
        lang,
      });
      if (renderResult.errors.length > 0) {
        for (const err of renderResult.errors) process.stderr.write(`${err}\n`);
        return 1;
      }
      if (!options.quiet) {
        process.stdout.write(`Generated ${renderResult.filesWritten.length} missing file(s):\n`);
        for (const f of renderResult.filesWritten) process.stdout.write(`  ${f}\n`);
      }
    }
    const fresh = runChecks(targetDir);
    const freshScore = score(fresh);
    if (!options.quiet) {
      process.stdout.write(`\nScore improved ${s} -> ${freshScore}\n`);
    }
    return freshScore === 100 ? 0 : 1;
  }

  if (options.json) {
    process.stdout.write(JSON.stringify({ target: targetDir, score: s, max: 100, results, version }, null, 2) + '\n');
    return s >= 80 ? 0 : 1;
  }

  if (options.quiet) {
    process.stdout.write(`oss-init check: ${targetDir} scored ${s}/100\n`);
    return s >= 80 ? 0 : 1;
  }

  const color = shouldUseColor();
  const g = (status) => (color ? colorize(status) : STATUS_GLYPH[status]);
  process.stdout.write(`\noss-init check\n  Auditing ${targetDir}\n\n`);
  for (const r of results) {
    process.stdout.write(`  ${g(r.status)}  ${r.name}${color ? `${DIM}  [${r.id}]${RESET}` : `  [${r.id}]`}\n`);
  }
  const summary = `\nScore: ${s} / 100  ${s >= 80 ? 'healthy' : s >= 50 ? 'needs work' : 'critical gaps'}\n`;
  process.stdout.write(summary);

  const failed = results.filter((r) => r.status === 'fail');
  const warned = results.filter((r) => r.status === 'warn');
  if (failed.length > 0 || warned.length > 0) {
    process.stdout.write('\nSuggestions:\n');
    for (const r of [...failed, ...warned]) {
      const verb = r.status === 'fail' ? 'Add' : 'Consider adding';
      const suggest = suggestions(r.id);
      if (suggest) process.stdout.write(`  - ${verb} ${suggest}\n`);
    }
    process.stdout.write('\n  Run "oss-init check --fix" to patch missing community files automatically.\n');
  }

  return s >= 80 ? 0 : 1;
}

function suggestions(id) {
  const map = {
    readme: 'a README.md describing the project',
    readmetitle: 'a "# Project Name" title to your README',
    readmeinstall: 'an "Install" / "Getting Started" section to your README',
    readmeusage: 'a "Usage" / "Features" section to your README',
    readmelicense: 'a "License" section linking to your LICENSE file',
    readmelength: 'more content to your README (description, examples, contributing)',
    license: 'a LICENSE file (use "oss-init check --fix")',
    licensereal: 'a real license file (current one looks like a placeholder)',
    contributing: 'a CONTRIBUTING.md (use "oss-init check --fix")',
    codeofconduct: 'a CODE_OF_CONDUCT.md (use "oss-init check --fix")',
    security: 'a SECURITY.md reporting policy (use "oss-init check --fix")',
    changelog: 'a CHANGELOG.md (use "oss-init check --fix")',
    gitignore: 'a .gitignore appropriate for your language (use "oss-init check --fix")',
    ci: 'a GitHub Actions CI workflow (use "oss-init check --fix")',
    issuetemplates: 'issue templates under .github/ISSUE_TEMPLATE/',
    prtemplate: 'a .github/PULL_REQUEST_TEMPLATE.md',
    manifest: 'a package.json or pyproject.toml',
  };
  return map[id] || '';
}

function guessName(dir) {
  const base = require_basename(dir);
  return base.toLowerCase().replace(/[^a-z0-9._~-]+/g, '-').replace(/^-+|-+$/g, '') || 'my-project';
}

function require_basename(p) {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx === -1 ? p : p.slice(idx + 1);
}