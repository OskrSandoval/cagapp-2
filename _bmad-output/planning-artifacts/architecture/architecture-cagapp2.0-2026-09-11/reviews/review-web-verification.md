# Tech Currency Verification — CagApp 2.0

## Overall verdict
Most pinned versions in the Stack table check out against fresh web searches (React 19.3, Express 5.2.1, @supabase/supabase-js 2.116.0 are all real, current npm releases as of September 2026), and the Deployment section's platform claims about Render/Vercel/Railway/Fly.io are directionally correct. The one real miss is Vite: the doc hedges at "~7.x" citing conflicting search results, but a fresh search shows Vite 8.0 shipped in March 2026 and 8.3.0 is current as of this review — the hedge should have been resolved to "8.x" rather than left open. Node 22 LTS is valid but is now the older of two supported LTS lines (24 is Active LTS), which the doc doesn't surface.

### Findings

- **high** Vite version claim is stale, not merely "unverified." The spine hedges at "~7.x (verificar versión exacta al instalar)" citing conflicting web data. A fresh search (Sept 2026) confirms Vite 8.0.0 released March 12, 2026, with 8.3.0 current — 8.x has been the shipping major for ~6 months, and `npm install vite` today pulls 8.x by default. Vite 8 is a significant change (Rolldown-based bundler by default). *Fix:* Update the Stack table to "Vite 8.x (confirmed current, released March 2026 — do not pin to 7.x)" and note that Vite 8's Rolldown bundler may affect plugin compatibility versus the Vite 7 assumptions implicit elsewhere in the doc.

- **medium** Node.js 22 is correctly still-supported but is no longer the leading LTS choice for a greenfield project. Search confirms Node 22 entered Maintenance LTS in October 2025 (EOL April 30, 2027) while Node 24 is now Active LTS and Node 26 is Current. The doc's own justification ("Node 20 EOL abril 2026") is accurate but only argues against 20, not for 22 over 24. *Fix:* Either confirm Node 22 is intentional (acceptable — it has runway to April 2027, more than enough for this MVP) or switch the pin to Node 24 (Active LTS) for more runway/support. Either is defensible; the gap is that the tradeoff isn't stated.

- **medium** Vercel's Hobby (free) tier is restricted to personal/non-commercial use — Vercel's terms treat revenue-generating use as a ToS violation. The architecture doc's Deployment section lists Vercel free tier without this caveat. This matters here specifically because the PRD/AD-3 rationale references a long-term monetization intent for the ratings data asset. *Fix:* Add a note to the Deployment section that Vercel's free tier must be upgraded (or swapped) before any commercial launch — not a blocker for the learning-MVP phase, but a real constraint the doc should name given the stated product trajectory.

- **low** Render free-tier cold-start latency is understated. The doc says the sleeping service "tarda unos segundos en responder" (takes a few seconds). Multiple current sources describe cold-start as ~30-60 seconds (roughly "up to a minute"), not just a few seconds. *Fix:* Reword to "puede tardar hasta un minuto en responder tras dormir" so expectations match reality — still acceptable for the stated MVP traffic, just a wording correction.

- **low** Railway/Fly.io "no genuine free tier without payment info" claim is confirmed directionally correct but the picture for Railway is more nuanced than a flat "no". Fly.io: confirmed — free allowances for new orgs were removed in 2024; today it's a 2-VM-hour/7-day trial and a credit card is required afterward for all but "Linked Organizations." Railway: sources conflict on whether the $5 trial credit itself requires a card, but converge that Railway has required a card since August 2023 to do anything beyond that trial, and there's no indefinite no-card free tier. Net effect on the decision (ruling both out in favor of Render) is unaffected. *Fix:* No correction needed to the conclusion; optionally soften the decision-log wording from "ya no tienen planes gratis reales sin tarjeta" to "no ofrecen un tier gratuito indefinido sin tarjeta" to reflect that Railway's trial credit specifically is where sources disagree.

- **confirmed** React 19.3 is a real, current release — react.dev's own blog post is dated September 9, 2026 (two days before this review), matching npm. No correction needed.

- **confirmed** Express 5.2.1 is a real npm release (published ~December 2025) and remains the latest stable as of September 2026. No correction needed.

- **confirmed** @supabase/supabase-js 2.116.0 is a real, current npm release (published within days of this review) with no newer stable superseding it. No correction needed. (Note: a separate CLI package literally named `supabase` is on 2.117.0 — different package, not a contradiction.)

- **confirmed** Render's free tier claims check out: no credit card required to deploy a free web service, and the 15-minute-inactivity sleep behavior is accurate and still current in 2026 (aside from the cold-start-duration wording flagged above).

## Sources consulted
- https://react.dev/blog/2026/09/09/react-19-3
- https://github.com/react/react/releases/tag/v19.3.0
- https://vite.dev/releases
- https://www.npmjs.com/package/vite?activeTab=versions
- https://medium.com/@onix_react/vite-8-0-released-fbf23ade5f79
- https://www.npmjs.com/package/express?activeTab=versions
- https://www.herodevs.com/blog-posts/express-3-is-eol-express-4-is-next-the-2026-support-reference
- https://dev.to/endoflifeai/nodejs-22-lts-eol-date-support-timeline-and-what-comes-next-30dm
- https://eolradar.com/node-js-20-end-of-life-2026/
- https://newreleases.io/project/npm/@supabase/supabase-js/release/2.116.0
- https://www.npmjs.com/package/@supabase/supabase-js
- https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026
- https://justinmckelvey.com/blog/is-render-free
- https://www.fencode.dev/en/blog/vercel-free-vs-pro-2026-official-limits-pricing
- https://kuberns.com/blogs/railway-free-tier/
- https://www.saaspricepulse.com/blog/flyio-free-tier-2026
- https://fly.io/docs/about/free-trial/
