// Runs every eval question through BOTH paths — the structured agent (Sanity
// Context) and the naive keyword-search baseline — and prints a comparison
// table. Results are sealed into NoireBox as eval_result events.

import {ask, naive} from '../agent/src/main.ts'
import {keywordSearch, loadCorpus} from '../agent/src/baseline.ts'
import {loadConfig, requireAgentModel} from '../agent/src/config.ts'
import {NoireBoxJournal} from '../agent/src/noirebox.ts'
import {connectSanityContext} from '../agent/src/mcp.ts'
import {QUESTIONS} from './questions.ts'

function containsToken(answer: string, tokens: string[]): string | null {
  const lower = answer.toLowerCase()
  for (const token of tokens) {
    if (token.length > 2 && lower.includes(token.toLowerCase())) return token
  }
  return null
}

async function main() {
  const cfg = loadConfig()
  requireAgentModel(cfg)
  const corpus = loadCorpus()
  const journal = new NoireBoxJournal(cfg)
  const sanity = await connectSanityContext(cfg)
  await sanity.client.close() // connectivity check up front — fail fast before running the suite

  const rows: {
    id: string
    kind: string
    gtCount: number
    naiveHit: boolean
    naiveToken: string | null
    naiveCoverage: string
    structuredHit: boolean
    structuredToken: string | null
    steps: number
  }[] = []

  for (const q of QUESTIONS) {
    const gt = q.gt(corpus)
    if (!gt.expectedTokens.length) {
      console.log(`\n${q.id}: ground truth is empty — skipping (${gt.note})`)
      continue
    }

    const hits = keywordSearch(corpus, q.question, 5)
    const hitIds = new Set(hits.map((h) => h.ghsaId))
    const coverage = gt.advisoryIds.length
      ? `${gt.advisoryIds.filter((id) => hitIds.has(id.replace('advisory-', ''))).length}/${gt.advisoryIds.length}`
      : 'n/a'

    const naiveResult = await naive(q.question)
    const structuredResult = await ask(q.question)

    const naiveToken = containsToken(naiveResult.answer, gt.expectedTokens)
    const structuredToken = containsToken(structuredResult.answer, gt.expectedTokens)

    rows.push({
      id: q.id,
      kind: q.kind,
      gtCount: gt.advisoryIds.length,
      naiveHit: naiveToken !== null,
      naiveToken,
      naiveCoverage: coverage,
      structuredHit: structuredToken !== null,
      structuredToken,
      steps: structuredResult.steps.length,
    })

    console.log(`\n=== ${q.id} (${q.kind}) — ${gt.note}`)
    console.log(`  ground truth: ${gt.advisoryIds.length} decisive doc(s), tokens: ${gt.expectedTokens.slice(0, 4).join(', ')}`)
    console.log(`  naive:      hit=${naiveToken !== null}${naiveToken ? ` (${naiveToken})` : ''}  keyword-hits coverage of decisive docs: ${coverage}`)
    console.log(`  structured: hit=${structuredToken !== null}${structuredToken ? ` (${structuredToken})` : ''}  tool steps: ${structuredResult.steps.length}`)
    console.log(`  --- naive answer:\n${naiveResult.answer.slice(0, 600)}`)
    console.log(`  --- structured answer:\n${structuredResult.answer.slice(0, 600)}`)

    await journal.seal('eval_result', {
      questionId: q.id,
      question: q.question,
      kind: q.kind,
      expectedTokens: gt.expectedTokens,
      naiveHit: naiveToken !== null,
      structuredHit: structuredToken !== null,
      keywordCoverage: coverage,
    })
  }

  const naivePass = rows.filter((r) => r.naiveHit).length
  const structuredPass = rows.filter((r) => r.structuredHit).length
  console.log(`\n===== SUMMARY: naive ${naivePass}/${rows.length} — structured ${structuredPass}/${rows.length} =====`)
  console.log('Verdicts are automated token containment against independently computed ground truth; review the transcripts manually before publishing.')
  await journal.seal('eval_summary', {naivePass, structuredPass, total: rows.length})
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
