# AGENTS.md

Guidance for coding agents working on **{{projectName}}**.

## Project overview

{{description}}

## Repository facts

- Primary language: {{primaryLanguage}}
- This repository existed before oss-init adoption; package metadata, source layout, dependencies, and existing workflows are authoritative.
- Do not infer APIs, commands, compatibility, or dependency policy from generic templates.

## Conventions

- Inspect the existing code, package metadata, tests, and workflows before changing behavior.
- Follow the repository's established module layout, formatting, and naming.
- Keep changes focused and preserve unrelated user-authored files.
- Never commit credentials, local machine configuration, or generated archives.

## Verification

Use the repository's actual test, lint, type-check, and build commands. If CI is present, reproduce the relevant jobs locally where practical. Add regression coverage for behavior changes and state any verification boundary explicitly.

## Change workflow

1. Branch from the repository's default branch and keep commits focused.
2. Preserve user-authored files and existing changelog history.
3. Update documentation when public behavior changes.
4. Run the relevant verification before opening a pull request.

## Maintainer

Core maintainer: {{githubUser}}.

## License

See [LICENSE](LICENSE) and package metadata for the applicable {{licenseTitle}} terms.
