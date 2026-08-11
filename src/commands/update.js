import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseArgs } from '../args.js';
import {
  createManifest,
  isSafeRelativePath,
  parseAndValidateManifest,
  resolveContainedPath,
  sha256,
  writeManifestAtomic,
} from '../manifest.js';
import { render } from '../render.js';

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
  const manifestPath = join(targetDir, '.oss-init.json');
  if (!existsSync(manifestPath)) return null;
  try {
    return parseAndValidateManifest(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return { ok: false, errors: [`Unable to read manifest: ${error.message}`] };
  }
}

export const isSafeRelative = isSafeRelativePath;

function writeFileAtomic(path, content) {
  const temporaryPath = `${path}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(temporaryPath, content, { mode: 0o644 });
    renameSync(temporaryPath, path);
  } finally {
    if (existsSync(temporaryPath)) rmSync(temporaryPath, { force: true });
  }
}

function reportResult({
  targetDir,
  dryRun,
  updated,
  added,
  removed,
  skippedRetiredModified,
  skippedUserModified,
  skippedUnchanged,
}) {
  const verb = dryRun ? 'Would update' : 'Updated';
  process.stdout.write(`\n${verb} ${updated.length} file(s) in ${targetDir}\n`);
  for (const rel of updated) process.stdout.write(`  ~ ${rel}\n`);
  if (added.length > 0) {
    process.stdout.write(`\n${dryRun ? 'Would add' : 'Added'} ${added.length} new file(s):\n`);
    for (const rel of added) process.stdout.write(`  + ${rel}\n`);
  }
  if (removed.length > 0) {
    process.stdout.write(`\n${dryRun ? 'Would remove' : 'Removed'} ${removed.length} file(s) no longer in the template:\n`);
    for (const rel of removed) process.stdout.write(`  - ${rel}\n`);
  }
  if (skippedRetiredModified.length > 0) {
    process.stdout.write(`\nSkipped ${skippedRetiredModified.length} retired file(s) you have modified (use --force to remove):\n`);
    for (const rel of skippedRetiredModified) process.stdout.write(`  ! ${rel}\n`);
  }
  if (skippedUserModified.length > 0) {
    process.stdout.write(`\nSkipped ${skippedUserModified.length} file(s) you have modified (use --force to overwrite):\n`);
    for (const rel of skippedUserModified) process.stdout.write(`  ! ${rel}\n`);
  }
  if (skippedUnchanged.length > 0) {
    process.stdout.write(`\n${skippedUnchanged.length} file(s) already up to date.\n`);
  }
}

export function runUpdate(argv, { version }) {
  const { options: commandOptions, positionals, errors } = parseArgs(argv, UPDATE_FLAGS);

  if (errors.length > 0) {
    process.stderr.write(`${errors.join('\n')}\n\n`);
    process.stderr.write(`${updateHelpText()}\n`);
    return 1;
  }

  const targetDir = resolve(positionals[0] ?? '.');
  const parsed = readManifest(targetDir);
  if (!parsed) {
    process.stderr.write(
      `No .oss-init.json found in "${targetDir}".\n` +
        'Run "oss-init init" first to scaffold a project, then "oss-init update" to refresh it.\n',
    );
    return 1;
  }
  if (!parsed.ok) {
    process.stderr.write('Invalid .oss-init.json; refusing to render or modify project files:\n');
    for (const error of parsed.errors) process.stderr.write(`  - ${error}\n`);
    return 1;
  }

  const manifest = parsed.manifest;
  const templateOptions = manifest.options;
  const tmpDir = mkdtempSync(join(tmpdir(), 'oss-init-update-'));

  try {
    const rendered = render({
      templateRoot: TEMPLATE_ROOT,
      targetDir: tmpDir,
      values: manifest.values,
      docs: templateOptions.docs,
      ci: templateOptions.ci,
      publish: templateOptions.publish,
      agents: templateOptions.agents,
      lang: templateOptions.lang,
      dryRun: false,
    });
    if (rendered.errors.length > 0) {
      for (const error of rendered.errors) process.stderr.write(`Error: ${error}\n`);
      return 1;
    }

    const updated = [];
    const added = [];
    const removed = [];
    const skippedRetiredModified = [];
    const skippedUserModified = [];
    const skippedUnchanged = [];
    const writes = [];
    const removals = [];
    const generatedHashes = {};
    const renderedSet = new Set(rendered.filesWritten);

    for (const rel of rendered.filesWritten) {
      const newContent = readFileSync(resolveContainedPath(tmpDir, rel), 'utf8');
      const newHash = sha256(newContent);
      generatedHashes[rel] = newHash;
      const manifestHash = manifest.files[rel];
      const currentPath = resolveContainedPath(targetDir, rel);

      if (!existsSync(currentPath)) {
        added.push(rel);
        writes.push({ path: currentPath, content: newContent });
        continue;
      }

      const currentHash = sha256(readFileSync(currentPath, 'utf8'));
      if (currentHash === newHash) {
        skippedUnchanged.push(rel);
        continue;
      }

      const userModified = manifestHash === undefined || currentHash !== manifestHash;
      if (userModified && !commandOptions.force) {
        skippedUserModified.push(rel);
        continue;
      }

      updated.push(rel);
      writes.push({ path: currentPath, content: newContent });
    }

    for (const [rel, manifestHash] of Object.entries(manifest.files)) {
      if (renderedSet.has(rel)) continue;
      const currentPath = resolveContainedPath(targetDir, rel);
      if (!existsSync(currentPath)) continue;
      const currentHash = sha256(readFileSync(currentPath, 'utf8'));
      if (currentHash !== manifestHash && !commandOptions.force) {
        skippedRetiredModified.push(rel);
        continue;
      }
      removed.push(rel);
      removals.push(currentPath);
    }

    const nextManifest = createManifest({
      generatorVersion: version,
      values: manifest.values,
      options: templateOptions,
      files: generatedHashes,
    });

    if (!commandOptions['dry-run']) {
      for (const entry of writes) {
        mkdirSync(dirname(entry.path), { recursive: true });
        writeFileAtomic(entry.path, entry.content);
      }
      for (const path of removals) unlinkSync(path);
      writeManifestAtomic(targetDir, nextManifest);
    }

    reportResult({
      targetDir,
      dryRun: commandOptions['dry-run'],
      updated,
      added,
      removed,
      skippedRetiredModified,
      skippedUserModified,
      skippedUnchanged,
    });
    return 0;
  } catch (error) {
    process.stderr.write(`Update failed: ${error.message}\n`);
    return 1;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
