// Minimal local UI for demos — built around the DUEL: the same question is
// answered twice, side by side. Left: Sanity Context (GROQ + KB). Right:
// flat keyword search. The difference is the whole argument.
// Zero build step, zero dependencies — `npm run ui` and open http://127.0.0.1:8767.

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
<title>ZéroJour — the duel: structure vs keyword search</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Pirata+One&family=IBM+Plex+Mono:wght@400;600&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: dark; --bg:#0b0e13; --panel:#121821; --line:#232a35; --ink:#d7dde6; --muted:#7d8b9e; --green:#3fb950; --red:#f85149; --blue:#7fb2e5; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.55 Inter, ui-sans-serif, system-ui, sans-serif; }
  header { display:flex; align-items:baseline; gap:16px; padding:18px 28px; border-bottom:1px solid var(--line); }
  .wordmark { font-family:'Pirata One', serif; font-size:34px; letter-spacing:.02em; color:#f6f1e5; }
  header .tag { color:var(--muted); font-size:13px; }
  header .chain { margin-left:auto; font:600 12px 'IBM Plex Mono', monospace; color:var(--green); border:1px solid var(--green); border-radius:20px; padding:4px 12px; }
  header .chain.bad { color:var(--red); border-color:var(--red); }
  .scoreboard { display:flex; gap:12px; padding:16px 28px; flex-wrap:wrap; align-items:center; }
  .chip { border:1px solid var(--line); border-radius:10px; padding:8px 14px; background:var(--panel); }
  .chip b { font:800 18px Inter; }
  .chip .lbl { font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); display:block; }
  .chip.win b { color:var(--green); } .chip.lose b { color:var(--red); }
  .scoreboard .note { color:var(--muted); font-size:12px; font-style:italic; margin-left:auto; }
  main { max-width:1200px; margin:0 auto; padding:10px 28px 60px; }
  .explain { border-left:3px solid var(--blue); padding:10px 16px; color:var(--ink); margin:10px 0 16px; }
  .explain b { color:var(--blue); }
  .row { display:flex; gap:10px; margin:8px 0 18px; }
  textarea { flex:1; min-height:78px; background:var(--panel); color:#e8edf4; border:1px solid var(--line); border-radius:12px; padding:14px; font:inherit; resize:vertical; }
  button { font:inherit; font-weight:700; border:0; border-radius:12px; padding:12px 22px; cursor:pointer; }
  .duel { background:#2b6cb0; color:#fff; }
  button:disabled { opacity:.5; cursor:wait; }
  .cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  @media (max-width:900px){ .cols{grid-template-columns:1fr;} }
  .panel { border:1px solid var(--line); border-radius:14px; background:var(--panel); overflow:hidden; }
  .panel .head { padding:12px 16px; font:600 13px Inter; letter-spacing:.04em; }
  .panel.win .head { background:#12261a; color:var(--green); border-bottom:1px solid #1d3a26; }
  .panel.lose .head { background:#2a1512; color:var(--red); border-bottom:1px solid #3a1d1d; }
  .panel .head .sub { display:block; font-weight:400; color:var(--muted); font-size:12px; margin-top:2px; }
  .panel .body { padding:16px; }
  .answer { white-space:pre-wrap; font-size:14.5px; }
  .meta { margin-top:10px; font-size:12px; color:var(--muted); }
  details { margin-top:12px; border-top:1px dashed var(--line); padding-top:10px; }
  summary { cursor:pointer; color:var(--blue); font:600 12px 'IBM Plex Mono', monospace; }
  .step { font:12.5px/1.5 'IBM Plex Mono', monospace; padding:6px 0; border-bottom:1px dashed #1f2733; }
  .step b { color:var(--blue); font-weight:600; }
  .step .arg { color:var(--muted); }
  .status { font:13px 'IBM Plex Mono', monospace; color:var(--muted); padding:14px 4px; }
  .foot { text-align:center; color:var(--muted); font-size:12px; padding:26px 0 6px; }
  a { color:var(--blue); }
  /* the duel-wait overlay: the wait is part of the show */
  #overlay { position:fixed; inset:0; background:rgba(11,14,19,.88); backdrop-filter:blur(5px);
             display:flex; align-items:center; justify-content:center; z-index:50; }
  #overlay[hidden] { display:none; }
  .arena { text-align:center; max-width:720px; padding:30px; }
  .arena .faces { display:flex; align-items:center; justify-content:center; gap:34px; }
  .face { border:1px solid var(--line); border-radius:14px; padding:18px 26px; background:var(--panel); width:220px; }
  .face .name { font:800 15px Inter; letter-spacing:.06em; }
  .face.g .name { color:var(--green); } .face.r .name { color:var(--red); }
  .face .sub { font-size:11.5px; color:var(--muted); margin-top:4px; }
  .face.live { animation:pulse 1.6s ease-in-out infinite; }
  .face.g.live { border-color:var(--green); } .face.r.live { border-color:var(--red); }
  .vs { font-family:'Pirata One', serif; font-size:54px; color:#f6f1e5; animation:vsPulse 1.6s ease-in-out infinite; }
  @keyframes pulse { 0%,100% { box-shadow:0 0 0 0 rgba(127,178,229,0); } 50% { box-shadow:0 0 22px 2px rgba(127,178,229,.25); } }
  @keyframes vsPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.12); } }
  .track { height:6px; border-radius:6px; background:var(--line); margin:26px auto 14px; max-width:520px; overflow:hidden; }
  .track i { display:block; height:100%; width:34%; border-radius:6px;
             background:linear-gradient(90deg, var(--green), var(--blue), var(--red));
             animation:slide 1.8s ease-in-out infinite; }
  @keyframes slide { 0% { transform:translateX(-110%);} 100% { transform:translateX(320%);} }
  .caption { font:600 14px 'IBM Plex Mono', monospace; color:var(--ink); min-height:44px; max-width:640px; margin:0 auto; }
  .caption .k { color:var(--blue); }
  .hint { font-size:12px; color:var(--muted); margin-top:12px; }
</style>
</head>
<body>
<header>
  <span class="wordmark">ZÉROJOUR</span>
  <span class="tag">the zero-day paper · security advisories agent</span>
  <span class="chain" id="chain">checking journal…</span>
</header>

<div class="scoreboard">
  <div class="chip win"><span class="lbl">Structured — Sanity Context</span><b>9/11</b></div>
  <div class="chip lose"><span class="lbl">Keyword search — flat text</span><b>1/11</b></div>
  <div class="chip"><span class="lbl">No tools — memorization control</span><b>0/11</b></div>
  <span class="note">measured on the live dataset · ground truth computed independently · sealed in NoireBox</span>
</div>

<main>
  <div class="explain">
    <b>Run the duel:</b> the same model answers your question twice. Left, it reads through
    <b>Sanity Context</b> (structured fields: version ranges, CVSS components, fix status).
    Right, it only gets flat keyword-search results over the same 82 documents.
    Only one of them can cross-check a version, a vector and a fix at the same time.
  </div>
  <div class="row">
    <textarea id="question" placeholder="e.g. I run axios 1.2.0 — which advisories affect exactly that version, and what fixes each one?"></textarea>
  </div>
  <div class="row">
    <button class="duel" id="duel">⚔ Run the duel</button>
    <select id="mode">
      <option value="structured">single: structured</option>
      <option value="naive">single: keyword search</option>
      <option value="no_tools">single: no tools (control)</option>
    </select>
    <button id="ask" style="background:var(--panel);color:var(--ink);border:1px solid var(--line)">Run single arm</button>
  </div>

  <div id="status" class="status" hidden></div>

  <div id="overlay" hidden>
    <div class="arena">
      <div class="faces">
        <div class="face g live" id="faceG"><div class="name">WITH STRUCTURE</div><div class="sub">Sanity Context · GROQ + KB</div></div>
        <div class="vs">VS</div>
        <div class="face r live" id="faceR"><div class="name">KEYWORD SEARCH</div><div class="sub">flat text · same 82 docs</div></div>
      </div>
      <div class="track"><i></i></div>
      <div class="caption" id="caption"></div>
      <div class="hint">real model · real dataset · every step sealed — this usually takes 30–90 seconds</div>
    </div>
  </div>

  <div class="cols" id="duelCols" hidden>
    <div class="panel win" id="pStruct">
      <div class="head">WITH STRUCTURE — Sanity Context (GROQ + KB)
        <span class="sub" id="structSub"></span></div>
      <div class="body">
        <div class="answer" id="structAnswer"></div>
        <details><summary>tool trace</summary><div id="structTrace"></div></details>
      </div>
    </div>
    <div class="panel lose" id="pNaive">
      <div class="head">KEYWORD SEARCH — flat text, same 82 documents
        <span class="sub" id="naiveSub"></span></div>
      <div class="body">
        <div class="answer" id="naiveAnswer"></div>
        <details><summary>what the search returned</summary><div id="naiveTrace"></div></details>
      </div>
    </div>
  </div>
  <div class="panel" id="singleCard" hidden>
    <div class="head" id="singleHead"></div>
    <div class="body"><div class="answer" id="singleAnswer"></div>
      <details><summary>tool trace</summary><div id="singleTrace"></div></details></div>
  </div>

  <div class="foot">every step of every answer is sealed into a NoireBox journal —
    <a href="#" id="dashLink" target="_blank">open the flight deck</a> ·
    <a href="https://github.com/slabbdev/zerojour" target="_blank">github.com/slabbdev/zerojour</a></div>
</main>
<script>
  const $ = (id) => document.getElementById(id)
  const esc = (s) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;')
  async function journal() {
    try {
      const j = await (await fetch('/api/journal')).json()
      const el = $('chain')
      if (j.valid) { el.textContent = 'chain intact · ' + j.nb_events + ' events'; el.className = 'chain' }
      else { el.textContent = 'journal offline'; el.className = 'chain bad' }
      $('dashLink').href = j.dashboard
    } catch {}
  }
  journal()

  function traceHtml(steps) {
    return (steps ?? []).map(s =>
      '<div class="step"><b>' + s.tool + '</b> <span class="arg">' + esc(JSON.stringify(s.args)).slice(0, 200) + '</span> → ' + esc(s.resultPreview).slice(0, 200) + '</div>'
    ).join('') || '<div class="step">(no tool calls)</div>'
  }

  async function duel() {
    const question = $('question').value.trim()
    if (!question) return
    $('duel').disabled = true; $('ask').disabled = true
    $('duelCols').hidden = false; $('singleCard').hidden = true
    $('structAnswer').textContent = ''; $('naiveAnswer').textContent = ''
    $('structSub').textContent = 'working…'; $('naiveSub').textContent = 'working…'
    // the wait is part of the show: rotate through TRUE phase captions
    const captions = [
      'connecting to the <span class="k">Sanity Context</span> endpoint…',
      'the structured arm walks the dataset — <span class="k">GROQ queries</span> on version ranges, CVSS components, fix status…',
      'intersecting candidate ranges with <span class="k">real semver</span> (GROQ cannot compare versions)…',
      'the keyword arm got the same 82 documents as <span class="k">flat text</span> — no fields to cross…',
      'sealing every step into the <span class="k">NoireBox</span> journal…',
    ]
    let ci = 0
    $('caption').innerHTML = captions[0]
    const rot = setInterval(() => { ci = (ci + 1) % captions.length; $('caption').innerHTML = captions[ci] }, 4200)
    $('overlay').hidden = false
    try {
      const res = await fetch('/api/duel', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({question})})
      const j = await res.json()
      if (j.error) { $('status').hidden = false; $('status').textContent = 'Error: ' + j.error; return }
      $('structAnswer').textContent = j.structured.answer
      $('structTrace').innerHTML = traceHtml(j.structured.steps)
      $('structSub').textContent = j.structured.steps.length + ' tool calls · ' + j.structured.sealed + ' events sealed'
      $('naiveAnswer').textContent = j.naive.answer
      $('naiveTrace').innerHTML = '<div class="step">' + esc(j.naive.context).slice(0, 600) + '</div>'
      $('naiveSub').textContent = j.naive.sealed + ' events sealed'
      journal()
    } catch (err) { $('status').hidden = false; $('status').textContent = 'Error: ' + err.message }
    finally { clearInterval(rot); $('overlay').hidden = true; $('duel').disabled = false; $('ask').disabled = false }
  }

  async function single() {
    const question = $('question').value.trim()
    if (!question) return
    $('duel').disabled = true; $('ask').disabled = true
    $('duelCols').hidden = true; $('singleCard').hidden = false
    $('singleHead').textContent = 'SINGLE ARM — ' + $('mode').value
    $('singleAnswer').textContent = ''; $('singleTrace').innerHTML = ''
    $('status').hidden = false; $('status').textContent = 'working…'
    try {
      const res = await fetch('/api/ask', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({question, mode: $('mode').value})})
      const j = await res.json()
      if (j.error) { $('status').textContent = 'Error: ' + j.error; return }
      $('singleAnswer').textContent = j.answer
      $('singleTrace').innerHTML = traceHtml(j.steps)
      $('status').hidden = true
      journal()
    } catch (err) { $('status').textContent = 'Error: ' + err.message }
    finally { $('duel').disabled = false; $('ask').disabled = false }
  }

  $('duel').onclick = duel
  $('ask').onclick = single
  $('question').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) duel() })
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
    if (req.method === 'POST' && req.url === '/api/duel') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', async () => {
        try {
          const {question} = JSON.parse(body) as {question?: string}
          if (!question?.trim()) return sendJson(res, 400, {error: 'empty question'})
          // The two arms run in parallel: same model, same moment, same question.
          const [naiveResult, structuredResult] = await Promise.all([naive(question), ask(question)])
          sendJson(res, 200, {
            structured: {answer: structuredResult.answer, steps: structuredResult.steps, sealed: structuredResult.sealed},
            naive: {answer: naiveResult.answer, context: naiveResult.context, sealed: naiveResult.sealed},
          })
        } catch (err) {
          sendJson(res, 500, {error: err instanceof Error ? err.message : String(err)})
        }
      })
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
    console.log(`ZéroJour duel UI on http://127.0.0.1:${PORT} (NoireBox journal: ${loadConfig().noireboxUrl})`)
  })
}
