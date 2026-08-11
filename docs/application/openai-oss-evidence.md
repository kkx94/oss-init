# OpenAI open source application evidence

This file records evidence for a planned application around 2026-09-10. It separates public facts, local verification, and gaps. Update it after every material public milestone; do not convert pending items into claims before they are independently visible.

## Snapshot

Evidence checked on 2026-08-12 at approximately 05:55 (Asia/Shanghai).

### Public repository facts

| Item | Verified state |
|---|---|
| Repository | [`kkx94/oss-init`](https://github.com/kkx94/oss-init), public and not archived |
| Created | 2026-08-10 08:02:49 UTC |
| Audited product commit | `64afd5cdda74967e807076d447fbf3ef2e26654a`; release hardening and documentation-only evidence updates may advance `main` afterward |
| Stars / forks | 70 stars / 4 forks |
| Issues | 6 closed / 0 open; all six were opened by `kkx94` |
| Pull requests | 11 maintainer PRs merged; 4 superseded Dependabot PRs closed; 0 external human PRs |
| Contributors API | 1 contributor returned (`kkx94`, 39 contributions) |
| Releases | 4; latest is [`v0.4.0`](https://github.com/kkx94/oss-init/releases/tag/v0.4.0), published 2026-08-11 21:38:36 UTC |
| CI for the audited product commit | Run [`31537272077`](https://github.com/kkx94/oss-init/actions/runs/31537272077) completed successfully for `64afd5c`, including Node.js 22/24/26 on Linux, Node.js 24 on Windows, package inspection, the end-to-end Node.js/Python demo, the repository-local GitHub Action, and aggregate `CI` |
| Branch protection | Strict required check `CI`; administrator enforcement and conversation resolution enabled; force pushes and branch deletion disabled |
| npm package | [`@kkx94/oss-init@0.4.0`](https://www.npmjs.com/package/@kkx94/oss-init/v/0.4.0) is public and tagged `latest`; registry metadata exposes an npm attestation with SLSA provenance v1 |

These values are time-sensitive and must be refreshed immediately before the application.

### Current product readiness facts

The v0.3.1 code and documentation were merged through PR [#7](https://github.com/kkx94/oss-init/pull/7). Current Action majors were then aligned across parent and generated workflows through PR [#12](https://github.com/kkx94/oss-init/pull/12). A reproducible product demo, Chinese project documentation, and adoption-report entry point were merged through PR [#14](https://github.com/kkx94/oss-init/pull/14). A zero-dependency repository-hygiene GitHub Action was merged through PR [#17](https://github.com/kkx94/oss-init/pull/17). Safe custom template overlays and portable update snapshots were merged through PR [#19](https://github.com/kkx94/oss-init/pull/19), closing Issue [#3](https://github.com/kkx94/oss-init/issues/3). PR [#21](https://github.com/kkx94/oss-init/pull/21) then released these additions as v0.4.0 after its pull-request and post-merge `main` CI runs succeeded.

Release workflow run [`31537685762`](https://github.com/kkx94/oss-init/actions/runs/31537685762/attempts/2) published v0.4.0 with provenance successfully, but its two-minute registry read-back window expired before npm's first-package metadata became publicly visible, so the run correctly withheld the GitHub Release. After the public registry returned v0.4.0, a clean-directory `npx` acceptance check returned `0.4.0`; only then was the GitHub Release created from the already verified tag. The follow-up hardening increases the bounded registry window to five minutes for parent and generated Node.js workflows.

| Verification | Result |
|---|---|
| `npm test` | 106 tests passed, 0 failed for the audited product tree |
| `npm run lint` | Passed all configured Node.js syntax checks |
| `npm run demo` | Passed real Node.js and Python scaffold, generated-test, 100/100 audit, and safe-update-preview flows using temporary files |
| Repository-local GitHub Action | GitHub-hosted `node24` runner executed `uses: ./`, returned score 100, and passed success/failure/input-boundary regression tests |
| `node scripts/verify-release.js v0.4.0` | Verified `@kkx94/oss-init@0.4.0` |
| `npm pack --dry-run --json` | Passed; 44 package entries, limited to package metadata, bilingual project READMEs, LICENSE, CLI, source, and templates |
| Public npm registry | Returned `@kkx94/oss-init@0.4.0`; package access status is `public` and `latest` resolves to `0.4.0` |
| npm provenance | `dist.attestations` exposes an attestation URL with predicate type `https://slsa.dev/provenance/v1` |
| Clean `npx` acceptance | `npx --yes --package @kkx94/oss-init@0.4.0 oss-init --version` returned `0.4.0` from a new temporary directory |
| npm Trusted Publishing | npm account 2FA is `auth-and-writes`; the authenticated trust command completed for `kkx94/oss-init` and `release.yml`, and this revision removes `NPM_TOKEN` from the parent workflow |
| `git diff --check` | Passed |

The code now on `main` adds or verifies:

- safe identity derivation for scoped Node.js packages and Python distributions/imports;
- separation of GitHub login from LICENSE and commit author identity;
- manifest schema version 2 with schema v1 and legacy v0.2.x/v0.3.0 compatibility;
- fail-closed manifest validation, lexical and symbolic-link path containment, atomic writes, cleanup, and preservation of user-edited files;
- language-appropriate Node.js and Python documentation and workflows;
- Linux and Windows CI with a stable aggregate check named `CI`;
- current Node.js 24-based GitHub Action major versions in parent and generated workflows (`checkout`, `setup-node`, and `setup-python` v7; `action-gh-release` v3);
- release verification before npm publication and GitHub Release creation;
- a network-free end-to-end demo enforced by parent CI for both generated ecosystems;
- Chinese project documentation plus Chinese-aware README section and substance checks;
- a structured public adoption-report form whose submissions require a public downstream repository and explicit listing permission;
- a zero-dependency GitHub Action with a configurable failure threshold, score output, job summary, workspace containment, and a required repository-local integration job in parent CI.
- `--template <dir>` overlays for organization-specific common and Node.js/Python files, with preflight token validation, bounded UTF-8 snapshots, reserved-path protection, and portable safe updates that do not store machine-specific source paths.

## Claims that are currently supportable

- `oss-init` is a maintained, MIT-licensed, zero-runtime-dependency CLI for scaffolding, auditing, and refreshing Node.js and Python open source repository baselines.
- The project has automated tests for its core generation, audit, update, manifest, path-safety, identity, rendering, and release-verification behavior.
- The current public repository has visible releases, successful CI, issues, stars, and forks.
- The current code on `main` materially improves safety, cross-platform testing, documentation accuracy, customization, and release integrity.
- The public README now provides a reproducible product demo, and the same flow is continuously checked in CI.
- Public repositories can preview the read-only audit through a documented GitHub Action; the README recommends full-SHA pinning until an action-bearing release is tagged.
- Organizations can overlay and safely refresh their own templates without forking the built-in baseline or persisting local template paths.
- The scoped package is installable from the public npm registry, and v0.4.0 carries npm provenance tied to the GitHub Actions source build.
- The parent release workflow is configured for npm Trusted Publishing through GitHub OIDC and contains no repository npm token reference.

## Claims that are not yet supportable

- Do not claim external adoption without a verifiable downstream repository, package usage, maintainer statement, or other public evidence.
- Do not claim external contributors or community pull requests; none were visible at snapshot time.
- Do not treat the four forks as adoption evidence without verifying independent downstream use.
- Do not describe the hygiene score as a security, quality, importance, or production-readiness certification.
- Do not claim long-term maintenance history; the public repository was created on 2026-08-10.
- Do not claim that a tokenless npm publish has completed until the next release exercises the new Trusted Publishing workflow end to end.

## Official program fit

The [official Codex for Open Source page](https://developers.openai.com/community/codex-for-oss) says core maintainers or people who run widely used public projects should apply, and that projects outside neat criteria may still explain their ecosystem importance. It lists six months of ChatGPT Pro with Codex, conditional Codex Security access, and possible API credits.

The [official Program Terms](https://learn.chatgpt.com/docs/codex-for-oss-terms) require a valid ChatGPT account and accurate, complete information. They say OpenAI may consider repository usage, ecosystem importance, active maintenance, role or permissions, and Program capacity; submission does not guarantee selection.

Current fit, separating evidence from inference:

- **Strong evidence:** the repository is public; `kkx94` owns and actively administers it; protected merges and successful CI are visible.
- **Moderate evidence:** 70 stars and 4 forks show early attention, and the project has a public npm release with provenance plus working GitHub releases and issue history.
- **Weak evidence:** the repository is less than two days old, and there are no external human issues or pull requests.
- **Unknown:** OpenAI's current Program capacity, comparative applicant pool, account verification, and any local restrictions.

## Required evidence before applying

1. [x] Merge v0.3.1 readiness changes through protected `main` and record the merged commit plus successful required checks.
2. [x] Harden branch protection and read the settings back through the GitHub API.
3. [x] Add a public, CI-verified Node.js/Python product demo, bilingual project documentation, a GitHub Action adoption path, and a structured intake path for verifiable downstream use.
4. [x] Close Issue #3 with CI-verified custom template overlays and portable update snapshots.
5. [x] Publish `@kkx94/oss-init@0.4.0` through the repository release workflow with provenance.
6. [x] Verify the public npm registry response and execute the exact version with `npx` in a clean directory before the GitHub Release is created.
7. [x] Confirm the versioned installation and GitHub Action instructions against the public package and release after publication.
8. [ ] Collect genuine adoption evidence. Prefer public downstream repositories, unsolicited issues, external pull requests, or maintainer-confirmed use; never fabricate `ADOPTERS.md` entries.
9. [ ] Continue shipping useful, scoped changes through late August and early September so the application shows sustained maintenance rather than a one-day repository burst.
10. [ ] Refresh stars, forks, issues, pull requests, contributors, releases, npm status, branch protection, and CI on the application date.

## Reproduction commands

```bash
# Local candidate
npm test
npm run lint
npm run demo
node bin/oss-init.js check --json
node src/action.js
node scripts/verify-release.js v0.4.0
npm pack --dry-run --json
git diff --check

# Public state
gh repo view kkx94/oss-init --json createdAt,description,forkCount,issues,latestRelease,pullRequests,stargazerCount
gh api repos/kkx94/oss-init/commits/main --jq '.sha'
gh api repos/kkx94/oss-init/branches/main/protection
npm view @kkx94/oss-init version --json
```
