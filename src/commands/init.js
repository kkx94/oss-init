import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import readline from 'node:readline/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs, INIT_FLAG_DEFS } from '../args.js';
import { deriveProjectIdentity, resolveGithubMetadata } from '../project-identity.js';
import { defaultNameFor, dirExists, dirIsEmpty, isWritable, validateName } from '../validate.js';
import { promptForConflictOverwrite, promptForOptions } from '../prompts.js';
import { render } from '../render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = join(__dirname, '..', 'templates');

export function initHelpText() {
  return [
    'oss-init init - Scaffold a production-grade open source repository',
    '',
    'Usage:',
    '  oss-init init [target-dir] [options]',
    '',
    'With no arguments, an interactive wizard guides you through each option.',
    '',
    'Options:',
    '  --lang <node|python>       Template language (default: node)',
    '  --license <mit|apache-2.0> License to generate (default: mit)',
    '  --docs <en|zh|bilingual>   README language (default: bilingual)',
    '  --name <name>              Package/project name (default: directory name)',
    '  --author <name>            License/commit author',
    '  --github-user <login>      GitHub login for generated repository links',
    '  --ci                       Generate .github/workflows/ci.yml',
    '  --publish                  Generate .github/workflows/release.yml',
    '  --git                      Initialize a git repo and make the first commit',
    '  --github                   --git and create a public GitHub repo + push (requires gh)',
  '  --no-agents                Skip generating AGENTS.md',
  '  --dry-run                  Preview the files that would be generated without writing anything',
  '  --force, -f                Overwrite a non-empty target directory',
    '  --help, -h                 Show this help message',
    '  --version, -v              Show version',
    '',
    'Examples:',
    '  oss-init init my-app --lang node --ci --git',
    '  oss-init init my-lib --docs bilingual --ci --publish --github',
  ].join('\n');
}

function gitConfig(key) {
  try {
    return execFileSync('git', ['config', '--get', key], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

function ghApiUser() {
  try {
    return execFileSync('gh', ['api', 'user', '--jq', '.login'], { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

function whichGit() {
  const out = spawnSync('git', ['--version'], { stdio: 'ignore' });
  return out.status === 0;
}

const SCAFFOLD_PATHS = [
  'README.md',
  'README.zh-CN.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'AGENTS.md',
  '.gitignore',
  '.gitattributes',
  'package.json',
  'src/index.js',
  'test/index.test.js',
  '.github/workflows/ci.yml',
  '.github/workflows/release.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
];

function listConflicts(targetDir) {
  return SCAFFOLD_PATHS.filter((rel) => existsSync(join(targetDir, rel)));
}

function hasGh() {
  const out = spawnSync('gh', ['--version'], { stdio: ['ignore', 'pipe', 'ignore'] });
  return out.status === 0;
}

function gitInitAndCommit(targetDir) {
  spawnSync('git', ['init'], { cwd: targetDir, stdio: 'ignore' });
  spawnSync('git', ['add', '-A'], { cwd: targetDir, stdio: 'ignore' });
  const msg = 'Initial commit (scaffolded with oss-init)';
  const committed = spawnSync('git', ['commit', '-m', msg], {
    cwd: targetDir,
    stdio: 'ignore',
  });
  if (committed.status === 0) {
    process.stdout.write(`\nInitialized git repo and made the first commit.\n`);
    return true;
  }
  process.stderr.write('\ngit commit failed — check your git user.name / user.email configuration.\n');
  return false;
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function writeManifest(targetDir, filesWritten, values, opts) {
  const manifest = {
    version: '0.2.0',
    values,
    options: {
      lang: opts.lang,
      license: opts.license,
      docs: opts.docs,
      ci: opts.ci,
      publish: opts.publish,
      agents: opts.agents,
    },
    files: {},
  };
  for (const rel of filesWritten) {
    try {
      const content = readFileSync(join(targetDir, rel), 'utf8');
      manifest.files[rel] = sha256(content);
    } catch {
      // file wasn't written (dry run) — skip
    }
  }
  const manifestPath = join(targetDir, '.oss-init.json');
  mkdirSync(join(manifestPath, '..'), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o644 });
}

export async function runInit(argv, { version }) {
  const { options: finalOptions, positionals, errors, explicitFlags } = parseArgs(argv, INIT_FLAG_DEFS);

  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n\n`);
    process.stderr.write(`${initHelpText()}\n`);
    return 1;
  }

  const interactive = explicitFlags
    .filter((f) => f !== 'git' && f !== 'github' && f !== 'agents' && f !== 'dry-run')
    .length === 0;
  const targetDir = resolve(positionals[0] ?? '.');
  const defaultName = defaultNameFor(targetDir);

  if (finalOptions.lang === 'python') {
    // Python template is supported as of v0.2.
  }

  let opts = finalOptions;
  if (interactive) {
    opts = await promptForOptions(
      {
        lang: undefined,
        license: undefined,
        docs: undefined,
        ci: undefined,
        publish: undefined,
        force: undefined,
      },
      { nameValidator: validateName, defaultName },
    );
    opts.git = finalOptions.git;
    opts.github = finalOptions.github;
    opts.agents = finalOptions.agents;
    opts['dry-run'] = finalOptions['dry-run'];
  }

  const name = opts.name || defaultName;
  let identity;
  try {
    identity = deriveProjectIdentity(name, opts.lang);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }

  if (dirExists(targetDir) && !dirIsEmpty(targetDir) && !opts.force) {
    if (interactive) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const overwrite = await promptForConflictOverwrite(rl, targetDir);
      rl.close();
      if (!overwrite) {
        process.stdout.write('Aborted. Nothing was generated.\n');
        return 0;
      }
    } else {
      const conflicts = listConflicts(targetDir);
      process.stderr.write(
        `Directory "${targetDir}" is not empty. Use --force to overwrite existing files.\n`,
      );
      if (conflicts.length > 0) {
        process.stderr.write(`Files that would be overwritten:\n`);
        for (const rel of conflicts.slice(0, 15)) process.stderr.write(`  ${rel}\n`);
        if (conflicts.length > 15) process.stderr.write(`  ...and ${conflicts.length - 15} more\n`);
        process.stderr.write(`Inspect them, back up anything important, then re-run with --force.\n`);
      }
      return 1;
    }
  }

  if (!isWritable(targetDir)) {
    process.stderr.write(`Cannot write to "${targetDir}". Check permissions.\n`);
    return 1;
  }

  if (!opts['dry-run']) {
    mkdirSync(targetDir, { recursive: true });
  }

  const detectedGhUser = opts['github-user'] ? '' : ghApiUser();
  const detectedGitUser = gitConfig('user.name');
  const metadata = resolveGithubMetadata({
    ghLogin: detectedGhUser,
    gitUserName: detectedGitUser,
    explicitGithubUser: opts['github-user'],
  });
  const author = opts.author || metadata.author || identity.projectName;

  const values = {
    name: identity.packageName || identity.pythonDistribution,
    ...identity,
    projectBase: identity.projectName,
    nameCamel: identity.jsIdentifier || identity.projectName,
    nameSnake: identity.pythonImport || identity.projectName.replace(/[-._~]+/g, '_'),
    description: `A ${opts.lang} project, scaffolded with oss-init.`,
    year: String(new Date().getFullYear()),
    author,
    githubUser: metadata.githubUser,
    license: opts.license,
    licenseId: opts.license === 'apache-2.0' ? 'Apache-2.0' : 'MIT',
    licenseTitle: opts.license === 'apache-2.0' ? 'Apache License 2.0' : 'MIT License',
  };

  const result = render({
    templateRoot: TEMPLATE_ROOT,
    targetDir,
    values,
    docs: opts.docs,
    ci: opts.ci,
    publish: opts.publish,
    agents: opts.agents,
    dryRun: opts['dry-run'],
    lang: opts.lang,
  });

  for (const error of result.errors) {
    process.stderr.write(`Error: ${error}\n`);
  }
  if (result.errors.length > 0) {
    return 1;
  }

  const verb = opts['dry-run'] ? 'Would generate' : 'Generated';
  process.stdout.write(`\n${verb} ${result.filesWritten.length} files in ${targetDir}:\n`);
  for (const file of result.filesWritten) {
    process.stdout.write(`  ${file}\n`);
  }

  const nextSteps = [];

  if (opts['dry-run']) {
    process.stdout.write('\n(dry run — no files were written, no git or GitHub actions taken)\n');
    return 0;
  }

  writeManifest(targetDir, result.filesWritten, values, opts);

  const didGitInit = (opts.git || opts.github) && whichGit()
    ? gitInitAndCommit(targetDir)
    : false;

  if (opts.github) {
    if (!hasGh()) {
      process.stderr.write('\n--github requested but "gh" CLI was not found. Skipping GitHub creation; files and git commit still done.\n');
    } else if (!didGitInit) {
      process.stderr.write('\n--github requested but git init/commit failed (check git user.name / user.email). Cannot push to GitHub.\n');
    } else {
      const suggestedRepo = `${metadata.githubUser}/${identity.repoName}`;
      const r = spawnSync('gh', ['repo', 'create', identity.repoName, '--public', '--source', '.', '--push'], {
        cwd: targetDir,
        stdio: 'inherit',
      });
      if (r.status === 0) {
        process.stdout.write(`\nCreated and pushed GitHub repository.\n`);
        nextSteps.push(`Open https://github.com/${suggestedRepo}`);
      } else {
        process.stderr.write('\nFailed to create GitHub repository. You can create it manually and push.\n');
      }
    }
  }

  if (opts.git && !opts.github && !whichGit()) {
    process.stderr.write('\n--git requested but git was not found. Skipping.\n');
  }

  if (!opts.git && !opts.github) {
    nextSteps.push(`cd ${targetDir}`);
    nextSteps.push('git init && git add -A && git commit -m "Initial commit"');
  }

  process.stdout.write('\nNext steps:\n');
  for (const s of nextSteps) {
    process.stdout.write(`  ${s}\n`);
  }
  if (opts.ci && !opts.github) {
    process.stdout.write('  Push to GitHub and enable Actions.\n');
  }
  return 0;
}
