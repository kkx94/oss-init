# AGENTS.md

Guidance for coding agents working on **{{projectName}}**.

## Project overview

{{description}}

## Language and runtime

- Primary language: {{primaryLanguage}}
- Runtime: {{runtimeSummary}}
- No runtime dependencies in the generated starter

## Conventions

- Follow the existing module layout and local style.
- Keep functions small, focused, and clearly named.
- Do not add runtime dependencies without explaining the need and supply-chain impact.
- Do not reformat unrelated files or add speculative features.
- Never commit credentials, local machine configuration, or generated archives.

## Verification

Run the project test command before submitting a change:

```bash
{{testCommand}}
```

Add or update tests for behavior changes. A command exiting successfully is not enough if it does not exercise the changed behavior.

## Change workflow

1. Branch from `main` and keep commits focused.
2. Preserve user-authored files and existing changelog history.
3. Update documentation when public behavior changes.
4. Verify the full test suite before opening a pull request.

## Maintainer

Core maintainer: {{githubUser}}.

## License

Contributions are licensed under the project's {{licenseTitle}}. See [LICENSE](LICENSE).
