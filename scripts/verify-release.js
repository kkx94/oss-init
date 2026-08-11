import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_PACKAGE = '@kkx94/oss-init';

function parseArguments(argv) {
  let tag = '';
  let packagePath = 'package.json';
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--package') {
      packagePath = argv[index + 1];
      if (!packagePath) throw new Error('Option --package requires a path.');
      index += 1;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (!tag) {
      tag = arg;
    } else {
      throw new Error(`Unexpected argument: ${arg}`);
    }
  }
  if (!tag) {
    throw new Error('Usage: node scripts/verify-release.js <tag> [--package <package.json>]');
  }
  return { tag, packagePath };
}

export function verifyRelease({ tag, packagePath }) {
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(resolve(packagePath), 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read package metadata: ${error.message}`);
  }
  if (pkg.name !== EXPECTED_PACKAGE) {
    throw new Error(`Package name is ${JSON.stringify(pkg.name)}; expected ${EXPECTED_PACKAGE}.`);
  }
  if (typeof pkg.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(pkg.version)) {
    throw new Error('package.version must be a semantic version.');
  }
  const expectedTag = `v${pkg.version}`;
  if (tag !== expectedTag) {
    throw new Error(`Tag ${JSON.stringify(tag)} does not match package version ${pkg.version}; expected ${expectedTag}.`);
  }
  return `${pkg.name}@${pkg.version}`;
}

export function main(argv = process.argv.slice(2)) {
  try {
    const result = verifyRelease(parseArguments(argv));
    process.stdout.write(`Verified release ${result}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
}

const isEntryPoint = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntryPoint) process.exitCode = main();
