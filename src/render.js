import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const PLACEHOLDER_RE = /{{\s*([a-zA-Z0-9_-]+)\s*}}/g;

const README_SPEC = {
  en: { source: 'README.md.tpl', target: 'README.md' },
  zh: { source: 'README.zh-CN.md.tpl', target: 'README.md' },
  bilingual: [
    { source: 'README.md.tpl', target: 'README.md' },
    { source: 'README.zh-CN.md.tpl', target: 'README.zh-CN.md' },
  ],
};

export function render({
  templateRoot,
  targetDir,
  values,
  docs,
  ci,
  publish,
  agents = true,
  onlyMissing = false,
}) {
  const filesWritten = [];
  const warnings = [];
  const errors = [];

  const readmeSpecs = Array.isArray(README_SPEC[docs]) ? README_SPEC[docs] : [README_SPEC[docs]];

  for (const spec of readmeSpecs) {
    const content = readFileSync(join(templateRoot, 'common', spec.source), 'utf8');
    writeRendered(targetDir, spec.target, content, values, filesWritten, errors, onlyMissing);
  }

  const licenseSource = `LICENSE.${values.license}.tpl`;
  const licenseAbs = join(templateRoot, 'common', licenseSource);
  if (!existsSync(licenseAbs)) {
    errors.push(`License template not found: ${licenseSource}. Choose --license mit or apache-2.0.`);
  } else {
    const licenseContent = readFileSync(licenseAbs, 'utf8');
    writeRendered(targetDir, 'LICENSE', licenseContent, values, filesWritten, errors, onlyMissing);
  }

  if (agents) {
    const agentsAbs = join(templateRoot, 'common', 'AGENTS.md.tpl');
    if (existsSync(agentsAbs)) {
      writeRendered(
        targetDir,
        'AGENTS.md',
        readFileSync(agentsAbs, 'utf8'),
        values,
        filesWritten,
        errors,
        onlyMissing,
      );
    }
  }

  const ctxBase = { templateRoot, targetDir, values, ci, publish, onlyMissing };

  const entries = readdirSync(templateRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'common') {
      walkLang(entry.name, '', filesWritten, warnings, errors, {
        ...ctxBase,
        isCommon: true,
      });
      continue;
    }
    walkLang(entry.name, '', filesWritten, warnings, errors, {
      ...ctxBase,
      isCommon: false,
    });
  }

  return { filesWritten, warnings, errors };
}

function walkLang(lang, relDir, filesWritten, warnings, errors, ctx) {
  const absDir = join(ctx.templateRoot, lang, relDir);
  const entries = readdirSync(absDir, { withFileTypes: true });

  for (const entry of entries) {
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    const abs = join(absDir, entry.name);

    if (entry.isDirectory()) {
      if (rel === '.github/workflows' && !ctx.ci && !ctx.publish) continue;
      walkLang(lang, rel, filesWritten, warnings, errors, ctx);
      continue;
    }

    if (ctx.isCommon) {
      if (rel === 'README.md.tpl' || rel === 'README.zh-CN.md.tpl') continue;
      if (rel.startsWith('LICENSE.')) continue;
      if (rel === 'AGENTS.md.tpl') continue;
    }

    if (rel.startsWith('.github/workflows/')) {
      if (rel.endsWith('ci.yml.tpl') && !ctx.ci) continue;
      if (rel.endsWith('release.yml.tpl') && !ctx.publish) continue;
    }

    const content = readFileSync(abs, 'utf8');
    const target = rel.endsWith('.tpl') ? rel.slice(0, -4) : rel;
    writeRendered(ctx.targetDir, target, content, ctx.values, filesWritten, errors, ctx.onlyMissing);
  }
}

function writeRendered(targetDir, target, content, values, filesWritten, errors, onlyMissing = false) {
  const outPath = join(targetDir, target);
  if (onlyMissing && existsSync(outPath)) return;

  const rendered = content.replace(PLACEHOLDER_RE, (match, key) => {
    if (values[key] === undefined) {
      errors.push(`Template value missing for "${match}" in ${target}`);
      return match;
    }
    return String(values[key]);
  });

  if (PLACEHOLDER_RE.test(rendered)) {
    const leftover = rendered.match(PLACEHOLDER_RE);
    errors.push(
      `Unresolved placeholder${leftover.length > 1 ? 's' : ''} in ${target}: ${[...new Set(leftover)].join(', ')}`,
    );
    return;
  }

  mkdirSync(join(outPath, '..'), { recursive: true });
  writeFileSync(outPath, rendered, { mode: 0o644 });
  filesWritten.push(target);
}