'use client'

import {useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'

export type PressArticleView = {
  _id: string
  title: string
  state: string
  byline: string
  body: Array<{_type: string; children?: Array<{_type: string; text: string}>}>
  publishedAt?: string
}

function BlockText({body}: {body: PressArticleView['body']}): React.ReactNode {
  if (!Array.isArray(body)) return String(body ?? '')
  return body.map((b, i) => <p key={i}>{(b.children ?? []).map((c) => c.text).join('')}</p>)
}

export type CandidateView = {ghsaId: string; cveId: string | null; title: string; score: number}

export default function RedactionDesk({
  initialArticles,
  initialCandidates,
  readOnly,
}: {
  initialArticles: PressArticleView[]
  initialCandidates: CandidateView[]
  readOnly: boolean
}) {
  const router = useRouter()
  const [articles] = useState(initialArticles)
  const [candidates] = useState(initialCandidates)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function compose(ghsa: string) {
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/redaction', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ghsa})})
      const json = await res.json()
      setNote(res.ok ? `Composé : « ${json.title} » — état : draft (la machine ne se publie pas elle-même)` : `Erreur : ${json.error}`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function advance(id: string, state: 'review' | 'published') {
    setBusy(true)
    try {
      const res = await fetch('/api/redaction', {method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, state})})
      const json = await res.json()
      if (!res.ok) setNote(`Erreur : ${json.error}`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {readOnly && (
        <div className="notice">
          Read-only newsroom: no SANITY_API_WRITE_TOKEN is set, so composition and workflow are disabled. That is the honest mode —
          the desk refuses to pretend it can print.
        </div>
      )}
      {note && <div className="notice">{note}</div>}

      <div className="desk">
        <h2>The make-list — pick an advisory, the desk composes it</h2>
        <div className="grid">
          {candidates.map((c) => (
            <div className="card" key={c.ghsaId}>
              <span className="badge">{c.score}/10</span>
              <h3 style={{fontSize: 16}}>{c.cveId ?? c.ghsaId} — {c.title.slice(0, 80)}…</h3>
              <button className="print" disabled={busy || readOnly} onClick={() => compose(c.ghsaId)}>
                Composer l&apos;article
              </button>
            </div>
          ))}
        </div>
      </div>

      <h2 className="section-title">On the press <span className="en">— draft → review → published</span></h2>
      {articles.length === 0 && <p className="fineprint">Nothing on the press yet. The paper awaits its editors.</p>}
      {articles.map((a) => (
        <div className="desk" key={a._id}>
          <span className={`state-chip ${a.state}`}>{a.state}</span>
          <h2 style={{fontSize: 20, display: 'inline'}}>{a.title}</h2>
          <p className="fineprint">{a.byline}</p>
          <BlockText body={a.body} />
          {a.state === 'draft' && (
            <button className="print" disabled={busy || readOnly} onClick={() => advance(a._id, 'review')}>
              Send to human review →
            </button>
          )}
          {a.state === 'review' && (
            <button className="print" disabled={busy || readOnly} onClick={() => advance(a._id, 'published')}>
              ✅ Publish (human signature)
            </button>
          )}
          {a.state === 'published' && a.publishedAt && <p className="fineprint">Published {new Date(a.publishedAt).toLocaleString('fr-FR')}</p>}
        </div>
      ))}
      <p className="fineprint" style={{marginTop: 30}}>
        <Link href="/">← Front page</Link>
      </p>
    </>
  )
}
