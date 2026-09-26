// An OpenAI-compatible chat-completions mock with a scripted behavior: the
// test decides, from the conversation so far, what the model "does" next
// (call a tool, or produce the final answer).

import {createServer, type Server} from 'node:http'
import type {AddressInfo} from 'node:net'

export type MockLlm = {url: string; calls: number; close: () => Promise<void>}

export async function startMockLlm(
  decide: (messages: {role: string; content: string | null; tool_calls?: {function: {name: string}}[]}[], hasTools: boolean) => {
    content: string | null
    tool_calls?: {id: string; type: 'function'; function: {name: string; arguments: string}}[]
  },
): Promise<MockLlm> {
  let calls = 0
  const server: Server = createServer((req, res) => {
    if (req.method !== 'POST' || !req.url?.endsWith('/chat/completions')) {
      res.statusCode = 404
      res.end()
      return
    }
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      calls++
      const json = JSON.parse(body) as {messages: {role: string; content: string | null; tool_calls?: {function: {name: string}}[]}[]; tools?: unknown[]}
      const next = decide(json.messages, Boolean(json.tools?.length))
      res.writeHead(200, {'Content-Type': 'application/json'})
      res.end(JSON.stringify({choices: [{message: next}]}))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const {port} = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}/v1`,
    calls,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
