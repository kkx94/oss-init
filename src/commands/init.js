import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import readline from 'node:readline/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs, INIT_FLAG_DEFS } from '../args.js';
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
    '  --ci                       Generate .github/workflows/ci.yml',
    '  --publish                  Generate .github/workflows/release.yml',
    '  --git                      Initialize a git repo and make the first commit',
    '  --github                   --git and create a public GitHub repo + push (requires gh)',
    '  --no-agents                Skip generating AGENTS.md',
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
    return execSync(`git config --get ${key}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
}

function whichGit() {
  const out = spawnSync('git', ['--version'], { shell: true });
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
  const out = spawnSync('gh', ['--version'], { shell: true, stdio: ['ignore', 'pipe', 'ignore'] });
  return out.status === 0;
}

export async function runInit(argv, { version }) {
  const { options: finalOptions, positionals, errors, explicitFlags } = parseArgs(argv, INIT_FLAG_DEFS);

  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n\n`);
    process.stderr.write(`${initHelpText()}\n`);
    return 1;
  }

  const interactive = explicitFlags.filter((f) => f !== 'git' && f !== 'github' && f !== 'agents').length === 0;
  const targetDir = resolve(positionals[0] ?? '.');
  const defaultName = defaultNameFor(targetDir);

  if (finalOptions.lang === 'python') {
    process.stderr.write(
      'The Python template is planned for v0.2. Use --lang node for now.\n',
    );
    return 1;
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
  }

  const name = opts.name || defaultName;
  const nameCheck = validateName(name);
  if (!nameCheck.ok) {
    process.stderr.write(`${nameCheck.errors.join('\n')}\n`);
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

  mkdirSync(targetDir, { recursive: true });

  const githubUser = opts.github
    ? gitConfig('user.name') || 'your-username'
    : gitConfig('user.name') || 'your-username';
  const author = opts.author || githubUser || name;

  const values = {
    name,
    nameCamel: name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
    description: `A production-grade ${opts.lang} project, scaffolded with oss-init.`,
    year: String(new Date().getFullYear()),
    author,
    githubUser,
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
  });

  for (const error of result.errors) {
    process.stderr.write(`Error: ${error}\n`);
  }
  if (result.errors.length > 0) {
    return 1;
  }

  process.stdout.write(`\nGenerated ${result.filesWritten.length} files in ${targetDir}:\n`);
  for (const file of result.filesWritten) {
    process.stdout.write(`  ${file}\n`);
  }

  const nextSteps = [];

  if (opts.github) {
    if (!hasGh()) {
      process.stderr.write('\n--github requested but "gh" CLI was not found. Skipping GitHub creation; files and git commit still done.\n');
      opts.git = true;
    } else {
      opts.git = true;
      const ghUser = gitConfig('user.name') || '';
      const suggestedRepo = ghUser ? `${ghUser}/${name}` : name;
      const r = spawnSync('gh', ['repo', 'create', name, '--public', '--source', '.', '--push'], {
        cwd: targetDir,
        stdio: 'inherit',
        shell: true,
      });
      if (r.status === 0) {
        process.stdout.write(`\nCreated and pushed GitHub repository.\n`);
        nextSteps.push(`Open https://github.com/${suggestedRepo}`);
      } else {
        process.stderr.write('\nFailed to create GitHub repository. You can create it manually and push.\n');
      }
    }
  }

  if (opts.git && !opts.github) {
    if (!whichGit()) {
      process.stderr.write('\n--git requested but git was not found. Skipping.\n');
    } else {
      spawnSync('git', ['init'], { cwd: targetDir, stdio: 'ignore', shell: true });
      spawnSync('git', ['add', '-A'], { cwd: targetDir, stdio: 'ignore', shell: true });
      const msg = 'Initial commit (scaffolded with oss-init)';
      const committed = spawnSync('git', ['commit', '-m', msg], {
        cwd: targetDir,
        stdio: 'ignore',
        shell: true,
      });
      if (committed.status === 0) {
        process.stdout.write(`\nInitialized git repo and made the first commit.\n`);
      } else {
        process.stderr.write('\ngit commit failed — check your git user.name / user.email configuration.\n');
      }
    }
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