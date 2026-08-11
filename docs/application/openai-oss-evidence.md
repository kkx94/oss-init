# OpenAI open source application evidence

This file records evidence for a planned application around 2026-09-10. It separates public facts, local verification, and gaps. Update it after every material public milestone; do not convert pending items into claims before they are independently visible.

## Snapshot

Evidence checked on 2026-08-11 at approximately 20:51 (Asia/Shanghai).

### Public repository facts

| Item | Verified state |
|---|---|
| Repository | [`kkx94/oss-init`](https://github.com/kkx94/oss-init), public and not archived |
| Created | 2026-08-10 08:02:49 UTC |
| Audited product commit | `ebd3d019ec4c113c08f30f0f43890bc18e3f5fb3`; documentation-only evidence updates may advance `main` afterward |
| Stars / forks | 58 stars / 3 forks |
| Issues | 5 closed / 1 open; all six were opened by `kkx94` |
| Pull requests | 7 maintainer PRs merged; 4 superseded Dependabot PRs closed; 0 external human PRs |
| Contributors API | 1 contributor returned (`kkx94`, 31 contributions) |
| Releases | 3; latest is `v0.3.0`, published 2026-08-11 03:24:02 UTC |
| CI for the audited product commit | Run `31493158079` completed successfully for `ebd3d01`, including Node.js 22/24/26 on Linux, Node.js 24 on Windows, package inspection, the end-to-end Node.js/Python demo, the repository-local GitHub Action, and aggregate `CI` |
| Branch protection | Strict required check `CI`; administrator enforcement and conversation resolution enabled; force pushes and branch deletion disabled |
| npm package | `npm view @kkx94/oss-init version --json` returned registry `E404`; no public package version was verified |

These values are time-sensitive and must be refreshed immediately before the application.

### v0.3.1 readiness facts

The v0.3.1 code and documentation were merged through PR [#7](https://github.com/kkx94/oss-init/pull/7). Current Action majors were then aligned across parent and generated workflows through PR [#12](https://github.com/kkx94/oss-init/pull/12). A reproducible product demo, Chinese project documentation, and adoption-report entry point were merged through PR [#14](https://github.com/kkx94/oss-init/pull/14). A zero-dependency repository-hygiene GitHub Action was merged through PR [#17](https://github.com/kkx94/oss-init/pull/17). All four product PRs and their post-merge `main` CI runs succeeded. The package is still a release candidate until npm publication and public acceptance complete.

| Verification | Result |
|---|---|
| `npm test` | 94 tests passed, 0 failed |
| `npm run lint` | Passed all configured Node.js syntax checks |
| `npm run demo` | Passed real Node.js and Python scaffold, generated-test, 100/100 audit, and safe-update-preview flows using temporary files |
| Repository-local GitHub Action | GitHub-hosted `node24` runner executed `uses: ./`, returned score 100, and passed success/failure/input-boundary regression tests |
| `node scripts/verify-release.js v0.3.1` | Verified `@kkx94/oss-init@0.3.1` |
| `npm pack --dry-run --json` | Passed; 44 package entries, limited to package metadata, bilingual project READMEs, LICENSE, CLI, source, and templates |
| `git diff --check` | Passed |

The code now on `main` adds or verifies:

- safe identity derivation for scoped Node.js packages and Python distributions/imports;
- separation of GitHub login from LICENSE and commit author identity;
- manifest schema version 1 with legacy v0.2.x/v0.3.0 migration;
- fail-closed manifest validation, path containment, atomic writes, cleanup, and preservation of user-edited files;
- language-appropriate Node.js and Python documentation and workflows;
- Linux and Windows CI with a stable aggregate check named `CI`;
- current Node.js 24-based GitHub Action major versions in parent and generated workflows (`checkout`, `setup-node`, and `setup-python` v7; `action-gh-release` v3);
- release verification before npm publication and GitHub Release creation;
- a network-free end-to-end demo enforced by parent CI for both generated ecosystems;
- Chinese project documentation plus Chinese-aware README section and substance checks;
- a structured public adoption-report form whose submissions require a public downstream repository and explicit listing permission;
- a zero-dependency GitHub Action with a configurable failure threshold, score output, job summary, workspace containment, and a required repository-local integration job in parent CI.

## Claims that are currently supportable

- `oss-init` is a maintained, MIT-licensed, zero-runtime-dependency CLI for scaffolding, auditing, and refreshing Node.js and Python open source repository baselines.
- The project has automated tests for its core generation, audit, update, manifest, path-safety, identity, rendering, and release-verification behavior.
- The current public repository has visible releases, successful CI, issues, stars, and forks.
- The v0.3.1 code on `main` materially improves safety, cross-platform testing, documentation accuracy, and release integrity.
- The public README now provides a reproducible product demo, and the same flow is continuously checked in CI.
- Public repositories can preview the read-only audit through a documented GitHub Action; the README recommends full-SHA pinning until an action-bearing release is tagged.

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
3. [x] Add a public, CI-verified Node.js/Python product demo, bilingual project documentation, a GitHub Action adoption path, and a structured intake path for verifiable downstream use.
4. [ ] Publish `@kkx94/oss-init@0.3.1` through the repository release workflow with provenance.
5. [ ] Verify the public npm registry response and execute the exact version with `npx` in a clean directory before the GitHub Release is created.
6. [ ] Replace the temporary npm status notice in `README.md` with verified installation instructions after publication.
7. [ ] Collect genuine adoption evidence. Prefer public downstream repositories, unsolicited issues, external pull requests, or maintainer-confirmed use; never fabricate `ADOPTERS.md` entries.
8. [ ] Continue shipping useful, scoped changes through late August and early September so the application shows sustained maintenance rather than a one-day repository burst.
9. [ ] Refresh stars, forks, issues, pull requests, contributors, releases, npm status, branch protection, and CI on the application date.

## Reproduction commands

```bash
# Local candidate
npm test
npm run lint
npm run demo
node bin/oss-init.js check --json
node src/action.js
node scripts/verify-release.js v0.3.1
npm pack --dry-run --json
git diff --check

# Public state
gh repo view kkx94/oss-init --json createdAt,description,forkCount,issues,latestRelease,pullRequests,stargazerCount
gh api repos/kkx94/oss-init/commits/main --jq '.sha'
gh api repos/kkx94/oss-init/branches/main/protection
npm view @kkx94/oss-init version --json
```
