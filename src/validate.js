import { readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

const NAME_PATTERN = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const PYTHON_NAME_PATTERN = /^[a-z0-9-~][a-z0-9-._~]*$/;

export function validateName(name) {
  const errors = [];
  if (!name || name.trim() === '') {
    errors.push('Project name must not be empty.');
    return { ok: false, errors };
  }
  if (name.length > 214) {
    errors.push('Project name must be 214 characters or fewer.');
  }
  if (!NAME_PATTERN.test(name)) {
    errors.push(
      'Project name must follow npm naming rules: lowercase letters, digits, hyphens, ' +
        'underscores, dots and tildes only (e.g. "my-app" or "@scope/my-app").',
    );
  }
  if (name !== name.toLowerCase()) {
    errors.push('Project name must be all lowercase.');
  }
  return { ok: errors.length === 0, errors };
}

export function isValidName(name) {
  return validateName(name).ok;
}

export function validatePythonName(name) {
  const errors = [];
  if (!name || name.trim() === '') {
    errors.push('Project name must not be empty.');
    return { ok: false, errors };
  }
  if (name.startsWith('@')) {
    errors.push(
      'Python project names cannot use npm scoped syntax (@scope/pkg). Use a plain name like "my-app" with --lang python.',
    );
    return { ok: false, errors };
  }
  if (!PYTHON_NAME_PATTERN.test(name)) {
    errors.push(
      'Python project name must use lowercase letters, digits, hyphens, underscores, dots and tildes only (e.g. "my-app").',
    );
  }
  return { ok: errors.length === 0, errors };
}

export function isValidPythonName(name) {
  return validatePythonName(name).ok;
}

export function baseName(name) {
  if (name.startsWith('@')) {
    const idx = name.indexOf('/');
    return idx === -1 ? name.slice(1) : name.slice(idx + 1);
  }
  return name;
}

export function snakeCase(name) {
  return baseName(name).replace(/-/g, '_');
}

export function camelCase(name) {
  const base = baseName(name);
  return base.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

export function dirIsEmpty(dir) {
  try {
    return readdirSync(dir).length === 0;
  } catch {
    return true;
  }
}

export function dirExists(dir) {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

export function isWritable(dir) {
  try {
    if (!dirExists(dir)) {
      const parent = join(dir, '..');
      return isWritable(parent);
    }
    return !!(statSync(dir).mode & 0o200);
  } catch {
    return false;
  }
}

export function defaultNameFor(dir) {
  const base = basename(dir);
  return base
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
