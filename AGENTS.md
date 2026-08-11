# AGENTS.md

Guidance for AI coding agents working on **oss-init**.

> This file is a repository convention for automated contributors. Maintainers should update it when project behavior or validation requirements change.

## Project overview

oss-init is a zero-runtime-dependency Node.js CLI. It scaffolds a documented Node.js or Python open source repository baseline, audits repository hygiene with `oss-init check`, and safely refreshes generated files with `oss-init update`.

## Languages and runtime

- Primary language: JavaScript using ES modules
- Runtime: Node.js 22 or newer
- Test runner: built-in `node:test`
- No build step and no runtime dependencies

## Conventions

- Adding a runtime dependency requires maintainer discussion and justification.
- Use ESM (`import` and `export`), not CommonJS (`require`).
- Use 2-space indentation and no trailing semicolons.
- Prefer small, focused functions with descriptive names.
- Add comments only where behavior is genuinely non-obvious.
- Treat template output and generated workflows as product behavior, not documentation-only changes.

## Validation

```bash
npm test
npm run lint
npm pack --dry-run --json
```

All applicable checks must pass before a change is submitted. Add or update tests for behavior changes. Changes to templates should be verified for both Node.js and Python output where relevant.

## Change process

1. Branch from `main` and keep commits focused.
2. Preserve user-authored files and legacy `.oss-init.json` compatibility unless a documented migration is part of the change.
3. Update tests and `CHANGELOG.md` for user-visible behavior.
4. Run the validation commands above.
5. Follow the existing concise, imperative commit-message style.

## Guardrails

- Do not commit secrets, tokens, personal data, or machine-specific configuration.
- Do not add runtime dependencies without discussion.
- Do not reformat unrelated code.
- Do not delete existing changelog history.
- Do not weaken path containment, manifest validation, user-edit preservation, or release verification.
- Do not claim publication, compatibility, adoption, or verification without current evidence.

## Maintainer

Core maintainer: [kkx94](https://github.com/kkx94).

## License

Contributions are licensed under the project's [MIT License](LICENSE).
