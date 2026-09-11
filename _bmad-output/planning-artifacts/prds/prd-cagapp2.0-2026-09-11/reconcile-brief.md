---
title: "Reconciliation: brief.md (+ addendum.md) vs prd.md — CagApp 2.0"
created: 2026-09-11
---

# Reconciliation: Brief → PRD (CagApp 2.0)

**Source (ground truth):**
`_bmad-output/planning-artifacts/briefs/brief-cagapp2.0-2026-09-10/brief.md`
`_bmad-output/planning-artifacts/briefs/brief-cagapp2.0-2026-09-10/addendum.md`

**Derived document:**
`_bmad-output/planning-artifacts/prds/prd-cagapp2.0-2026-09-11/prd.md`

## Method

Read both source documents fully, then read the PRD fully, then searched the PRD for the specific language, names, and framings used in the brief/addendum to confirm presence or absence rather than relying on paraphrase-matching alone. Items explicitly marked as deferred to v1.1 or out of scope in the PRD (photos, text comments, English/i18n, business accounts, moderation, gamification) are **not** treated as gaps — the PRD correctly carries these forward from the brief's "Fuera de la v1" list. Likewise, the addendum's data-monetization idea is correctly captured as a deferred, non-v1 direction (§Monetización, Pregunta Abierta 1, `[NOTE FOR PM → Arquitectura]`) — that's a scoping decision faithfully carried forward, not a gap.

## Gaps Found

### 1. The brief's aspirational "Visión" is narrowed to a data-asset business case; the personality/humor driving it is dropped
The brief's Visión section has two components: (a) a tongue-in-cheek founder joke — *"Llega Google y me la compra por una cantidad millonaria y yo no vuelvo a pensar en trabajar"* — explicitly framed as "la meta no tan secreta," and (b) a serious aspirational picture: CagApp becoming *"la referencia obligada antes de salir de casa en cualquier ciudad donde exista — con miles de baños calificados por check-ins reales, no reseñas genéricas de Google Maps."*

The PRD's §1 Vision and §Monetización sections carry forward only the data-as-asset logic (data become valuable, could attract a "comprador/patrocinador estratégico"). Both the humor (the Google-buyout joke, which is a direct expression of the founders' irreverent voice) and the "become the go-to reference in every city" aspirational framing are absent — not deferred, not contradicted, just gone. Given the brief explicitly frames the joke as capturing "the not-so-secret goal," its disappearance is a loss of founder voice/intent, not a legitimate scoping trim.

### 2. The mutual interdependence between the two personas is not stated anywhere
The brief's "Quién Usa Esto" section closes with a specific insight that motivates why *both* personas must be designed for, not just prioritized independently: *"Ambos tipos de usuario se necesitan mutuamente: sin reseñadores entusiastas no hay suficientes datos para que los buscadores con urgencia encuentren algo útil, y sin gente con una necesidad real, la app pierde su razón de ser práctica."*

The PRD's §2 (Target User) lists both personas' JTBDs and journeys (UJ-1, UJ-2) individually and well, but never states this flywheel/symbiosis rationale. This isn't a feature that can be individually "implemented," which is exactly the kind of intangible reasoning a feature-list-oriented PRD tends to silently drop — yet it's the strategic justification for why the product needs *both* the fun/social loop and the utility loop, and it's absent from the PRD entirely (confirmed via search — no occurrence of "mutuamente" or equivalent framing).

### 3. "Qué Hace Diferente a CagApp" — the competitive-positioning narrative is not carried into the PRD
The brief has a dedicated section explaining CagApp's differentiation along three axes (cobertura amplia vs. niche competitors like Refuge Restrooms; enganche por diversión vs. Flush being "puramente funcional y sin personalidad" and Google Maps not treating baños as a category; utilidad real), plus an explicit "ventaja honesta" framing (no secret tech/moat — the combination itself is the advantage) and the point that check-in-gated data is more trustworthy than an unverified open form.

The PRD's §1 Vision only reuses one fragment of this (the check-in-verification trust claim vs. "Flush, SitOrSquat, Google Maps"). It drops: the Refuge Restrooms niche-coverage comparison (not mentioned anywhere in the PRD), the specific characterization of Flush as personality-less, and the "ventaja honesta" framing. This is meaningful competitive-strategy context that grounds several product decisions (why tone/fun matters as a moat, why broad coverage matters) and it has no home in the PRD — not a §Constraints item, not a Vision bullet, nothing.

### 4. Minor: "sin fricción innecesaria" as an explicit design principle is dropped
The brief's Solución section states the experience should be "divertida y ligera — con emojis, un tono chusco y sin fricción innecesaria." The PRD's "Aesthetic and Tone" section captures the fun/emoji/chusco tone well (and expands on it nicely — the "brand doesn't take itself seriously" framing is a faithful and even richer rendition), but the explicit "no unnecessary friction" principle isn't restated as a design/UX principle anywhere (e.g., in Information Architecture or the feature descriptions). This is minor since low-friction flows are arguably implied by the journeys (FR-7 through FR-10 are short flows), but the principle itself, as a named intent, doesn't appear.

## Non-Gaps (verified as legitimately carried forward, not flagged)

- Photos, text comments, English/i18n, business accounts, moderation, gamification — all explicitly deferred to v1.1 or "sin fecha definida" in both brief and PRD §5/§6, consistent.
- Data-as-future-asset (addendum) — correctly reflected in PRD §Monetización, §6.2, Pregunta Abierta 1, and the `[NOTE FOR PM → Arquitectura]` instructing the data model be designed for future exploitation. The addendum's more granular sub-ideas (government open-data partnerships, per-business competitive insights, diversifying away from single-sponsor dependency per the SitOrSquat lesson) are compressed into a generic "licenciable a gobiernos municipales o negocios" — a reasonable compression of a document explicitly marked as not a v1 product decision, not a dropped idea.
- Success criteria (50 baños, retorno espontáneo) — preserved verbatim as SM-1/SM-2.
- 1–5 rating scale semantics ("un desastre" / "limpio, amplio y hasta huele bien") — preserved in Glossary.
- "Buscar antes de crear" anti-duplicate flow — preserved as FR-7.
- Tone/voice (fun, emoji-forward, "chusco," brand doesn't take itself seriously) — preserved and well-developed in the dedicated "Aesthetic and Tone" section.
