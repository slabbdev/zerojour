# Publication checklist — Oct 1, morning

## Before publishing (Oct 1, ~08:30 Paris)

- [ ] Verify the repo is green: https://github.com/slabbdev/zerojour (screenshots + demo.gif visible in docs/screens/)
- [ ] Optional video embed: upload docs/screens/demo.mp4 (41 s) to YouTube (unlisted) and paste the URL in the Path One post — dev.to embeds YouTube natively
- [ ] Vercel (optional but strong): https://vercel.com/new → import `slabbdev/zerojour` → **Root Directory: `press`** → env var `SANITY_API_WRITE_TOKEN` (value from local `.env`) → Deploy → copy the URL into both `[VERCEL-URL]` placeholders in docs/post-path-two.md
- [ ] Sanity services alive: dashboard shows the dataset; the Context endpoints (`zerojour`, `zerojour-kb`) listed in the Context app

## Path One (publish first)

1. Open the challenge page → **Submit to Path One** (the pre-filled template): https://dev.to/challenges/sanity-2026-09-16
2. Paste the body of `docs/post-path-one.md` (everything below the HTML comment)
3. Fix the two `[Path Two post](#)` links AFTER publishing Path Two (edit the post, swap in the real URL)
4. Tags: `#sanitychallenge` `#ai` `#security` `#mcp` · Title: the H1 of the draft
5. The images are GitHub raw URLs — dev.to renders them directly; optionally re-upload via the editor for CDN
6. **Publish between 08:00 and 10:00 Paris** (US morning traffic), then share: pinned tweet thread, the Grok thread, NoireBox README

## Path Two (publish ~2 h later)

1. **Submit to Path Two** (pre-filled template)
2. Paste `docs/post-path-two.md` (below the comment), fix `[VERCEL-URL]` if deployed
3. Edit the Path One post: replace the `[Path Two post](#)` link with the real URL
4. Tags: `#sanitychallenge` `#nextjs` `#sanity` `#vibecoding`

## After publishing (Oct 1-2)

- [ ] Reply to every comment within the hour (tie-break = reactions; engagement counts)
- [ ] Comment genuinely on 8-10 other entries (the field list is in the memory: Broken RimWorld mods, Homelab agent, 2-Hop Relational Context Engine, FinePrint, Receipts agent…)
- [ ] Watch reactions: leaders are at 34 — the bar is low, morning posting + replies is the game
- [ ] Winners announced Oct 22

## Hard rules (already honored, keep honoring)

- Nothing published that wasn't running first — every screenshot in the posts is a real capture
- English only in the deliverables (ZÉROJOUR brand name is the single deliberate exception, explained in the post)
- The eval failures are reported, not hidden — that honesty is the post's spine
