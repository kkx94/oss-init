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
      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"
      - name: Verify tag matches project version
        run: python -c "import os,tomllib; p=tomllib.load(open('pyproject.toml','rb'))['project']; assert os.environ['GITHUB_REF_NAME'] == 'v' + p['version'], 'tag/version mismatch'"
      - run: python -m pip install --upgrade build
      - run: python -m pip install -e ".[dev]"
      - run: python -m unittest discover -s tests
      - run: python -m build
      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
      - name: Verify public PyPI registry
        env:
          PACKAGE_NAME: "{{pythonDistribution}}"
        run: |
          python - <<'PY'
          import json
          import os
          import time
          import urllib.error
          import urllib.parse
          import urllib.request

          name = urllib.parse.quote(os.environ["PACKAGE_NAME"], safe="")
          version = os.environ["GITHUB_REF_NAME"].removeprefix("v")
          url = f"https://pypi.org/pypi/{name}/{version}/json"
          for _ in range(12):
              try:
                  with urllib.request.urlopen(url, timeout=10) as response:
                      if response.status == 200:
                          json.load(response)
                          raise SystemExit(0)
              except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                  pass
              time.sleep(10)
          raise SystemExit("Package version did not become visible on public PyPI")
          PY
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
