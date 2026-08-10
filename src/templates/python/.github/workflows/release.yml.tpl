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
    environment: pypi
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install build tooling
        run: |
          python -m pip install --upgrade pip
          pip install build
      - name: Run tests
        run: |
          pip install -e ".[dev]"
          python -m unittest discover -s tests
      - name: Build distributions
        run: python -m build
      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
