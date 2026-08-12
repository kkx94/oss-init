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

export const GENERATOR_REPO_URL = 'https://github.com/kkx94/oss-init';

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

export function deriveTemplateValues(identity, lang, { ci = false, githubUser = 'your-username' } = {}) {
  const repositoryUrl = `https://github.com/${githubUser}/${identity.repoName}`;
  const shared = {
    generatorRepoUrl: GENERATOR_REPO_URL,
    ciBadge: ci ? `![CI](${repositoryUrl}/actions/workflows/ci.yml/badge.svg)` : '',
    ciSummary: ci ? 'GitHub Actions CI included' : 'CI workflow not generated',
  };
  if (lang === 'node') {
    return {
      ...shared,
      primaryLanguage: 'JavaScript',
      runtimeSummary: 'Node.js >= 22 (ES modules)',
      installCommand: 'npm install',
      testCommand: 'npm test',
      codeFenceLanguage: 'js',
      usageExample: "import { add } from './src/index.js';\n\nconsole.log(add(1, 2));",
      ciInstallCommand: 'npm install',
      ciTestCommand: 'npm test',
      ciLintStep: '      - run: npm run lint',
    };
  }
  if (lang === 'python') {
    return {
      ...shared,
      primaryLanguage: 'Python',
      runtimeSummary: 'Python >= 3.10',
      installCommand: 'python -m pip install -e ".[dev]"',
      testCommand: 'python -m unittest discover -s tests',
      codeFenceLanguage: 'python',
      usageExample: `from ${identity.pythonImport} import add\n\nprint(add(1, 2))`,
      ciInstallCommand: 'python -m pip install -e ".[dev]"',
      ciTestCommand: 'python -m unittest discover -s tests',
      ciLintStep: '',
    };
  }
  throw new Error(`Unsupported project language: ${lang}`);
}
