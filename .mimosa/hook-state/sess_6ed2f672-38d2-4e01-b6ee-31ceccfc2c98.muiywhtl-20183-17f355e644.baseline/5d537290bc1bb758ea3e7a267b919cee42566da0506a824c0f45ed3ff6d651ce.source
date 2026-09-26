import assert from 'node:assert/strict'
import {test} from 'node:test'
import {parseCvssVector} from '../agent/src/cvss.ts'

test('parses a classic 9.8 vector into queryable components', () => {
  const c = parseCvssVector('CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H')
  assert.deepEqual(c, {
    attackVector: 'NETWORK',
    attackComplexity: 'LOW',
    privilegesRequired: 'NONE',
    userInteraction: 'NONE',
    scope: 'UNCHANGED',
    confidentialityImpact: 'HIGH',
    integrityImpact: 'HIGH',
    availabilityImpact: 'HIGH',
  })
})

test('parses a network/low-priv/required-UI vector', () => {
  const c = parseCvssVector('CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:H/I:L/A:N')
  assert.ok(c)
  assert.equal(c.privilegesRequired, 'LOW')
  assert.equal(c.userInteraction, 'REQUIRED')
  assert.equal(c.availabilityImpact, 'NONE')
})

test('accepts CVSS 3.0 vectors', () => {
  const c = parseCvssVector('CVSS:3.0/AV:A/AC:H/PR:H/UI:N/S:C/C:L/I:N/A:L')
  assert.ok(c)
  assert.equal(c.attackVector, 'ADJACENT_NETWORK')
  assert.equal(c.scope, 'CHANGED')
})

test('returns null for CVSS v4 and malformed vectors instead of guessing', () => {
  assert.equal(parseCvssVector('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N'), null)
  assert.equal(parseCvssVector('CVSS:3.1/AV:N/AC:L'), null)
  assert.equal(parseCvssVector('not-a-vector'), null)
  assert.equal(parseCvssVector(null), null)
})
