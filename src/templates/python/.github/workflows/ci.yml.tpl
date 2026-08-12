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
        python-version: ["3.10", "3.11", "3.12", "3.13"]
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: ${{ matrix.python-version }}
      - run: {{ciInstallCommand}}
      - run: {{ciTestCommand}}
{{ciLintStep}}

  windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-python@v7
        with:
          python-version: "3.13"
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
