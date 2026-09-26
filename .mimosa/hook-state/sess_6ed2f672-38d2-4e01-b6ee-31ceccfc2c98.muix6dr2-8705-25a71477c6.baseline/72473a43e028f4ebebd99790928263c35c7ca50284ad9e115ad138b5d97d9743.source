// A minimal Sanity-Context-shaped MCP server over streamable HTTP. It speaks
// just enough JSON-RPC (initialize, tools/list, tools/call) for the official
// MCP SDK client to connect — enough to integration-test the agent loop
// without a real Sanity organization.

import {createServer, type Server} from 'node:http'
import type {AddressInfo} from 'node:net'

export type MockMcp = {url: string; requests: string[]; close: () => Promise<void>}

export async function startMockMcp(): Promise<MockMcp> {
  const requests: string[] = []
  const server: Server = createServer((req, res) => {
    if (req.method === 'DELETE') {
      res.statusCode = 200
      res.end()
      return
    }
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.end()
      return
    }
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      const msg = JSON.parse(body) as {id?: number | string; method: string; params?: {arguments?: Record<string, unknown>; protocolVersion?: string}}
      requests.push(msg.method)
      // NB: a request id can legitimately be 0 — only undefined means notification.
      if (msg.id === undefined) {
        res.statusCode = 202
        res.end()
        return
      }
      const respond = (result: unknown) => {
        res.writeHead(200, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({jsonrpc: '2.0', id: msg.id, result}))
      }
      switch (msg.method) {
        case 'initialize':
          respond({
            protocolVersion: msg.params?.protocolVersion ?? '2025-06-18',
            capabilities: {tools: {}},
            serverInfo: {name: 'mock-sanity-context', version: '0.0.1'},
          })
          return
        case 'tools/list':
          respond({
            tools: [
              {name: 'initial_context', description: 'Compressed schema overview', inputSchema: {type: 'object', properties: {}}},
              {name: 'groq_query', description: 'Run a GROQ query', inputSchema: {type: 'object', properties: {query: {type: 'string'}}, required: ['query']}},
            ],
          })
          return
        case 'tools/call': {
          const name = (msg.params as {name?: string} | undefined)?.name ?? ''
          if (name === 'initial_context') {
            respond({content: [{type: 'text', text: 'SCHEMA OVERVIEW: advisory{ghsaId, cveId, affectedVersions[], severity.components.*, fix.status, fix.fixedVersion} product{name, ecosystem}'}]})
          } else if (name === 'groq_query') {
            respond({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify([
                    {ghsaId: 'GHSA-mock-0001', cveId: 'CVE-TEST-0001', affectedVersions: [{introduced: '1.15.2', fixed: '1.18.0'}], fix: {status: 'fixed', fixedVersion: '1.18.0'}},
                  ]),
                },
              ],
            })
          } else {
            respond({content: [{type: 'text', text: `unknown tool ${name}`}], isError: true})
          }
          return
        }
        default:
          res.writeHead(200, {'Content-Type': 'application/json'})
          res.end(JSON.stringify({jsonrpc: '2.0', id: msg.id, error: {code: -32601, message: 'method not found'}}))
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const {port} = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/mcp`,
    requests,
    close: () =>
      new Promise<void>((resolve) => {
        // The MCP client's fetch keep-alive sockets would hold close() open.
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
