// Sanity Context MCP client(s). The endpoint is hosted by Sanity:
//   https://api.sanity.io/v1/context/organizations/:orgId/mcp/:endpointName
// Auth is an organization API token with Context Viewer permission.
//
// IMPORTANT (verified against the docs): one endpoint serves ONE retrieval
// mode — an endpoint with a dataset source serves GROQ tools and IGNORES
// Knowledge Base sources. Using both modes means two endpoints, connected
// here as two MCP clients; KB tools are exposed with a `kb_` prefix.

import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type {Config} from './config.ts'
import type {OpenAITool} from './llm.ts'

export type SanityContext = {
  tools: OpenAITool[]
  call: (name: string, args: Record<string, unknown>) => Promise<string>
  close: () => Promise<void>
}

export function contextUrl(cfg: Config, endpoint = cfg.sanityContextEndpoint): URL {
  // SANITY_CONTEXT_URL overrides the whole endpoint (local mocks, proxies);
  // otherwise the hosted endpoint is built from org id + endpoint name.
  if (cfg.sanityContextUrl) return new URL(cfg.sanityContextUrl)
  if (!cfg.sanityOrgId || !endpoint) {
    throw new Error('Set SANITY_ORG_ID + SANITY_CONTEXT_ENDPOINT (or SANITY_CONTEXT_URL)')
  }
  return new URL(`https://api.sanity.io/v1/context/organizations/${cfg.sanityOrgId}/mcp/${endpoint}`)
}

async function connectOne(cfg: Config, endpoint: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(contextUrl(cfg, endpoint), {
    requestInit: {headers: {Authorization: `Bearer ${cfg.sanityContextToken}`}},
  })
  const client = new Client({name: 'zerojour', version: '0.1.0'})
  await client.connect(transport)
  return client
}

async function listToolDefs(client: Client): Promise<OpenAITool[]> {
  const {tools} = await client.listTools()
  return tools.map((t) => ({
    type: 'function',
    function: {name: t.name, description: t.description ?? '', parameters: (t.inputSchema ?? {}) as Record<string, unknown>},
  }))
}

async function callClientTool(client: Client, name: string, args: Record<string, unknown>): Promise<string> {
  const res = await client.callTool({name, arguments: args})
  const content = (res.content ?? []) as {type: string; text?: string}[]
  return content.map((c) => (c.type === 'text' ? c.text : JSON.stringify(c))).join('\n')
}

export async function connectSanityContext(cfg: Config): Promise<SanityContext> {
  const groq = await connectOne(cfg, cfg.sanityContextEndpoint)
  const groqTools = await listToolDefs(groq)

  let kbClient: Client | null = null
  let kbTools: OpenAITool[] = []
  if (cfg.sanityContextKbEndpoint) {
    kbClient = await connectOne(cfg, cfg.sanityContextKbEndpoint)
    // Only the KB-specific tools are useful from the second connection, and
    // both modes serve an initial_context — keep one, prefix the rest.
    kbTools = (await listToolDefs(kbClient))
      .filter((t) => t.function.name !== 'initial_context')
      .map((t) => ({...t, function: {...t.function, name: `kb_${t.function.name}`}}))
  }

  return {
    tools: [...groqTools, ...kbTools],
    call: (name, args) => {
      if (name.startsWith('kb_')) {
        if (!kbClient) throw new Error(`tool ${name} requires SANITY_CONTEXT_KB_ENDPOINT (KB endpoint not configured)`)
        return callClientTool(kbClient, name.slice(3), args)
      }
      return callClientTool(groq, name, args)
    },
    close: async () => {
      await groq.close()
      if (kbClient) await kbClient.close()
    },
  }
}
