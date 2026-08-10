# oss-init

Scaffold and health-check production-grade open source repositories.

[![CI](https://github.com/kkx94/oss-init/actions/workflows/ci.yml/badge.svg)](https://github.com/kkx94/oss-init/actions/workflows/ci.yml)
![Zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![License](https://img.shields.io/github/license/kkx94/oss-init)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

`oss-init` does two things:

1. **Scaffolds** a complete, production-ready repository skeleton in one command — bilingual README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, AGENTS.md, `.gitignore`, GitHub Actions CI/CD, issue/PR templates. Real content, not empty boilerplate.
2. **Audits** any existing repository against 17 open source best-practice rules and prints a 0-100 health score, with an optional `--fix` that patches missing community files in place.

**Zero dependencies.** No build step. Works with Node.js >= 18.

## Why this project exists

Setting up a new open source repository is repetitive and error-prone — most people copy-paste incomplete templates, forget `SECURITY.md`, write weak CONTRIBUTING, or skip CI/CD. `oss-init` eliminates that busywork and gives maintainers a clean, production-grade starting point in seconds, plus an ongoing audit so the repo doesn't drift.

I am the **sole core maintainer** with write access to this repository. The project is actively maintained and will keep improving with community feedback.

Unlike other scaffolding tools:

- **Zero dependencies** — no supply chain risk, no install weight
- **Real content** — every generated file is complete and usable as-is
- **Bilingual support** — English and Chinese README out of the box
- **Production-grade defaults** — CI matrix, release automation, security policy included
- **Self-auditing** — `oss-init check` scores this very repository at **100/100**

## Installation

```bash
npx oss-init
```

or install globally:

```bash
npm install -g oss-init
```

## Usage

### Scaffold a repository (`init`)

```bash
oss-init                              # interactive wizard
oss-init my-project --lang node --ci  # non-interactive
```

The `init` command is the default, so `oss-init [dir]` and `oss-init init [dir]` are equivalent.

#### Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `--lang` | `node`, `python` | `node` | Template language (python planned for v0.2) |
| `--license` | `mit`, `apache-2.0` | `mit` | License to generate |
| `--docs` | `en`, `zh`, `bilingual` | `bilingual` | README language |
| `--name` | string | directory name | Package name (npm naming rules) |
| `--author` | string | git user.name | Author used in LICENSE and commits |
| `--ci` | flag | off | Generate `.github/workflows/ci.yml` |
| `--publish` | flag | off | Generate `.github/workflows/release.yml` |
| `--git` | flag | off | Run `git init` and make the first commit |
| `--github` | flag | off | `--git` plus create a public GitHub repo and push (requires `gh`) |
| `--no-agents` | flag | off | Skip generating `AGENTS.md` |
| `--dry-run` | flag | off | Preview the files that would be generated without writing anything |
| `--force`, `-f` | flag | off | Overwrite a non-empty directory |
| `--help`, `-h` | flag | — | Show help |
| `--version`, `-v` | flag | — | Show version |

When the target directory is non-empty, `oss-init` lists the files it would overwrite and asks you to re-run with `--force` (or confirms interactively).

#### What gets generated

| Category | Files |
|----------|-------|
| Documentation | `README.md` (English), `README.zh-CN.md` (Chinese), `CHANGELOG.md`, `AGENTS.md` |
| Community | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` |
| Legal | `LICENSE` (MIT or Apache-2.0) |
| Tooling | `.gitignore`, `.gitattributes`, `package.json` |
| Issue & PR templates | `.github/ISSUE_TEMPLATE/` (bug, feature, config), `.github/PULL_REQUEST_TEMPLATE.md` |
| CI/CD | `.github/workflows/ci.yml`, `.github/workflows/release.yml` (optional) |
| Starter code | `src/index.js`, `test/index.test.js` with passing tests |

### Audit a repository (`check`)

```bash
oss-init check                # audit the current directory
oss-init check ./other-repo   # audit another repo
oss-init check --json         # machine-readable output for CI
oss-init check --fix          # patch missing community files in place
```

`check` scores the repository against 17 rules covering documentation quality, community files, and CI configuration. A score of 80 or above is considered healthy. Non-`--fix` runs exit with code 1 when the score is below 80, so you can wire it into CI.

#### Check options

| Option | Description |
|--------|--------------|
| `--json` | Output results as JSON |
| `--fix` | Generate any missing community files from the oss-init templates |
| `--quiet` | Print only the summary line |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

## Examples

```bash
# Bilingual Node.js project with CI and release automation
oss-init my-lib --lang node --docs bilingual --ci --publish

# Scaffold, init git, create a GitHub repo and push, all in one go
oss-init my-lib --ci --github

# Audit your existing repo and auto-patch missing files
oss-init check --fix
```

## Preview

Scaffold a project, init git, and make the first commit in one command:

```text
$ oss-init my-lib --lang node --docs bilingual --ci --publish --git

Generated 19 files in /path/to/my-lib:
  README.md
  README.zh-CN.md
  LICENSE
  AGENTS.md
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
  .github/workflows/release.yml
  .github/ISSUE_TEMPLATE/bug_report.yml
  .github/ISSUE_TEMPLATE/feature_request.yml
  .github/ISSUE_TEMPLATE/config.yml
  .github/PULL_REQUEST_TEMPLATE.md

Initialized git repo and made the first commit.
```

Audit it immediately afterwards — the freshly scaffolded repo scores near-perfectly out of the box:

```text
$ oss-init check ./my-lib

oss-init check
  Auditing ./my-lib

  ✓  README.md exists                       [readme]
  ✓  README starts with a project title     [readmeTitle]
  ✓  README has install/getting started     [readmeInstall]
  ✓  README has usage/features section      [readmeUsage]
  ✓  README mentions the license            [readmeLicense]
  ✓  README is at least 200 words           [readmeLength]
  ✓  LICENSE file is present                [license]
  ✓  LICENSE is a real license text         [licenseReal]
  ✓  CONTRIBUTING.md exists                 [contributing]
  ✓  CODE_OF_CONDUCT.md exists              [codeOfConduct]
  ✓  SECURITY.md exists                     [security]
  ✓  CHANGELOG.md exists                    [changelog]
  ✓  .gitignore exists                      [gitignore]
  ✓  GitHub Actions CI workflow present     [ci]
  ✓  Issue templates configured             [issueTemplates]
  ✓  Pull request template configured       [prTemplate]
  ✓  Project manifest present               [manifest]

Score: 100 / 100  healthy
```

Add `--github` to the first command and the repo is also created on GitHub and pushed — one command from empty directory to published repository with CI.

## Development

```bash
# Run the test suite (node:test, zero dependencies)
npm test

# Syntax-check all source files
npm run lint

# Audit this repository against its own rules
node bin/oss-init.js check
```

## Documentation

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [AGENTS.md](AGENTS.md) — guidance for AI coding agents working on this repo

## Roadmap

- [ ] Python template (v0.2)
- [ ] Go template
- [ ] `oss-init update` — sync generated files in existing repositories (#2)
- [ ] `--template` for custom template directories (#3)
- [ ] Configurable rule sets for `check`

## License

MIT — see [LICENSE](LICENSE). Sole maintainer: [kkx94](https://github.com/kkx94).
