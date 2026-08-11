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
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: python -m pip install -e ".[dev]"
      - run: python -m unittest discover -s tests

  windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"
      - run: python -m pip install -e ".[dev]"
      - run: python -m unittest discover -s tests

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
