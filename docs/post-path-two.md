<!-- DEV.to submission — Path Two · tag: #sanitychallenge
     Use the official template via the challenge page button, then paste this content.
     Suggested tags: #sanitychallenge #nextjs #sanity #vibecoding
     Publish AFTER the Path One post (link the other path from the Code section).
     The Vercel deploy is live: https://zerojour.vercel.app -->

# ZéroJour (the press edition): a newspaper that prints itself from structured content — where the machine composes and only a human can publish

A daily paper with no reporters.

**ZéroJour** is a newspaper printed live from the same structured advisories dataset as our [Path One agent](#) — the front page is a GROQ query, the weather widgets are CVSS components, and the "Front page" section is literally the CISA KEV catalog field. (ZéroJour is French for *zero-day* — the brand stays French on purpose; everything else here is English, like the dataset it prints.)

The strange part is the **newsroom**: a `pressArticle` document type carries a real editorial workflow — `draft → review → published`. The press desk composes an article deterministically *from the typed fields* (it prints the structure, it doesn't invent prose), but **the composer cannot publish**. The state machine only moves forward on a human signature. An AI can draft your front page; it cannot sign it.

![The ZéroJour front page — masthead, Front page (KEV badge), No remedy, real scores](https://raw.githubusercontent.com/slabbdev/zerojour/main/docs/screens/press-front-page.png)

## What's on the front page

Every section is a query, not a curation:

- **Front page** — `exploitMaturity == "known_exploited"`: the CISA KEV catalog field, worn as a red badge.
- **No remedy** — `fix.status == "no_fix"`: advisories no upgrade can close. Upgrading cannot save you here.
- **Highest severity** — `severity.baseScore >= 8.0`, ranked. The scores are numbers, not prose.
- **Latest dispatches** — `order(published desc)`.

![Highest severity section — dispatch cards with big CVSS numbers and fix targets](https://raw.githubusercontent.com/slabbdev/zerojour/main/docs/screens/press-high-severity.png)

Open any headline and the article page prints the advisory's **structure**: the CVSS components as weather widgets — Vector: NETWORK, Privileges: NONE, Scope: UNCHANGED — followed by the advisory's own prose, credited to its source.

![An article page: CVE-2026-4800 with the CVSS component widgets](https://raw.githubusercontent.com/slabbdev/zerojour/main/docs/screens/press-article.png)

## The newsroom — a workflow the AI cannot finish alone

The make-list ranks the highest-severity advisories; one click and the press desk composes an article **from the fields**: the profile line ("reached over network; no special privileges required: none; no user interaction"), the remediation line ("upgrade to 4.18.0"), the KEV flag, and a quoted extract from the advisory record. Deterministic — the desk prints the schema's truth, it does not generate wording.

![On the press: a PUBLISHED article (human-signed) above a DRAFT awaiting review](https://raw.githubusercontent.com/slabbdev/zerojour/main/docs/screens/press-workflow-draft.png)

Then the workflow: `draft → review → published`. Only a human advances it. The published byline says exactly what happened: *"Approved by a human editor — the machine composed, the human signed off."* And when no write token is configured, the newsroom refuses to pretend — it shows a read-only notice instead of dead buttons.

## Build process (the honest version)

1. **The dataset was already structured** (built for Path One), so the interesting engineering was editorial, not retrieval: how do you print a newspaper from fields? Answer: pick the sections the *schema* can express — KEV field → "Front page", `fix.status == "no_fix"` → "No remedy", `severity.baseScore >= 8` → the ranking. The newspaper is a GROQ query made visible.
2. **I cut the LLM out of the composer.** My first instinct was "have a model rewrite each advisory as an article" — deliberately scrapped: if the machine rewrites the facts, the paper is generation noise over structured data. The desk composes from fields (a deterministic template over the advisory record) and the human editor adds the value by approving. Schema thoughtfulness beat model magic.
3. **The wire almost lied to me.** The live ticker (`client.listen`) reports every dataset mutation — including the composer's own writes. For the demo that's a feature ("the paper updated itself"), but the newsroom must never treat the wire as truth: it's a doorbell, not a source.
4. **A ghost server bit me.** After fixing the composer, an old process kept serving the previous build on the same port — "undefined" leaked into two drafts until I audited PIDs instead of trusting my restart. The fix (kill, verify the listener, rebuild) is in the repo history; the lesson: demo screenshots of half-stale servers are how fake demos happen by accident.
5. **Read-only honesty**: without a write token the newsroom refuses to pretend — it shows a notice instead of dead buttons.

## Demo

- **Live: https://zerojour.vercel.app** *(deployed from the repo's `press/` folder)*
- Fallback, locally: `git clone https://github.com/slabbdev/zerojour && cd zerojour/press && npm install && npm run dev` — it prints from the same public dataset, no credentials needed for reading.

## Sanity Project Details

- Project ID: **`ngvnxjkl`** · dataset `production` (public) — the same structured content as Path One, consumed three ways here: GROQ queries (front page), references joined at read time (article pages), and a workflow state machine (`pressArticle`).
- Bonus features used: **Workflows** (draft → review → published with a hard human gate) and a live wire in the **App-SDK** spirit (dataset mutations printed in real time).

## Code

[github.com/slabbdev/zerojour](https://github.com/slabbdev/zerojour) — `press/` folder. Next.js App Router, `@sanity/client`, zero UI libraries: the newspaper look is one stylesheet on purpose. This is one of two ZéroJour submissions; the measured agent lives in the [Path One post](#) (linked once published).
