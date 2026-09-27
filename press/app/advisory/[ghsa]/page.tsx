import Link from 'next/link'
import {notFound} from 'next/navigation'
import {advisoryByGhsa} from '../../../lib/sanity'

export const dynamic = 'force-dynamic'

const WIDGETS: {key: string; label: string}[] = [
  {key: 'attackVector', label: 'Vector'},
  {key: 'attackComplexity', label: 'Complexity'},
  {key: 'privilegesRequired', label: 'Privileges'},
  {key: 'userInteraction', label: 'Interaction'},
  {key: 'scope', label: 'Scope'},
  {key: 'confidentialityImpact', label: 'Confidentiality'},
  {key: 'integrityImpact', label: 'Integrity'},
  {key: 'availabilityImpact', label: 'Availability'},
]

export default async function AdvisoryPage({params}: {params: Promise<{ghsa: string}>}) {
  const {ghsa} = await params
  const a = await advisoryByGhsa(decodeURIComponent(ghsa))
  if (!a) notFound()
  const c = a.severity?.components
  return (
    <main>
      <article className="article">
        <div className="meta" style={{color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: 12}}>
          {a.exploitMaturity === 'known_exploited' ? 'Front page — actively exploited · ' : ''}
          {a.fix.status === 'no_fix' ? 'No remedy · ' : ''}
          {a.productName} ({a.ecosystem}) · published {a.published?.slice(0, 10)}
        </div>
        <h1 style={{fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.15}}>{a.title}</h1>
        <div className="lead">
          {a.cveId ?? a.ghsaId} — CVSS {a.severity?.baseScore ?? '—'}/10.{' '}
          {a.fix.fixedVersion ? `Fix: upgrade to ${a.fix.fixedVersion}.` : 'No fix has been published yet.'}
        </div>
        <div className="widgets">
          <div className="widget"><div className="k">Package</div><div className="v">{a.productName}</div></div>
          <div className="widget"><div className="k">Ecosystem</div><div className="v">{a.ecosystem}</div></div>
          {WIDGETS.map(({key, label}) =>
            c?.[key as keyof typeof c] ? (
              <div className="widget" key={key}>
                <div className="k">{label}</div>
                <div className="v">{String(c[key as keyof typeof c])}</div>
              </div>
            ) : null,
          )}
        </div>
        {a.details && a.details.split('\n').filter(Boolean).slice(0, 12).map((p, i) => <p key={i}>{p.replace(/^#+\s*/, '')}</p>)}
        {a.cwe && a.cwe.length > 0 && (
          <p className="fineprint">
            Weakness classes: {a.cwe.map((w) => `${w.cweId} (${w.name})`).join(' · ')}
          </p>
        )}
        <p className="fineprint">
          Source: <a href={a.sourceUrl ?? '#'} target="_blank" rel="noreferrer">{a.ghsaId}</a> · GitHub Advisory Database (CC-BY-4.0)
          {a.exploitMaturity === 'known_exploited' ? ' · CISA KEV' : ''} — printed from a structured Sanity dataset.
          {' '}<Link href="/">← Back to the front page</Link>
        </p>
      </article>
    </main>
  )
}
