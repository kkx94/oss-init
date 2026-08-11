name: Release

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24.x
          registry-url: https://registry.npmjs.org/
      - name: Verify tag matches package version
        run: node -e "const p=require('./package.json'); if (process.env.GITHUB_REF_NAME !== 'v' + p.version) { console.error('Tag/version mismatch'); process.exit(1) }"
      - name: Require npm publication credential
        run: test -n "$NODE_AUTH_TOKEN"
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - run: npm test
      - run: npm run lint
      - run: npm pack --dry-run --json
      - name: Publish to npm
        run: npm publish --access public --provenance
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - name: Verify public npm registry
        shell: bash
        env:
          PACKAGE_NAME: "{{packageName}}"
        run: |
          expected="${GITHUB_REF_NAME#v}"
          for attempt in {1..12}; do
            actual="$(npm view "$PACKAGE_NAME@$expected" version --registry=https://registry.npmjs.org/ 2>/dev/null || true)"
            if [ "$actual" = "$expected" ]; then
              exit 0
            fi
            sleep 10
          done
          echo "Package version did not become visible on the public npm registry."
          exit 1
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
