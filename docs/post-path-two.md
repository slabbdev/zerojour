# [Path Two submission draft — publish after screenshots]

<!-- Tag: #sanitychallenge · Template sections: What I Built / Demo / Code / How I Used Sanity / Sanity Project Details / Build Process -->

## ZéroJour (the press edition): a newspaper that prints itself from structured content — where the machine composes and only a human can publish

### What I Built

A daily paper with no reporters. **ZéroJour** is a newspaper printed live from the same structured advisories dataset as our Path One agent: the front page is a GROQ query, the weather widgets are CVSS components, and the "Front page" section is the CISA KEV catalog field.

The strange part is the **newsroom**: a `pressArticle` document type carries a real editorial workflow — `draft → review → published`. The press desk composes an article deterministically *from the typed fields* (it prints the structure, it doesn't invent prose), but **the composer cannot publish**. The state machine only moves forward on a human signature. An AI can draft your front page; it cannot sign it.

### Demo

- [SCREENSHOT: front page — masthead, Front page (KEV badge), No remedy, scores as numbers]
- [SCREENSHOT: an article page with the CVSS component widgets]
- [SCREENSHOT: the newsroom — compose button, then draft → review → published chips]
- Live demo: [Vercel URL if deployed] · otherwise `cd press && npm run dev` on the public dataset

### Build Process (the honest version)

What went wrong and what it taught me:

1. **The dataset was already structured** (built for Path One), so the interesting engineering was editorial, not retrieval: how do you print a newspaper from fields? Answer: pick the sections the *schema* can express — KEV field → "À la une", `fix.status == "no_fix"` → "No remedy", `severity.baseScore >= 8` → the ranking. The newspaper is a GROQ query made visible.
2. **The composer writes nothing.** My first instinct was "have an LLM rewrite each advisory as an article" — and I cut it deliberately: if the machine rewrites the facts, the newspaper is just generation noise over structured data. The desk now *composes from fields* (deterministic template over the advisory record) and the human editor adds value by approving. Schema thoughtfulness beat model magic.
3. **The Ticker almost lied to me.** The live wire (`client.listen`) reports every mutation, including the composer's own writes. For the demo that's a feature ("the paper updated itself"), but it means the newsroom must never treat the wire as truth — it's a doorbell, not a source.
4. **Read-only honesty**: without a write token the newsroom refuses to pretend — it shows a notice instead of dead buttons. [Adjust wording if shipped with token.]

### Sanity Project Details

- Project ID: `ngvnxjkl` · dataset `production` (public) — same structured content as Path One, consumed three ways: GROQ queries (front page), references (article pages), and a workflow state machine (`pressArticle`).
- Bonus used: **Workflows** (draft → review → published with a human gate) and a **live wire** in the App-SDK spirit (dataset mutations printed in real time).

### Code

[github.com/slabbdev/zerojour](https://github.com/slabbdev/zerojour) (`press/` folder) — Next.js App Router, @sanity/client, zero UI libraries: the newspaper look is one stylesheet on purpose.
