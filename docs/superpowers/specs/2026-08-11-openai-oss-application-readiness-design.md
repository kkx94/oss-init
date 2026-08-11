# oss-init OpenAI OSS Application Readiness Design

Date: 2026-08-11  
Target application date: 2026-09-10  
Status: Approved direction; written specification awaiting final user review

## Objective

Prepare `oss-init` to make a credible Codex for Open Source application by
September 10, 2026. The work prioritizes verifiable installability, safe
behavior, release integrity, active maintenance, and genuine downstream use
over adding unrelated features.

The project should be able to demonstrate that it is a real maintained tool,
not merely a repository with community files and self-reported scores.

## Success Criteria

### Product and release readiness

- The public npm package `@kkx94/oss-init` is installable in a clean
  environment and reports the expected version.
- A newly generated Node project and a newly generated Python project pass
  their own tests on supported platforms.
- Scoped Node package names either generate valid code and repository metadata
  or fail with a precise actionable error.
- Python input rejects npm-only scoped names instead of generating invalid
  package and test paths.
- `oss-init update` rejects malformed or unsafe manifests before rendering or
  writing, preserves user changes by default, and records an explicit manifest
  schema version and generator version.
- Generated documentation and workflows reference the real `kkx94/oss-init`
  repository and do not repeat release defects fixed in the parent project.

### Engineering and governance readiness

- CI exercises supported Node versions and at least Windows and Linux paths.
- One stable aggregate check named `CI` is the required branch-protection
  context and actually runs on pull requests and `main` pushes.
- Release jobs fail when publication fails or credentials are unavailable;
  they cannot report success after silently skipping npm publication.
- Release tags match the package version, and release verification includes
  tests, syntax checks, and package-content inspection.
- GitHub Actions permissions are minimal, and third-party workflow dependencies
  have an explicit update or pinning policy.
- Changes are merged through a pull request with passing checks. Branch
  protection is strict and applies to administrators, with an emergency bypass
  retained only if GitHub requires one.

### Application evidence readiness

- The repository maintains a dated evidence record containing releases,
  install verification, downstream repositories, external issues or pull
  requests, npm download evidence, and maintenance activity.
- `ADOPTERS.md` is created only after at least one independently controlled
  public project is verified to use the tool.
- The final application explains the ecosystem problem, the project's specific
  bilingual and maintenance value, the maintainer's role, and how Codex will be
  used for core OSS maintenance.
- No purchased, automated, or otherwise unverifiable popularity signal is used
  as primary application evidence.

## Scope

### Phase 1: v0.3.1 correctness and safety

1. Preserve and finish the current uncommitted CI, release, and updater work.
2. Replace the single overloaded project name with derived values that have
   explicit purposes:
   - package name;
   - repository name;
   - JavaScript identifier;
   - Python distribution name;
   - Python import name.
3. Resolve the GitHub login through `gh api user` when available and support an
   explicit offline value rather than assuming `git user.name` is a login.
4. Introduce a manifest schema validator before render. Reject invalid shape,
   unsupported language/options, invalid hashes, unsafe relative paths, and
   invalid path-derived values.
5. Store `schemaVersion` separately from the installed generator version.
6. Guarantee temporary-directory cleanup on every success and failure path.
7. Remove the personal `opencode.json` from the public product repository and
   ignore it. A sanitized example may be kept only if it has contributor value.
8. Correct stale template links, README wording, sample output, changelog dates,
   and repository metadata.

### Phase 2: CI and release integrity

1. Test supported Node releases rather than EOL Node 18 and Node 20.
2. Add a bounded cross-platform matrix: full version coverage on Linux and a
   representative supported version on Windows. macOS may be added only when a
   concrete path or shell behavior requires it.
3. Add a stable aggregate `CI` job and verify its check-run name through the
   GitHub API after push.
4. Make both the project's release workflow and generated Node release workflow
   fail closed.
5. Verify the tag/package-version relationship before publication.
6. Add npm package inspection and provenance. Prefer npm Trusted Publishing
   after the package exists and the npm account can configure the publisher.
7. Apply least-privilege workflow permissions and a policy for pinned Actions.

### Phase 3: publication and live acceptance

1. Merge the v0.3.1 pull request after all required checks pass.
2. Publish `@kkx94/oss-init` only after clean-install acceptance passes locally.
3. Confirm through the public registry, not the local npm cache:
   - package version;
   - package ownership;
   - package integrity metadata;
   - `npx @kkx94/oss-init --version` in a clean directory.
4. Create the GitHub tag and Release only when npm publication and public
   read-back are successful. Avoid a fourth GitHub-only release.

The machine is not currently authenticated to npm. Codex may prepare and run
all non-sensitive steps. If npm requires web login, account creation, password,
or two-factor confirmation, the maintainer must perform that single identity
step; credentials must not be placed in chat, source, logs, or configuration.

### Phase 4: genuine adoption and application package

1. Publish a concise usage demonstration and a verified generated-project
   example.
2. Invite maintainers of small public Node and Python projects to try the tool.
   Do not mass-message or post through unrelated accounts.
3. Provide a GitHub Discussion or issue path for adoption reports and feedback.
4. Verify downstream claims before adding them to application evidence.
5. Prepare a self-contained application draft and evidence appendix during the
   first week of September.

## Architecture and Data Flow

### Name derivation

CLI input is parsed once into a project identity object. Language-specific
validators derive safe identifiers. Rendering receives explicit values and
never derives filesystem paths from an ambiguous package name.

```text
CLI input -> identity validation -> language-specific derived values
          -> template render -> containment check -> filesystem write
```

### Manifest update

The updater validates the entire manifest before creating a temporary render
directory. Rendered paths and destination paths pass the same containment
function. Hash comparison determines update, preserve, add, or retire actions.

```text
.oss-init.json -> schema validation -> safe temporary render
               -> path containment -> hash comparison -> planned operations
               -> dry-run report OR atomic per-file writes -> new manifest
```

Unsafe or unsupported input fails before any target file is changed. A cleanup
`finally` block removes temporary artifacts after all code paths.

### Release flow

```text
PR -> matrix tests -> aggregate CI -> protected merge
   -> version/tag validation -> test/lint/pack -> npm publish
   -> public registry read-back -> GitHub Release
```

No stage treats command completion as proof of a later external result.

## Error Handling

- Validation errors include the field or path and a safe remediation.
- Missing `git` or `gh` is reported without claiming that GitHub creation
  succeeded.
- GitHub authentication and npm authentication failures remain distinct.
- An npm release cannot be marked successful when publication was skipped.
- Partial external success is reported precisely. Retrying a release must not
  republish an already existing npm version without an explicit idempotency
  check.
- Destructive update actions require either an unchanged manifest hash or the
  explicit `--force` flag.

## Testing Strategy

Implementation follows test-first changes for every behavior modification.

Required additions include:

- scoped Node identity and generated-code acceptance;
- scoped Python rejection;
- GitHub login/repository-name separation;
- malformed but syntactically valid manifest shapes;
- unsupported manifest schema versions;
- unsafe manifest values and rendered-path escape attempts;
- temporary cleanup after render and update failures;
- retired-file preservation and forced deletion;
- generated template repository links and release fail-closed behavior;
- tag/package-version mismatch failure;
- clean package installation and executable invocation;
- Windows path and command execution coverage.

Acceptance requires the full local suite, syntax checks, package dry-run,
generated Node tests, generated Python tests, GitHub Actions success, and public
npm registry read-back after publication.

## Delivery and Change Boundaries

- Existing user changes are preserved and reviewed before integration.
- Implementation occurs on a dedicated branch and is merged through a PR.
- No credential is requested in chat or written to the repository.
- GitHub pushes, PRs, branch protection, tags, and Releases are authorized by
  the maintainer.
- Live npm publication is authorized, but it remains conditional on a secure
  authenticated npm identity being available.
- External promotion outside the repository requires a separate concrete
  channel and target; this design does not authorize posting from personal
  social accounts.

## Schedule

- August 11-16: v0.3.1 correctness, safety, CI, and release work.
- August 17-20: npm authentication boundary, first publication, and live
  acceptance.
- August 21-31: verified downstream trials and external feedback.
- September 1-5: evidence audit and application draft.
- September 6-8: freeze application evidence and perform final review.
- Around September 10: maintainer submits the application.

## Explicit Non-Goals Before Application

- `--template` custom template directories without demonstrated user demand.
- A Go template added only to increase feature count.
- A documentation website when the README and generated examples are adequate.
- Artificial stars, scripted adoption reports, or self-authored activity used
  as community evidence.
- Large internal refactors that do not improve correctness, release integrity,
  adoption, or application evidence.
