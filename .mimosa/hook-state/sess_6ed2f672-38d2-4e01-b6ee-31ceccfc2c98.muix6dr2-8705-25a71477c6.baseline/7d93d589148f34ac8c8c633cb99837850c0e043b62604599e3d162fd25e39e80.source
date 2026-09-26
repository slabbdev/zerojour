import Link from 'next/link'
import {notFound} from 'next/navigation'
import {advisoryByGhsa} from '../../../lib/sanity'

export const dynamic = 'force-dynamic'

const WIDGETS: {key: string; label: string}[] = [
  {key: 'attackVector', label: 'Vecteur'},
  {key: 'attackComplexity', label: 'Complexité'},
  {key: 'privilegesRequired', label: 'Privilèges'},
  {key: 'userInteraction', label: 'Interaction'},
  {key: 'scope', label: 'Périmètre'},
  {key: 'confidentialityImpact', label: 'Confidentialité'},
  {key: 'integrityImpact', label: 'Intégrité'},
  {key: 'availabilityImpact', label: 'Disponibilité'},
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
          {a.exploitMaturity === 'known_exploited' ? 'À la une — activement exploitée · ' : ''}
          {a.fix.status === 'no_fix' ? 'Sans remède · ' : ''}
          {a.productName} ({a.ecosystem}) · publié le {a.published?.slice(0, 10)}
        </div>
        <h1 style={{fontSize: 'clamp(26px, 4vw, 40px)', lineHeight: 1.15}}>{a.title}</h1>
        <div className="lead">
          {a.cveId ?? a.ghsaId} — CVSS {a.severity?.baseScore ?? '—'}/10.{' '}
          {a.fix.fixedVersion ? `Correctif : mettre à jour vers ${a.fix.fixedVersion}.` : 'Aucun correctif publié à ce jour.'}
        </div>
        <div className="widgets">
          <div className="widget"><div className="k">Package</div><div className="v">{a.productName}</div></div>
          <div className="widget"><div className="k">Écosystème</div><div className="v">{a.ecosystem}</div></div>
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
            Classes de faiblesse : {a.cwe.map((w) => `${w.cweId} (${w.name})`).join(' · ')}
          </p>
        )}
        <p className="fineprint">
          Source : <a href={a.sourceUrl ?? '#'} target="_blank" rel="noreferrer">{a.ghsaId}</a> · GitHub Advisory Database (CC-BY-4.0)
          {a.exploitMaturity === 'known_exploited' ? ' · CISA KEV' : ''} — imprimé depuis un dataset structuré Sanity.
          {' '}<Link href="/">← Retour à la une</Link>
        </p>
      </article>
    </main>
  )
}
