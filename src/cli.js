import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import readline from 'node:readline/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { helpText, parseArgs } from './args.js';
import { defaultNameFor, dirExists, dirIsEmpty, isWritable, validateName } from './validate.js';
import { promptForConflictOverwrite, promptForOptions } from './prompts.js';
import { render } from './render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = join(__dirname, 'templates');

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
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

export async function main(argv) {
  const { options, positionals, errors, explicitFlags } = parseArgs(argv);

  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n\n`);
    process.stderr.write('Run "oss-init --help" for usage.\n');
    return 1;
  }

  if (options.help) {
    process.stdout.write(`${helpText()}\n`);
    return 0;
  }

  if (options.version) {
    process.stdout.write(`${readVersion()}\n`);
    return 0;
  }

  const interactive = explicitFlags.length === 0;
  const targetDir = resolve(positionals[0] ?? '.');
  const defaultName = defaultNameFor(targetDir);

  if (options.lang === 'python') {
    process.stderr.write(
      'The Python template is planned for v0.2. Use --lang node for now.\n',
    );
    return 1;
  }

  let finalOptions = options;
  if (interactive) {
    finalOptions = await promptForOptions(
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
  }

  const name = finalOptions.name || defaultName;
  const nameCheck = validateName(name);
  if (!nameCheck.ok) {
    process.stderr.write(`${nameCheck.errors.join('\n')}\n`);
    return 1;
  }

  if (dirExists(targetDir) && !dirIsEmpty(targetDir) && !finalOptions.force) {
    if (interactive) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const overwrite = await promptForConflictOverwrite(rl, targetDir);
      rl.close();
      if (!overwrite) {
        process.stdout.write('Aborted. Nothing was generated.\n');
        return 0;
      }
    } else {
      process.stderr.write(
        `Directory "${targetDir}" is not empty. Use --force to overwrite existing files.\n`,
      );
      return 1;
    }
  }

  if (!isWritable(targetDir)) {
    process.stderr.write(`Cannot write to "${targetDir}". Check permissions.\n`);
    return 1;
  }

  mkdirSync(targetDir, { recursive: true });

  const author = finalOptions.author || gitConfig('user.name') || name;
  const githubUser = gitConfig('user.name') || 'your-username';

  const values = {
    name,
    nameCamel: name.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
    description:
      `A production-grade ${finalOptions.lang} project, scaffolded with oss-init.`,
    year: String(new Date().getFullYear()),
    author,
    githubUser,
    license: finalOptions.license,
    licenseId: finalOptions.license === 'apache-2.0' ? 'Apache-2.0' : 'MIT',
    licenseTitle: finalOptions.license === 'apache-2.0' ? 'Apache License 2.0' : 'MIT License',
  };

  const result = render({
    templateRoot: TEMPLATE_ROOT,
    targetDir,
    values,
    docs: finalOptions.docs,
    ci: finalOptions.ci,
    publish: finalOptions.publish,
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
  process.stdout.write('\nNext steps:\n');
  process.stdout.write(`  cd ${targetDir}\n`);
  process.stdout.write('  git init && git add -A && git commit -m "Initial commit"\n');
  if (finalOptions.ci) {
    process.stdout.write('  Push to GitHub and enable Actions.\n');
  }
  return 0;
}
