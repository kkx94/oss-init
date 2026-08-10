# oss-init Design Specification

**Date:** 2026-08-10
**Status:** Approved

## 1. Purpose

`oss-init` is a zero-dependency Node.js CLI that scaffolds a production-grade
open source repository in one command: professional README (bilingual
en/zh-CN), LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG,
.gitignore, and complete GitHub Actions CI/CD + release workflows.

It solves the repetitive boilerplate work every open source maintainer faces
when starting a new repository, and provides a genuinely usable, high-quality
starting point instead of empty placeholders.

## 2. Target Audience

- Open source maintainers starting new repositories
- Chinese developers (bilingual documentation is a differentiator)

## 3. Constraints

- **Strictly zero runtime dependencies.** Argument parsing is hand-written,
  interactive prompts use `node:readline/promises`, tests use `node:test`.
- Node.js >= 18, pure ESM.
- No build step. `npx oss-init` works out of the box.

## 4. CLI Design

```bash
oss-init [target-dir]                        # interactive wizard
oss-init my-project --lang node --license mit --docs bilingual --ci
oss-init --help
oss-init --version
```

### Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--lang` | `node`, `python` | `node` | Template language (python is reserved for v0.2, currently errors with a friendly message) |
| `--name` | string | directory name | npm-validated package name |
| `--license` | `mit`, `apache-2.0` | `mit` | License to generate |
| `--docs` | `en`, `zh`, `bilingual` | `bilingual` | README language: English only, Chinese only, or both |
| `--ci` | boolean | false | Generate `.github/workflows/ci.yml` |
| `--publish` | boolean | false | Generate `.github/workflows/release.yml` |
| `--force` | boolean | false | Overwrite non-empty target directory |
| `--help` | - | - | Show help and exit |
| `--version` | - | - | Show version and exit |

### Error handling

- Unknown flag -> error message + exit code 1
- Invalid package name -> clear error with npm naming rules
- Target directory exists and is non-empty without `--force` -> prompt (interactive) or error (non-interactive)
- Target directory cannot be written -> error
- `--lang python` in v0.1 -> friendly "coming soon" error

## 5. Generated Files

### Common (all languages)

| File | Notes |
|------|-------|
| `README.md` | English, real content with badges, usage, contribution section |
| `README.zh-CN.md` | Chinese, only when `--docs bilingual` or `--docs zh` |
| `LICENSE` | MIT or Apache-2.0, real license text with `{{year}}`/`{{author}}` filled |
| `CONTRIBUTING.md` | Real contribution guide |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1 |
| `SECURITY.md` | Security reporting policy |
| `CHANGELOG.md` | Keep a Changelog format, starts with 0.1.0 unreleased |
| `.github/` | Only when `--ci`/`--publish` requested |

### Node template

| File | Notes |
|------|-------|
| `package.json` | Complete fields: bin, engines >=18, type module, files, scripts, keywords, author placeholder |
| `.gitignore` | Node-appropriate ignores |
| `src/index.js` | Minimal real implementation (exported function with unit test) |
| `test/index.test.js` | node:test unit test for src/index.js |
| `.github/workflows/ci.yml` | Node 18/20/22 matrix, npm test |
| `.github/workflows/release.yml` | Tag v* triggers npm publish |

### Python template (v0.2, not in this release)

pyproject.toml, .gitignore, ci/release workflows for PyPI.

## 6. Template Engine

- Templates are plain files containing `{{placeholder}}` tokens.
- `render.js` walks the template tree, replaces tokens, copies conditionally:
  - `--docs en` skips `*.zh-CN.md`
  - `--docs zh` skips `README.md` (English) unless explicitly kept
  - `--ci`/`--publish` include `.github/**`
- Files are written with exact 0o644 permissions; directories created as needed.
- Tokens that survive substitution (missing value) are detected and reported as errors — never silently shipped.

## 7. Module Structure

```
bin/oss-init.js        # shebang entry, imports src/cli.js
src/cli.js             # orchestration: parse -> validate -> prompt -> render -> summary
src/args.js            # pure-function argv parser (testable)
src/validate.js        # package name, directory checks (pure functions)
src/prompts.js         # readline/promises interactive wizard
src/render.js          # placeholder substitution + conditional file copy
src/templates/         # template tree (common/, node/)
test/                  # node:test suites
```

### Interaction contract

- `args.js` -> `{ options, positionals, help, version }` (pure, no I/O)
- `validate.js` -> `{ ok, errors[] }` (pure)
- `prompts.js` -> resolves a completed options object (I/O, only in interactive mode)
- `render.js` -> `render(templateRoot, targetDir, values)` -> `{ filesWritten[], warnings[] }`
- `cli.js` -> main entry, exit codes 0/1

## 8. Testing Strategy

1. `test/args.test.js` — all flag combinations, unknown flags, help/version
2. `test/validate.test.js` — valid/invalid package names, directory checks
3. `test/render.test.js` — render into a temp dir; assert key files exist, zero `{{` placeholders remain, bilingual/ci conditionals correct
4. `test/cli.test.js` — spawn `bin/oss-init.js`, full end-to-end run, assert output summary and files
5. `test/templates.test.js` — every template token has a value in the values map (no dangling placeholders for any option combination)

All tests run via `node --test` — zero dependencies.

## 9. Repository Quality (this project itself)

- English-only repository content (README, docs, commit messages, issues)
- Bilingual README is a *feature of the tool*, not the repo's own docs
- Badges: CI status, npm version/downloads, license, zero dependencies
- MIT license, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG
- GitHub Actions: Node 18/20/22 matrix CI + tag-triggered npm publish
- Single maintainer listed explicitly

## 10. Release & Publishing Plan

1. All tests green locally; manual end-to-end verification
2. Commit in logical batches
3. `gh repo create oss-init --public --source . --push`
4. Description + topics (`open-source`, `cli`, `developer-tools`, `scaffolding`, `zero-dependencies`)
5. `gh release create v0.1.0`
6. Open starter issues/discussions
7. Optional `npm publish` (requires npm account)

## 11. Out of Scope (v0.2+)

- Python template
- Interactive multi-select UI polish
- `oss-init update` (self-upgrade of generated files)
- Templates for Go / Rust / other ecosystems
