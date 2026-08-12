# oss-init

Scaffold, adopt, audit, and safely refresh bilingual Node.js and Python open source repositories.

English | [简体中文](README.zh-CN.md)

[![CI](https://github.com/kkx94/oss-init/actions/workflows/ci.yml/badge.svg)](https://github.com/kkx94/oss-init/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40kkx94%2Foss-init)](https://www.npmjs.com/package/@kkx94/oss-init)
![Zero runtime dependencies](https://img.shields.io/badge/runtime_dependencies-0-brightgreen)
![License](https://img.shields.io/github/license/kkx94/oss-init)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22-brightgreen)](https://nodejs.org)

`oss-init` provides four related commands:

1. **Scaffold** a repository baseline with real documentation, community files, starter code, tests, and optional GitHub Actions workflows.
2. **Adopt** an existing Node.js or Python repository by adding only missing maintenance files while keeping every existing path user-owned.
3. **Audit** an existing repository against 17 open source hygiene checks. The score measures file presence and basic documentation quality; it does not measure project importance, security, or adoption.
4. **Refresh** files generated or adopted by an earlier `oss-init` run while preserving user edits by default.

The CLI has no runtime dependencies and no build step. It supports Node.js 22 and newer. The repository also ships a zero-dependency GitHub Action for enforcing the audit in CI.

## Installation

Install or run the scoped package from the public npm registry:

```bash
npx @kkx94/oss-init
npm install --global @kkx94/oss-init
```

The unscoped npm name `oss-init` belongs to another maintainer. The installed command remains `oss-init`.

## Why this project exists

New repositories often repeat the same setup work: licensing, contributor guidance, security reporting, issue templates, tests, and CI. `oss-init` turns those pieces into a reproducible starting point for small and medium Node.js or Python projects, including English and Chinese documentation.

The generated output is intentionally a baseline, not a certification. Maintainers remain responsible for adapting policies, validating release settings, and documenting their actual project behavior.

## Reproducible demo

Run one command from a source checkout to exercise the real CLI end to end. The demo creates temporary Node.js and Python repositories, adopts an existing project without changing its package metadata, runs generated tests, verifies hygiene results, previews a safe update, and removes the temporary files. It does not use the network or modify the checkout.

```bash
npm run demo
```

Expected summary (the commands themselves are executed, not simulated):

```text
✓ Scaffolded a bilingual Node.js repository
✓ Generated Node.js tests passed
✓ node-demo hygiene audit passed (100/100)
✓ Safe refresh preview completed without changing files
✓ Existing Node.js repository adopted without replacing package metadata
✓ Scaffolded a bilingual Python repository
✓ Generated Python tests passed
✓ python-demo hygiene audit passed (100/100)
✓ End-to-end demo passed
```

The same demo runs in [GitHub Actions](https://github.com/kkx94/oss-init/actions/workflows/ci.yml), so the README flow is continuously checked on Linux with current Node.js and Python runtimes.

## Usage

### Scaffold a repository

```bash
oss-init                              # interactive wizard
oss-init my-project --lang node --ci  # non-interactive
```

`init` is the default command, so `oss-init [dir]` and `oss-init init [dir]` are equivalent.

| Option | Values | Default | Description |
|---|---|---|---|
| `--lang` | `node`, `python` | `node` | Template language |
| `--license` | `mit`, `apache-2.0` | `mit` | License to generate |
| `--docs` | `en`, `zh`, `bilingual` | `bilingual` | README language |
| `--name` | string | directory name | Project/package name; npm scopes are supported for Node.js |
| `--author` | string | `git user.name` | Author used in the LICENSE and initial commit |
| `--github-user` | string | detected `gh` login | GitHub login used in generated repository links |
| `--template` | directory | none | Overlay built-ins with organization templates from `common/` and `<lang>/` |
| `--ci` | flag | off | Generate `.github/workflows/ci.yml` |
| `--publish` | flag | off | Generate `.github/workflows/release.yml` |
| `--git` | flag | off | Initialize Git and create the first commit |
| `--github` | flag | off | Run `--git`, create a public GitHub repository, and push; requires `gh` |
| `--no-agents` | flag | off | Skip generating `AGENTS.md` |
| `--dry-run` | flag | off | Preview generated files without writing them |
| `--force`, `-f` | flag | off | Allow writes into a non-empty target directory |
| `--help`, `-h` | flag | off | Show help |
| `--version`, `-v` | flag | off | Show version |

When the target directory is non-empty, `oss-init` reports which paths conflict and requires `--force` before writing. `--force` at initialization permits those writes; inspect the target first.

#### Generated content

| Category | Files |
|---|---|
| Documentation | Language-appropriate README files, `CHANGELOG.md`, `AGENTS.md` |
| Community | `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` |
| Legal | MIT or Apache-2.0 `LICENSE` |
| Tooling | `.gitignore`, `.gitattributes`, `package.json` or `pyproject.toml` |
| GitHub | Issue templates and a pull request template |
| CI/CD | Optional CI and release workflows |
| Starter code | A small Node.js or Python module with passing tests |

Generated Node.js CI tests Node.js 22 and 24 on Linux and Node.js 24 on Windows. Generated Python CI tests Python 3.10 through 3.13 on Linux and Python 3.13 on Windows. Both expose a stable aggregate check named `CI` for branch protection.

### Adopt an existing repository

`adopt` makes the maintenance lifecycle available to repositories that were not created by oss-init:

```bash
oss-init adopt . --dry-run       # inspect every proposed addition
oss-init adopt . --ci            # add missing community files and CI
oss-init adopt . --lang python   # resolve a mixed Node.js/Python monorepo
```

The command reads `package.json` or the PEP 621 `[project]` table in `pyproject.toml`, then derives the project name, description, author, license, and GitHub owner where available. It refuses ambiguous mixed-language repositories unless `--lang` is supplied and requires an explicit `--license` when no license can be identified.

With `--ci`, adoption derives commands from the existing repository instead of assuming the starter setup. Node.js projects must have a `test` script; npm, pnpm, and Yarn installation are selected from `packageManager` and lockfiles, and lint runs only when a `lint` script exists. Python projects must expose recognizable pytest or unittest tests and installation metadata. Ambiguous or incomplete setups fail before any file is written. Release automation is intentionally not inferred: `adopt --publish` exits without changes because publishing credentials and commands are project-specific.

Adoption never overwrites an existing file and never generates starter source, tests, `package.json`, or `pyproject.toml`. Schema v3 records both the files created by oss-init and the template paths that already belonged to the repository. Future `update` runs can add newly introduced maintenance files, but even `update --force` will not take ownership of paths that existed before adoption.

| Option | Description |
|---|---|
| `--lang <node\|python>` | Select a project type when both manifests exist |
| `--license <mit\|apache-2.0>` | Select a license only when the project has none |
| `--docs <en\|zh\|bilingual>` | Language for a missing README; default `en` |
| `--name`, `--author`, `--github-user` | Override metadata that cannot be detected |
| `--ci` | Add CI only after deriving a supported install and test setup |
| `--publish` | Unsupported for adoption; exits without writing files |
| `--no-agents` | Do not add `AGENTS.md` |
| `--dry-run` | Preview additions without writing files or a manifest |

### Overlay organization templates

Use `--template <dir>` to keep the built-in baseline while replacing individual files or adding organization-specific files. The custom directory mirrors the built-in `common/`, `node/`, and `python/` layout:

```text
company-templates/
├── common/
│   ├── README.md.tpl
│   └── NOTICE.md.tpl
└── node/
    └── docs/architecture.md.tpl
```

```bash
oss-init my-service --lang node --template ./company-templates
```

Files under `common/` apply to either language and files under the selected language directory apply afterward. A matching relative path overrides the built-in template; a new path adds a generated file. Template filenames and UTF-8 text can use the same `{{projectName}}`, `{{author}}`, and other built-in values. Unknown values fail before any project file is written.

For portable updates, `init` stores the selected custom template text in `.oss-init.json`, not the machine-specific source directory. `update` can therefore reproduce the same files after that directory moves or disappears, while the normal manifest hashes still protect user edits. Symbolic links, escaping paths, reserved `.git/` and `.oss-init.json` targets, more than 200 files, individual files over 256 KiB, and snapshots over 2 MiB are rejected.

### Refresh a scaffolded repository

`init` and `adopt` write a `.oss-init.json` manifest with schema version 3, normalized project identity, render options, SHA-256 hashes, explicit path ownership, and an optional portable custom-template snapshot. Schema v1 and v2 manifests remain supported, and manifests written by v0.2.x through v0.4.x are migrated when updated.

```bash
oss-init update                # update generated files that remain unchanged
oss-init update --dry-run      # preview changes without writing
oss-init update --force        # also overwrite user-modified generated files
```

Before rendering, `update` validates the complete manifest, including paths and hashes. Target paths are checked again before each write. Existing and retired files whose content no longer matches the recorded hash are preserved unless `--force` is supplied. Updated files and the manifest are written atomically, and temporary rendering data is cleaned up after success or failure.

### Audit a repository

```bash
oss-init check                 # audit the current directory
oss-init check ./other-repo    # audit another repository
oss-init check --json          # machine-readable output
oss-init check --fix           # add missing community files
```

`check` evaluates 17 rules covering documentation, community files, and CI configuration. A score of 80 or above is reported as healthy. A normal audit exits with code 1 below 80, which makes it usable in CI. `check --fix` only adds missing files and does not overwrite an existing README or other present files.

| Option | Description |
|---|---|
| `--json` | Output results as JSON |
| `--fix` | Add missing files from the matching Node.js or Python templates |
| `--quiet` | Print only the summary |
| `--help`, `-h` | Show help |
| `--version`, `-v` | Show version |

### Run the audit as a GitHub Action

The action audits the checked-out repository, writes a detailed job summary, fails below a configurable threshold, and exposes the numeric score as `steps.<id>.outputs.score`.

```yaml
name: Repository hygiene

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - id: oss-hygiene
        uses: kkx94/oss-init@v0.4.0
        with:
          fail-below: "80"
      - run: echo "Hygiene score ${{ steps.oss-hygiene.outputs.score }}/100"
```

`path` defaults to the repository root and must remain inside the checked-out workspace. `fail-below` accepts an integer from 0 to 100 and defaults to 80.

The version tag above selects the v0.4.0 release. For an immutable supply-chain input, pin the action to the release's full commit SHA and update that SHA intentionally.

## Examples

```bash
# Bilingual Node.js project with CI and release automation
oss-init my-lib --lang node --docs bilingual --ci --publish

# Python project with explicit GitHub identity
oss-init data-tool --lang python --github-user octocat --ci

# Scaffold, initialize Git, create a GitHub repository, and push
oss-init my-lib --ci --github

# Audit an existing repository and add only missing files
oss-init check --fix

# Adopt an existing repository into the safe update lifecycle
oss-init adopt . --dry-run
oss-init adopt . --ci
```

## Development

```bash
npm test
npm run lint
npm run demo
node bin/oss-init.js check
npm pack --dry-run --json
```

The parent repository tests Node.js 22, 24, and 26 on Linux and Node.js 24 on Windows. Releases authenticate to npm through GitHub OIDC Trusted Publishing (no repository npm token), verify the tag against `package.json`, run tests and package inspection, publish with npm provenance, wait for public registry visibility, and exercise `npx` in a clean directory before creating the GitHub Release.

## Documentation

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [Guidance for coding agents](AGENTS.md)

## Community

- Already using oss-init in a public repository? [Submit an adoption report](https://github.com/kkx94/oss-init/issues/new?template=adoption.yml). Reports are verified before a project is listed; no adoption is inferred from stars or downloads.
- Found a bug or have a concrete workflow request? [Open an issue](https://github.com/kkx94/oss-init/issues/new/choose).

## Roadmap

- [x] Python templates
- [x] Safe generated-file refresh with manifest migration
- [x] Cross-platform generated CI
- [x] Custom template directories ([#3](https://github.com/kkx94/oss-init/issues/3))
- [x] Safe adoption for existing Node.js and Python repositories
- [ ] Configurable rule sets for `check`
- [ ] Additional language templates driven by user demand

## License and maintainer

Maintained by [kkx94](https://github.com/kkx94). Licensed under the [MIT License](LICENSE).
