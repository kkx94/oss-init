# OpenAI open source application evidence

This file records evidence for a planned application around 2026-09-10. It separates public facts, local verification, and gaps. Update it after every material public milestone; do not convert pending items into claims before they are independently visible.

## Snapshot

Evidence checked on 2026-08-11 at approximately 18:50 (Asia/Shanghai).

### Public repository facts

| Item | Verified state |
|---|---|
| Repository | [`kkx94/oss-init`](https://github.com/kkx94/oss-init), public and not archived |
| Created | 2026-08-10 08:02:49 UTC |
| Public `main` commit | `53505757bbc4bde5191a2e380a81097b16ad7f20` |
| Stars / forks | 58 stars / 3 forks |
| Issues | 5 closed / 1 open; all six were opened by `kkx94` |
| Pull requests | 2 maintainer PRs merged; 4 superseded Dependabot PRs closed; 0 external human PRs |
| Contributors API | 1 contributor returned (`kkx94`, 9 contributions) |
| Releases | 3; latest is `v0.3.0`, published 2026-08-11 03:24:02 UTC |
| Latest public `main` CI | Run `31483752471` completed successfully for `5350575`, including Node.js 22/24/26 on Linux, Node.js 24 on Windows, package inspection, and aggregate `CI` |
| Branch protection | Strict required check `CI`; administrator enforcement and conversation resolution enabled; force pushes and branch deletion disabled |
| npm package | `npm view @kkx94/oss-init version --json` returned registry `E404`; no public package version was verified |

These values are time-sensitive and must be refreshed immediately before the application.

### v0.3.1 readiness facts

The v0.3.1 code and documentation were merged through PR [#7](https://github.com/kkx94/oss-init/pull/7). Current Action majors were then aligned across parent and generated workflows through PR [#12](https://github.com/kkx94/oss-init/pull/12). Both PR checks and both post-merge `main` CI runs succeeded. The package is still a release candidate until npm publication and public acceptance complete.

| Verification | Result |
|---|---|
| `npm test` | 86 tests passed, 0 failed |
| `npm run lint` | Passed all configured Node.js syntax checks |
| `node scripts/verify-release.js v0.3.1` | Verified `@kkx94/oss-init@0.3.1` |
| `npm pack --dry-run --json` | Passed; 42 package entries, limited to package metadata, README, LICENSE, CLI, source, and templates |
| `git diff --check` | Passed |

The code now on `main` adds or verifies:

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
- The v0.3.1 code on `main` materially improves safety, cross-platform testing, documentation accuracy, and release integrity.

## Claims that are not yet supportable

- Do not claim that `@kkx94/oss-init` is installable from npm until registry read-back and clean-directory `npx` execution succeed publicly.
- Do not claim external adoption without a verifiable downstream repository, package usage, maintainer statement, or other public evidence.
- Do not claim external contributors or community pull requests; none were visible at snapshot time.
- Do not treat the three forks as adoption evidence: their public default branches had no independent pushes at snapshot time.
- Do not describe the hygiene score as a security, quality, importance, or production-readiness certification.
- Do not claim long-term maintenance history; the public repository was created on 2026-08-10.

## Official program fit

The [official Codex for Open Source page](https://developers.openai.com/community/codex-for-oss) says core maintainers or people who run widely used public projects should apply, and that projects outside neat criteria may still explain their ecosystem importance. It lists six months of ChatGPT Pro with Codex, conditional Codex Security access, and possible API credits.

The [official Program Terms](https://learn.chatgpt.com/docs/codex-for-oss-terms) require a valid ChatGPT account and accurate, complete information. They say OpenAI may consider repository usage, ecosystem importance, active maintenance, role or permissions, and Program capacity; submission does not guarantee selection.

Current fit, separating evidence from inference:

- **Strong evidence:** the repository is public; `kkx94` owns and actively administers it; protected merges and successful CI are visible.
- **Moderate evidence:** 58 stars and 3 forks show early attention, and the project has working releases and issue history.
- **Weak evidence:** the repository is only one day old, npm is not published, the forks show no independent work, and there are no external human issues or pull requests.
- **Unknown:** OpenAI's current Program capacity, comparative applicant pool, account verification, and any local restrictions.

## Required evidence before applying

1. [x] Merge v0.3.1 readiness changes through protected `main` and record the merged commit plus successful required checks.
2. [x] Harden branch protection and read the settings back through the GitHub API.
3. [ ] Publish `@kkx94/oss-init@0.3.1` through the repository release workflow with provenance.
4. [ ] Verify the public npm registry response and execute the exact version with `npx` in a clean directory before the GitHub Release is created.
5. [ ] Replace the temporary npm status notice in `README.md` with verified installation instructions after publication.
6. [ ] Collect genuine adoption evidence. Prefer public downstream repositories, unsolicited issues, external pull requests, or maintainer-confirmed use; never fabricate `ADOPTERS.md` entries.
7. [ ] Continue shipping useful, scoped changes through late August and early September so the application shows sustained maintenance rather than a one-day repository burst.
8. [ ] Refresh stars, forks, issues, pull requests, contributors, releases, npm status, branch protection, and CI on the application date.

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
