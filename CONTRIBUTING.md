# Contributing to oss-init

First off, thank you for taking the time to contribute!

The following is a set of guidelines for contributing to oss-init. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the [issue tracker](https://github.com/kkx94/oss-init/issues) to see if the problem has already been reported.

When you are creating a bug report, please include as many details as possible:

- A clear and descriptive title
- Exact steps to reproduce the problem
- The behavior you observed and the behavior you expected
- Your environment: OS version, Node.js version

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When you are creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide a step-by-step description of the suggested enhancement
- Explain why this enhancement would be useful
- List other tools or projects where this enhancement exists, if applicable

### Pull Requests

1. Fork the repository and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed behavior, update the README.
4. Ensure the test suite passes (`npm test`).
5. Make sure your code lints cleanly (`npm run lint`).
6. Issue that pull request!

#### Pull Request Checklist

- [ ] I have read the CONTRIBUTING guide
- [ ] I have followed the code style of the project
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have checked that there are no unresolved placeholders or TODOs

## Style Guide

- ES Modules (`import` / `export`), no CommonJS
- 2-space indentation, no semicolons
- Small, focused functions with clear names
- **No runtime dependencies** — a new dependency must be justified
- Keep the generated output professional and useful — no empty shells

## Git Commit Messages

- Present tense ("Add feature" not "Added feature")
- Imperative mood ("Move cursor to..." not "Moves cursor to...")
- First line limited to 72 characters or fewer

## Attribution

This contribution guide is based on the [Atom contributing guide](https://github.com/atom/atom/blob/master/CONTRIBUTING.md).
