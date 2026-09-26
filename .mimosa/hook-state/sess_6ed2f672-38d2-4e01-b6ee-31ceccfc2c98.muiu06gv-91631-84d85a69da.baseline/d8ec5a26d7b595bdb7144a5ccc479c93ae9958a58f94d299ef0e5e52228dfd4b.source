'use client'

import {useEffect, useState} from 'react'
import Link from 'next/link'
import {client, writeClient, PRESS_ARTICLES_QUERY} from '../../lib/sanity'

type PressArticle = {
  _id: string
  title: string
  state: string
  byline: string
  body: string
  publishedAt?: string
  basedOn?: {ghsaId: string; cveId: string | null; title: string}
}

const TOP_ADVISORIES_QUERY = `*[_type == "advisory"] | order(severity.baseScore desc) [0...8] {ghsaId, cveId, title, "score": severity.baseScore}`

export default function RedactionPage() {
  const [articles, setArticles] = useState<PressArticle[]>([])
  const [candidates, setCandidates] = useState<{ghsaId: string; cveId: string | null; title: string; score: number}[]>([])
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const readOnly = !writeClient

  async function refresh() {
    setArticles(await client.fetch<PressArticle[]>(PRESS_ARTICLES_QUERY))
    setCandidates(await client.fetch(TOP_ADVISORIES_QUERY))
  }
  useEffect(() => {
    refresh()
  }, [])

  async function compose(ghsa: string) {
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/redaction', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ghsa})})
      const json = await res.json()
      setNote(res.ok ? `Composé : « ${json.title} » — état : draft (la machine ne se publie pas elle-même)` : `Erreur : ${json.error}`)
      await refresh()
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
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <h2 className="section-title">La rédaction <span className="en">— the machine composes, only a human advances the workflow</span></h2>
      {readOnly && (
        <div className="notice">
          Read-only newsroom: no SANITY_API_WRITE_TOKEN is set, so composition and workflow are disabled. That is the honest mode —
          the desk refuses to pretend it can print.
        </div>
      )}
      {note && <div className="notice">{note}</div>}

      <div className="desk">
        <h2>Ordre de fabrication — pick an advisory, the desk composes it</h2>
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

      <h2 className="section-title">Tirage en cours <span className="en">— draft → review → published</span></h2>
      {articles.length === 0 && <p className="fineprint">Aucun article en composition. Le journal attend la rédaction.</p>}
      {articles.map((a) => (
        <div className="desk" key={a._id}>
          <span className={`state-chip ${a.state}`}>{a.state}</span>
          <h2 style={{fontSize: 20, display: 'inline'}}>{a.title}</h2>
          <p className="fineprint">{a.byline}</p>
          <p style={{whiteSpace: 'pre-wrap'}}>{a.body}</p>
          {a.state === 'draft' && (
            <button className="print" disabled={busy || readOnly} onClick={() => advance(a._id, 'review')}>
              Passer en revue humaine →
            </button>
          )}
          {a.state === 'review' && (
            <button className="print" disabled={busy || readOnly} onClick={() => advance(a._id, 'published')}>
              ✅ Publier (signature humaine)
            </button>
          )}
          {a.state === 'published' && a.publishedAt && <p className="fineprint">Publié le {new Date(a.publishedAt).toLocaleString('fr-FR')}</p>}
        </div>
      ))}
      <p className="fineprint" style={{marginTop: 30}}>
        <Link href="/">← La une</Link>
      </p>
    </main>
  )
}
