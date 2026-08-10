# AGENTS.md

Guidance for AI coding agents (Codex, OpenCode, Cursor, Copilot, etc.) working on **oss-init**.

> This file is a convention growing in the open source ecosystem. It tells autonomous agents how to behave in this repository. Maintainers: edit it as the project evolves.

## Project overview

oss-init scaffolds production-grade open source repositories in one command. It generates bilingual READMEs, LICENSE, community files, GitHub Actions, issue/PR templates, and (now) AGENTS.md itself. It also audits existing repos with `oss-init check`.

## Languages and runtime

- Primary language: JavaScript (ES Modules)
- Runtime: Node.js >= 18
- No build step

## Conventions

- **No runtime dependencies.** Adding a dependency requires justification — keep the supply chain surface minimal.
- ESM (`import` / `export`), no CommonJS (`require`).
- 2-space indentation, no trailing semicolons.
- Small, focused functions; descriptive names.
- Do not add comments unless requested or the code is genuinely non-obvious.

## How to run tests

```bash
npm test        # node --test test/
npm run lint    # node --check on every source file
```

All tests must pass before submitting a change. Prefer adding tests alongside new features.

## How to make changes

1. Fork, branch from `main`, keep commits focused.
2. Update tests for any behavior change.
3. Ensure `npm test` and `npm run lint` are green.
4. Follow the existing commit message style: present tense, imperative mood.

## What not to do

- Do not add new runtime dependencies without discussion.
- Do not reformat code that is unrelated to the change at hand.
- Do not commit secrets, tokens, or personal data.
- Do not delete CHANGELOG entries.
- Do not change published template content in a way that breaks downstream scaffolds without a major version bump and a CHANGELOG entry.

## Maintainer

Sole core maintainer: kkx94 (write access).

## License

By contributing you agree your contributions are licensed under the project's MIT License — see [LICENSE](LICENSE).