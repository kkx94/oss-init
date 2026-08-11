# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added `--template <dir>` for safe organization template overlays, including built-in overrides, new files, Node.js/Python sections, preflight placeholder validation, and portable update snapshots. Closes #3.
- Added a zero-dependency GitHub Action that audits checked-out repositories, enforces a configurable score threshold, publishes a `score` output, and writes a detailed job summary.
- Added a reproducible end-to-end demo that scaffolds, tests, audits, and previews updates for temporary Node.js and Python projects; parent CI runs it on every change.
- Added a structured adoption-report issue template for public downstream projects.
- Added Chinese project documentation and clearer entry points for users and first-time contributors.

### Changed

- Advanced `.oss-init.json` to schema v2 while retaining schema v1 and legacy manifest compatibility; custom snapshots never store machine-specific source paths.
- Expanded generated READMEs with concrete customization, development, and release guidance.
- Made the hygiene audit recognize Chinese section headings and measure Chinese prose without relying on whitespace-delimited word counts.

## [0.3.1] - 2026-08-11

### Added

- Added `--github-user` so generated repository links can use the GitHub login independently of the LICENSE and commit author.
- Added an explicit manifest schema with validation and migration support for manifests written by v0.2.x and v0.3.0.
- Added Linux and Windows coverage to generated Node.js and Python CI workflows, with a stable aggregate `CI` check for branch protection.
- Added release verification for tag/package identity, package contents, public registry visibility, and clean-directory `npx` execution.

### Changed

- Scoped Node.js package names keep their npm identity while repository names and JavaScript identifiers use safe unscoped forms.
- Python project names now reject npm scopes and safely derive import names from dots, hyphens, digits, and Python keywords.
- Node.js 22 is now the minimum supported runtime. Parent CI covers Node.js 22, 24, and 26 on Linux plus Node.js 24 on Windows.
- GitHub Actions use current Node.js 24-based major versions (`checkout@v7`, `setup-node@v7`, `setup-python@v7`, and `action-gh-release@v3`) in the parent repository and generated workflows.
- Generated documentation and workflows now reflect the selected Node.js or Python project type instead of mixing ecosystem-specific instructions.
- Release automation now creates a GitHub Release only after npm publication, public registry read-back, and a clean `npx` acceptance check succeed.

### Fixed

- Manifest paths, values, and SHA-256 hashes are fully validated before rendering or writing; target writes also enforce directory containment.
- Updates use temporary rendering and atomic file writes, clean up temporary data on every exit path, and preserve user-modified or retired files unless `--force` is supplied.
- `check --fix` now adds only missing files and does not overwrite an existing README.
- Removed stale runtime claims, fixed encoding artifacts, and made installation status explicit before the first public npm release.

## [0.3.0] - 2026-08-10

### Changed

- **Package renamed to `@kkx94/oss-init` on npm.** The plain `oss-init` name on npm belongs to another maintainer; install with `npm install -g @kkx94/oss-init` or `npx @kkx94/oss-init`. The CLI command is still `oss-init`.

### Fixed

- `oss-init update` no longer deletes retired files the user has modified. Retired files are now subject to the same hash-based protection as updated files: if the on-disk content differs from the manifest hash, the file is preserved unless `--force` is given.
- `oss-init update` now rejects manifest paths that escape the target directory (`../`, absolute paths, drive roots) and reports them instead of touching files outside the repo.
- `--github` now runs `git init`, `git add -A`, and the first commit before `gh repo create --source . --push`, so a single command can take an empty directory to a pushed GitHub repository.
- Hardened `--dry-run`: no `.oss-init.json` manifest is written in dry-run mode.

### Added

- Branch protection guidance and a self-update acceptance test.
- `oss-init update` path escape regression tests.

## [0.2.0] - 2026-08-10

### Added

- **Python template** (`--lang python`): `pyproject.toml` (Hatchling backend, PEP 621), `src/<package>/__init__.py` with real code, `tests/test_*.py` using `unittest` (zero dev deps to run), Python 3.10/3.11/3.12/3.13 CI matrix, and a release workflow that publishes to PyPI via trusted publishing. Closes #1.
- **`oss-init update` subcommand**: refreshes files in a repository previously scaffolded with `oss-init init`. A `.oss-init.json` manifest written at scaffold time records render values and content hashes; `update` re-renders and uses the hashes to preserve files the user has modified (use `--force` to overwrite). Supports `--dry-run`. Closes #2.
- `oss-init check` subcommand: audits a repository against 17 open source best-practice rules and prints a 0-100 health score, with `--json`, `--quiet`, and `--fix` (auto-patches missing community files, auto-detecting Node vs Python).
- `--git` and `--github` flags for `init`: scaffold, `git init`, make the first commit, and (with `--github`) create a public GitHub repo and push — all in one command.
- `--dry-run` flag for `init`: preview the files that would be generated without writing anything.
- `AGENTS.md` generation (on by default; opt out with `--no-agents`) — gives AI coding agents working on the new repo clear conventions.
- Non-empty directory handling now lists the files that would be overwritten before requiring `--force`.
- Path placeholders in template trees (e.g. `src/{{nameSnake}}/`) are now substituted, enabling language templates with dynamic package directories.

### Changed

- CLI restructured around subcommands (`init`, `check`, `update`); bare `oss-init [dir]` still defaults to `init`.
- `--no-<bool>` negation syntax supported for boolean flags.
- `check --fix` auto-detects the project language from `pyproject.toml` vs `package.json`.
- README rewritten with maintainer statement, full command reference, and check preview.

## [0.1.0] - 2026-08-10

### Added

- Interactive wizard and non-interactive CLI (`--lang`, `--license`, `--docs`, `--name`, `--ci`, `--publish`, `--force`)
- Node.js template: `package.json`, `.gitignore`, CI/release workflows, starter `src/` and `test/`
- Common files: bilingual README, LICENSE (MIT / Apache-2.0), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG
- Zero runtime dependencies (hand-written argument parser, `node:readline/promises` prompts, `node:test` suite)
