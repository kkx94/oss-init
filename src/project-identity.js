import { validateName, validatePythonName } from './validate.js';

const JAVASCRIPT_RESERVED = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

const PYTHON_RESERVED = new Set([
  'and',
  'as',
  'assert',
  'async',
  'await',
  'break',
  'class',
  'continue',
  'def',
  'del',
  'elif',
  'else',
  'except',
  'false',
  'finally',
  'for',
  'from',
  'global',
  'if',
  'import',
  'in',
  'is',
  'lambda',
  'nonlocal',
  'none',
  'not',
  'or',
  'pass',
  'raise',
  'return',
  'true',
  'try',
  'while',
  'with',
  'yield',
]);

function projectBaseName(name) {
  return name.startsWith('@') ? name.slice(name.indexOf('/') + 1) : name;
}

function identifierParts(name) {
  return name.split(/[-._~]+/).filter(Boolean);
}

function javascriptIdentifier(name) {
  const parts = identifierParts(name);
  if (parts.length === 0) {
    throw new Error('Project name must contain at least one letter or digit.');
  }
  let identifier = parts[0] + parts.slice(1).map((part) => part[0].toUpperCase() + part.slice(1)).join('');
  if (/^[0-9]/.test(identifier) || JAVASCRIPT_RESERVED.has(identifier)) {
    identifier = `_${identifier}`;
  }
  return identifier;
}

function pythonImportName(name) {
  let identifier = identifierParts(name).join('_');
  if (!identifier) {
    throw new Error('Python project name must contain at least one letter or digit.');
  }
  if (/^[0-9]/.test(identifier) || PYTHON_RESERVED.has(identifier)) {
    identifier = `_${identifier}`;
  }
  return identifier;
}

function assertValid(result) {
  if (!result.ok) {
    throw new Error(result.errors.join('\n'));
  }
}

export function deriveProjectIdentity(name, lang) {
  if (lang === 'node') {
    assertValid(validateName(name));
    const projectName = projectBaseName(name);
    return {
      packageName: name,
      projectName,
      repoName: projectName,
      jsIdentifier: javascriptIdentifier(projectName),
      pythonDistribution: null,
      pythonImport: null,
    };
  }

  if (lang === 'python') {
    assertValid(validatePythonName(name));
    return {
      packageName: null,
      projectName: name,
      repoName: name,
      jsIdentifier: null,
      pythonDistribution: name,
      pythonImport: pythonImportName(name),
    };
  }

  throw new Error(`Unsupported project language: ${lang}`);
}

export function resolveGithubMetadata({
  ghLogin = '',
  gitUserName = '',
  explicitGithubUser = '',
} = {}) {
  const githubUser = explicitGithubUser.trim() || ghLogin.trim() || 'your-username';
  const author = gitUserName.trim() || explicitGithubUser.trim() || ghLogin.trim() || 'your-name';
  return { githubUser, author };
}
