# Contributing to {{projectName}}

Thank you for considering a contribution.

## Before you start

- Search existing issues and pull requests before opening a duplicate.
- Use the issue templates for reproducible bugs and focused feature requests.
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report security concerns privately through [SECURITY.md](SECURITY.md), not a public issue.

## Pull requests

1. Fork the repository and create a focused branch from `main`.
2. Make the smallest change that resolves the issue.
3. Add or update tests for behavior changes.
4. Update user-facing documentation when behavior changes.
5. Run the full test command:

   ```bash
   {{testCommand}}
   ```

6. Open a pull request with the motivation, implementation summary, and verification evidence.

## Review checklist

- [ ] The change is scoped to one clear objective.
- [ ] New behavior has regression coverage.
- [ ] Existing and new tests pass locally.
- [ ] Documentation and changelog entries are accurate.
- [ ] No credentials, personal paths, archives, or unrelated generated files are included.

## Commit messages

- Use the imperative mood, such as `Fix manifest validation`.
- Keep the first line concise and explain non-obvious decisions in the body.
- Link the relevant issue or pull request when one exists.
