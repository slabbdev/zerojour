// Upserts seed/data/*.jsonl into the Sanity dataset. Requires a project with
// a write token (SANITY_PROJECT_ID / SANITY_DATASET / SANITY_API_WRITE_TOKEN).

import {createClient} from '@sanity/client'
import {readFileSync} from 'node:fs'
import {randomBytes} from 'node:crypto'
import {loadConfig} from '../agent/src/config.ts'

function readJsonl(file: string): Record<string, unknown>[] {
  return readFileSync(`seed/data/${file}`, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
}

function key(): string {
  return randomBytes(6).toString('hex')
}

function block(text: string, opts: {style?: string; listItem?: string} = {}): Record<string, unknown> {
  return {
    _type: 'block',
    _key: key(),
    style: opts.style ?? 'normal',
    listItem: opts.listItem,
    level: opts.listItem ? 1 : undefined,
    markDefs: [],
    children: [{_type: 'span', _key: key(), text, marks: []}],
  }
}

async function main() {
  const cfg = loadConfig()
  if (!cfg.sanityProjectId || !cfg.sanityApiWriteToken) {
    console.error('Missing SANITY_PROJECT_ID or SANITY_API_WRITE_TOKEN — see .env.example')
    process.exit(1)
  }
  const client = createClient({
    projectId: cfg.sanityProjectId,
    dataset: cfg.sanityDataset,
    apiVersion: '2025-01-01',
    token: cfg.sanityApiWriteToken,
    useCdn: false,
  })

  const products = readJsonl('products.jsonl').map((d) => ({...d, _type: 'product'}))
  const cwes = readJsonl('cwes.jsonl').map((d) => ({...d, _type: 'cwe'}))
  const advisories = readJsonl('advisories.jsonl').map((d) => ({...d, _type: 'advisory'}))
  const playbooks = readJsonl('playbooks.jsonl').map((d) => {
    const p = d as {blocks: {intro: string; bullets: string[]}; lastReviewed?: string}
    return {
      _id: d._id,
      _type: 'playbook',
      title: d.title,
      product: d.product,
      lastReviewed: (p.blocks ? new Date().toISOString().slice(0, 10) : undefined) as string | undefined,
      content: [block(p.blocks.intro), ...p.blocks.bullets.map((b) => block(b, {listItem: 'bullet'}))],
    }
  })

  const all = [...products, ...cwes, ...advisories, ...playbooks] as unknown as {
    _id: string
    _type: string
    [key: string]: unknown
  }[]
  console.log(`Importing ${all.length} documents into ${cfg.sanityProjectId}/${cfg.sanityDataset}...`)
  const BATCH = 25
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH)
    const tx = client.transaction()
    for (const doc of batch) tx.createOrReplace(doc)
    await tx.commit()
    console.log(`  ${Math.min(i + BATCH, all.length)}/${all.length}`)
  }
  console.log('Done. Deploy the schema (studio: npm run deploy-schema) and build the Knowledge Base in the Context app.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
