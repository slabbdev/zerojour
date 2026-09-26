// CVSS v3.1 helpers: decompose an official vector string into queryable
// components. Numeric base scores always come from the advisory database
// (authoritative); we never recompute or guess one here.

export type CvssComponents = {
  attackVector: 'NETWORK' | 'ADJACENT_NETWORK' | 'LOCAL' | 'PHYSICAL'
  attackComplexity: 'LOW' | 'HIGH'
  privilegesRequired: 'NONE' | 'LOW' | 'HIGH'
  userInteraction: 'NONE' | 'REQUIRED'
  scope: 'UNCHANGED' | 'CHANGED'
  confidentialityImpact: 'NONE' | 'LOW' | 'HIGH'
  integrityImpact: 'NONE' | 'LOW' | 'HIGH'
  availabilityImpact: 'NONE' | 'LOW' | 'HIGH'
}

const MAPS = {
  AV: {N: 'NETWORK', A: 'ADJACENT_NETWORK', L: 'LOCAL', P: 'PHYSICAL'},
  AC: {L: 'LOW', H: 'HIGH'},
  PR: {N: 'NONE', L: 'LOW', H: 'HIGH'},
  UI: {N: 'NONE', R: 'REQUIRED'},
  S: {U: 'UNCHANGED', C: 'CHANGED'},
  C: {H: 'HIGH', L: 'LOW', N: 'NONE'},
  I: {H: 'HIGH', L: 'LOW', N: 'NONE'},
  A: {H: 'HIGH', L: 'LOW', N: 'NONE'},
} as const

const KEYS = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'] as const

// Returns null for non-v3 vectors (CVSS v4 etc.): the raw vector is still
// stored, we just cannot decompose it.
export function parseCvssVector(vector: string | null | undefined): CvssComponents | null {
  if (!vector) return null
  const parts = vector.split('/')
  if (parts[0] !== 'CVSS:3.1' && parts[0] !== 'CVSS:3.0') return null
  const kv = new Map(parts.slice(1).map((p) => p.split(':') as [string, string]))
  const out: Record<string, string> = {}
  for (const key of KEYS) {
    const raw = kv.get(key)
    const mapped = raw ? (MAPS[key] as Record<string, string>)[raw] : undefined
    if (!mapped) return null
    out[{
      AV: 'attackVector', AC: 'attackComplexity', PR: 'privilegesRequired', UI: 'userInteraction',
      S: 'scope', C: 'confidentialityImpact', I: 'integrityImpact', A: 'availabilityImpact',
    }[key]] = mapped
  }
  return out as unknown as CvssComponents
}
