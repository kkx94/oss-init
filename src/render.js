import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

import { isSafeRelativePath, resolveContainedPath } from './manifest.js';

const PLACEHOLDER_RE = /{{\s*([a-zA-Z0-9_-]+)\s*}}/g;
const CUSTOM_TEMPLATE_SECTIONS = new Set(['common', 'node', 'python']);
const MAX_CUSTOM_TEMPLATE_FILES = 200;
const MAX_CUSTOM_TEMPLATE_FILE_BYTES = 256 * 1024;
const MAX_CUSTOM_TEMPLATE_TOTAL_BYTES = 2 * 1024 * 1024;

const README_SPEC = {
  en: { source: 'README.md.tpl', target: 'README.md' },
  zh: { source: 'README.zh-CN.md.tpl', target: 'README.md' },
  bilingual: [
    { source: 'README.md.tpl', target: 'README.md' },
    { source: 'README.zh-CN.md.tpl', target: 'README.zh-CN.md' },
  ],
};
const ADOPT_README_SPEC = {
  en: { source: 'README.md.adopt.tpl', target: 'README.md' },
  zh: { source: 'README.zh-CN.md.adopt.tpl', target: 'README.md' },
  bilingual: [
    { source: 'README.md.adopt.tpl', target: 'README.md' },
    { source: 'README.zh-CN.md.adopt.tpl', target: 'README.zh-CN.md' },
  ],
};
const SPECIAL_COMMON_TEMPLATES = new Set([
  'README.md.tpl',
  'README.zh-CN.md.tpl',
  'README.md.adopt.tpl',
  'README.zh-CN.md.adopt.tpl',
  'AGENTS.md.tpl',
  'AGENTS.md.adopt.tpl',
]);

function readUtf8Template(path, label) {
  const buffer = readFileSync(path);
  if (buffer.length > MAX_CUSTOM_TEMPLATE_FILE_BYTES) {
    throw new Error(
      `Custom template ${label} is too large (${buffer.length} bytes; maximum ${MAX_CUSTOM_TEMPLATE_FILE_BYTES}).`,
    );
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new Error(`Custom template ${label} must be valid UTF-8 text.`);
  }
}

function walkCustomSection(root, section, relDir, snapshot, totals) {
  const absDir = relDir
    ? join(root, section, ...relDir.split('/'))
    : join(root, section);
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
    const sourceRel = `${section}/${rel}`;
    if (!isSafeRelativePath(sourceRel)) {
      throw new Error(`Custom template path must stay inside the template directory: ${JSON.stringify(sourceRel)}`);
    }
    const abs = join(absDir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Custom template symbolic links are not allowed: ${sourceRel}`);
    }
    if (entry.isDirectory()) {
      walkCustomSection(root, section, rel, snapshot, totals);
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`Custom template entry must be a regular file: ${sourceRel}`);
    }
    const content = readUtf8Template(abs, sourceRel);
    totals.files += 1;
    totals.bytes += Buffer.byteLength(content);
    if (totals.files > MAX_CUSTOM_TEMPLATE_FILES) {
      throw new Error(`Custom template directory exceeds ${MAX_CUSTOM_TEMPLATE_FILES} files.`);
    }
    if (totals.bytes > MAX_CUSTOM_TEMPLATE_TOTAL_BYTES) {
      throw new Error(`Custom template directory exceeds ${MAX_CUSTOM_TEMPLATE_TOTAL_BYTES} bytes.`);
    }
    snapshot[sourceRel] = content;
  }
}

export function loadCustomTemplateSnapshot(templateDir, lang) {
  const root = resolve(templateDir);
  if (!existsSync(root)) {
    throw new Error(`Custom template directory not found: ${templateDir}`);
  }
  if (!statSync(root).isDirectory()) {
    throw new Error(`Custom template path is not a directory: ${templateDir}`);
  }

  const snapshot = {};
  const totals = { files: 0, bytes: 0 };
  for (const section of ['common', lang]) {
    const sectionPath = join(root, section);
    if (!existsSync(sectionPath)) continue;
    const sectionStat = lstatSync(sectionPath);
    if (sectionStat.isSymbolicLink()) {
      throw new Error(`Custom template symbolic links are not allowed: ${section}`);
    }
    if (!sectionStat.isDirectory()) {
      throw new Error(`Custom template section must be a directory: ${section}`);
    }
    walkCustomSection(root, section, '', snapshot, totals);
  }

  if (totals.files === 0) {
    throw new Error(`Custom template directory must contain files under common/ or ${lang}/.`);
  }
  return snapshot;
}

function readBuiltInSection(templateRoot, section) {
  const files = new Map();
  const walk = (relDir) => {
    const absDir = relDir
      ? join(templateRoot, section, ...relDir.split('/'))
      : join(templateRoot, section);
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      const abs = join(absDir, entry.name);
      if (entry.isDirectory()) {
        walk(rel);
      } else if (entry.isFile()) {
        files.set(rel, readFileSync(abs, 'utf8'));
      }
    }
  };
  walk('');
  return files;
}

function splitCustomTemplates(customTemplates, errors) {
  const sections = new Map([...CUSTOM_TEMPLATE_SECTIONS].map((section) => [section, new Map()]));
  for (const [sourceRel, content] of Object.entries(customTemplates ?? {})) {
    if (!isSafeRelativePath(sourceRel)) {
      errors.push(`Custom template path must be a safe relative path: ${JSON.stringify(sourceRel)}`);
      continue;
    }
    const slash = sourceRel.indexOf('/');
    const sourceSection = slash === -1 ? sourceRel : sourceRel.slice(0, slash);
    const rel = slash === -1 ? '' : sourceRel.slice(slash + 1);
    if (!CUSTOM_TEMPLATE_SECTIONS.has(sourceSection) || rel === '') {
      errors.push(`Custom template path must start with common/, node/, or python/: ${sourceRel}`);
      continue;
    }
    if (typeof content !== 'string') {
      errors.push(`Custom template content must be UTF-8 text: ${sourceRel}`);
      continue;
    }
    sections.get(sourceSection).set(rel, content);
  }
  return sections;
}

function shouldInclude(rel, { ci, publish }) {
  if (!rel.startsWith('.github/workflows/')) return true;
  if (rel.endsWith('ci.yml.tpl') && !ci) return false;
  if (rel.endsWith('release.yml.tpl') && !publish) return false;
  return ci || publish;
}

function shouldManageInAdoptMode(target, options) {
  if (options.mode !== 'adopt') return true;
  if (target === 'package.json' || target === 'pyproject.toml') return false;
  if (target.startsWith('src/') || target.startsWith('test/') || target.startsWith('tests/')) return false;
  return true;
}

function outputTemplatePath(sourceRel) {
  if (sourceRel.endsWith('.adopt.tpl')) return sourceRel.slice(0, -'.adopt.tpl'.length);
  return sourceRel.endsWith('.tpl') ? sourceRel.slice(0, -4) : sourceRel;
}

function addPlanned(planned, target, content, source, errors, allowOverride = false) {
  const existing = planned.get(target);
  if (existing && !allowOverride) {
    errors.push(`Templates ${existing.source} and ${source} both render to ${target}.`);
    return;
  }
  planned.set(target, { target, content, source });
}

function addGenericSection(planned, section, files, options, errors) {
  const targetsWithinSection = new Map();
  for (const rel of [...files.keys()].sort()) {
    if (section === 'common') {
      if (SPECIAL_COMMON_TEMPLATES.has(rel)) continue;
      if (rel.startsWith('LICENSE.')) continue;
    }
    if (rel.endsWith('.adopt.tpl') && options.mode !== 'adopt') continue;
    if (
      options.mode === 'adopt'
      && rel.endsWith('.tpl')
      && files.has(`${rel.slice(0, -4)}.adopt.tpl`)
    ) continue;
    if (!shouldInclude(rel, options)) continue;

    const target = outputTemplatePath(rel);
    const existingSource = targetsWithinSection.get(target);
    if (existingSource) {
      errors.push(`Templates ${section}/${existingSource} and ${section}/${rel} both render to ${target}.`);
      continue;
    }
    targetsWithinSection.set(target, rel);
    addPlanned(
      planned,
      target,
      files.get(rel),
      `${section}/${rel}`,
      errors,
      true,
    );
  }
}

function renderRecord(record, values, errors) {
  let missingPathValue = false;
  const renderedTarget = record.target.replace(PLACEHOLDER_RE, (match, key) => {
    if (values[key] === undefined || values[key] === null) {
      errors.push(`Template value missing for "${match}" in path ${record.source}`);
      missingPathValue = true;
      return match;
    }
    return String(values[key]);
  });
  if (missingPathValue) return null;
  if (
    renderedTarget === '.git' ||
    renderedTarget.startsWith('.git/') ||
    renderedTarget === '.oss-init.json' ||
    renderedTarget.startsWith('.oss-init.json/')
  ) {
    errors.push(`Custom templates cannot write the reserved path ${renderedTarget} (${record.source}).`);
    return null;
  }

  let missingContentValue = false;
  const rendered = record.content.replace(PLACEHOLDER_RE, (match, key) => {
    if (values[key] === undefined || values[key] === null) {
      errors.push(`Template value missing for "${match}" in ${record.source}`);
      missingContentValue = true;
      return match;
    }
    return String(values[key]);
  });
  if (missingContentValue) return null;
  const leftover = rendered.match(PLACEHOLDER_RE);
  if (leftover) {
    errors.push(
      `Unresolved placeholder${leftover.length > 1 ? 's' : ''} in ${record.source}: ${[...new Set(leftover)].join(', ')}`,
    );
    return null;
  }
  return { renderedTarget, rendered, source: record.source };
}

export function render({
  templateRoot,
  customTemplates,
  targetDir,
  values,
  docs,
  ci,
  publish,
  agents = true,
  onlyMissing = false,
  dryRun = false,
  lang = 'node',
  mode = 'init',
  skipLicense = false,
}) {
  const effectiveValues = {
    ciInstallCommand: lang === 'node' ? 'npm install' : 'python -m pip install -e ".[dev]"',
    ciTestCommand: lang === 'node' ? 'npm test' : 'python -m unittest discover -s tests',
    ciLintStep: lang === 'node' ? '      - run: npm run lint' : '',
    ...values,
  };
  const filesWritten = [];
  const filesSkippedExisting = [];
  const warnings = [];
  const errors = [];
  const builtInCommon = readBuiltInSection(templateRoot, 'common');
  const builtInLanguage = readBuiltInSection(templateRoot, lang);
  const customSections = splitCustomTemplates(customTemplates, errors);
  const customCommon = customSections.get('common');
  const customLanguage = customSections.get(lang);
  const planned = new Map();

  const readmeSpec = mode === 'adopt' ? ADOPT_README_SPEC : README_SPEC;
  const readmeSpecs = Array.isArray(readmeSpec[docs]) ? readmeSpec[docs] : [readmeSpec[docs]];
  for (const spec of readmeSpecs) {
    const content = customCommon.get(spec.source) ?? builtInCommon.get(spec.source);
    if (content === undefined) {
      errors.push(`README template not found: common/${spec.source}`);
    } else {
      addPlanned(planned, spec.target, content, `common/${spec.source}`, errors);
    }
  }

  if (!skipLicense) {
    const licenseSource = `LICENSE.${effectiveValues.license}.tpl`;
    const licenseContent = customCommon.get(licenseSource) ?? builtInCommon.get(licenseSource);
    if (licenseContent === undefined) {
      errors.push(`License template not found: ${licenseSource}. Choose --license mit or apache-2.0.`);
    } else {
      addPlanned(planned, 'LICENSE', licenseContent, `common/${licenseSource}`, errors);
    }
  }

  if (agents) {
    const agentsSource = mode === 'adopt' ? 'AGENTS.md.adopt.tpl' : 'AGENTS.md.tpl';
    const agentsContent = customCommon.get(agentsSource) ?? builtInCommon.get(agentsSource);
    if (agentsContent !== undefined) {
      addPlanned(planned, 'AGENTS.md', agentsContent, `common/${agentsSource}`, errors);
    }
  }

  addGenericSection(planned, 'common', builtInCommon, { ci, publish, mode }, errors);
  addGenericSection(planned, lang, builtInLanguage, { ci, publish, mode }, errors);
  addGenericSection(planned, 'common', customCommon, { ci, publish, mode }, errors);
  addGenericSection(planned, lang, customLanguage, { ci, publish, mode }, errors);

  const renderedRecords = [];
  const renderedTargets = new Map();
  for (const record of [...planned.values()].sort((a, b) => a.target.localeCompare(b.target))) {
    const renderedRecord = renderRecord(record, effectiveValues, errors);
    if (!renderedRecord) continue;
    if (!shouldManageInAdoptMode(renderedRecord.renderedTarget, { mode })) continue;
    resolveContainedPath(targetDir, renderedRecord.renderedTarget);
    const existingSource = renderedTargets.get(renderedRecord.renderedTarget);
    if (existingSource) {
      errors.push(
        `Templates ${existingSource} and ${record.source} both render to ${renderedRecord.renderedTarget}.`,
      );
      continue;
    }
    renderedTargets.set(renderedRecord.renderedTarget, record.source);
    renderedRecords.push(renderedRecord);
  }

  if (errors.length > 0) return { filesWritten, filesSkippedExisting, warnings, errors };

  for (const record of renderedRecords) {
    const outPath = resolveContainedPath(targetDir, record.renderedTarget);
    if (onlyMissing && existsSync(outPath)) {
      filesSkippedExisting.push(record.renderedTarget);
      continue;
    }
    if (!dryRun) {
      mkdirSync(join(outPath, '..'), { recursive: true });
      try {
        writeFileSync(outPath, record.rendered, { mode: 0o644, flag: onlyMissing ? 'wx' : 'w' });
      } catch (error) {
        if (onlyMissing && error.code === 'EEXIST') {
          filesSkippedExisting.push(record.renderedTarget);
          continue;
        }
        throw error;
      }
    }
    filesWritten.push(record.renderedTarget);
  }

  return { filesWritten, filesSkippedExisting, warnings, errors };
}
