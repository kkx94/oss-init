import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs } from '../args.js';
import { render } from '../render.js';
import { sha256 } from './init.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = join(__dirname, '..', 'templates');

const UPDATE_FLAGS = [
  { name: 'force', type: 'boolean', default: false },
  { name: 'dry-run', type: 'boolean', default: false },
  { name: 'help', type: 'boolean', default: false },
  { name: 'version', type: 'boolean', default: false },
];

export function updateHelpText() {
  return [
    'oss-init update - Refresh files in a repository previously scaffolded with oss-init',
    '',
    'Usage:',
    '  oss-init update [target-dir] [options]',
    '',
    'Re-renders the templates using the values stored in .oss-init.json and',
    'updates files that have not been modified by the user. Files you have',
    'edited are preserved by default.',
    '',
    'Options:',
    '  --force       Overwrite files even if the user has modified them',
    '  --dry-run     Show what would change without writing anything',
    '  --help, -h    Show this help message',
    '  --version, -v Show version',
    '',
    'Examples:',
    '  oss-init update                # refresh current repo safely',
    '  oss-init update --dry-run      # preview what would change',
    '  oss-init update --force        # overwrite even user-modified files',
  ].join('\n');
}

export function readManifest(targetDir) {
  const path = join(targetDir, '.oss-init.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function isSafeRelative(rel) {
  if (typeof rel !== 'string' || rel === '') return false;
  if (/^[a-zA-Z]:[\\/]/.test(rel) || rel.startsWith('/') || rel.startsWith('\\')) return false;
  if (rel.includes('\0')) return false;
  const norm = rel.replace(/\\/g, '/');
  const parts = norm.split('/');
  let depth = 0;
  for (const p of parts) {
    if (p === '..') depth -= 1;
    else if (p !== '' && p !== '.') depth += 1;
    if (depth < 0) return false;
  }
  return true;
}

export function runUpdate(argv, { version }) {
  const { options, positionals, errors } = parseArgs(argv, UPDATE_FLAGS);

  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n\n`);
    process.stderr.write(`${updateHelpText()}\n`);
    return 1;
  }

  const targetDir = resolve(positionals[0] ?? '.');
  const manifest = readManifest(targetDir);

  if (!manifest) {
    process.stderr.write(
      `No .oss-init.json found in "${targetDir}".\n` +
        'Run "oss-init init" first to scaffold a project, then "oss-init update" to refresh it.\n',
    );
    return 1;
  }

  const opts = manifest.options || {};
  const values = manifest.values || {};
  const lang = opts.lang || 'node';

  const tmpDir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));
  let rendered;
  try {
    rendered = render({
      templateRoot: TEMPLATE_ROOT,
      targetDir: tmpDir,
      values,
      docs: opts.docs || 'bilingual',
      ci: opts.ci ?? false,
      publish: opts.publish ?? false,
      agents: opts.agents ?? true,
      lang,
      dryRun: false,
    });
  } finally {
    // temp dir cleaned up after we read what we need
  }

  if (rendered.errors.length > 0) {
    for (const err of rendered.errors) process.stderr.write(`Error: ${err}\n`);
    rmSync(tmpDir, { recursive: true, force: true });
    return 1;
  }

  const updated = [];
  const skippedUserModified = [];
  const skippedUnchanged = [];
  const added = [];

  for (const rel of rendered.filesWritten) {
    if (!isSafeRelative(rel)) {
      rejectedPaths.push(rel);
      continue;
    }
    const newContent = readFileSync(join(tmpDir, rel), 'utf8');
    const newHash = sha256(newContent);
    const manifestHash = manifest.files[rel];
    const currentPath = join(targetDir, rel);
    const currentExists = existsSync(currentPath);
    const currentHash = currentExists ? sha256(readFileSync(currentPath, 'utf8')) : null;

    if (!currentExists) {
      added.push(rel);
      if (!options['dry-run']) {
        mkdirSync(join(currentPath, '..'), { recursive: true });
        writeFileSync(currentPath, newContent, { mode: 0o644 });
      }
      continue;
    }

    if (currentHash === newHash) {
      skippedUnchanged.push(rel);
      continue;
    }

    const userModified = manifestHash && currentHash !== manifestHash;

    if (userModified && !options.force) {
      skippedUserModified.push(rel);
      continue;
    }

    updated.push(rel);
    if (!options['dry-run']) {
      mkdirSync(join(currentPath, '..'), { recursive: true });
      writeFileSync(currentPath, newContent, { mode: 0o644 });
    }
  }

  const removed = [];
  const skippedRetiredModified = [];
  const rejectedPaths = [];
  for (const rel of Object.keys(manifest.files || {})) {
    if (!rendered.filesWritten.includes(rel)) {
      if (!isSafeRelative(rel)) {
        rejectedPaths.push(rel);
        continue;
      }
      const currentPath = join(targetDir, rel);
      if (!existsSync(currentPath)) continue;

      const manifestHash = manifest.files[rel];
      const currentHash = sha256(readFileSync(currentPath, 'utf8'));
      const userModified = manifestHash && currentHash !== manifestHash;

      if (userModified && !options.force) {
        skippedRetiredModified.push(rel);
        continue;
      }

      removed.push(rel);
      if (!options['dry-run']) {
        try {
          unlinkSync(currentPath);
        } catch {
          // ignore
        }
      }
    }
  }

  rmSync(tmpDir, { recursive: true, force: true });

  if (!options['dry-run']) {
    const newManifest = {
      ...manifest,
      version: '0.2.0',
      files: {},
    };
    for (const rel of rendered.filesWritten) {
      const p = join(targetDir, rel);
      if (existsSync(p)) {
        newManifest.files[rel] = sha256(readFileSync(p, 'utf8'));
      }
    }
    writeFileSync(join(targetDir, '.oss-init.json'), JSON.stringify(newManifest, null, 2) + '\n');
  }

  const verb = options['dry-run'] ? 'Would update' : 'Updated';
  process.stdout.write(`\n${verb} ${updated.length} file(s) in ${targetDir}\n`);
  for (const rel of updated) process.stdout.write(`  ~ ${rel}\n`);
  if (added.length > 0) {
    process.stdout.write(`\n${options['dry-run'] ? 'Would add' : 'Added'} ${added.length} new file(s):\n`);
    for (const rel of added) process.stdout.write(`  + ${rel}\n`);
  }
  if (removed.length > 0) {
    process.stdout.write(`\n${options['dry-run'] ? 'Would remove' : 'Removed'} ${removed.length} file(s) no longer in the template:\n`);
    for (const rel of removed) process.stdout.write(`  - ${rel}\n`);
  }
  if (skippedRetiredModified.length > 0) {
    process.stdout.write(`\nSkipped ${skippedRetiredModified.length} retired file(s) you have modified (use --force to remove):\n`);
    for (const rel of skippedRetiredModified) process.stdout.write(`  ! ${rel}\n`);
  }
  if (rejectedPaths.length > 0) {
    process.stderr.write(`\nRejected ${rejectedPaths.length} manifest path(s) that escape the target directory:\n`);
    for (const rel of rejectedPaths) process.stderr.write(`  x ${rel}\n`);
    return 1;
  }
  if (skippedUserModified.length > 0) {
    process.stdout.write(`\nSkipped ${skippedUserModified.length} file(s) you have modified (use --force to overwrite):\n`);
    for (const rel of skippedUserModified) process.stdout.write(`  ! ${rel}\n`);
  }
  if (skippedUnchanged.length > 0) {
    process.stdout.write(`\n${skippedUnchanged.length} file(s) already up to date.\n`);
  }

  return 0;
}
