import RedactionDesk from './Desk'
import {client, PRESS_ARTICLES_QUERY, writeClient} from '../../lib/sanity'

export const dynamic = 'force-dynamic'

export default async function RedactionPage() {
  // Data comes from the server (the public dataset needs no token); the client
  // side only drives the workflow mutations through /api/redaction.
  const [articles, candidates] = await Promise.all([
    client.fetch(PRESS_ARTICLES_QUERY),
    client.fetch('*[_type == "advisory"] | order(severity.baseScore desc) [0...6] {ghsaId, cveId, title, "score": severity.baseScore}'),
  ])
  return (
    <main>
      <h2 className="section-title">La rédaction <span className="en">— the machine composes, only a human advances the workflow</span></h2>
      <RedactionDesk initialArticles={articles ?? []} initialCandidates={candidates ?? []} readOnly={!writeClient} />
    </main>
  )
}
