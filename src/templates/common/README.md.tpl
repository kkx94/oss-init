# {{projectName}}

{{description}}

![License](https://img.shields.io/github/license/{{githubUser}}/{{repoName}})
{{ciBadge}}

> Scaffolded with [oss-init]({{generatorRepoUrl}}), a zero-runtime-dependency tool for creating and safely refreshing open-source repository foundations.

## Included foundations

- Runtime: {{runtimeSummary}}
- Zero runtime dependencies in the starter project
- Built-in tests
- {{ciSummary}}
- Contribution, security, issue, and pull-request guidance

## What to customize

This scaffold is a maintainable starting point, not a substitute for project-specific documentation. Before the first public release:

- Replace the starter description and example code with the real problem, intended users, and supported use cases.
- Document the public API, configuration, compatibility policy, and any external services the project requires.
- Review the selected license, security contact, contribution process, and Code of Conduct contact details.
- Configure branch protection and required checks after the repository is pushed to its permanent GitHub location.
- Remove unused files or workflows and record meaningful user-visible changes in `CHANGELOG.md`.

## Installation

```bash
{{installCommand}}
```

## Usage

```{{codeFenceLanguage}}
{{usageExample}}
```

## Testing

```bash
{{testCommand}}
```

## Development workflow

Install the project, run the test command before and after each focused change, and keep documentation in sync with actual behavior. Pull requests should explain the user problem, the chosen approach, and how the result was verified. Add regression coverage for bug fixes and avoid committing credentials, generated package archives, or machine-specific files.

For releases, confirm that the package metadata and repository links are correct, review the changelog, and use the generated release workflow only after its publishing credentials or trusted-publishing settings have been configured in the destination repository.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request.

## Security

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

{{licenseTitle}} © {{author}} — see [LICENSE](LICENSE).
