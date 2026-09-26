// Fetches REAL security advisories from the GitHub Advisory Database
// (api.github.com/advisories, data licensed CC-BY-4.0) and CISA's Known
// Exploited Vulnerabilities catalog, then maps them to the ZéroJour schema.
// No data is invented: every field traces back to a source URL, and
// exploitMaturity stays 'unknown' unless CISA lists the CVE.

import {parseCvssVector} from '../agent/src/cvss.ts'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'

type ProductSeed = {
  name: string
  vendor: string
  ecosystem: 'npm' | 'pip'
  repoUrl: string
  description: string
}

const PRODUCTS: ProductSeed[] = [
  {name: 'axios', vendor: 'axios', ecosystem: 'npm', repoUrl: 'https://github.com/axios/axios', description: 'Promise based HTTP client for the browser and node.js'},
  {name: 'lodash', vendor: 'OpenJS Foundation', ecosystem: 'npm', repoUrl: 'https://github.com/lodash/lodash', description: 'Modern JavaScript utility library delivering modularity, performance & extras'},
  {name: 'fastify', vendor: 'Fastify', ecosystem: 'npm', repoUrl: 'https://github.com/fastify/fastify', description: 'Fast and low overhead web framework, for Node.js'},
  {name: 'express', vendor: 'OpenJS Foundation', ecosystem: 'npm', repoUrl: 'https://github.com/expressjs/express', description: 'Fast, unopinionated, minimalist web framework for node'},
  {name: 'next', vendor: 'Vercel', ecosystem: 'npm', repoUrl: 'https://github.com/vercel/next.js', description: 'The React Framework'},
  {name: 'minimist', vendor: 'Substack', ecosystem: 'npm', repoUrl: 'https://github.com/minimistjs/minimist', description: 'Parse argument options'},
  {name: 'node-fetch', vendor: 'node-fetch', ecosystem: 'npm', repoUrl: 'https://github.com/node-fetch/node-fetch', description: 'Light-weight module that brings window.fetch to Node.js'},
  {name: 'jsonwebtoken', vendor: 'Auth0', ecosystem: 'npm', repoUrl: 'https://github.com/auth0/node-jsonwebtoken', description: 'JSON Web Token implementation'},
  {name: 'tough-cookie', vendor: 'Salesforce', ecosystem: 'npm', repoUrl: 'https://github.com/salesforce/tough-cookie', description: 'RFC6265 Cookies and CookieJar for Node.js'},
  {name: 'undici', vendor: 'Node.js', ecosystem: 'npm', repoUrl: 'https://github.com/nodejs/undici', description: 'An HTTP/1.1 client, written from scratch for Node.js'},
  {name: 'requests', vendor: 'Python Software Foundation', ecosystem: 'pip', repoUrl: 'https://github.com/psf/requests', description: 'A simple, yet elegant HTTP library for Python'},
  {name: 'flask', vendor: 'Pallets', ecosystem: 'pip', repoUrl: 'https://github.com/pallets/flask', description: 'The Python micro framework for building web applications'},
  {name: 'django', vendor: 'Django Software Foundation', ecosystem: 'pip', repoUrl: 'https://github.com/django/django', description: 'The Web framework for perfectionists with deadlines'},
  {name: 'paramiko', vendor: 'Jeff Forcier', ecosystem: 'pip', repoUrl: 'https://github.com/paramiko/paramiko', description: 'SSH2 protocol library for Python'},
  {name: 'pillow', vendor: 'Alex Clark', ecosystem: 'pip', repoUrl: 'https://github.com/python-pillow/Pillow', description: 'Python Imaging Library (fork)'},
  {name: 'jquery', vendor: 'OpenJS Foundation', ecosystem: 'npm', repoUrl: 'https://github.com/jquery/jquery', description: 'jQuery JavaScript Library'},
]

const MAX_PER_PRODUCT = 6 // keeps the whole corpus under the 150-doc Knowledge Base beta limit

const DATA_DIR = 'seed/data'

type GhsaAdvisory = {
  ghsa_id: string
  cve_id: string | null
  type: string
  withdrawn_at: string | null
  summary: string
  description: string | null
  severity: string | null
  cvss: {score: number; vector_string: string | null} | null
  cvss_severities?: {
    cvss_v3?: {score: number; vector_string: string}
    cvss_v4?: {score: number; vector_string: string}
  }
  cwes?: {cwe_id: string; name: string}[]
  vulnerabilities: {
    package: {ecosystem: string; name: string}
    vulnerable_version_range: string
    first_patched_version: string | null
  }[]
  published_at: string
  updated_at: string
  html_url: string
}

async function ghFetch(path: string): Promise<unknown> {
  const headers: Record<string, string> = {Accept: 'application/vnd.github+json', 'User-Agent': 'zerojour-seed (challenge submission)'}
  const token = process.env.GITHUB_TOKEN || (await ghAuthToken())
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`https://api.github.com${path}`, {headers})
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}: ${await res.text()}`)
  return res.json()
}

async function ghAuthToken(): Promise<string | null> {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  try {
    const {execFileSync} = await import('node:child_process')
    return execFileSync('gh', ['auth', 'token'], {stdio: ['ignore', 'pipe', 'ignore']}).toString().trim() || null
  } catch {
    return null
  }
}

// ">= 1.0.0, < 1.6.3" -> {introduced: '1.0.0', fixed: '1.6.3'}
// "<= 2.15.0"         -> {lastAffected: '2.15.0'}
// Unrecognized operator shapes are recorded verbatim in `raw` — never dropped silently.
function parseRange(range: string): {introduced?: string; fixed?: string; lastAffected?: string; raw: string} {
  const out: {introduced?: string; fixed?: string; lastAffected?: string; raw: string} = {raw: range}
  for (const part of range.split(',')) {
    const m = part.trim().match(/^(>=|<=|=|<|>)\s*([\d][\w.\-+]*)$/)
    if (!m) continue
    const [, op, version] = m
    if (op === '>=') out.introduced = version
    else if (op === '<') out.fixed = version
    else if (op === '<=') out.lastAffected = version
  }
  return out
}

async function fetchKevCves(): Promise<Set<string>> {
  const res = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', {
    headers: {'User-Agent': 'zerojour-seed'},
  })
  if (!res.ok) throw new Error(`CISA KEV ${res.status}`)
  const json = (await res.json()) as {vulnerabilities: {cveID: string}[]}
  return new Set(json.vulnerabilities.map((v) => v.cveID))
}

type AdvisoryRow = Record<string, unknown> & {_id: string}

// Generic weakness explanations are standard public knowledge; everything
// numeric (versions, dates, counts) comes strictly from the fetched sources.
const CWE_HINTS: Record<string, string> = {
  'prototype pollution': 'Prototype Pollution lets an attacker add or change properties on Object.prototype through unsanitized input, which can escalate into XSS or code execution depending on the sink.',
  'request forgery': 'Server-Side Request Forgery (SSRF) makes the application send requests to attacker-chosen destinations, often reaching services that should stay internal.',
  'cross-site scripting': 'Cross-site Scripting (XSS) runs attacker-controlled script in a victim browser session.',
  'sql injection': 'SQL Injection lets attacker-controlled input alter database queries.',
  'open redirect': 'An Open Redirect sends users to attacker-chosen URLs through a trusted origin.',
  'denial of service': 'Denial-of-Service weaknesses let small inputs consume disproportionate CPU or memory.',
  'certificate': 'Improper Certificate Validation makes TLS connections accept attacker certificates, enabling interception.',
  'deserialization': 'Deserialization of untrusted data can reconstruct attacker-controlled objects, a common code-execution path.',
  'information exposure': 'Information Exposure leaks secrets or sensitive data to parties that should not see them.',
  'path traversal': 'Path Traversal lets attacker-controlled paths escape the intended directory.',
}

export function buildPlaybooks(
  products: (ProductSeed & {_id: string})[],
  advisories: AdvisoryRow[],
  cweNameById: Map<string, string>,
): Record<string, unknown>[] {
  const hintFor = (advisory: AdvisoryRow): string => {
    const refs = (advisory.cwe as {_ref: string}[]) ?? []
    const names = refs.map((r) => cweNameById.get(r._ref) ?? '').join(' ')
    for (const [needle, hint] of Object.entries(CWE_HINTS)) {
      if (names.toLowerCase().includes(needle)) return hint
    }
    return ''
  }

  return products.map((p) => {
    const mine = advisories.filter((a) => (a.product as {_ref: string})._ref === p._id)
    const newest = [...mine].sort((a, b) => ((a.published as string) < (b.published as string) ? 1 : -1))
    const fixed = newest.filter((a) => (a.fix as {fixedVersion?: string}).fixedVersion)
    const unpatched = newest.filter((a) => !(a.fix as {fixedVersion?: string}).fixedVersion)
    const kev = newest.filter((a) => a.exploitMaturity === 'known_exploited')
    const highScore = newest.filter((a) => ((a.severity as {baseScore?: number}).baseScore ?? 0) >= 7)
    const worst = [...newest].sort((a, b) => ((b.severity as {baseScore?: number}).baseScore ?? 0) - ((a.severity as {baseScore?: number}).baseScore ?? 0))[0]
    const hints = [...new Set(newest.map((a) => hintFor(a)).filter(Boolean))]

    const upgradeBullets = fixed.map(
      (a) =>
        `${(a.cveId as string) ?? (a.ghsaId as string)} (${(a.title as string).slice(0, 90)}): upgrade to ${(a.fix as {fixedVersion: string}).fixedVersion}${
          a.exploitMaturity === 'known_exploited' ? ' — listed in the CISA KEV catalog, treat as actively exploited and patch first' : ''
        }`,
    )

    const intro = `${p.name} (${p.ecosystem}) remediation notes, generated from the GitHub Advisory Database entries in this dataset and the CISA KEV catalog, last fetched ${new Date().toISOString().slice(0, 10)}. Read them as advice: the advisory records answer "what is affected", these notes answer "what to do". The dataset currently holds ${mine.length} advisories for ${p.name}, ${highScore.length} of them scoring 7.0 or higher${kev.length ? `, ${kev.length} listed as actively exploited` : ''}.`

    const unpatchedLine = unpatched.length
      ? `Unpatched as of the fetch date: ${unpatched.map((a) => (a.cveId as string) ?? (a.ghsaId as string)).join(', ')}. No fixed version has been published yet — upgrading cannot close these.`
      : ''

    const unpatchedGuidance = unpatched.length
      ? 'For advisories without a published fix, the generic playbook applies: reduce exposure (disable or sandbox the affected feature where possible), watch the upstream repository for the patched release, and treat the weakness class above as the axis to contain.'
      : ''

    const contextPara = `The most severe entry scores ${(worst?.severity as {baseScore?: number} | undefined)?.baseScore ?? 0} (${(worst?.cveId as string) ?? (worst?.ghsaId as string)}).${
      hints.length ? ' Weakness classes involved: ' + hints.join(' ') : ''
    } Decide like an analyst: actively-exploited first, then network-reachable high scores, then everything else — and always land on the fixed version listed in the advisory record, not a nearby one.`

    return {
      _id: `playbook-${(p._id as string).replace('product-', '')}`,
      title: `${p.name} remediation notes`,
      product: {_type: 'reference', _ref: p._id},
      sections: {intro, upgradeBullets, unpatchedLine, unpatchedGuidance, contextPara},
    }
  })
}

async function main() {
  mkdirSync(DATA_DIR, {recursive: true})

  if (process.argv.includes('--playbooks-only')) {
    // Rebuild the prose from already-fetched data — no network, no rate limits.
    const read = (file: string) =>
      readFileSync(`${DATA_DIR}/${file}`, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))
    const products = read('products.jsonl') as (ProductSeed & {_id: string})[]
    const advisories = read('advisories.jsonl') as AdvisoryRow[]
    const cweNameById = new Map((read('cwes.jsonl') as {_id: string; name: string}[]).map((c) => [c._id, c.name] as const))
    const playbooks = buildPlaybooks(products, advisories, cweNameById)
    writeFileSync(`${DATA_DIR}/playbooks.jsonl`, playbooks.map((p) => JSON.stringify(p)).join('\n') + '\n')
    console.log(`playbooks.jsonl rebuilt locally: ${playbooks.length} playbooks`)
    return
  }

  console.log('Fetching CISA KEV catalog...')
  const kevCves = await fetchKevCves()
  console.log(`  ${kevCves.size} known exploited CVEs`)

  const advisories: (Record<string, unknown> & {_id: string})[] = []
  const products: (ProductSeed & {_id: string})[] = []
  const cwes = new Map<string, {cweId: string; name: string}>()
  const seenGhsa = new Set<string>()
  let kevHits = 0
  let noFixCount = 0

  for (const product of PRODUCTS) {
    console.log(`Fetching advisories for ${product.ecosystem}/${product.name}...`)
    const list = (await ghFetch(`/advisories?ecosystem=${product.ecosystem}&affects=${encodeURIComponent(product.name)}&per_page=100`)) as GhsaAdvisory[]
    // Withdrawn advisories are duplicates/errata without actionable fields;
    // malware entries describe poisoned packages, not vulnerabilities in ours.
    const recent = list
      .filter((a) => !a.withdrawn_at && a.type === 'reviewed')
      .filter((a) => a.vulnerabilities.some((v) => v.package.name === product.name))
      .sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
      .slice(0, MAX_PER_PRODUCT)

    products.push({
      _id: `product-${product.ecosystem}-${product.name}`,
      name: product.name,
      vendor: product.vendor,
      ecosystem: product.ecosystem,
      repoUrl: product.repoUrl,
      description: product.description,
    })

    for (const a of recent) {
      if (seenGhsa.has(a.ghsa_id)) continue // same advisory can list several packages; one doc per GHSA
      seenGhsa.add(a.ghsa_id)

      for (const cwe of a.cwes ?? []) cwes.set(cwe.cwe_id, {cweId: cwe.cwe_id, name: cwe.name})

      const mine = a.vulnerabilities.filter((v) => v.package.name === product.name)
      const affectedVersions = mine.map((v) => parseRange(v.vulnerable_version_range))
      const firstPatched = mine.find((v) => v.first_patched_version)?.first_patched_version ?? null
      const vector = a.cvss?.vector_string ?? a.cvss_severities?.cvss_v3?.vector_string ?? null
      const baseScore = a.cvss?.score ?? a.cvss_severities?.cvss_v3?.score ?? null
      const exploited = a.cve_id !== null && kevCves.has(a.cve_id)
      if (exploited) kevHits++
      if (!firstPatched) noFixCount++

      advisories.push({
        _id: `advisory-${a.ghsa_id}`,
        ghsaId: a.ghsa_id,
        cveId: a.cve_id,
        title: a.summary,
        summary: a.description ? `${a.description.slice(0, 400)}${a.description.length > 400 ? '…' : ''}` : a.summary,
        details: a.description,
        product: {_type: 'reference', _ref: `product-${product.ecosystem}-${product.name}`},
        affectedVersions,
        severity: {
          baseScore,
          vector,
          components: parseCvssVector(vector),
        },
        cwe: (a.cwes ?? []).map((c) => ({_type: 'reference', _ref: `cwe-${c.cwe_id.replace('CWE-', '')}`})),
        exploitMaturity: exploited ? 'known_exploited' : 'unknown',
        fix: {
          status: firstPatched ? 'fixed' : 'no_fix',
          fixedVersion: firstPatched,
        },
        published: a.published_at,
        modified: a.updated_at,
        sourceUrl: a.html_url,
      })
    }
  }

  const cweDocs = [...cwes.values()].map((c) => ({
    _id: `cwe-${c.cweId.replace('CWE-', '')}`,
    cweId: c.cweId,
    name: c.name,
  }))

  const cweNameById = new Map([...cwes.values()].map((c) => [`cwe-${c.cweId.replace('CWE-', '')}`, c.name] as const))
  const playbooks = buildPlaybooks(products, advisories, cweNameById)

  writeFileSync(`${DATA_DIR}/products.jsonl`, products.map((p) => JSON.stringify(p)).join('\n') + '\n')
  writeFileSync(`${DATA_DIR}/cwes.jsonl`, cweDocs.map((c) => JSON.stringify(c)).join('\n') + '\n')
  writeFileSync(`${DATA_DIR}/advisories.jsonl`, advisories.map((a) => JSON.stringify(a)).join('\n') + '\n')
  writeFileSync(`${DATA_DIR}/playbooks.jsonl`, playbooks.map((p) => JSON.stringify(p)).join('\n') + '\n')
  writeFileSync(
    `${DATA_DIR}/meta.json`,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        sources: [
          {name: 'GitHub Advisory Database', url: 'https://api.github.com/advisories', license: 'CC-BY-4.0'},
          {name: 'CISA Known Exploited Vulnerabilities (KEV) catalog', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog'},
        ],
        counts: {products: products.length, advisories: advisories.length, cwes: cweDocs.length, playbooks: playbooks.length, knownExploited: kevHits, noFix: noFixCount},
      },
      null,
      2,
    ) + '\n',
  )
  console.log(`\nDone: ${advisories.length} advisories, ${products.length} products, ${cweDocs.length} CWEs, ${playbooks.length} playbooks (${kevHits} KEV, ${noFixCount} without a published fix). Total docs: ${advisories.length + products.length + cweDocs.length + playbooks.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
