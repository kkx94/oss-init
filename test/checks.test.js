import test from 'node:test'
import assert from 'node:assert/strict'

import { readmeSubstanceStatus } from '../src/checks.js'

test('README substance check preserves the existing English thresholds', () => {
  assert.equal(readmeSubstanceStatus('word '.repeat(200)), 'pass')
  assert.equal(readmeSubstanceStatus('word '.repeat(50)), 'warn')
  assert.equal(readmeSubstanceStatus('word '.repeat(49)), 'fail')
})

test('README substance check measures Chinese prose without whitespace', () => {
  assert.equal(readmeSubstanceStatus('开'.repeat(300)), 'pass')
  assert.equal(readmeSubstanceStatus('开'.repeat(80)), 'warn')
  assert.equal(readmeSubstanceStatus('开'.repeat(79)), 'fail')
})

test('README substance check handles missing content', () => {
  assert.equal(readmeSubstanceStatus(null), 'fail')
  assert.equal(readmeSubstanceStatus(''), 'fail')
})
