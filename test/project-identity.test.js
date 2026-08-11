import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveProjectIdentity,
  resolveGithubMetadata,
} from '../src/project-identity.js';

test('derives repository and code names from a scoped Node package', () => {
  assert.deepEqual(deriveProjectIdentity('@scope/my-lib', 'node'), {
    packageName: '@scope/my-lib',
    projectName: 'my-lib',
    repoName: 'my-lib',
    jsIdentifier: 'myLib',
    pythonDistribution: null,
    pythonImport: null,
  });
});

test('derives safe JavaScript identifiers from separators, digits, and reserved words', () => {
  assert.equal(deriveProjectIdentity('my.tool_name~cli', 'node').jsIdentifier, 'myToolNameCli');
  assert.equal(deriveProjectIdentity('123-tool', 'node').jsIdentifier, '_123Tool');
  assert.equal(deriveProjectIdentity('class', 'node').jsIdentifier, '_class');
});

test('rejects scoped package syntax for Python', () => {
  assert.throws(
    () => deriveProjectIdentity('@scope/my-lib', 'python'),
    /Python project names cannot use npm scoped syntax/,
  );
});

test('derives valid Python distribution and import names', () => {
  assert.deepEqual(deriveProjectIdentity('my.cool-lib', 'python'), {
    packageName: null,
    projectName: 'my.cool-lib',
    repoName: 'my.cool-lib',
    jsIdentifier: null,
    pythonDistribution: 'my.cool-lib',
    pythonImport: 'my_cool_lib',
  });
  assert.equal(deriveProjectIdentity('123-tool', 'python').pythonImport, '_123_tool');
  assert.equal(deriveProjectIdentity('class', 'python').pythonImport, '_class');
});

test('separates GitHub login from git author name', () => {
  assert.deepEqual(
    resolveGithubMetadata({ ghLogin: 'octocat', gitUserName: 'Jane Doe' }),
    { githubUser: 'octocat', author: 'Jane Doe' },
  );
  assert.deepEqual(
    resolveGithubMetadata({
      ghLogin: '',
      gitUserName: 'Jane Doe',
      explicitGithubUser: 'offline-login',
    }),
    { githubUser: 'offline-login', author: 'Jane Doe' },
  );
});
