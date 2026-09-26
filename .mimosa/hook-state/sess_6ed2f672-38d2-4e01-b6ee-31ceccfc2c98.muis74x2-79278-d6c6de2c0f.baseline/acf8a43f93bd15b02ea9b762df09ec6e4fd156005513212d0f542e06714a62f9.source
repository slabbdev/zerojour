// End-to-end integration test of the agent loop WITHOUT any real provider:
// mock Sanity-Context MCP server + mock OpenAI-compatible LLM (+ the local
// NoireBox server when it happens to be running). This validates the parts
// that cannot break later: MCP client handshake, tool loop, local semver
// tool dispatch, naive path, no-tools path, event sealing path.

import assert from 'node:assert/strict'
import {test} from 'node:test'
import {startMockMcp} from './mock-mcp.ts'
import {startMockLlm} from './mock-llm.ts'

// Test-only network targets: explicit loopback allowlist. The mocks and the
// local journal both live on 127.0.0.1; anything else is refused before any
// request is made.
function loopbackOrigin(rawUrl: string): string {
  const u = new URL(rawUrl)
  assert.equal(u.protocol, 'http:', 'only http to loopback is allowed in tests')
  assert.ok(u.hostname === '127.0.0.1' || u.hostname === '::1', `refusing non-loopback host: ${u.hostname}`)
  return u.origin
}

async function noireboxUp(rawUrl: string): Promise<boolean> {
  const base = loopbackOrigin(rawUrl)
  try {
    const res = await fetch(`${base}/health`, {signal: AbortSignal.timeout(800)})
    return res.ok
  } catch {
    return false
  }
}

test('agent loop: connect, discover tools, query, intersect ranges, answer', async () => {
  const mcp = await startMockMcp()
  const llm = await startMockLlm((messages, hasTools) => {
    if (!hasTools) return {content: 'unexpected: no-tools request in ask()'}
    const hasContext = messages.some((m) => m.role === 'tool' && (m.content ?? '').includes('SCHEMA OVERVIEW'))
    const hasQuery = messages.some((m) => m.role === 'tool' && (m.content ?? '').includes('CVE-TEST-0001'))
    const hasRange = messages.some((m) => m.role === 'tool' && (m.content ?? '').match(/^(true|false)$/))
    if (!hasContext) {
      return {content: null, tool_calls: [{id: 't1', type: 'function', function: {name: 'initial_context', arguments: '{}'}}]}
    }
    if (!hasQuery) {
      return {content: null, tool_calls: [{id: 't2', type: 'function', function: {name: 'groq_query', arguments: JSON.stringify({query: '*[_type == "advisory"]'})}}]}
    }
    if (!hasRange) {
      return {content: null, tool_calls: [{id: 't3', type: 'function', function: {name: 'version_in_range', arguments: JSON.stringify({version: '1.2.0', introduced: '1.15.2', fixed: '1.18.0'})}}]}
    }
    return {
      content: 'axios 1.2.0 is NOT affected by CVE-TEST-0001 (GHSA-mock-0001): the range starts at 1.15.2 and version_in_range returned false for 1.2.0.',
    }
  })

  process.env.SANITY_CONTEXT_URL = mcp.url
  process.env.SANITY_CONTEXT_TOKEN = 'mock-token'
  process.env.AGENT_BASE_URL = llm.url
  process.env.AGENT_API_KEY = 'mock-key'
  process.env.AGENT_MODEL = 'mock-model'

  // Import after the env is set: config is read at call time, but this keeps
  // the test self-contained regardless of import order.
  const {ask} = await import('../agent/src/main.ts')
  const result = await ask('Which advisories affect axios 1.2.0?')

  assert.ok(result.answer.includes('CVE-TEST-0001'), `answer should cite the mock CVE, got: ${result.answer}`)
  assert.ok(result.answer.includes('GHSA-mock-0001'), 'answer should cite the mock GHSA id')
  const toolsUsed = result.steps.map((s) => s.tool)
  assert.deepEqual(toolsUsed, ['initial_context', 'groq_query', 'version_in_range'])
  assert.equal(mcp.requests.filter((r) => r === 'tools/call').length, 2)

  await llm.close()
  await mcp.close()
})

test('naive path answers from keyword results only', async () => {
  const llm = await startMockLlm((messages, hasTools) => {
    assert.equal(hasTools, false, 'naive mode must not receive any tools')
    const userMsg = messages.find((m) => m.role === 'user')
    assert.ok(userMsg?.content.includes('KEYWORD SEARCH RESULTS'), 'naive prompt must carry the flat keyword context')
    return {content: 'Based on the keyword results: CVE-TEST-0001 (GHSA-mock-0001) is the closest match, but I cannot verify version ranges from flat text.'}
  })
  process.env.AGENT_BASE_URL = llm.url
  process.env.AGENT_API_KEY = 'mock-key'
  process.env.AGENT_MODEL = 'mock-model'

  const {naive} = await import('../agent/src/main.ts')
  const result = await naive('Which advisories affect axios 1.2.0?')
  assert.ok(result.answer.includes('cannot verify version ranges'))
  assert.ok(result.context.includes('KEYWORD SEARCH RESULTS'))
  await llm.close()
})

test('no-tools arm answers with no data access (memorization control)', async () => {
  const llm = await startMockLlm((messages, hasTools) => {
    assert.equal(hasTools, false)
    assert.equal(messages.length, 2, 'no corpus context in the no-tools arm')
    return {content: 'I have no data access and cannot verify this dataset.'}
  })
  process.env.AGENT_BASE_URL = llm.url
  process.env.AGENT_API_KEY = 'mock-key'
  process.env.AGENT_MODEL = 'mock-model'

  const {direct} = await import('../agent/src/main.ts')
  const result = await direct('Which advisories affect axios 1.2.0?')
  assert.ok(result.answer.includes('no data access'))
  await llm.close()
})

test('NoireBox sealing: events land and verify when a server is running', async () => {
  const rawUrl = 'http://127.0.0.1:8768' // fixed loopback target, never env-derived
  if (!(await noireboxUp(rawUrl))) {
    console.log('  (no NoireBox server on 8768 — sealing skipped in this environment)')
    return
  }
  const llm = await startMockLlm(() => ({content: 'final answer with CVE-TEST-0001'}))
  process.env.AGENT_BASE_URL = llm.url
  process.env.AGENT_API_KEY = 'mock-key'
  process.env.AGENT_MODEL = 'mock-model'

  const {direct} = await import('../agent/src/main.ts')
  const result = await direct('sealing smoke test')
  assert.equal(result.sealed, 2, 'agent_query + no_tools_answer should both be sealed')

  const verify = await (await fetch(`${loopbackOrigin(rawUrl)}/api/v1/verify`)).json()
  assert.equal(verify.valid, true)
  await llm.close()
})
