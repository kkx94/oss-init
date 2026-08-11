import { createHash } from 'node:crypto';
import { existsSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, win32 } from 'node:path';

import { deriveProjectIdentity } from './project-identity.js';

export const MANIFEST_SCHEMA_VERSION = 1;

const LANGS = new Set(['node', 'python']);
const LICENSES = new Set(['mit', 'apache-2.0']);
const DOCS = new Set(['en', 'zh', 'bilingual']);
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
      };
    }
  }
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatorVersion: manifest.version,
    values,
    options,
    files: manifest.files,
  };
}

function validateOptions(options, errors) {
  if (!isObject(options)) {
    errors.push('options must be an object.');
    return;
  }
  if (!LANGS.has(options.lang)) errors.push('options.lang must be "node" or "python".');
  if (!LICENSES.has(options.license)) errors.push('options.license must be "mit" or "apache-2.0".');
  if (!DOCS.has(options.docs)) errors.push('options.docs must be "en", "zh", or "bilingual".');
  for (const key of ['ci', 'publish', 'agents']) {
    if (typeof options[key] !== 'boolean') errors.push(`options.${key} must be a boolean.`);
  }
}

function validateValues(values, options, errors) {
  if (!isObject(values)) {
    errors.push('values must be an object.');
    return;
  }
  for (const key of ['name', 'projectName', 'repoName', 'description', 'year', 'author', 'githubUser', 'license', 'licenseId', 'licenseTitle']) {
    if (typeof values[key] !== 'string' || values[key] === '') {
      errors.push(`values.${key} must be a non-empty string.`);
    }
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
  if (manifest.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    errors.push(`Unsupported manifest schemaVersion ${JSON.stringify(manifest.schemaVersion)}; expected ${MANIFEST_SCHEMA_VERSION}.`);
  }
  if (typeof manifest.generatorVersion !== 'string' || !VERSION_RE.test(manifest.generatorVersion)) {
    errors.push('generatorVersion must be a semantic version such as "0.3.1".');
  }
  validateOptions(manifest.options, errors);
  validateValues(manifest.values, manifest.options, errors);
  validateFiles(manifest.files, errors);

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    manifest: {
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      generatorVersion: manifest.generatorVersion,
      values: { ...manifest.values },
      options: { ...manifest.options },
      files: { ...manifest.files },
    },
  };
}

export function createManifest({ generatorVersion, values, options, files }) {
  const result = parseAndValidateManifest({
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    generatorVersion,
    values,
    options,
    files,
  });
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
