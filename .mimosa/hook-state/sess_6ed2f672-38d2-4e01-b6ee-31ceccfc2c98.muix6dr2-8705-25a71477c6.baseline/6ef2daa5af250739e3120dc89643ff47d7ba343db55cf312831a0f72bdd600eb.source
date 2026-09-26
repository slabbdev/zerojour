import {createClient} from '@sanity/client'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'ngvnxjkl'
export const dataset = 'production'

// Public read: the dataset is public, the challenge post publishes the query URL.
export const client = createClient({projectId, dataset, apiVersion: '2025-01-01', useCdn: true})

// Editorial writes (draft -> review -> published) only when a write token exists;
// without it the newsroom runs in honest read-only mode and says so.
export const writeClient = process.env.SANITY_API_WRITE_TOKEN
  ? createClient({projectId, dataset, apiVersion: '2025-01-01', useCdn: false, token: process.env.SANITY_API_WRITE_TOKEN})
  : null

export type Advisory = {
  _id: string
  ghsaId: string
  cveId: string | null
  title: string
  summary: string | null
  details: string | null
  productName: string
  ecosystem: string
  published: string
  severity: {
    baseScore?: number | null
    vector?: string | null
    components?: {
      attackVector?: string
      attackComplexity?: string
      privilegesRequired?: string
      userInteraction?: string
      scope?: string
      confidentialityImpact?: string
      integrityImpact?: string
      availabilityImpact?: string
    } | null
  } | null
  exploitMaturity: string
  fix: {status?: string; fixedVersion?: string | null}
  sourceUrl: string | null
  cwe: {cweId: string; name: string}[] | null
}

const ADVISORY_PROJECTION = `{
  _id, ghsaId, cveId, title, summary, details, published, exploitMaturity,
  "productName": product->name, "ecosystem": product->ecosystem,
  severity, fix, sourceUrl,
  "cwe": cwe[]->{cweId, name}
}`

export const FRONT_PAGE_QUERY = `{
  "kev": *[_type == "advisory" && exploitMaturity == "known_exploited"] | order(severity.baseScore desc) ${ADVISORY_PROJECTION},
  "worst": *[_type == "advisory" && fix.status == "no_fix"] | order(severity.baseScore desc) ${ADVISORY_PROJECTION},
  "highSeverity": *[_type == "advisory" && severity.baseScore >= 8] | order(severity.baseScore desc) [0...6] ${ADVISORY_PROJECTION},
  "latest": *[_type == "advisory"] | order(published desc) [0...12] ${ADVISORY_PROJECTION},
  "stats": {"advisories": count(*[_type=="advisory"]), "products": count(*[_type=="product"]), "kev": count(*[_type=="advisory" && exploitMaturity=="known_exploited"]), "noFix": count(*[_type=="advisory" && fix.status=="no_fix"])}
}`

export const ADVISORY_BY_GHSA_QUERY = /* groq */ `
*[_type == "advisory" && ghsaId == $ghsa][0] ${ADVISORY_PROJECTION}`

export const PRESS_ARTICLES_QUERY = /* groq */ `
*[_type == "pressArticle"] | order(_createdAt desc) {
  _id, title, state, byline, body, publishedAt,
  "basedOn": basedOn->{ghsaId, cveId, title, severity, fix}
}`

export async function frontPage() {
  return client.fetch<Record<string, unknown>>(FRONT_PAGE_QUERY)
}

export async function advisoryByGhsa(ghsa: string): Promise<Advisory | null> {
  return client.fetch<Advisory | null>(ADVISORY_BY_GHSA_QUERY, {ghsa})
}
