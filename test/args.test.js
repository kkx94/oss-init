import test from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs, helpText } from '../src/args.js';

test('parses value flags with separate value', () => {
  const { options, positionals, errors, explicitFlags } = parseArgs([
    '--lang',
    'node',
    'my-app',
  ]);
  assert.deepEqual(errors, []);
  assert.equal(options.lang, 'node');
  assert.deepEqual(positionals, ['my-app']);
  assert.deepEqual(explicitFlags, ['lang']);
});

test('parses value flags with inline value', () => {
  const { options, errors } = parseArgs(['--docs=zh']);
  assert.deepEqual(errors, []);
  assert.equal(options.docs, 'zh');
});

test('parses boolean flags', () => {
  const { options, errors } = parseArgs(['--ci', '--publish', '--force']);
  assert.deepEqual(errors, []);
  assert.equal(options.ci, true);
  assert.equal(options.publish, true);
  assert.equal(options.force, true);
});

test('applies defaults', () => {
  const { options } = parseArgs([]);
  assert.equal(options.lang, 'node');
  assert.equal(options.license, 'mit');
  assert.equal(options.docs, 'bilingual');
  assert.equal(options.ci, false);
  assert.equal(options.publish, false);
  assert.equal(options.force, false);
});

test('rejects unknown long flags', () => {
  const { errors } = parseArgs(['--bogus']);
  assert.ok(errors.some((e) => e.includes('Unknown option: --bogus')));
});

test('rejects unknown short flags', () => {
  const { errors } = parseArgs(['-z']);
  assert.ok(errors.some((e) => e.includes('Unknown option: -z')));
});

test('rejects invalid value for constrained flag', () => {
  const { errors } = parseArgs(['--lang', 'rust']);
  assert.ok(errors.some((e) => e.includes('Invalid value for --lang')));
});

test('rejects missing value for value flag', () => {
  const { errors } = parseArgs(['--name']);
  assert.ok(errors.some((e) => e.includes('requires a value')));
});

test('rejects value for boolean flag', () => {
  const { errors } = parseArgs(['--ci=yes']);
  assert.ok(errors.some((e) => e.includes('does not take a value')));
});

test('handles aliases', () => {
  const { options, errors } = parseArgs(['-f', '-h']);
  assert.deepEqual(errors, []);
  assert.equal(options.force, true);
  assert.equal(options.help, true);
});

test('treats "--" as positionals separator', () => {
  const { positionals, errors } = parseArgs(['--', '--not-a-flag']);
  assert.deepEqual(errors, []);
  assert.deepEqual(positionals, ['--not-a-flag']);
});

test('help text mentions key flags', () => {
  const text = helpText();
  assert.match(text, /--lang/);
  assert.match(text, /--docs/);
  assert.match(text, /--ci/);
  assert.match(text, /--version/);
});
