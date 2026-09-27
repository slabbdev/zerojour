import Link from 'next/link'
import {frontPage, type Advisory} from '../lib/sanity'

function Card({a, kind = 'Dispatch'}: {a: Advisory; kind?: string}) {
  const score = a.severity?.baseScore ?? null
  return (
    <Link href={`/advisory/${a.ghsaId}`} style={{textDecoration: 'none'}}>
      <div className="card">
        <span className={`badge ${a.exploitMaturity === 'known_exploited' ? 'kev' : a.fix.status === 'no_fix' ? 'nofix' : ''}`}>
          {a.exploitMaturity === 'known_exploited' ? 'Front page · actively exploited' : a.fix.status === 'no_fix' ? 'No remedy' : kind}
        </span>
        <h3>{a.title}</h3>
        <div className="meta">
          {a.cveId ?? a.ghsaId} · {a.productName} ({a.ecosystem}) · {a.published?.slice(0, 10)}
        </div>
        <div className="score">
          {score ?? '—'}
          <small> / CVSS {a.severity?.vector ? '3.x' : 'n/a'}</small>
        </div>
        <div className="meta">
          {a.fix.fixedVersion ? `Fix: upgrade to ${a.fix.fixedVersion}` : 'No fix published'}
        </div>
      </div>
    </Link>
  )
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const fp = await frontPage()
  const {kev, worst, highSeverity, latest, stats} = fp as {
    kev: Advisory[]
    worst: Advisory[]
    highSeverity: Advisory[]
    latest: Advisory[]
    stats: {advisories: number; products: number; kev: number; noFix: number}
  }
  return (
    <main>
      {kev.length > 0 && (
        <>
          <h2 className="section-title">Front page <span className="en">— listed in the CISA KEV catalog: treat as actively exploited</span></h2>
          <div className="grid">{kev.map((a) => <Card key={a._id} a={a} />)}</div>
        </>
      )}
      {worst.length > 0 && (
        <>
          <h2 className="section-title">No remedy <span className="en">— no published fix; upgrading cannot close these</span></h2>
          <div className="grid">{worst.map((a) => <Card key={a._id} a={a} />)}</div>
        </>
      )}
      <h2 className="section-title">Highest severity <span className="en">— CVSS base score 8.0 and above</span></h2>
      <div className="grid">{highSeverity.map((a) => <Card key={a._id} a={a} />)}</div>
      <h2 className="section-title">Latest dispatches <span className="en">— newest advisories in the dataset</span></h2>
      <div className="grid">{latest.map((a) => <Card key={a._id} a={a} />)}</div>
      <p className="fineprint" style={{marginTop: 26}}>
        Edition #{stats?.advisories} — {stats?.products} packages tracked, {stats?.kev} actively exploited, {stats?.noFix} without a fix.
        <Link href="/redaction"> The newsroom →</Link>
      </p>
    </main>
  )
}
