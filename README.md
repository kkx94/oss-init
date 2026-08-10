# oss-init

Scaffold a production-grade open source repository in one command.

[![CI](https://github.com/kkx94/oss-init/actions/workflows/ci.yml/badge.svg)](https://github.com/kkx94/oss-init/actions/workflows/ci.yml)
![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![License](https://img.shields.io/github/license/kkx94/oss-init)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

`oss-init` generates a complete, production-ready repository skeleton: professional README (English and Chinese), LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, `.gitignore`, and optional GitHub Actions CI/CD and release workflows. Every file is real, useful content �?not empty boilerplate.

**Zero dependencies.** No build step. Works with Node.js >= 18.

## Why oss-init?

Every open source maintainer does the same tedious work for every new repository: writing a README, picking a license, adding CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, setting up CI and release workflows. `oss-init` removes that friction so you can focus on the code that matters.

Unlike other scaffolding tools:

- **Zero dependencies** �?no supply chain risk, no install weight
- **Real content** �?every generated file is complete and usable as-is
- **Bilingual support** �?English and Chinese README out of the box
- **Production-grade defaults** �?CI matrix, release automation, security policy included

## Installation

```bash
npx oss-init
```

or install globally:

```bash
npm install -g oss-init
```

## Usage

### Interactive wizard

```bash
oss-init
```

Prompts guide you through project name, language, license, documentation language, and CI options.

### Non-interactive

```bash
oss-init my-project --lang node --license mit --docs bilingual --ci --publish
```

### Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--lang` | `node`, `python` | `node` | Template language (python planned for v0.2) |
| `--license` | `mit`, `apache-2.0` | `mit` | License to generate |
| `--docs` | `en`, `zh`, `bilingual` | `bilingual` | README language |
| `--name` | string | directory name | Package name (npm naming rules) |
| `--ci` | flag | off | Generate `.github/workflows/ci.yml` |
| `--publish` | flag | off | Generate `.github/workflows/release.yml` |
| `--force`, `-f` | flag | off | Overwrite a non-empty directory |
| `--help`, `-h` | flag | �?| Show help |
| `--version`, `-v` | flag | �?| Show version |

### What gets generated

| Category | Files |
|----------|-------|
| Documentation | `README.md` (English), `README.zh-CN.md` (Chinese), `CHANGELOG.md` |
| Community | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` |
| Legal | `LICENSE` (MIT or Apache-2.0) |
| Tooling | `.gitignore`, `.gitattributes`, `package.json` |
| Issue & PR templates | `.github/ISSUE_TEMPLATE/` (bug, feature), `.github/PULL_REQUEST_TEMPLATE.md` |
| CI/CD | `.github/workflows/ci.yml`, `.github/workflows/release.yml` (optional) |
| Starter code | `src/index.js`, `test/index.test.js` with passing tests |

## Examples

```bash
# Bilingual Node.js project with CI and release automation
oss-init my-lib --lang node --docs bilingual --ci --publish

# English-only, MIT, minimal
oss-init tool --lang node --docs en --license mit
```

## Preview

```text
$ oss-init my-lib --lang node --docs bilingual --ci

Generated 18 files in /path/to/my-lib:
  README.md
  README.zh-CN.md
  LICENSE
  CONTRIBUTING.md
  CODE_OF_CONDUCT.md
  SECURITY.md
  CHANGELOG.md
  .gitignore
  .gitattributes
  package.json
  src/index.js
  test/index.test.js
  .github/workflows/ci.yml
  .github/ISSUE_TEMPLATE/bug_report.yml
  .github/ISSUE_TEMPLATE/feature_request.yml
  .github/PULL_REQUEST_TEMPLATE.md

Next steps:
  cd my-lib
  git init && git add -A && git commit -m "Initial commit"
  Push to GitHub and enable Actions.
```

## Development

```bash
# Run the test suite (node:test, zero dependencies)
npm test

# Syntax-check all source files
npm run lint
```

## Documentation

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Changelog](CHANGELOG.md)

## Roadmap

- [ ] Python template (v0.2)
- [ ] Go template
- [ ] `oss-init update` �?sync generated files in existing repositories
- [ ] `--template` for custom template directories

## License

MIT © [oss-init contributors](https://github.com/kkx94/oss-init/graphs/contributors) �?see [LICENSE](LICENSE).
