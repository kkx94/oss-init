{
  "name": "{{packageName}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "type": "module",
  "main": "src/index.js",
  "files": [
    "src"
  ],
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "test": "node --test",
    "lint": "node --check src/index.js && node --check test/index.test.js"
  },
  "keywords": [],
  "license": "{{licenseId}}",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/{{githubUser}}/{{repoName}}.git"
  },
  "homepage": "https://github.com/{{githubUser}}/{{repoName}}#readme",
  "bugs": {
    "url": "https://github.com/{{githubUser}}/{{repoName}}/issues"
  },
  "dependencies": {},
  "devDependencies": {}
}
