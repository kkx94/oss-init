const FLAG_DEFS = [
  { name: 'lang', type: 'value', values: ['node', 'python'], default: 'node' },
  { name: 'license', type: 'value', values: ['mit', 'apache-2.0'], default: 'mit' },
  { name: 'docs', type: 'value', values: ['en', 'zh', 'bilingual'], default: 'bilingual' },
  { name: 'name', type: 'value', values: null },
  { name: 'author', type: 'value', values: null },
  { name: 'ci', type: 'boolean', default: false },
  { name: 'publish', type: 'boolean', default: false },
  { name: 'force', type: 'boolean', default: false },
  { name: 'help', type: 'boolean', default: false },
  { name: 'version', type: 'boolean', default: false },
];

const ALIASES = new Map([
  ['-h', 'help'],
  ['-v', 'version'],
  ['-f', 'force'],
]);

export function parseArgs(argv) {
  const options = {};
  const positionals = [];
  const errors = [];
  const explicitFlags = [];
  let i = 0;

  for (const def of FLAG_DEFS) {
    options[def.name] = def.default;
  }

  while (i < argv.length) {
    const arg = argv[i];

    if (arg === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      const rawName = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      const inlineValue = eq === -1 ? null : arg.slice(eq + 1);
      const def = FLAG_DEFS.find((d) => d.name === rawName);

      if (!def) {
        errors.push(`Unknown option: --${rawName}`);
        i += 1;
        continue;
      }

      explicitFlags.push(def.name);

      if (def.type === 'boolean') {
        if (inlineValue !== null) {
          errors.push(`Option --${rawName} does not take a value`);
        } else {
          options[def.name] = true;
        }
        i += 1;
        continue;
      }

      let value = inlineValue;
      if (value === null) {
        value = argv[i + 1];
        if (value === undefined || value.startsWith('--')) {
          errors.push(`Option --${rawName} requires a value`);
          i += 1;
          continue;
        }
        i += 2;
      } else {
        i += 1;
      }

      if (def.values && !def.values.includes(value)) {
        errors.push(
          `Invalid value for --${rawName}: "${value}" (expected one of: ${def.values.join(', ')})`,
        );
        continue;
      }
      options[def.name] = value;
      continue;
    }

    if (arg.startsWith('-') && arg !== '-') {
      const target = ALIASES.get(arg);
      const def = target ? FLAG_DEFS.find((d) => d.name === target) : null;
      if (def) {
        explicitFlags.push(def.name);
      }
      if (def && def.type === 'boolean') {
        options[target] = true;
        i += 1;
        continue;
      }
      if (def) {
        const value = argv[i + 1];
        if (value === undefined || value.startsWith('-')) {
          errors.push(`Option ${arg} requires a value`);
          i += 1;
          continue;
        }
        options[target] = value;
        i += 2;
        continue;
      }
      errors.push(`Unknown option: ${arg}`);
      i += 1;
      continue;
    }

    positionals.push(arg);
    i += 1;
  }

  return { options, positionals, errors, explicitFlags };
}

export function helpText() {
  return [
    'oss-init - Scaffold a production-grade open source repository',
    '',
    'Usage:',
    '  oss-init [target-dir] [options]',
    '',
    'With no arguments, an interactive wizard guides you through each option.',
    '',
    'Options:',
    '  --lang <node|python>       Template language (default: node)',
    '  --license <mit|apache-2.0> License to generate (default: mit)',
    '  --docs <en|zh|bilingual>   README language (default: bilingual)',
    '  --name <name>              Package/project name (default: directory name)',
    '  --ci                       Generate .github/workflows/ci.yml',
    '  --publish                  Generate .github/workflows/release.yml',
    '  --force, -f                Overwrite a non-empty target directory',
    '  --help, -h                 Show this help message',
    '  --version, -v              Show version',
    '',
    'Examples:',
    '  oss-init                          # interactive wizard',
    '  oss-init my-app --lang node --ci  # non-interactive, node template with CI',
    '',
    'Generated files: README.md (and README.zh-CN.md for bilingual), LICENSE,',
    'CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, CHANGELOG.md, .gitignore,',
    'and optional GitHub Actions CI/release workflows.',
  ].join('\n');
}
