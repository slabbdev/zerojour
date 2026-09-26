# [Path One submission draft — publish NOT before the eval runs with a real model]

<!-- Tag: #sanitychallenge · Template sections: What I Built / Demo / Code / How I Used Sanity / Sanity Project Details / Agent Session -->

## ZéroJour: an advisories agent that only works because the content is structured — and we prove it

### What I Built

Most challenge entries will *claim* their agent works thanks to structured content. This one **measures** it.

ZéroJour is an agent that answers security-advisory questions — the kind an analyst actually asks: *"I run axios 1.2.0, which advisories affect exactly that version?"* or *"network vector, no privileges, no user interaction, score 8+, what fixes each one?"* Answering requires intersecting version ranges, CVSS components, fix status and CWE references across 82 real advisories. That is impossible for keyword search, and we didn't argue it — we measured it.

**The 3-arm eval** (the same model, the same 82 documents):

| Arm | What it gets | [RESULT — fill after real-model eval run] |
|---|---|---|
| Structured | Sanity Context MCP (GROQ + Knowledge Base) | X/Y |
| Naive | Flat keyword search over the same docs | X/Y |
| No-tools | The model alone (memorization control) | X/Y |

Ground truth is computed independently from the seed data with plain predicates and semver — never through Sanity. The corpus is deliberately seeded with **2026 advisories that postdate every model's training data** (including one with no published fix at all), so regurgitation cannot fake a win.

### Demo

- [SCREENSHOT: eval table from `npm run eval`]
- [SCREENSHOT: demo UI chat with tool trace — structured mode]
- [SCREENSHOT: the same question, naive mode, failing]
- The dataset is public — judges can query it themselves:

```bash
curl -G "https://ngvnxjkl.api.sanity.io/v1/data/query/production" \
  --data-urlencode 'query=*[_type=="advisory" && severity.components.attackVector=="NETWORK" && severity.components.privilegesRequired=="NONE" && severity.baseScore>=8]{cveId, "score": severity.baseScore, "fix": fix.fixedVersion}'
# → real results in ~15 ms
```

### How I Used Sanity / My Build Process

- **Schema thoughtfulness**: `advisory` carries version ranges (introduced/fixed/lastAffected), CVSS components **parsed from the official vector** (so agents query `severity.components.privilegesRequired`, not regex over strings), fix status, exploit maturity (sourced ONLY from the CISA KEV catalog — never guessed), and CWE references. `playbook` holds generated remediation prose. `pressArticle` carries an editorial workflow.
- **Sanity Context**: a Context MCP endpoint serves the dataset in GROQ mode [LINK once endpoint is live] plus a Knowledge Base built from the playbook + advisory prose (98 docs, under the 150 beta limit) [LINK].
- **The semver trap**: GROQ compares version strings lexicographically ("1.10.0" < "1.9.0"). The agent gets one local deterministic tool (`version_in_range`, real semver) and the schema docs say why. Range checks never happen in the query.
- **Data honesty**: everything comes from the GitHub Advisory Database (CC-BY-4.0) + CISA KEV. Withdrawn and malware advisories excluded. `npm run fetch:advisories` rebuilds the whole corpus from live sources.

### Sanity Project Details

- Project ID: `ngvnxjkl` · dataset: `production` (public)
- Public query URL: https://ngvnxjkl.api.sanity.io/v1/data/query/production
- Repo: [github.com/slabbdev/zerojour — push before publishing this post]

### Bonus: auditability — sealing the agent with NoireBox

LLM logs are the only logs nobody trusts by default. So every step of this agent — each query, each MCP tool call, each answer, each eval verdict — is sealed into a local [NoireBox](https://github.com/slabbdev/noirebox) journal: SHA-256 hash chain, Ed25519 signatures, RFC 3161 timestamps. [SCREENSHOT: /dashboard with the agent's events] [GIF: tamper demo — edit one answer, the chain explodes]

The uploader's Agent Sessions show your work; the journal proves it wasn't touched afterwards. Same instinct, cryptographic.

### Code

[repo link] — `npm run eval` replays everything. 15 tests, mock-MCP integration suite, and a zero-build demo UI.
