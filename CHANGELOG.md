# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `oss-init check` subcommand: audits a repository against 17 open source best-practice rules and prints a 0-100 health score, with `--json`, `--quiet`, and `--fix` (auto-patches missing community files).
- `--git` and `--github` flags for `init`: scaffold, `git init`, make the first commit, and (with `--github`) create a public GitHub repo and push — all in one command.
- `--dry-run` flag for `init`: preview the files that would be generated without writing anything.
- `AGENTS.md` generation (on by default; opt out with `--no-agents`) — gives AI coding agents working on the new repo clear conventions.
- Non-empty directory handling now lists the files that would be overwritten before requiring `--force`.
- Self-audit: `oss-init check` scores this repository at 100/100.

### Changed

- CLI restructured around subcommands (`init`, `check`); bare `oss-init [dir]` still defaults to `init`.
- `--no-<bool>` negation syntax supported for boolean flags.
- README rewritten with maintainer statement, full command reference, and check preview.

## [0.1.0] - 2026-08-10

### Added

- Interactive wizard and non-interactive CLI (`--lang`, `--license`, `--docs`, `--name`, `--ci`, `--publish`, `--force`)
- Node.js template: `package.json`, `.gitignore`, CI/release workflows, starter `src/` and `test/`
- Common files: bilingual README, LICENSE (MIT / Apache-2.0), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG
- Zero runtime dependencies (hand-written argument parser, `node:readline/promises` prompts, `node:test` suite)
