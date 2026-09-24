# VulnRadar

A security-advisories agent that **only works because the content is structured** — built for the [DEV × Sanity Challenge](https://dev.to/challenges/sanity-2026-09-16) (Path One).

Ask it: *"Which advisories need no privileges and no user interaction, come through the network, score 8.0+, and what fixes each one?"* Answering that requires crossing version ranges, CVSS components and fix status across 80+ advisories. A keyword search cannot do that. This repo proves the difference: the same model answers every question **three** ways — through a **Sanity Context** endpoint (GROQ + Knowledge Base), through **flat keyword search** over the same documents, and with **no data access at all** (the memorization control: if the bare model scores well, the eval proves nothing) — and a ground-truth eval scores all three.

The corpus is deliberately seeded with 2026 advisories that postdate every model's training data, so regurgitation cannot fake a win.

## How it works

```
                        ┌────────────────────────────┐
   question ──────────► │  agent loop (any LLM that  │
                        │  speaks chat-completions)  │
                        └──────┬───────────┬─────────┘
              structured path  │           │  naive path
                     ┌─────────▼───┐   ┌───▼──────────┐
                     │ Sanity      │   │ keyword search│
                     │ Context MCP │   │ over the same │
                     │ (GROQ + KB) │   │ flat documents│
                     └──────┬──────┘   └───┬──────────┘
                            │   every step │
                            ▼              ▼
                     ┌────────────────────────────┐
                     │ NoireBox journal (local)   │
                     │ SHA-256 + Ed25519 + TSA    │
                     │ → /dashboard, /verify      │
                     └────────────────────────────┘
```

- **Structured corpus** (`studio/schemas/`): `advisory` (version ranges, parsed CVSS components, fix status, exploit maturity, CWE references), `product`, `cwe`, `playbook` (prose the Knowledge Base indexes).
- **Why a local `version_in_range` tool**: GROQ compares version strings lexicographically (`"1.10.0" < "1.9.0"`), so range checks happen client-side with real semver.
- **NoireBox** (bonus section of the submission): every agent step is sealed into a tamper-evident journal — the post will show a live `/dashboard`, a chain verification, and the tamper demo.

## Status

| Piece | State |
| --- | --- |
| Seed pipeline (GHSA + CISA KEV → JSONL) | ✅ working, 164 docs (82 advisories, 16 products, 50 CWEs, 16 playbooks) |
| Sanity schemas | ✅ written |
| Sanity Context MCP client | ✅ integration-tested against a spec-shaped mock (handshake, tools/list, tools/call) |
| Agent loop + naive baseline + no-tools arm | ✅ end-to-end tested against mock LLM + mock MCP |
| Eval set (11 questions, independent ground truth) | ✅ validated — naive coverage of decisive docs is 0/2, 0/1, 0/6, 0/6 on the version/cross-field questions |
| Demo UI (chat + tool trace + journal status) | ✅ smoke-tested locally, zero build step |
| Unit + integration tests + typecheck | ✅ 15 passing |
| NoireBox sealing + verify | ✅ integration-tested against a live local server |
| Sanity import / Studio deploy / KB build | ⏳ needs the Sanity project (manual steps below) |
| Challenge post | ⏳ only after everything above is live (no screenshots of vaporware) |

## Setup

### 1. Sanity (manual, ~15 min — one-time)

1. Create a free account at [sanity.io](https://www.sanity.io/) and create an **organization**.
2. In `manage`: **Labs → enable Context** (org admin).
3. In `manage`: **API → Tokens → create an org API token** with **Context Viewer** permission → `SANITY_CONTEXT_TOKEN`.
4. Create a **project** (dataset `production`) → note the project ID → `SANITY_PROJECT_ID`.
5. Create a **project API token** with **write** access → `SANITY_API_WRITE_TOKEN`.
6. In the **Context app** (Sanity dashboard): create a Context MCP endpoint named `vulnradar`, source = this project's dataset (GROQ mode) + a Knowledge Base built from `playbook` + `advisory` documents (98 docs, under the 150-doc beta limit). Note the endpoint name → `SANITY_CONTEXT_ENDPOINT`.

### 2. This repo

```bash
npm install
cp .env.example .env        # fill in the values from step 1 + a model key
npm run fetch:advisories    # rebuild seed/data from live sources
npm run seed                # import into Sanity
cd studio && npm install
npx sanity schema deploy    # required for GROQ mode (Studio 5.1+)
```

### 3. Run

```bash
npm run agent -- ask "I run axios 1.2.0 — which advisories affect exactly that version?"
npm run agent -- naive "I run axios 1.2.0 — which advisories affect exactly that version?"
npm run eval                # 3-arm before/after table, sealed into NoireBox
npm run ui                  # demo UI on http://127.0.0.1:8767 (chat, tool trace, journal status)
```

NoireBox (optional but recommended): run a local server on `127.0.0.1:8768` (`NOIREBOX_URL`); the agent seals every query, tool call and answer. If the server is down, the agent keeps working and prints that events were **not** sealed — it never claims a proof it did not produce.

## Why not just query the NVD API?

Because the point is the content layer, not the source. What Sanity adds here: an **owned schema** (version ranges, parsed CVSS components, fix status, exploit maturity, CWE references) instead of scraping prose; **GROQ** to ask cross-field questions in one query; a **Knowledge Base** that turns the remediation prose into retrievable answers; and a **Context MCP endpoint** an agent can be re-pointed at without redeploying. NVD would be one more API to parse per call; the structured dataset is the reusable asset — and the eval is what keeps that claim honest.

## Data sources & licensing

- [GitHub Advisory Database](https://api.github.com/advisories) — CC-BY-4.0. GHSA IDs, CVE IDs, version ranges, first patched versions, CVSS vectors and official base scores, CWE IDs and names. Withdrawn and malware advisories are excluded.
- [CISA Known Exploited Vulnerabilities catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) — the only source of `exploitMaturity: "known_exploited"`. No PoC/weaponization claims are ever inferred.
- Remediation playbooks are generated from those same two sources and are the only prose the Knowledge Base indexes.

`seed/data/` is regenerated by `npm run fetch:advisories`; nothing hand-written is imported.

## Test

```bash
npm test          # CVSS parsing, semver ranges (incl. the "1.10.0" trap), keyword ranking
npm run typecheck
```
