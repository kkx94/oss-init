import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const CHOICES = {
  lang: { label: 'Template language', values: ['node', 'python'] },
  license: { label: 'License', values: ['mit', 'apache-2.0'] },
  docs: { label: 'README language', values: ['en', 'zh', 'bilingual'] },
};

function formatChoices(values) {
  return values.map((v, i) => `  ${i + 1}) ${v}`).join('\n');
}

async function askSelect(rl, question, { values, current }) {
  const def = current ? ` [${current}]` : '';
  for (;;) {
    const answer = await rl.question(
      `${question}${def}\n${formatChoices(values)}\n> `,
    );
    const trimmed = answer.trim();
    if (trimmed === '' && current) return current;
    const num = Number(trimmed);
    if (Number.isInteger(num) && num >= 1 && num <= values.length) {
      return values[num - 1];
    }
    if (values.includes(trimmed)) return trimmed;
    process.stdout.write(`  Invalid choice. Pick a number or one of: ${values.join(', ')}\n`);
  }
}

async function askText(rl, question, { current, validate, hint }) {
  const def = current ? ` [${current}]` : '';
  for (;;) {
    const answer = await rl.question(`${question}${hint ? `\n  ${hint}` : ''}${def}\n> `);
    const trimmed = answer.trim();
    if (trimmed === '' && current) return current;
    if (validate) {
      const result = validate(trimmed);
      if (!result.ok) {
        for (const err of result.errors) process.stdout.write(`  ${err}\n`);
        continue;
      }
    }
    if (trimmed !== '') return trimmed;
  }
}

export async function promptForOptions(partial, { nameValidator, defaultName }) {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const options = { ...partial };
  try {
    if (!options.name) {
      options.name = await askText(rl, 'Project name?', {
        current: isValidDefault(defaultName) ? defaultName : undefined,
        validate: nameValidator,
        hint: 'Must be lowercase letters, digits, hyphens (npm naming rules).',
      });
    }
    for (const [key, def] of Object.entries(CHOICES)) {
      if (options[key] === undefined) {
        options[key] = await askSelect(rl, `${def.label}?`, {
          values: def.values,
          current: undefined,
        });
      }
    }
    if (options.ci === undefined) {
      options.ci = await askYesNo(rl, 'Generate a GitHub Actions CI workflow?');
    }
    if (options.publish === undefined) {
      options.publish = await askYesNo(rl, 'Generate a GitHub Actions release workflow?');
    }
    if (options.force === undefined) {
      options.force = false;
    }
  } finally {
    rl.close();
  }
  return options;
}

function isValidDefault(name) {
  return typeof name === 'string' && name.length > 0 && !name.startsWith('-');
}

async function askYesNo(rl, question) {
  for (;;) {
    const answer = await rl.question(`${question} (y/n) [y]\n> `);
    const trimmed = answer.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'y' || trimmed === 'yes') return true;
    if (trimmed === 'n' || trimmed === 'no') return false;
    process.stdout.write('  Please answer y or n.\n');
  }
}

export async function promptForConflictOverwrite(rl, targetDir) {
  const answer = await rl.question(
    `Directory "${targetDir}" exists and is not empty. Overwrite? (y/n) [n]\n> `,
  );
  const trimmed = answer.trim().toLowerCase();
  return trimmed === 'y' || trimmed === 'yes';
}
