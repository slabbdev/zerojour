// ZéroJour agent. Two answering modes:
//   ask    — agent loop over Sanity Context MCP tools (+ one local semver tool)
//   naive  — the baseline: same model, but only flat keyword-search results
// Every step is sealed into the NoireBox journal when the server is running.

import {assistantMessage, chat, toolResultMessage, type ChatMessage, type ToolCall} from './llm.ts'
import {baselineContext, loadCorpus, type Corpus} from './baseline.ts'
import {loadConfig, requireAgentModel, requireSanityContext} from './config.ts'
import {connectSanityContext, callMcpTool} from './mcp.ts'
import {NoireBoxJournal} from './noirebox.ts'
import {versionInRange, versionInRangeTool} from './tools.ts'

const MAX_STEPS = 10

const SYSTEM_PROMPT = `You are ZéroJour, an agent answering questions about security advisories in a curated dataset of npm/pip packages, served through Sanity Context.

Method:
1. Call initial_context once to see the schema.
2. Use schema_explorer before writing non-trivial GROQ.
3. Use groq_query to answer. Useful shapes:
   - Documents have _type "advisory" | "product" | "cwe" | "playbook".
   - CVSS components live at severity.components.* (e.g. severity.components.attackVector == "NETWORK").
   - Fix status lives at fix.status ("fixed" | "workaround_available" | "no_fix") and fix.fixedVersion.
   - Exploit maturity lives at exploitMaturity ("known_exploited" comes from the CISA KEV catalog).
   - References: product->{name, ecosystem}, cwe[]->{cweId, name}.
4. GROQ compares version strings lexicographically and cannot do semver. To test whether a version is affected, fetch the candidate advisory ranges, then call the local version_in_range tool for each range.

Rules:
- Answer ONLY from tool results. Cite CVE/GHSA IDs and fixed versions exactly as returned.
- If the data does not answer the question, say so plainly instead of guessing.`

type Step = {tool: string; args: Record<string, unknown>; resultPreview: string}

export type AskResult = {answer: string; steps: Step[]; sealed: number}

export async function ask(question: string): Promise<AskResult> {
  const cfg = loadConfig()
  requireSanityContext(cfg)
  requireAgentModel(cfg)
  const journal = new NoireBoxJournal(cfg)
  let sealed = 0
  if (await journal.seal('agent_query', {question, mode: 'structured'})) sealed++

  const {client, tools} = await connectSanityContext(cfg)
  const allTools = [...tools, versionInRangeTool]
  const messages: ChatMessage[] = [
    {role: 'system', content: SYSTEM_PROMPT},
    {role: 'user', content: question},
  ]

  const steps: Step[] = []
  for (let step = 0; step < MAX_STEPS; step++) {
    const msg = await chat(cfg, messages, allTools)
    if (!msg.tool_calls?.length) {
      const answer = msg.content ?? ''
      if (await journal.seal('agent_answer', {question, answer, steps})) sealed++
      await client.close()
      return {answer, steps, sealed}
    }
    messages.push(assistantMessage(msg))
    for (const call of msg.tool_calls as ToolCall[]) {
      const args = JSON.parse(call.function.arguments || '{}') as Record<string, unknown>
      let text: string
      if (call.function.name === 'version_in_range') {
        text = String(versionInRange(args as Parameters<typeof versionInRange>[0]))
      } else {
        text = await callMcpTool(client, call.function.name, args)
      }
      const preview = text.length > 300 ? `${text.slice(0, 300)}…` : text
      steps.push({tool: call.function.name, args, resultPreview: preview})
      if (await journal.seal('mcp_tool_call', {question, tool: call.function.name, args, resultPreview: preview})) sealed++
      messages.push(toolResultMessage(call.id, text))
    }
  }
  await client.close()
  throw new Error(`agent exceeded ${MAX_STEPS} steps without a final answer`)
}

export async function naive(question: string): Promise<{answer: string; context: string; sealed: number}> {
  const cfg = loadConfig()
  requireAgentModel(cfg)
  const journal = new NoireBoxJournal(cfg)
  let sealed = 0
  if (await journal.seal('agent_query', {question, mode: 'naive'})) sealed++

  const corpus: Corpus = loadCorpus()
  const context = baselineContext(corpus, question)
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'Answer the question using ONLY the keyword-search results provided. They are flat text: you cannot query versions, scores or statuses beyond what the snippets say. If the results do not answer the question, say so plainly.',
    },
    {role: 'user', content: `${context}\n\nQuestion: ${question}`},
  ]
  const msg = await chat(cfg, messages, [])
  const answer = msg.content ?? ''
  if (await journal.seal('naive_answer', {question, context, answer})) sealed++
  return {answer, context, sealed}
}

// Third eval arm: the model alone, no context, no tools. Controls for
// memorized CVEs — if this arm scores well, the eval proves nothing.
export async function direct(question: string): Promise<{answer: string; sealed: number}> {
  const cfg = loadConfig()
  requireAgentModel(cfg)
  const journal = new NoireBoxJournal(cfg)
  let sealed = 0
  if (await journal.seal('agent_query', {question, mode: 'no_tools'})) sealed++
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content:
        'You are asked a factual question about security advisories in a specific dataset. You have no tools and no data access. Answer from your own knowledge only; if you do not know or cannot verify, say so plainly.',
    },
    {role: 'user', content: question},
  ]
  const msg = await chat(cfg, messages, [])
  const answer = msg.content ?? ''
  if (await journal.seal('no_tools_answer', {question, answer})) sealed++
  return {answer, sealed}
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const question = rest.join(' ').trim()
  if (command === 'serve-ui') {
    const {startUiServer} = await import('./ui.ts')
    startUiServer()
    return
  }
  if (!question) {
    console.error('Usage: npm run agent -- ask|naive "question"')
    process.exit(1)
  }
  if (command === 'ask') {
    const result = await ask(question)
    for (const step of result.steps) {
      console.log(`\n[tool] ${step.tool}(${JSON.stringify(step.args)})`)
      console.log(`       -> ${step.resultPreview.replace(/\n/g, ' ').slice(0, 160)}`)
    }
    console.log(`\n=== ANSWER (sealed events: ${result.sealed}) ===\n${result.answer}\n`)
  } else if (command === 'naive') {
    const result = await naive(question)
    console.log(`\n${result.context}\n\n=== ANSWER (sealed events: ${result.sealed}) ===\n${result.answer}\n`)
  } else {
    console.error(`Unknown command: ${command}. Use "ask" or "naive".`)
    process.exit(1)
  }
}

// eval/run.ts imports the functions; only run main when executed directly.
if (process.argv[1]?.endsWith('main.ts')) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
