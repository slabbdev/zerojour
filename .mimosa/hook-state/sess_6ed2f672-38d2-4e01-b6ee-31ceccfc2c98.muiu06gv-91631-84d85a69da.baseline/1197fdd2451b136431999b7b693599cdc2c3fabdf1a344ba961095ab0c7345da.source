import {NextResponse} from 'next/server'
import {client, writeClient} from '../../../lib/sanity'
import type {Advisory} from '../../../lib/sanity'

// The editorial workflow, implemented on the dataset itself:
//   draft  — the machine composes an article from the advisory's typed fields
//   review — waiting for a human (only a human should advance this)
//   published — the article appears as part of the paper's record
// Compose is deterministic: it prints the STRUCTURE, it does not invent prose.

function composeArticle(a: Advisory): {title: string; body: string} {
  const id = a.cveId ?? a.ghsaId
  const c = a.severity?.components ?? {}
  const profile = [
    c.attackVector && `reached over ${c.attackVector.toLowerCase()}`,
    c.privilegesRequired && `no special privileges required: ${c.privilegesRequired === 'NONE' ? 'none' : c.privilegesRequired.toLowerCase()}`,
    c.userInteraction === 'NONE' && 'no user interaction',
    c.scope === 'CHANGED' && 'may cross security scopes',
  ].filter(Boolean) as string[]
  const paras = [
    `${a.productName} (${a.ecosystem}) is affected by ${id}. The advisory records a CVSS base score of ${a.severity?.baseScore ?? 'n/a'}/10.`,
    profile.length ? `The structured profile reads: ${profile.join('; ')}.` : '',
    a.fix.fixedVersion
      ? `Remediation is a version bump: upgrade to ${a.fix.fixedVersion}.`
      : `No fixed version has been published yet. The newsroom will keep the page open.`,
    a.exploitMaturity === 'known_exploited'
      ? 'The CISA KEV catalog lists it as actively exploited — the front page is reserved for it.'
      : '',
    a.details ? `From the advisory record: ${a.details.slice(0, 400)}${a.details.length > 400 ? '…' : ''}` : '',
  ].filter(Boolean)
  return {
    title: `${id}: ${a.title}`,
    body: paras.join('\n\n'),
  }
}

export async function POST(req: Request) {
  if (!writeClient) return NextResponse.json({error: 'no write token — newsroom is read-only'}, {status: 501})
  const {ghsa} = (await req.json()) as {ghsa?: string}
  if (!ghsa) return NextResponse.json({error: 'missing ghsa'}, {status: 400})
  const a = await client.fetch<Advisory | null>('*[_type=="advisory" && ghsaId==$ghsa][0]', {ghsa})
  if (!a) return NextResponse.json({error: 'advisory not found'}, {status: 404})
  const {title, body} = composeArticle(a)
  const doc = {
    _id: `pressArticle-${a.ghsaId}`,
    _type: 'pressArticle',
    title,
    basedOn: {_type: 'reference', _ref: a._id},
    byline: 'Composed by the ZéroJour press desk from structured fields — pending human review',
    body,
    state: 'draft',
  }
  await writeClient.createOrReplace(doc)
  return NextResponse.json({ok: true, state: doc.state, title})
}

export async function PATCH(req: Request) {
  if (!writeClient) return NextResponse.json({error: 'no write token — newsroom is read-only'}, {status: 501})
  const {id, state} = (await req.json()) as {id?: string; state?: string}
  if (!id || !['review', 'published'].includes(state ?? '')) {
    return NextResponse.json({error: 'expected id + state in {review, published}'}, {status: 400})
  }
  const set: Record<string, unknown> = {state}
  if (state === 'published') {
    set.publishedAt = new Date().toISOString()
    set.byline = 'Approved by a human editor — the machine composed, the human signed off'
  }
  await writeClient.patch(id).set(set).commit()
  return NextResponse.json({ok: true, id, state})
}
