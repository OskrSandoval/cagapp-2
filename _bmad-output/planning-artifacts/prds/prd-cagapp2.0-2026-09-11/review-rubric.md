# PRD Quality Review — CagApp 2.0

## Overall verdict

This PRD is well-built for its stakes: a solo-builder consumer app with genuine, specific decisions (150m check-in radius, 1.5km duplicate-search radius, rating-replaces-rating semantics), honest scope-cutting, and two personas that actually drive every FR. It is not theater. What's at risk is downstream: one unresolved contradiction between the rating-overwrite mechanic and the stated "data as long-term asset" thesis could silently undercut the product's own value proposition if architecture doesn't catch it, and one Success Metric (SM-2) has no measurable bar, leaving the MVP's central "community hook" claim unfalsifiable. Fix those two and this PRD is solid to build from.

## Decision-readiness — adequate

Real decisions are stated as decisions with concrete numbers, not hedged as "considerations": FR-9's 150m check-in radius, FR-7's 1.5km duplicate-search radius, and the Glossary's rating-replaces-rating rule are all tagged `[confirmado por skr]` and read as settled. The `[NOTE FOR PM]` at §4.1 (profile scope left undefined) and the two-part monetization note (§6.2, §Monetización) sit at genuine tensions — not safe checkpoints — which is exactly what the rubric wants.

The Open Questions in §8 are genuinely open (Q1 has no trigger defined; Q2 defers actual game-mechanic design), not rhetorical.

### Findings
- **critical** Rating-overwrite mechanic contradicts the stated data-preservation intent (§3 Glossary "Calificación" vs §Monetización note) — The Glossary states a new check-in+rating "**reemplaza** la Calificación anterior" of that user on that Baño. But the Monetización section's `[NOTE FOR PM → Arquitectura]` insists the data model must preserve "check-ins, calificaciones, ubicaciones, tipos de baño, **series de tiempo**... no descartada ni agregada de forma que impida análisis o licenciamiento futuro," because the collected data is framed in the Vision as CagApp's long-term asset. "Reemplaza" is ambiguous as to whether the prior rating is hard-deleted or soft-replaced (superseded but retained for time-series analysis) — and the PRD never reconciles this. If architecture reads "reemplaza" literally, the product silently forfeits the historical rating series that the Vision and Monetización sections both call foundational to the long-term thesis. *Fix:* Add an explicit consequence to FR-10 or the Glossary entry clarifying that "reemplaza" means the previous rating stops counting toward the current average and stops being editable by that user, but the record itself is retained (soft-superseded) for future analysis — or state plainly that history is discarded and accept that trade-off explicitly.
- **low** No trade-off framing on "no moderation beyond check-in" (§5) — The decision not to moderate bad-faith ratings is stated flatly; the risk being accepted (troll ratings, review-bombing a competitor's bathroom) is only implicitly addressed via the SM-C1 counter-metric, not named as a conscious trade-off. *Fix:* One sentence naming what's being risked and why it's acceptable at MVP scale would close this.

## Substance over theater — strong

No theater found. Two personas (Buscador con Urgencia, Reseñador Entusiasta) each anchor a UJ and are referenced by ID (`Realiza UJ-1` / `Realiza UJ-2`) on the FRs they justify — they earn their place rather than decorating the doc. The Vision (§1) names three specific competitors (Flush, SitOrSquat, Google Maps) and states a specific mechanism for differentiation (check-in-gated ratings) rather than a generic "we're better" claim — it would not swap cleanly into another PRD. The single NFR present (§4.4, location privacy) is specific and falsifiable, not "must be secure/scalable" boilerplate. No findings.

## Strategic coherence — adequate

The thesis — verified check-ins are the trust mechanism competitors lack — is stated once in Vision and then actually drives scope: FR-7 (search before create) and FR-9/FR-10 (check-in gates rating) are the mechanical expression of that thesis, and §5/§6.2 cut everything that doesn't serve it (photos, comments, gamification, business accounts). SM-C1 as a named counter-metric against SM-1 is a genuine coherence strength — it prevents optimizing registration count at the expense of data trust, which is the whole thesis.

### Findings
- **high** SM-2 has no measurable threshold (§7) — "Usuarios que regresan a calificar más de una vez sin que se les pida — objetivo cualitativo: observar retorno espontáneo como señal." This is the metric meant to validate the community-hook part of the thesis, and it has no number, rate, or timeframe — just "observe." As written, there is no way to know after launch whether this succeeded or failed. *Fix:* Even a rough bar ("X% of raters return within N weeks") would make this falsifiable; if truly too early to set one, mark it `[SUPUESTO]` and flag it for revisit post-launch rather than leaving it permanently qualitative.

## Done-ness clarity — adequate

Most FRs carry testable consequences with real numbers: FR-9's 150m threshold, FR-7's 1.5km radius, FR-10's "no path to rate without check-in, not even by direct URL." FR-6's empty-state handling ("si el Baño no tiene ninguna Calificación... lo indica en vez de mostrar un promedio vacío o en cero") is a good example of a concrete, testable edge case. Where the PRD is genuinely uncertain (password policy, geolocation-denied fallback), it uses `[SUPUESTO]` rather than a vague adjective standing alone — that's the right move, though the underlying vagueness is still a gap for whoever implements it.

### Findings
- **medium** No performance/latency bounds anywhere, despite urgency being the primary JTBD (§2.1: "Como buscador con urgencia... quiero encontrar rápido uno cercano") — The map load, geolocation permission round-trip, and list-reorder-on-move (FR-5) have no time bound ("rápido" is asserted in the JTBD but never operationalized as a requirement). For a product whose entire premise is a user under time pressure, the absence of any target (e.g., map interactive within N seconds on 4G) is a real gap, not a nice-to-have. *Fix:* Add a lightweight NFR under Platform or Constraints with a rough bound, even a soft one.
- **medium** 150m check-in radius (FR-9) doesn't address GPS accuracy tolerance — Urban GPS drift (tall buildings, indoor bathrooms) commonly exceeds 150m in dense areas like CDMX, and FR-9's only stated consequence is rejection with an explanation when "fuera de rango" — there's no mention of retry guidance, accuracy-based tolerance, or what happens when a legitimately-present user can't get a fix tight enough. This directly affects UJ-2's climax (Ana's check-in succeeding). *Fix:* Either explicitly defer this to architecture as an `[ASSUMPTION]`, or add a consequence describing the retry/fallback behavior.

## Scope honesty — strong

§5 (No-Objetivos) and §6.2 (Fuera de Alcance) are thorough and mirror each other with reasoning attached to each cut item — most usefully, items are differentiated by *why* they're out: "se suma en v1.1" (scheduled) vs. "sin fecha definida" (business accounts) vs. "se evalúa si se vuelve un problema real" (moderation) — this is honest de-scoping, not a flat list. `[SUPUESTO]` tags mark genuine inferences rather than being sprinkled everywhere for cover. Open-items density (2 Open Questions, 4 inline `[SUPUESTO]`, 3 `[NOTE FOR PM]`) is proportionate to "between hobby and real launch" stakes — not excessive for a document meant to green-light building.

### Findings
- **low** Two inline `[SUPUESTO]` tags are not indexed in §9 (see Mechanical notes) — same underlying issue as the roundtrip gap noted below; listed here because it slightly weakens the "explicit omissions" claim for a reader who only checks §9.

## Downstream usability — adequate

The PRD states its own purpose as feeding UX and architecture (§0), so this dimension matters. The Glossary (§3) is used consistently — "Baño," "Calificación," "Check-in," "Usuario," "Cuenta" appear with stable meaning across Features, No-Objetivos, and Constraints. FR IDs (FR-1…FR-10), UJ IDs (UJ-1, UJ-2), and SM IDs (SM-1, SM-2, SM-C1) are contiguous with no gaps or duplicates.

### Findings
- **medium** "Perfil" surface in Information Architecture has no corresponding FR (§Information Architecture vs §4) — The IA section lists **Perfil** as a top-level MVP surface ("actividad propia del Usuario (baños calificados)") and tags its scope with `[SUPUESTO: alcance mínimo...]`, but no FR in §4 defines what the profile shows, how activity is listed, or any consequence for it — UJ-2's Resolution step even references it ("Ana ve su actividad reflejada en su perfil"). UX/architecture would have to invent this surface's requirements from a single assumption tag and a one-line UJ mention. *Fix:* Either add a minimal FR-11 for the profile/activity view, or explicitly fold it into an existing FR's consequences.
- **low** Inconsistent `Realiza UJ-X` tagging — FR-6 (bathroom detail view) is clearly part of UJ-1's path ("toca para ver el detalle") but carries no `Realiza UJ-1` tag, unlike FR-4 and FR-5. FR-7 (search-before-create) is explicitly part of UJ-2's path but carries no `Realiza UJ-2` tag, unlike FR-8/9/10. Not a resolution failure, just an inconsistency a downstream reader could stumble on. *Fix:* Add the tags for consistency.

## Shape fit — strong

This is a consumer product with meaningful UX, and the PRD is shaped accordingly: two named-protagonist UJs (Mario, Ana) that are genuinely load-bearing (every discovery/creation FR traces to one), not over-formalized with excess personas (rubric's >4-persona flag doesn't apply — there are 2), and not under-formalized either (a consumer app with zero UJs would have been a red flag; this one has UJs doing real work). Rigor is appropriately light for a "between hobby and real launch" solo-builder project — no enterprise-grade NFR scaffolding, no compliance traceability that wouldn't apply. No findings.

## Mechanical notes

- **Assumptions Index roundtrip gap** — §9 (Índice de Supuestos) indexes only 2 of the 4 inline `[SUPUESTO]` tags in the document. Missing from the index: the Information Architecture "Perfil" assumption (line ~225, "alcance mínimo, sin edición de perfil más allá de lo esencial") and the Constraints/Seguridad assumption (line ~244, "detalle técnico de implementación queda para arquitectura"). *Fix:* Add both to §9 for a clean roundtrip.
- **Cross-reference tagging inconsistency** — FR-6 and FR-7 lack the `Realiza UJ-X` tags that their sibling FRs in the same feature group carry (see Downstream usability finding above).
- **Glossary/ID continuity** — otherwise clean: no gaps in FR/UJ/SM numbering, no duplicate IDs, no unresolved cross-references, no detected glossary term drift (casing differences like "buscador con urgencia" in prose vs. "Buscador con Urgencia" in Glossary are normal defined-term capitalization, not drift).
- **UJ protagonist naming** — both UJs carry named protagonists (Mario, Ana) with contextual detail inline, per rubric.
- **Required sections** — all present for the agreed stakes: Vision, Target User (JTBD + Non-Users + UJs), Glossary, Features/FRs, No-Objetivos, Alcance del MVP, Métricas de Éxito, Preguntas Abiertas, Índice de Supuestos, plus supporting Aesthetic/IA/Monetización/Platform/Constraints sections appropriate to a standalone build reference.
