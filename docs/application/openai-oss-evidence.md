# OpenAI open source application evidence

This file records evidence for a planned application around 2026-09-10. It separates public facts, locally verified release-candidate facts, and gaps. Update it after every material public milestone; do not convert pending items into claims before they are independently visible.

## Snapshot

Evidence checked on 2026-08-11 at approximately 18:20 (Asia/Shanghai).

### Public repository facts

| Item | Verified state |
|---|---|
| Repository | [`kkx94/oss-init`](https://github.com/kkx94/oss-init), public and not archived |
| Created | 2026-08-10 08:02:49 UTC |
| Public `main` commit | `c4abc1eed78f65631bddc2e88bc5941da759541b` |
| Stars / forks | 58 stars / 3 forks |
| Issues | 5 closed / 1 open; all six were opened by `kkx94` |
| Pull requests | 0 total |
| Contributors API | 1 contributor returned |
| Releases | 3; latest is `v0.3.0`, published 2026-08-11 03:24:02 UTC |
| Latest public `main` CI | GitHub Actions `CI` completed successfully for `c4abc1e` |
| Branch protection | Requires a check named `CI`; force pushes and branch deletion are disabled |
| Protection gaps | Strict up-to-date checking and administrator enforcement were disabled at snapshot time |
| npm package | `npm view @kkx94/oss-init version --json` returned registry `E404`; no public package version was verified |

These values are time-sensitive and must be refreshed immediately before the application.

### v0.3.1 release-candidate facts

The following results apply to the local branch `codex/v0.3.1-application-readiness`. They are not public release evidence until the branch is reviewed, merged, tested by GitHub Actions, and published through the release workflow.

| Verification | Result |
|---|---|
| `npm test` | 86 tests passed, 0 failed |
| `npm run lint` | Passed all configured Node.js syntax checks |
| `node scripts/verify-release.js v0.3.1` | Verified `@kkx94/oss-init@0.3.1` |
| `npm pack --dry-run --json` | Passed; 42 package entries, limited to package metadata, README, LICENSE, CLI, source, and templates |
| `git diff --check` | Passed |

The release candidate adds or verifies:

- safe identity derivation for scoped Node.js packages and Python distributions/imports;
- separation of GitHub login from LICENSE and commit author identity;
- manifest schema version 1 with legacy v0.2.x/v0.3.0 migration;
- fail-closed manifest validation, path containment, atomic writes, cleanup, and preservation of user-edited files;
- language-appropriate Node.js and Python documentation and workflows;
- Linux and Windows CI with a stable aggregate check named `CI`;
- current Node.js 24-based GitHub Action major versions in parent and generated workflows (`checkout`, `setup-node`, and `setup-python` v7; `action-gh-release` v3);
- release verification before npm publication and GitHub Release creation.

## Claims that are currently supportable

- `oss-init` is a maintained, MIT-licensed, zero-runtime-dependency CLI for scaffolding, auditing, and refreshing Node.js and Python open source repository baselines.
- The project has automated tests for its core generation, audit, update, manifest, path-safety, identity, rendering, and release-verification behavior.
- The current public repository has visible releases, successful CI, issues, stars, and forks.
- The v0.3.1 candidate materially improves safety, cross-platform testing, documentation accuracy, and release integrity.

## Claims that are not yet supportable

- Do not claim that `@kkx94/oss-init` is installable from npm until registry read-back and clean-directory `npx` execution succeed publicly.
- Do not claim external adoption without a verifiable downstream repository, package usage, maintainer statement, or other public evidence.
- Do not claim external contributors or community pull requests; none were visible at snapshot time.
- Do not describe the hygiene score as a security, quality, importance, or production-readiness certification.
- Do not claim long-term maintenance history; the public repository was created on 2026-08-10.

## Required evidence before applying

1. Merge v0.3.1 through the protected `main` workflow and record the merged commit plus successful required checks.
2. Harden branch protection so required checks are strict and administrator enforcement is enabled; read the settings back through the GitHub API.
3. Publish `@kkx94/oss-init@0.3.1` through the repository release workflow with provenance.
4. Verify the public npm registry response and execute the exact version with `npx` in a clean directory before the GitHub Release is created.
5. Replace the temporary npm status notice in `README.md` with verified installation instructions after publication.
6. Collect genuine adoption evidence. Prefer public downstream repositories, unsolicited issues, external pull requests, or maintainer-confirmed use; never fabricate `ADOPTERS.md` entries.
7. Continue shipping useful, scoped changes through late August and early September so the application shows sustained maintenance rather than a one-day repository burst.
8. Refresh stars, forks, issues, pull requests, contributors, releases, npm status, branch protection, and CI on the application date.

## Reproduction commands

```bash
# Local candidate
npm test
npm run lint
node scripts/verify-release.js v0.3.1
npm pack --dry-run --json
git diff --check

# Public state
gh repo view kkx94/oss-init --json createdAt,description,forkCount,issues,latestRelease,pullRequests,stargazerCount
gh api repos/kkx94/oss-init/commits/main --jq '.sha'
gh api repos/kkx94/oss-init/branches/main/protection
npm view @kkx94/oss-init version --json
```
