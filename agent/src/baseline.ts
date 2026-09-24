// The "before" picture: plain keyword search over the same corpus, flat text,
// no structure. Whatever structure the data has (version ranges, CVSS
// components, fix status) is invisible to this path — that is the point.

import {readFileSync} from 'node:fs'

export type AdvisoryRow = {
  _id: string
  ghsaId: string
  cveId: string | null
  title: string
  summary: string
  details?: string | null
  product: {_ref: string}
  severity?: {baseScore?: number | null; vector?: string | null}
  fix?: {status?: string; fixedVersion?: string | null}
  published?: string
  [key: string]: unknown
}

export type ProductRow = {_id: string; name: string; ecosystem: string; [key: string]: unknown}

export type Corpus = {advisories: AdvisoryRow[]; products: ProductRow[]; cwes: {_id: string; cweId: string; name: string}[]}

export function loadCorpus(dir = 'seed/data'): Corpus {
  const read = (file: string) =>
    readFileSync(`${dir}/${file}`, 'utf8')
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l))
  return {advisories: read('advisories.jsonl'), products: read('products.jsonl'), cwes: read('cwes.jsonl')}
}

export function productName(corpus: Corpus, ref: string): string {
  return corpus.products.find((p) => p._id === ref)?.name ?? ref
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9.]+/).filter((t) => t.length > 1)
}

export function keywordSearch(corpus: Corpus, query: string, topK = 5) {
  const tokens = tokenize(query)
  const productNames = new Map(corpus.products.map((p) => [p._id, p.name.toLowerCase()]))
  const hits = corpus.advisories
    .map((a) => {
      const pName = productName(corpus, a.product._ref)
      const text = `${a.title} ${a.summary} ${pName} ${a.cveId ?? ''} ${a.ghsaId}`.toLowerCase()
      let score = 0
      for (const token of tokens) {
        const occurrences = text.split(token).length - 1
        if (!occurrences) continue
        let weight = occurrences
        if ((a.cveId ?? '').toLowerCase() === token || a.ghsaId.toLowerCase() === token) weight += 5
        if (token === pName.toLowerCase()) weight += 3
        score += weight
      }
      return {ghsaId: a.ghsaId, cveId: a.cveId, title: a.title, product: pName, baseScore: a.severity?.baseScore ?? null, score}
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
  return hits
}

export function baselineContext(corpus: Corpus, query: string, topK = 5): string {
  const hits = keywordSearch(corpus, query, topK)
  if (!hits.length) return 'KEYWORD SEARCH RESULTS: (no match)'
  const lines = hits.map(
    (h, i) => `${i + 1}. [${h.ghsaId}${h.cveId ? ` / ${h.cveId}` : ''}] (${h.product}, base score ${h.baseScore ?? 'n/a'}) ${h.title}`,
  )
  return `KEYWORD SEARCH RESULTS (flat text, no structure):\n${lines.join('\n')}`
}
