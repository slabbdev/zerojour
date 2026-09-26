import assert from 'node:assert/strict'
import {test} from 'node:test'
import {keywordSearch, type Corpus} from '../agent/src/baseline.ts'

const corpus: Corpus = {
  products: [
    {_id: 'product-npm-axios', name: 'axios', ecosystem: 'npm'},
    {_id: 'product-npm-lodash', name: 'lodash', ecosystem: 'npm'},
  ],
  advisories: [
    {
      _id: 'advisory-A',
      ghsaId: 'GHSA-aaaa',
      cveId: 'CVE-2020-28168',
      title: 'SSRF in axios',
      summary: 'Server-side request forgery when following redirects with a proxy.',
      product: {_ref: 'product-npm-axios'},
      severity: {baseScore: 9.8},
    },
    {
      _id: 'advisory-B',
      ghsaId: 'GHSA-bbbb',
      cveId: 'CVE-2021-23337',
      title: 'Command injection in lodash template',
      summary: 'Command injection via the template function.',
      product: {_ref: 'product-npm-lodash'},
      severity: {baseScore: 7.2},
    },
  ],
  cwes: [],
}

test('exact CVE match outranks weak mentions', () => {
  const hits = keywordSearch(corpus, 'CVE-2020-28168', 5)
  assert.equal(hits[0].ghsaId, 'GHSA-aaaa')
})

test('plain keyword query ranks the matching advisory first', () => {
  const hits = keywordSearch(corpus, 'lodash command injection template', 5)
  assert.equal(hits[0].ghsaId, 'GHSA-bbbb')
})

test('returns nothing for unrelated queries instead of pretending', () => {
  const hits = keywordSearch(corpus, 'eurorack modular planner', 5)
  assert.deepEqual(hits, [])
})
