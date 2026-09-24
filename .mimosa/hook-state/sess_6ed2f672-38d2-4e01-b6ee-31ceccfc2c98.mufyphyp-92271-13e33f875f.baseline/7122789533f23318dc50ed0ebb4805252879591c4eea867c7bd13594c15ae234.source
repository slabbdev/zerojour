import {readFileSync} from 'node:fs'

export type Config = {
  sanityProjectId: string
  sanityDataset: string
  sanityApiWriteToken: string
  sanityOrgId: string
  sanityContextEndpoint: string
  sanityContextToken: string
  agentBaseUrl: string
  agentApiKey: string
  agentModel: string
  noireboxUrl: string
  noireboxClientId: string | null
  noireboxClientSecret: string | null
}

// Minimal .env reader — existing process env always wins.
function loadDotEnv(path = '.env'): void {
  let text: string
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return
  }
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

export function loadConfig(): Config {
  loadDotEnv()
  return {
    sanityProjectId: process.env.SANITY_PROJECT_ID ?? '',
    sanityDataset: process.env.SANITY_DATASET ?? 'production',
    sanityApiWriteToken: process.env.SANITY_API_WRITE_TOKEN ?? '',
    sanityOrgId: process.env.SANITY_ORG_ID ?? '',
    sanityContextEndpoint: process.env.SANITY_CONTEXT_ENDPOINT ?? '',
    sanityContextToken: process.env.SANITY_CONTEXT_TOKEN ?? '',
    agentBaseUrl: process.env.AGENT_BASE_URL ?? 'https://api.openai.com/v1',
    agentApiKey: process.env.AGENT_API_KEY ?? '',
    agentModel: process.env.AGENT_MODEL ?? 'gpt-4.1-mini',
    noireboxUrl: process.env.NOIREBOX_URL ?? 'http://127.0.0.1:8768',
    noireboxClientId: process.env.NOIREBOX_CLIENT_ID || null,
    noireboxClientSecret: process.env.NOIREBOX_CLIENT_SECRET || null,
  }
}

export function requireSanityContext(cfg: Config): void {
  const missing = [
    ['SANITY_ORG_ID', cfg.sanityOrgId],
    ['SANITY_CONTEXT_ENDPOINT', cfg.sanityContextEndpoint],
    ['SANITY_CONTEXT_TOKEN', cfg.sanityContextToken],
  ].filter(([, v]) => !v).map(([k]) => k)
  if (missing.length) {
    console.error(`Missing required env vars: ${missing.join(', ')} — see .env.example`)
    process.exit(1)
  }
}

export function requireAgentModel(cfg: Config): void {
  if (!cfg.agentApiKey) {
    console.error('Missing AGENT_API_KEY (any OpenAI-compatible endpoint works) — see .env.example')
    process.exit(1)
  }
}
