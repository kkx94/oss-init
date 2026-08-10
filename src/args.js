const INIT_FLAGS = [
  { name: 'lang', type: 'value', values: ['node', 'python'], default: 'node' },
  { name: 'license', type: 'value', values: ['mit', 'apache-2.0'], default: 'mit' },
  { name: 'docs', type: 'value', values: ['en', 'zh', 'bilingual'], default: 'bilingual' },
  { name: 'name', type: 'value', values: null },
  { name: 'author', type: 'value', values: null },
  { name: 'ci', type: 'boolean', default: false },
  { name: 'publish', type: 'boolean', default: false },
  { name: 'git', type: 'boolean', default: false },
  { name: 'github', type: 'boolean', default: false },
  { name: 'dry-run', type: 'boolean', default: false },
  { name: 'force', type: 'boolean', default: false },
  { name: 'agents', type: 'boolean', default: true },
  { name: 'help', type: 'boolean', default: false },
  { name: 'version', type: 'boolean', default: false },
];

const CHECK_FLAGS = [
  { name: 'json', type: 'boolean', default: false },
  { name: 'fix', type: 'boolean', default: false },
  { name: 'quiet', type: 'boolean', default: false },
  { name: 'help', type: 'boolean', default: false },
  { name: 'version', type: 'boolean', default: false },
];

const GLOBAL_FLAGS = [
  { name: 'help', type: 'boolean', default: false },
  { name: 'version', type: 'boolean', default: false },
];

const ALIASES = new Map([
  ['-h', 'help'],
  ['-v', 'version'],
  ['-f', 'force'],
]);

const HELP_FLAGS = new Set(['help', 'version']);

export function parseArgs(argv, flagDefs = INIT_FLAG_DEFS) {
  const defsByName = new Map(flagDefs.map((d) => [d.name, d]));
  const options = {};
  const positionals = [];
  const errors = [];
  const explicitFlags = [];
  let i = 0;

  for (const def of flagDefs) {
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
      const def = defsByName.get(rawName);

      if (!def) {
        if (rawName.startsWith('no-')) {
          const base = rawName.slice(3);
          const baseDef = defsByName.get(base);
          if (baseDef && baseDef.type === 'boolean' && base !== 'help' && base !== 'version') {
            explicitFlags.push(baseDef.name);
            options[baseDef.name] = false;
            i += 1;
            continue;
          }
        }
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
        if (value === undefined || (typeof value === 'string' && value.startsWith('--'))) {
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
      const def = target ? defsByName.get(target) : null;
      if (def) {
        explicitFlags.push(def.name);
      }
      if (def && def.type === 'boolean') {
        options[def.name] = true;
        i += 1;
        continue;
      }
      if (def) {
        const value = argv[i + 1];
        if (value === undefined || (typeof value === 'string' && value.startsWith('-'))) {
          errors.push(`Option ${arg} requires a value`);
          i += 1;
          continue;
        }
        options[def.name] = value;
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

export const INIT_FLAG_DEFS = INIT_FLAGS;
export const CHECK_FLAG_DEFS = CHECK_FLAGS;
export const GLOBAL_FLAG_DEFS = GLOBAL_FLAGS;

export function isHelpOrVersion(flags) {
  return HELP_FLAGS.has(flags);
}