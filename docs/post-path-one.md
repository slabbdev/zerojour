<!-- DEV.to submission — Path One · tag: #sanitychallenge
     Use the official template via the challenge page button, then paste this content.
     Suggested tags: #sanitychallenge #ai #security #mcp
     Cover image suggestion: docs/screens/agent-ui-answer.png -->

# ZéroJour: an advisories agent that only works because the content is structured — and we prove it

Most entries will *claim* their agent works thanks to structured content. This one **measures** it.

ZéroJour is an agent that answers security-advisory questions — the kind an analyst actually asks: *"I run axios 1.2.0, which advisories affect exactly that version?"* or *"network vector, no privileges, no user interaction, score 8+, what fixes each one?"* Answering requires intersecting version ranges, CVSS components, fix status and CWE references across 82 real advisories. A keyword search cannot do that — and we didn't argue it, we measured it.

{% embed https://github.com/slabbdev/zerojour %}

## The 3-arm eval

The same model — `glm-4.5-flash`, a free-tier model, via an OpenAI-compatible endpoint — answers every question **three ways**:

| Arm | What it gets | Score |
| --- | --- | --- |
| Structured | Sanity Context MCP (GROQ + Knowledge Base) | **9/11** |
| Naive | Flat keyword search over the same docs | **1/11** |
| No-tools | The model alone (memorization control) | **0/11** |

Stable across two independent full runs. The bare model scores **zero**: the corpus is deliberately seeded with **2026 advisories that postdate every model's training data** (including one with no published fix at all), so regurgitation cannot fake a win. Ground truth is computed independently from the seed data with plain predicates and semver — never through Sanity.

![The real eval run: three arms side by side, question by question](https://raw.githubusercontent.com/slabbdev/zerojour/main/docs/screens/eval-run.png)

**The two misses, in full honesty** (both model-side, both verifiable):

- *Aggregation* ("which package has the most advisories ≥ 7.0?"): the flash model twice claimed `paramiko` — the dataset says `pillow` (4 advisories ≥ 7.0; paramiko has 2). Counting groups reliably at long context is exactly what small models do badly, and we say so instead of hiding it.
- *"Most recent advisory"*: the model twice grabbed the first document in default storage order (a 2018 advisory) instead of applying `order(published desc)`.

A stronger model is one env variable away (`AGENT_MODEL`) — the harness, the sealed transcripts and the eval replay with any OpenAI-compatible model.

## What I Built

Three pieces, all real, all running:

1. **A structured corpus** — 82 real advisories (16 npm/pip packages, 50 CWEs, 16 remediation playbooks), fetched from the GitHub Advisory Database (CC-BY-4.0) + the CISA KEV catalog. Withdrawn and malware advisories excluded. `npm run fetch:advisories` rebuilds the whole corpus from live sources — nothing hand-written is imported.
2. **The agent** — an MCP client over Sanity Context with one local deterministic tool, wrapped in a demo UI where you can watch the tool trace live.
3. **The proof harness** — 11 eval questions with independent ground truth, a keyword-search baseline, a no-tools arm, and every step sealed into a tamper-evident journal.

## Demo

Ask the structured agent a version question and watch the trace:

![The agent intersecting version ranges live: initial_context → groq_query → six version_in_range calls](https://raw.githubusercontent.com/slabbdev/zerojour/main/docs/screens/agent-ui-answer.png)

That trace *is* the thesis: the agent fetched the candidate ranges through GROQ, then ran real semver intersection locally — `version_in_range(1.2.0, introduced 1.0.0, fixed 1.18.0) → true`, and five other ranges → false.

The dataset is public — judges can query it themselves, right now:

```bash
curl -G "https://ngvnxjkl.api.sanity.io/v2025-01-01/data/query/production" \
  --data-urlencode 'query=*[_type=="advisory" && severity.components.attackVector=="NETWORK" && severity.components.privilegesRequired=="NONE" && severity.baseScore>=8]{cveId, "score": severity.baseScore, "fix": fix.fixedVersion}'
# → real results, ~15 ms
```

Run everything locally: `npm install && npm run eval` replays the whole three-arm comparison.

## How I Used Sanity / My Build Process

- **Schema thoughtfulness**: `advisory` carries version ranges (introduced/fixed/lastAffected), CVSS components **parsed from the official vector string** (so agents query `severity.components.privilegesRequired`, not regex over text), fix status, exploit maturity (sourced ONLY from the CISA KEV catalog — never guessed), and CWE references. `playbook` holds generated remediation prose. `pressArticle` carries an editorial workflow.
- **Sanity Context, both modes**: one endpoint serves the dataset in GROQ mode; a second serves a Knowledge Base built from the playbook + advisory prose (98 docs, under the 150-doc beta limit). One endpoint serves ONE mode — a dataset-source endpoint ignores KB sources — so the agent connects to both and prefixes the KB tools.
- **The semver trap**: GROQ compares version strings lexicographically (`"1.10.0" < "1.9.0"`). The agent gets one local deterministic tool (`version_in_range`, real semver) and the schema docs say why. Range checks never happen inside the query.
- **Iteration honesty**: eval v1 scored 9/11, prompt guards for ordering/aggregation kept it at 9/11 on the re-run — the failures stayed model-side, and the post reports them instead of hiding them.

## Sanity Project Details

- Project ID: **`ngvnxjkl`** · dataset: `production` (public)
- Public query URL: https://ngvnxjkl.api.sanity.io/v2025-01-01/data/query/production
- Backend: [github.com/slabbdev/zerojour](https://github.com/slabbdev/zerojour) — 15 tests, mock-MCP integration suite, zero-build demo UI. `npm run eval` replays everything.

## Bonus: auditability — sealing the agent with NoireBox

LLM logs are the only logs nobody trusts by default. So every step of this agent — each query, each MCP tool call, each answer, each eval verdict — is sealed into a local [NoireBox](https://github.com/slabbdev/noirebox) journal: SHA-256 hash chain, Ed25519 signatures, RFC 3161 timestamps.

![The NoireBox flight deck: 382 sealed events, chain intact, every link visible](https://raw.githubusercontent.com/slabbdev/zerojour/main/docs/screens/noirebox-dashboard.png)

And the part that matters: edit one sealed answer after the fact, and the chain breaks loudly.

![The tampered journal: TAMPERING — invalid hash (content was modified)](https://raw.githubusercontent.com/slabbdev/zerojour/main/docs/screens/noirebox-tamper-broken.png)

That screenshot is real: we copied the journal, edited one agent answer in the copy, and the verifier named the broken link. The uploader's Agent Sessions show your work; the journal proves it wasn't touched afterwards. Same instinct, cryptographic.

**And sealing is not ZéroJour-specific.** NoireBox ships a standard MCP server, so *your* agent — whoever is reading this — can mount it with one config block and get the same tamper-evident trail: [docs/witness-for-any-agent.md](https://github.com/slabbdev/zerojour/blob/main/docs/witness-for-any-agent.md). Running an entry for this challenge? Seal your own. Nobody should take our word for what an agent did — including us.

## Code

[github.com/slabbdev/zerojour](https://github.com/slabbdev/zerojour) — `npm run eval` replays the whole thing. This is one of two ZéroJour submissions; the newspaper edition lives in the [Path Two post](#) (linked once published).
