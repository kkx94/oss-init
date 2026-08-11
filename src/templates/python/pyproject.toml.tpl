[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "{{pythonDistribution}}"
version = "0.1.0"
description = "{{description}}"
readme = "README.md"
requires-python = ">=3.10"
license = "{{licenseId}}"
authors = [
  { name = "{{author}}" }
]
keywords = []
dependencies = []

[project.optional-dependencies]
dev = [
  "pytest>=8",
  "build>=1",
]

[project.urls]
Homepage = "https://github.com/{{githubUser}}/{{repoName}}"
Issues = "https://github.com/{{githubUser}}/{{repoName}}/issues"

[tool.hatch.build.targets.wheel]
packages = ["src/{{pythonImport}}"]

[tool.pytest.ini_options]
testpaths = ["tests"]
