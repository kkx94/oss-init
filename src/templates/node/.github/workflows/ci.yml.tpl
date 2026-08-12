name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [22.x, 24.x]
    steps:
      - uses: actions/checkout@v7
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v7
        with:
          node-version: ${{ matrix.node-version }}
      - run: {{ciInstallCommand}}
      - run: {{ciTestCommand}}
{{ciLintStep}}

  windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24.x
      - run: {{ciInstallCommand}}
      - run: {{ciTestCommand}}
{{ciLintStep}}

  CI:
    name: CI
    runs-on: ubuntu-latest
    needs: [test, windows]
    if: always()
    steps:
      - name: Require every test job
        if: ${{ needs.test.result != 'success' || needs.windows.result != 'success' }}
        run: exit 1
      - run: echo "All required test jobs passed."
