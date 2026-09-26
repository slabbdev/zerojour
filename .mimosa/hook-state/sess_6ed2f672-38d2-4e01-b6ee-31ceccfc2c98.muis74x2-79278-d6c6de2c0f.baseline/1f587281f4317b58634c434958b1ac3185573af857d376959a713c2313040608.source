// Minimal local UI for demos: one page, three answering modes, the tool
// trace, and the NoireBox sealing status. Zero build step, zero dependencies
// — `npm run ui` and open http://127.0.0.1:8767.

import {createServer, IncomingMessage, ServerResponse} from 'node:http'
import {ask, naive, direct} from './main.ts'
import {NoireBoxJournal} from './noirebox.ts'
import {loadConfig} from './config.ts'

type Mode = 'structured' | 'naive' | 'no_tools'

const PORT = Number(process.env.VULNRADAR_UI_PORT || 8767)

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>VulnRadar — structured advisories agent</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.55 ui-sans-serif, system-ui, sans-serif; background: #0e1116; color: #d7dde6; }
  header { padding: 18px 24px; border-bottom: 1px solid #232a35; display: flex; align-items: baseline; gap: 14px; }
  header h1 { font-size: 17px; margin: 0; letter-spacing: .3px; }
  header span { color: #7d8b9e; font-size: 13px; }
  main { max-width: 860px; margin: 0 auto; padding: 24px; }
  .row { display: flex; gap: 10px; margin: 14px 0; }
  textarea { flex: 1; min-height: 74px; background: #161c25; color: #e8edf4; border: 1px solid #2a3342; border-radius: 10px; padding: 12px; font: inherit; resize: vertical; }
  select, button { background: #1c2431; color: #e8edf4; border: 1px solid #2a3342; border-radius: 10px; padding: 10px 14px; font: inherit; cursor: pointer; }
  button { background: #2b6cb0; border-color: #2b6cb0; font-weight: 600; }
  button:disabled { opacity: .55; cursor: wait; }
  .card { background: #121821; border: 1px solid #232a35; border-radius: 12px; padding: 16px; margin: 14px 0; }
  .card h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: #7d8b9e; margin: 0 0 8px; }
  .step { font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; padding: 6px 0; border-bottom: 1px dashed #1f2733; }
  .step:last-child { border-bottom: 0; }
  .step b { color: #7fb2e5; font-weight: 600; }
  #answer { white-space: pre-wrap; }
  #status { font-size: 13px; color: #7d8b9e; }
  #status b { color: #9fd6a5; }
  a { color: #7fb2e5; }
</style>
</head>
<body>
<header><h1>VulnRadar</h1><span>security advisories agent — only works because the content is structured</span></header>
<main>
  <div class="row">
    <textarea id="question" placeholder="e.g. I run axios 1.2.0 — which advisories affect exactly that version, and what fixes each one?"></textarea>
  </div>
  <div class="row">
    <select id="mode">
      <option value="structured">Structured — Sanity Context (GROQ + KB)</option>
      <option value="naive">Naive — keyword search over the same docs</option>
      <option value="no_tools">Direct model — no data access (memorization control)</option>
    </select>
    <button id="ask">Ask</button>
  </div>
  <div class="card" id="traceCard" hidden><h2>Tool trace</h2><div id="trace"></div></div>
  <div class="card" id="answerCard" hidden><h2>Answer</h2><div id="answer"></div></div>
  <div class="card" id="statusCard" hidden><h2>Journal</h2><div id="status"></div></div>
</main>
<script>
  const $ = (id) => document.getElementById(id)
  async function ask() {
    const question = $('question').value.trim()
    if (!question) return
    $('ask').disabled = true
    $('traceCard').hidden = $('answerCard').hidden = $('statusCard').hidden = true
    try {
      const res = await fetch('/api/ask', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({question, mode: $('mode').value})})
      const json = await res.json()
      if (json.error) { $('answerCard').hidden = false; $('answer').textContent = 'Error: ' + json.error; return }
      $('traceCard').hidden = false
      $('trace').innerHTML = (json.steps ?? []).map((s) => '<div class="step"><b>' + s.tool + '</b>(' + JSON.stringify(s.args).slice(0, 220) + ') → ' + s.resultPreview.replace(/</g, '&lt;').slice(0, 220) + '</div>').join('') || '<div class="step">(no tool calls)</div>'
      $('answerCard').hidden = false
      $('answer').textContent = json.answer
      const journal = await (await fetch('/api/journal')).json()
      $('statusCard').hidden = false
      $('status').innerHTML = journal.valid
        ? 'This answer was produced with <b>' + json.sealed + ' events sealed</b> into the NoireBox journal — chain verified: <b>' + journal.nb_events + ' events, valid</b>. <a href="' + journal.dashboard + '" target="_blank">Open dashboard</a>'
        : 'NoireBox journal: <b>not available</b> at ' + journal.url + ' — the agent ran, but nothing was sealed (it never claims a proof it did not produce).'
    } catch (err) {
      $('answerCard').hidden = false
      $('answer').textContent = 'Error: ' + err.message
    } finally {
      $('ask').disabled = false
    }
  }
  $('ask').onclick = ask
  $('question').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask() })
</script>
</body>
</html>`

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {'Content-Type': 'application/json'})
  res.end(JSON.stringify(body))
}

export function startUiServer(): void {
  const journal = new NoireBoxJournal(loadConfig())
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'})
      res.end(PAGE)
      return
    }
    if (req.method === 'GET' && req.url === '/api/journal') {
      const cfg = loadConfig()
      const verify = await journal.verify()
      const body = (verify.body ?? {}) as {valid?: boolean; nb_events?: number}
      sendJson(res, 200, {...body, valid: verify.ok && body.valid === true, dashboard: `${cfg.noireboxUrl.replace(/\/+$/, '')}/dashboard`, url: cfg.noireboxUrl})
      return
    }
    if (req.method === 'POST' && req.url === '/api/ask') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', async () => {
        try {
          const {question, mode} = JSON.parse(body) as {question: string; mode: Mode}
          if (!question?.trim()) return sendJson(res, 400, {error: 'empty question'})
          if (mode === 'naive') return sendJson(res, 200, await naive(question))
          if (mode === 'no_tools') {
            const result = await direct(question)
            return sendJson(res, 200, {steps: [], ...result})
          }
          return sendJson(res, 200, await ask(question))
        } catch (err) {
          return sendJson(res, 500, {error: err instanceof Error ? err.message : String(err)})
        }
      })
      return
    }
    sendJson(res, 404, {error: 'not found'})
  })
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`VulnRadar UI on http://127.0.0.1:${PORT} (NoireBox journal: ${loadConfig().noireboxUrl})`)
  })
}
