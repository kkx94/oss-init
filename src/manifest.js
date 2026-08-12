import { createHash } from 'node:crypto';
import { existsSync, lstatSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, win32 } from 'node:path';

import { deriveProjectIdentity, deriveTemplateValues } from './project-identity.js';

export const MANIFEST_SCHEMA_VERSION = 3;

const LANGS = new Set(['node', 'python']);
const LICENSES = new Set(['mit', 'apache-2.0']);
const DOCS = new Set(['en', 'zh', 'bilingual']);
const SUPPORTED_MANIFEST_SCHEMAS = new Set([1, 2, MANIFEST_SCHEMA_VERSION]);
const CUSTOM_TEMPLATE_SECTIONS = new Set(['common', 'node', 'python']);
const MAX_CUSTOM_TEMPLATE_FILES = 200;
const MAX_CUSTOM_TEMPLATE_FILE_BYTES = 256 * 1024;
const MAX_CUSTOM_TEMPLATE_TOTAL_BYTES = 2 * 1024 * 1024;
const SHA256_RE = /^[a-f0-9]{64}$/;
const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

export function isSafeRelativePath(rel) {
  if (typeof rel !== 'string' || rel === '' || rel.includes('\0')) return false;
  if (rel.includes('\\') || rel.includes(':')) return false;
  if (isAbsolute(rel) || win32.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) return false;
  return rel.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}

export function resolveContainedPath(root, rel) {
  if (!isSafeRelativePath(rel)) {
    throw new Error(`Path must be a safe relative path: ${JSON.stringify(rel)}`);
  }
  const rootPath = resolve(root);
  const candidate = resolve(rootPath, ...rel.split('/'));
  const fromRoot = relative(rootPath, candidate);
  if (fromRoot === '' || fromRoot === '..' || fromRoot.startsWith(`..\\`) || fromRoot.startsWith('../') || isAbsolute(fromRoot)) {
    throw new Error(`Path resolves outside target directory: ${JSON.stringify(rel)}`);
  }
  let existingPath = rootPath;
  for (const part of rel.split('/')) {
    existingPath = join(existingPath, part);
    if (existsSync(existingPath) && lstatSync(existingPath).isSymbolicLink()) {
      throw new Error(`Path traverses a symbolic link: ${JSON.stringify(rel)}`);
    }
  }
  return candidate;
}

function normalizeLegacy(manifest) {
  if (typeof manifest.version !== 'string') return manifest;
  const options = isObject(manifest.options) ? {
    lang: manifest.options.lang ?? 'node',
    license: manifest.options.license ?? 'mit',
    docs: manifest.options.docs ?? 'bilingual',
    ci: manifest.options.ci ?? false,
    publish: manifest.options.publish ?? false,
    agents: manifest.options.agents ?? true,
  } : manifest.options;
  const oldValues = manifest.values;
  let values = oldValues;
  if (isObject(oldValues) && isObject(options) && LANGS.has(options.lang)) {
    const sourceName = options.lang === 'node'
      ? oldValues.packageName ?? oldValues.name
      : oldValues.pythonDistribution ?? oldValues.name;
    if (typeof sourceName === 'string') {
      const identity = deriveProjectIdentity(sourceName, options.lang);
      values = {
        ...oldValues,
        name: identity.packageName || identity.pythonDistribution,
        ...identity,
        projectBase: identity.projectName,
        nameCamel: identity.jsIdentifier || identity.projectName,
        nameSnake: identity.pythonImport || identity.projectName.replace(/[-._~]+/g, '_'),
        ...deriveTemplateValues(identity, options.lang, {
          ci: options.ci,
          githubUser: oldValues.githubUser || 'your-username',
        }),
      };
    }
  }
  return {
    schemaVersion: 1,
    generatorVersion: manifest.version,
    values,
    options,
    files: manifest.files,
  };
}

function validateCustomTemplates(customTemplates, errors) {
  if (customTemplates === undefined) return;
  if (!isObject(customTemplates)) {
    errors.push('customTemplates must be an object whose keys are template-relative paths and values are UTF-8 text.');
    return;
  }

  const entries = Object.entries(customTemplates);
  if (entries.length === 0) {
    errors.push('customTemplates must contain at least one template.');
    return;
  }
  if (entries.length > MAX_CUSTOM_TEMPLATE_FILES) {
    errors.push(`customTemplates cannot contain more than ${MAX_CUSTOM_TEMPLATE_FILES} files.`);
  }

  let totalBytes = 0;
  for (const [sourceRel, content] of entries) {
    if (!isSafeRelativePath(sourceRel)) {
      errors.push(`customTemplates[${JSON.stringify(sourceRel)}] must be a safe relative path.`);
    } else {
      const slash = sourceRel.indexOf('/');
      const section = slash === -1 ? sourceRel : sourceRel.slice(0, slash);
      const rel = slash === -1 ? '' : sourceRel.slice(slash + 1);
      if (!CUSTOM_TEMPLATE_SECTIONS.has(section) || rel === '') {
        errors.push(
          `customTemplates[${JSON.stringify(sourceRel)}] must start with common/, node/, or python/.`,
        );
      }
    }
    if (typeof content !== 'string') {
      errors.push(`customTemplates[${JSON.stringify(sourceRel)}] must be a string.`);
      continue;
    }
    const bytes = Buffer.byteLength(content);
    totalBytes += bytes;
    if (bytes > MAX_CUSTOM_TEMPLATE_FILE_BYTES) {
      errors.push(
        `customTemplates[${JSON.stringify(sourceRel)}] exceeds ${MAX_CUSTOM_TEMPLATE_FILE_BYTES} bytes.`,
      );
    }
  }
  if (totalBytes > MAX_CUSTOM_TEMPLATE_TOTAL_BYTES) {
    errors.push(`customTemplates exceeds ${MAX_CUSTOM_TEMPLATE_TOTAL_BYTES} bytes in total.`);
  }
}

function validateOptions(options, errors) {
  if (!isObject(options)) {
    errors.push('options must be an object.');
    return;
  }
  if (!LANGS.has(options.lang)) errors.push('options.lang must be "node" or "python".');
  const adoptLicense = options.mode === 'adopt'
    && typeof options.license === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9.+-]*$/.test(options.license);
  if (!LICENSES.has(options.license) && !adoptLicense) {
    errors.push('options.license must be "mit" or "apache-2.0" (adopt may preserve an existing SPDX identifier).');
  }
  if (!DOCS.has(options.docs)) errors.push('options.docs must be "en", "zh", or "bilingual".');
  for (const key of ['ci', 'publish', 'agents']) {
    if (typeof options[key] !== 'boolean') errors.push(`options.${key} must be a boolean.`);
  }
  if (options.mode !== undefined && options.mode !== 'adopt') {
    errors.push('options.mode must be "adopt" when present.');
  }
}

function validateValues(values, options, errors) {
  if (!isObject(values)) {
    errors.push('values must be an object.');
    return;
  }
  for (const key of [
    'name',
    'projectName',
    'repoName',
    'description',
    'year',
    'author',
    'githubUser',
    'license',
    'licenseId',
    'licenseTitle',
    'generatorRepoUrl',
    'primaryLanguage',
    'runtimeSummary',
    'installCommand',
    'testCommand',
    'codeFenceLanguage',
    'usageExample',
    'ciSummary',
  ]) {
    if (typeof values[key] !== 'string' || values[key] === '') {
      errors.push(`values.${key} must be a non-empty string.`);
    }
  }
  if (typeof values.ciBadge !== 'string') errors.push('values.ciBadge must be a string.');
  for (const key of ['ciInstallCommand', 'ciTestCommand']) {
    if (values[key] !== undefined && (typeof values[key] !== 'string' || values[key] === '')) {
      errors.push(`values.${key} must be a non-empty string when present.`);
    }
  }
  if (values.ciLintStep !== undefined && typeof values.ciLintStep !== 'string') {
    errors.push('values.ciLintStep must be a string when present.');
  }
  if (!isObject(options) || !LANGS.has(options.lang)) return;

  const sourceName = options.lang === 'node' ? values.packageName : values.pythonDistribution;
  if (typeof sourceName !== 'string' || sourceName === '') {
    errors.push(`values.${options.lang === 'node' ? 'packageName' : 'pythonDistribution'} must be a non-empty string.`);
    return;
  }

  try {
    const expected = deriveProjectIdentity(sourceName, options.lang);
    for (const key of ['packageName', 'projectName', 'repoName', 'jsIdentifier', 'pythonDistribution', 'pythonImport']) {
      if (values[key] !== expected[key]) {
        errors.push(`values.${key} does not match the derived ${options.lang} project identity.`);
      }
    }
    if (values.name !== (expected.packageName || expected.pythonDistribution)) {
      errors.push('values.name does not match the language package/distribution name.');
    }
    if (options.lang === 'python' && values.nameSnake !== expected.pythonImport) {
      errors.push('values.nameSnake does not match values.pythonImport.');
    }
    const expectedTemplateValues = deriveTemplateValues(expected, options.lang, {
      ci: options.ci,
      githubUser: values.githubUser,
    });
    for (const [key, expectedValue] of Object.entries(expectedTemplateValues)) {
      if (options.mode === 'adopt' && ['ciInstallCommand', 'ciTestCommand', 'ciLintStep'].includes(key)) continue;
      if (values[key] === undefined && ['ciInstallCommand', 'ciTestCommand', 'ciLintStep'].includes(key)) continue;
      if (values[key] !== expectedValue) {
        errors.push(`values.${key} does not match the derived template metadata.`);
      }
    }
    if (options.mode === 'adopt') {
      if (options.ci && (values.ciInstallCommand === undefined || values.ciTestCommand === undefined)) {
        errors.push('adopt manifests with CI must store inferred install and test commands.');
      }
      if (/[\r\n]/.test(values.ciInstallCommand ?? '') || /[\r\n]/.test(values.ciTestCommand ?? '')) {
        errors.push('adopt CI commands must each stay on one line.');
      }
      if (values.ciLintStep !== undefined && values.ciLintStep !== '' && !/^ {6}- run: (?:npm|pnpm|yarn) run lint$/.test(values.ciLintStep)) {
        errors.push('values.ciLintStep is not a supported adopted lint step.');
      }
    }
  } catch (error) {
    errors.push(`values identity is invalid: ${error.message}`);
  }

  if (values.license !== options.license) {
    errors.push('values.license must match options.license.');
  }
}

function validateFiles(files, errors) {
  if (!isObject(files)) {
    errors.push('files must be an object whose keys are relative paths and values are SHA-256 hashes.');
    return;
  }
  for (const [rel, hash] of Object.entries(files)) {
    if (!isSafeRelativePath(rel)) {
      errors.push(`files[${JSON.stringify(rel)}] must be a safe relative path and cannot escape the target directory.`);
    }
    if (typeof hash !== 'string' || !SHA256_RE.test(hash)) {
      errors.push(`files[${JSON.stringify(rel)}] must be a lowercase 64-character SHA-256 hash.`);
    }
  }
}

function validateManagedPaths(managedPaths, files, schemaVersion, errors) {
  if (schemaVersion < 3) {
    if (managedPaths !== undefined) errors.push('managedPaths requires schemaVersion 3.');
    return;
  }
  if (!Array.isArray(managedPaths)) {
    errors.push('managedPaths must be an array of safe relative paths.');
    return;
  }
  const seen = new Set();
  for (const rel of managedPaths) {
    if (!isSafeRelativePath(rel)) {
      errors.push(`managedPaths contains an unsafe relative path: ${JSON.stringify(rel)}.`);
      continue;
    }
    if (seen.has(rel)) errors.push(`managedPaths contains a duplicate path: ${JSON.stringify(rel)}.`);
    seen.add(rel);
  }
  if (isObject(files)) {
    for (const rel of Object.keys(files)) {
      if (!seen.has(rel)) errors.push(`files[${JSON.stringify(rel)}] is not listed in managedPaths.`);
    }
    for (const rel of seen) {
      if (!(rel in files)) errors.push(`managedPaths contains ${JSON.stringify(rel)}, but files has no hash for it.`);
    }
  }
}

function validateProtectedPaths(protectedPaths, managedPaths, schemaVersion, errors) {
  if (schemaVersion < 3) {
    if (protectedPaths !== undefined) errors.push('protectedPaths requires schemaVersion 3.');
    return;
  }
  if (!Array.isArray(protectedPaths)) {
    errors.push('protectedPaths must be an array of safe relative paths.');
    return;
  }
  const managed = new Set(Array.isArray(managedPaths) ? managedPaths : []);
  const seen = new Set();
  for (const rel of protectedPaths) {
    if (!isSafeRelativePath(rel)) {
      errors.push(`protectedPaths contains an unsafe relative path: ${JSON.stringify(rel)}.`);
      continue;
    }
    if (seen.has(rel)) errors.push(`protectedPaths contains a duplicate path: ${JSON.stringify(rel)}.`);
    if (managed.has(rel)) errors.push(`protectedPaths and managedPaths both contain ${JSON.stringify(rel)}.`);
    seen.add(rel);
  }
}

export function parseAndValidateManifest(raw) {
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return { ok: false, errors: [`Manifest JSON is invalid: ${error.message}`] };
    }
  }
  if (!isObject(parsed)) {
    return { ok: false, errors: ['Manifest root must be an object.'] };
  }

  let manifest = parsed;
  if (manifest.schemaVersion === undefined && manifest.version !== undefined) {
    try {
      manifest = normalizeLegacy(manifest);
    } catch (error) {
      return { ok: false, errors: [`Legacy manifest migration failed: ${error.message}`] };
    }
  }

  const errors = [];
  if (!SUPPORTED_MANIFEST_SCHEMAS.has(manifest.schemaVersion)) {
    errors.push(
      `Unsupported manifest schemaVersion ${JSON.stringify(manifest.schemaVersion)}; expected 1, 2, or ${MANIFEST_SCHEMA_VERSION}.`,
    );
  }
  if (typeof manifest.generatorVersion !== 'string' || !VERSION_RE.test(manifest.generatorVersion)) {
    errors.push('generatorVersion must be a semantic version such as "0.3.1".');
  }
  validateOptions(manifest.options, errors);
  if (manifest.options?.mode === 'adopt' && manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    errors.push(`options.mode "adopt" requires schemaVersion ${MANIFEST_SCHEMA_VERSION}.`);
  }
  validateValues(manifest.values, manifest.options, errors);
  validateFiles(manifest.files, errors);
  validateManagedPaths(manifest.managedPaths, manifest.files, manifest.schemaVersion, errors);
  validateProtectedPaths(manifest.protectedPaths, manifest.managedPaths, manifest.schemaVersion, errors);
  validateCustomTemplates(manifest.customTemplates, errors);

  if (errors.length > 0) return { ok: false, errors };
  const validatedManifest = {
    schemaVersion: manifest.schemaVersion,
    generatorVersion: manifest.generatorVersion,
    values: { ...manifest.values },
    options: { ...manifest.options },
    files: { ...manifest.files },
  };
  if (manifest.managedPaths !== undefined) {
    validatedManifest.managedPaths = [...manifest.managedPaths];
  }
  if (manifest.protectedPaths !== undefined) {
    validatedManifest.protectedPaths = [...manifest.protectedPaths];
  }
  if (manifest.customTemplates !== undefined) {
    validatedManifest.customTemplates = { ...manifest.customTemplates };
  }
  return { ok: true, manifest: validatedManifest };
}

export function createManifest({
  generatorVersion,
  values,
  options,
  files,
  customTemplates,
  managedPaths,
  protectedPaths,
}) {
  const candidate = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatorVersion,
    values,
    options,
    files,
  };
  candidate.managedPaths = managedPaths ?? Object.keys(files);
  candidate.protectedPaths = protectedPaths ?? [];
  if (customTemplates !== undefined) candidate.customTemplates = customTemplates;
  const result = parseAndValidateManifest(candidate);
  if (!result.ok) {
    throw new Error(`Cannot create manifest:\n${result.errors.join('\n')}`);
  }
  return result.manifest;
}

export function writeManifestAtomic(targetDir, manifest) {
  const manifestPath = resolveContainedPath(targetDir, '.oss-init.json');
  const temporaryPath = `${manifestPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    writeFileSync(temporaryPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o644 });
    renameSync(temporaryPath, manifestPath);
  } finally {
    if (existsSync(temporaryPath)) rmSync(temporaryPath, { force: true });
  }
}
