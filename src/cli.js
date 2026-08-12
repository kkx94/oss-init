import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runInit, initHelpText } from './commands/init.js';
import { runCheck, checkHelpText } from './commands/check.js';
import { runUpdate, updateHelpText } from './commands/update.js';
import { runAdopt, adoptHelpText } from './commands/adopt.js';
import { parseArgs, INIT_FLAG_DEFS, CHECK_FLAG_DEFS, ADOPT_FLAG_DEFS } from './args.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

const COMMANDS = new Set(['init', 'adopt', 'check', 'update']);

function globalHelp() {
  return [
    'oss-init - Scaffold, audit, and refresh open source repositories',
    '',
    'Usage:',
    '  oss-init [target-dir] [options]         Scaffold a new repository (default command)',
    '  oss-init init [target-dir] [options]     Scaffold a new repository',
    '  oss-init adopt [target-dir] [options]    Safely add missing files to an existing repo',
    '  oss-init check [target-dir] [options]    Audit a repository for OSS best practices',
    '  oss-init update [target-dir] [options]   Refresh files in a previously scaffolded repo',
    '',
    'Top-level options:',
    '  --help, -h     Show this help message (use with a command for command-specific help)',
    '  --version, -v  Show version',
    '',
    'Run "oss-init <command> --help" for command-specific details.',
  ].join('\n');
}

export async function main(argv) {
  const version = readVersion();

  if (argv.length === 0 || !COMMANDS.has(argv[0])) {
    const parsed = parseArgs(argv, INIT_FLAG_DEFS);
    if (parsed.errors.length > 0) {
      process.stderr.write(`${parsed.errors.join('\n')}\n\n`);
      process.stderr.write(`${initHelpText()}\n`);
      return 1;
    }
    if (parsed.options.help) {
      process.stdout.write(`${initHelpText()}\n`);
      return 0;
    }
    if (parsed.options.version) {
      process.stdout.write(`${version}\n`);
      return 0;
    }
    return runInit(argv, { version });
  }

  const command = argv[0];
  const rest = argv.slice(1);

  if (command === 'init') {
    const parsed = parseArgs(rest, INIT_FLAG_DEFS);
    if (parsed.errors.length > 0) {
      process.stderr.write(`${parsed.errors.join('\n')}\n\n`);
      process.stderr.write(`${initHelpText()}\n`);
      return 1;
    }
    if (parsed.options.help) {
      process.stdout.write(`${initHelpText()}\n`);
      return 0;
    }
    if (parsed.options.version) {
      process.stdout.write(`${version}\n`);
      return 0;
    }
    return runInit(rest, { version });
  }

  if (command === 'check') {
    const parsed = parseArgs(rest, CHECK_FLAG_DEFS);
    if (parsed.errors.length > 0) {
      process.stderr.write(`${parsed.errors.join('\n')}\n\n`);
      process.stderr.write(`${checkHelpText()}\n`);
      return 1;
    }
    if (parsed.options.help) {
      process.stdout.write(`${checkHelpText()}\n`);
      return 0;
    }
    if (parsed.options.version) {
      process.stdout.write(`${version}\n`);
      return 0;
    }
    return runCheck(rest, { version });
  }

  if (command === 'adopt') {
    const parsed = parseArgs(rest, ADOPT_FLAG_DEFS);
    if (parsed.errors.length > 0) {
      process.stderr.write(`${parsed.errors.join('\n')}\n\n`);
      process.stderr.write(`${adoptHelpText()}\n`);
      return 1;
    }
    if (parsed.options.help) {
      process.stdout.write(`${adoptHelpText()}\n`);
      return 0;
    }
    if (parsed.options.version) {
      process.stdout.write(`${version}\n`);
      return 0;
    }
    return runAdopt(rest, { version });
  }

  if (command === 'update') {
    const parsed = parseArgs(rest, [
      { name: 'force', type: 'boolean', default: false },
      { name: 'dry-run', type: 'boolean', default: false },
      { name: 'help', type: 'boolean', default: false },
      { name: 'version', type: 'boolean', default: false },
    ]);
    if (parsed.errors.length > 0) {
      process.stderr.write(`${parsed.errors.join('\n')}\n\n`);
      process.stderr.write(`${updateHelpText()}\n`);
      return 1;
    }
    if (parsed.options.help) {
      process.stdout.write(`${updateHelpText()}\n`);
      return 0;
    }
    if (parsed.options.version) {
      process.stdout.write(`${version}\n`);
      return 0;
    }
    return runUpdate(rest, { version });
  }

  process.stdout.write(`${globalHelp()}\n`);
  return 0;
}

export { globalHelp };
