import assert from 'node:assert/strict'
import {test} from 'node:test'
import {versionInRange} from '../agent/src/tools.ts'

test('introduced inclusive, fixed exclusive (GitHub Advisory semantics)', () => {
  assert.equal(versionInRange({version: '1.2.0', introduced: '1.0.0', fixed: '1.18.0'}), true)
  assert.equal(versionInRange({version: '1.18.0', introduced: '1.0.0', fixed: '1.18.0'}), false)
  assert.equal(versionInRange({version: '0.9.0', introduced: '1.0.0', fixed: '1.18.0'}), false)
})

test('lastAffected is inclusive (no-fix advisories)', () => {
  assert.equal(versionInRange({version: '2.15.0', lastAffected: '2.15.0'}), true)
  assert.equal(versionInRange({version: '2.15.1', lastAffected: '2.15.0'}), false)
})

test('handles loose versions and prefixes', () => {
  assert.equal(versionInRange({version: 'v1.2', introduced: '1.0.0', fixed: '1.18.0'}), true)
  assert.equal(versionInRange({version: 'garbage', introduced: '1.0.0'}), false)
})

test('lexicographic comparison is exactly what we are avoiding', () => {
  // "1.10.0" < "1.9.0" as strings; semver must disagree with that.
  assert.equal(versionInRange({version: '1.9.0', introduced: '1.0.0', fixed: '1.10.0'}), true)
})
