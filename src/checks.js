import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SECTIONS = {
  install: /\n#+\s*(install|installation|getting started)/i,
  usage: /\n#+\s*(usage|how to use|features|examples?)/i,
  license: /\n#+\s*(licen[sc]e|copying)/i,
  contributing: /\n#[^#\n]*\bcontributing\b|\(contributing\.md\)/i,
};

function fileExists(dir, rel) {
  return existsSync(join(dir, rel));
}

function readIfExists(dir, rel) {
  if (!fileExists(dir, rel)) return null;
  return readFileSync(join(dir, rel), 'utf8');
}

function hasHeading(content, pattern) {
  if (!content) return false;
  return pattern.test(content);
}

export const WEIGHTS = {
  readme: 12,
  readmeTitle: 5,
  readmeInstall: 5,
  readmeUsage: 5,
  readmeLicense: 5,
  readmeLength: 4,
  license: 12,
  licenseReal: 5,
  contributing: 8,
  codeOfConduct: 6,
  security: 8,
  changelog: 6,
  gitignore: 8,
  ci: 8,
  issueTemplates: 5,
  prTemplate: 4,
  manifest: 4,
};

export const RULES = [
  {
    id: 'readme',
    name: 'README.md exists',
    weight: WEIGHTS.readme,
    run: (dir) => (fileExists(dir, 'README.md') || fileExists(dir, 'readme.md') ? 'pass' : 'fail'),
  },
  {
    id: 'readmeTitle',
    name: 'README starts with a project title',
    weight: WEIGHTS.readmeTitle,
    run: (dir) => {
      const c = readIfExists(dir, 'README.md') || readIfExists(dir, 'readme.md');
      return c && /^#\s+\S/.test(c.trim()) ? 'pass' : 'warn';
    },
  },
  {
    id: 'readmeInstall',
    name: 'README has install / getting started section',
    weight: WEIGHTS.readmeInstall,
    run: (dir) => {
      const c = readIfExists(dir, 'README.md') || readIfExists(dir, 'readme.md');
      return hasHeading(c, SECTIONS.install) ? 'pass' : 'warn';
    },
  },
  {
    id: 'readmeUsage',
    name: 'README has usage / features section',
    weight: WEIGHTS.readmeUsage,
    run: (dir) => {
      const c = readIfExists(dir, 'README.md') || readIfExists(dir, 'readme.md');
      return hasHeading(c, SECTIONS.usage) ? 'pass' : 'warn';
    },
  },
  {
    id: 'readmeLicense',
    name: 'README mentions the license',
    weight: WEIGHTS.readmeLicense,
    run: (dir) => {
      const c = readIfExists(dir, 'README.md') || readIfExists(dir, 'readme.md');
      return hasHeading(c, SECTIONS.license) ? 'pass' : 'warn';
    },
  },
  {
    id: 'readmeLength',
    name: 'README is at least 200 words and not a stub',
    weight: WEIGHTS.readmeLength,
    run: (dir) => {
      const c = readIfExists(dir, 'README.md') || readIfExists(dir, 'readme.md');
      if (!c) return 'fail';
      const words = c.split(/\s+/).filter(Boolean).length;
      return words >= 200 ? 'pass' : words >= 50 ? 'warn' : 'fail';
    },
  },
  {
    id: 'license',
    name: 'LICENSE file is present',
    weight: WEIGHTS.license,
    run: (dir) => (fileExists(dir, 'LICENSE') || fileExists(dir, 'LICENSE.md') ? 'pass' : 'fail'),
  },
  {
    id: 'licenseReal',
    name: 'LICENSE is a real license text (not a placeholder)',
    weight: WEIGHTS.licenseReal,
    run: (dir) => {
      const c = readIfExists(dir, 'LICENSE') || readIfExists(dir, 'LICENSE.md');
      if (!c) return 'fail';
      return c.length > 500 ? 'pass' : 'warn';
    },
  },
  {
    id: 'contributing',
    name: 'CONTRIBUTING.md exists',
    weight: WEIGHTS.contributing,
    run: (dir) => (fileExists(dir, 'CONTRIBUTING.md') ? 'pass' : 'warn'),
  },
  {
    id: 'codeOfConduct',
    name: 'CODE_OF_CONDUCT.md exists',
    weight: WEIGHTS.codeOfConduct,
    run: (dir) => (fileExists(dir, 'CODE_OF_CONDUCT.md') ? 'pass' : 'warn'),
  },
  {
    id: 'security',
    name: 'SECURITY.md exists',
    weight: WEIGHTS.security,
    run: (dir) => (fileExists(dir, 'SECURITY.md') ? 'pass' : 'warn'),
  },
  {
    id: 'changelog',
    name: 'CHANGELOG.md exists',
    weight: WEIGHTS.changelog,
    run: (dir) => (fileExists(dir, 'CHANGELOG.md') ? 'pass' : 'warn'),
  },
  {
    id: 'gitignore',
    name: '.gitignore exists',
    weight: WEIGHTS.gitignore,
    run: (dir) => (fileExists(dir, '.gitignore') ? 'pass' : 'warn'),
  },
  {
    id: 'ci',
    name: 'GitHub Actions CI workflow present',
    weight: WEIGHTS.ci,
    run: (dir) => {
      const dir2 = join(dir, '.github', 'workflows');
      if (!fileExists(dir, '.github/workflows')) return 'warn';
      const files = readdirSync(dir2, { withFileTypes: true }).filter((e) => e.isFile() && /\.(ya?ml)$/i.test(e.name));
      return files.length > 0 ? 'pass' : 'warn';
    },
  },
  {
    id: 'issueTemplates',
    name: 'Issue templates configured',
    weight: WEIGHTS.issueTemplates,
    run: (dir) => {
      const d = join(dir, '.github', 'ISSUE_TEMPLATE');
      if (!fileExists(dir, '.github/ISSUE_TEMPLATE')) return 'warn';
      return readdirSync(d, { withFileTypes: true }).some((e) => /\.ya?ml$/i.test(e.name)) ? 'pass' : 'warn';
    },
  },
  {
    id: 'prTemplate',
    name: 'Pull request template configured',
    weight: WEIGHTS.prTemplate,
    run: (dir) => (fileExists(dir, '.github/PULL_REQUEST_TEMPLATE.md') ? 'pass' : 'warn'),
  },
  {
    id: 'manifest',
    name: 'Project manifest present (package.json or pyproject.toml)',
    weight: WEIGHTS.manifest,
    run: (dir) => (fileExists(dir, 'package.json') || fileExists(dir, 'pyproject.toml') ? 'pass' : 'warn'),
  },
];

export const MAX_SCORE = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

export function runChecks(dir) {
  return RULES.map((rule) => {
    let status = 'fail';
    let detail = '';
    try {
      const out = rule.run(dir);
      if (out === 'pass' || out === 'warn' || out === 'fail') status = out;
    } catch (err) {
      status = 'fail';
      detail = err.message;
    }
    return { id: rule.id, name: rule.name, weight: rule.weight, status, detail };
  });
}

export function score(results) {
  let earned = 0;
  for (const r of results) {
    if (r.status === 'pass') earned += r.weight;
    else if (r.status === 'warn') earned += Math.round(r.weight / 2);
  }
  return Math.round((earned / MAX_SCORE) * 100);
}