# Spine Pair Review — CagApp 2.0

## Overall verdict

The pair does the mechanical basics well: both PRD journeys are fully dramatized with named protagonists and climax beats, every color token carries a real hex value, and both documents follow their canonical section shapes almost exactly. But a downstream consumer building strictly from these spines will hit real friction: two full IA surfaces (Crear Baño, Perfil) have zero defined states, component names drift between DESIGN.md and EXPERIENCE.md for nearly every shared component (a literal-name join would fail), one `{path.to.token}` reference is broken, and one real UI element in an approved mockup — a public per-user ratings list — has no spec anywhere and raises an un-flagged privacy question. Neither file has been promoted out of draft (mocks still live in `.working/`, `status: draft` on both), so this reads as mid-Finalize rather than handoff-ready. None of this is unusable, but it is not yet a clean contract.

## 1. Flow coverage — strong

Checked: PRD §2.3's two Key User Journeys (UJ-1 Mario, UJ-2 Ana) against EXPERIENCE.md § Key Flows.

Both UJ names are carried verbatim from the PRD headers, each with a named protagonist, numbered steps, an explicit **Climax:** beat, and at least one failure/edge path (UJ-1: no-bathroom-nearby and geolocation-denied; UJ-2: rate-without-check-in). No PRD journey is missing a Key Flow, and no Key Flow lacks the required elements. This is the cleanest category in the pair.

### Findings
- **low** The mandatory login/registration gate — the single biggest behavioral divergence from the PRD, per `.memlog.md` line 9 — is never dramatized as its own flow; it only appears as step 2 inside UJ-1 (EXPERIENCE.md line 127). Its own failure paths (duplicate email, wrong credentials) live only in the State Patterns table, disconnected from a narrative. *Fix:* add a short "first-time gate" flow, or at minimum cross-link UJ-1 step 2 to the relevant State Patterns rows.

## 2. Token completeness — strong

Checked: every key in DESIGN.md's `colors`, `typography`, `rounded`, `spacing`, `components` frontmatter, and every `{path.to.token}` reference in both files' prose.

All 12 color tokens carry hex values (no missing color is a real risk here — the palette is single-theme, light-only, and documented as such). All typography roles specify family/size/weight. All `rounded` and `spacing` scale entries resolve. Every frontmatter `components` object token resolves to a real color/typography/rounded token. Nearly every prose `{...}` reference in DESIGN.md resolves cleanly.

### Findings
- **critical** EXPERIENCE.md's Accessibility Floor references `{colors.background}` (EXPERIENCE.md line 115: "Text contrast against `{colors.background}` / `{colors.surface}`..."), but DESIGN.md's frontmatter has no `background` key — the actual token is `bg` (DESIGN.md line 18). This reference does not resolve. *Fix:* change to `{colors.bg}`, or rename the DESIGN.md token if `background` is the intended long-term name.
- **medium** No contrast ratio is stated anywhere for load-bearing combinations (`text` on `bg`/`surface`, `primary-ink` on `primary`, `muted` on `surface`), yet EXPERIENCE.md's Accessibility Floor (line 115) explicitly defers to "whatever exact ratios DESIGN.md specifies" — DESIGN.md specifies none (Colors section, lines 149–164). *Fix:* add at least a one-line contrast statement per load-bearing pair, or an explicit `[GAP]` matching the doc's existing honesty pattern.
- **low** The Mapa/Lista toggle pill has full body-level visual rules (DESIGN.md line 221) but no entry in the frontmatter `components` object (unlike `fab`, `overlay-icon-button`, etc. — lines 73–136). *Fix:* add a `toggle-pill` component token for parity with the FAB/profile-button tokens it visually resembles.

## 3. Component coverage — thin

Checked: every component name appearing anywhere in DESIGN.md § Components, EXPERIENCE.md § Component Patterns, and the three approved mockups, cross-matched for a real (not one-word) row in both files.

Most components that appear in a mockup have *some* coverage in both files, but one visible mockup element is undocumented anywhere, and several DESIGN.md components have no EXPERIENCE.md behavioral counterpart at all.

### Findings
- **critical** `.working/key-detalle-checkin.html` (Estado A, lines 367–372) renders a "Lo que dice la gente" list — named individual users ("Ana R.", "Mario T.", "Karla V.") each shown with their own star rating and a relative date. This component appears nowhere as a spec: DESIGN.md mentions it exactly once, only to justify the `meta` typography role (line 175), and EXPERIENCE.md's Component Patterns table (lines 68–79) has no row for it at all. Beyond the missing spec, this is a real, unflagged product question: nothing in the PRD, DESIGN.md, or EXPERIENCE.md establishes that other users' names/ratings are ever shown publicly — FR-11's Perfil is explicitly private, own-activity-only (PRD line 92–95) — so this mockup element may be introducing a public-attribution surface with no owner. *Fix:* either add a full component spec (data source, name-display rule, privacy sign-off) or strike it from the mockup as exploratory-only and say so.
- **high** Component names are not held identical between DESIGN.md § Components and EXPERIENCE.md § Component Patterns for nearly every shared component: "Pin de mapa" (DESIGN.md line 223) vs. "Map pin badge" (EXPERIENCE.md line 70); "Toggle Mapa/Lista" (DESIGN.md line 221) vs. "Mapa/Lista toggle pill" (EXPERIENCE.md line 71); "Botón-ícono flotante (Perfil)" (DESIGN.md line 220) vs. "Perfil icon" (EXPERIENCE.md line 72); "Tarjeta hero / detalle de baño" (DESIGN.md line 224) vs. "Detalle hero card" (EXPERIENCE.md line 74); "Banner de estado (rango / confirmación)" (DESIGN.md line 226) vs. a split into "Range-status chip" (EXPERIENCE.md line 75) with the confirmation-banner half only described inside a State Patterns cell (line 94), never its own Component Patterns row. A consumer joining the two tables by literal name fails on every one of these. See also § 7 below. *Fix:* pick one canonical name per component and use it verbatim in both files (Spanish or English, either is fine — consistency is what matters).
- **medium** "Segmented tabs" and "Input de texto" both have full DESIGN.md visual rows (lines 216–217) but no corresponding EXPERIENCE.md Component Patterns row — e.g., does switching Iniciar-sesión/Crear-cuenta preserve entered field values? What is the input's error/focus treatment? *Fix:* add behavioral rows for both, even if brief.
- **medium** "Score-tag / badge de calificación" has a DESIGN.md visual row (line 225) but no EXPERIENCE.md Component Patterns row — the rule for how its qualitative suffix ("— ¡una joya!") is chosen per score band is undocumented. *Fix:* add a row, or fold the rule into the existing Rating scale list row with an explicit cross-reference.
- **low** "Duplicate-search step" and "Creation form" (EXPERIENCE.md lines 78–79, Crear Baño) have no DESIGN.md visual counterpart — but this is already self-flagged honestly in DESIGN.md's own `[GAP]` paragraph (line 235), so it is not a silent miss. *Fix:* none required beyond eventually closing the gap already tracked.

## 4. State coverage — thin

Checked: every IA surface in EXPERIENCE.md's Information Architecture table (Login/Registro, Mapa, Lista, Detalle de Baño, Check-in/Calificar, Crear Baño, Perfil) against the State Patterns table (lines 83–97) for empty / cold-load / error / offline / permission-denied states as applicable.

Detalle de Baño and Check-in/Calificar are well covered (no-ratings-yet, in-range, out-of-range, GPS-insufficient, success, re-rate, rate-without-check-in — 6 distinct rows). Two full surfaces have none at all.

### Findings
- **high** Crear Baño (FR-7/FR-8, EXPERIENCE.md IA line 32) has zero rows in State Patterns. Missing at minimum: what happens when the 1.5 km duplicate search *does* find a match (does the form stay blocked? does it offer a shortcut into the existing bathroom's check-in?); a creation-form validation-error state; a creation-success confirmation state. *Fix:* add at least these three rows before this surface goes to build.
- **high** Perfil (FR-11, EXPERIENCE.md IA line 33) has zero rows in State Patterns — no "no activity yet" empty state for a brand-new user, despite this being the very first thing every new account's Perfil shows. *Fix:* add an empty-state row; consider the emotional framing already surfaced in `reconcile-sources.md` Gap 5.
- **medium** Mapa has a "no bathrooms nearby" (empty-result) row and a "permission denied" row (lines 88–89) but no plain in-flight loading/cold-fetch state for pins — despite the Cross-Cutting NFR requiring Mapa interactive in <3s (PRD line 249, echoed in EXPERIENCE.md Responsive & Platform line 165), which makes that window load-bearing. *Fix:* add a loading/skeleton row.
- **medium** Login/Registro has rows for duplicate email and wrong credentials (lines 86–87) but none for a weak/invalid password at registration, despite FR-1's explicit consequence that a minimum password length is enforced (PRD line 80). *Fix:* add a row.
- **low** Detalle de Baño has no state for a stale or invalid deep link (bathroom deleted/nonexistent). Lista has no state of its own beyond sharing Mapa's empty-result row, and no independent loading state. *Fix:* low priority — note as open if not addressed before build.

## 5. Visual reference coverage — adequate

Checked: all four files under `.working/` (`color-themes-1.html`, `key-login.html`, `key-mapa.html`, `key-detalle-checkin.html` — confirmed via directory listing; there is no `mockups/`, `wireframes/`, or `imports/` yet) against inline references in both spines.

None of the four files is an orphan — each is cited at least once. EXPERIENCE.md's treatment is strong: its Information Architecture table has a per-surface "Mock status" column naming the exact relative path per surface, distinguishing Estado A/B within `key-detalle-checkin.html`, and a single "Composition reference... Spine wins on conflict" line (line 37) states the precedence rule exactly once, as the rubric wants. DESIGN.md's treatment is weaker and more generic.

### Findings
- **high** None of the three approved key mocks has been promoted from `.working/` to a `mockups/` (or `wireframes/`) directory, and both DESIGN.md and EXPERIENCE.md remain `status: draft` (DESIGN.md line 4, EXPERIENCE.md line 3). Per this skill's own Finalize step ("Promote `.working/` keepers to `mockups/`... Inline relative links at relevant spine sections; state spines-win-on-conflict once"), this step has not run. Functionally the links still resolve today, but `.working/` is conventionally scratch space — a later cleanup could silently break every reference in this pair. *Fix:* run the promotion + finalize-status step before treating this as a handoff-ready contract.
- **medium** DESIGN.md links `color-themes-1.html` inline at the right spot (Colors, line 151) but never links the three key mocks individually next to the components they actually source from — the only mention of all three together is a passing aside about the device-frame chrome (line 199, "los tres archivos `.working/key-*.html`"). The richest source mock for the star picker, segmented tabs, and wordmark is never named at the point those components are described (lines 215–227). *Fix:* add a one-line inline citation per component description, matching EXPERIENCE.md's per-surface precision.

## 6. Bloat & overspecification — strong

Checked both files for pixel-spec restatement of tokenized values, source restatement (personas/FRs/scope), prose where a table would do, and untied decorative narrative.

Both files are disciplined: tables are used throughout, `[GAP]`/`[NOTA]` tags are honest rather than papered over, and DESIGN.md's editorial prose earns its place (explaining *why* the emoji/pill/no-shadow choices exist, not just restating them).

### Findings
- **low** DESIGN.md's Brand & Style third paragraph (line 147) restates platform/scope facts ("solo español, solo CDMX, solo web responsiva mobile-first") that belong to EXPERIENCE.md's Foundation and the PRD's Platform section, not to a visual-identity document. Minor scope bleed, not misleading. *Fix:* trim to a cross-reference if this document is revised again.
- **low** The "verbo + emoji" button-copy convention and its example strings are restated near-identically in both DESIGN.md Typography (line 173) and DESIGN.md Components (line 218). *Fix:* state once, cross-reference the second time.

## 7. Inheritance discipline — thin

Checked: `sources` frontmatter resolution, UJ names verbatim from PRD, Glossary term consistency, component-name identity across files, and EXPERIENCE.md token references resolving into DESIGN.md by name.

UJ names and Glossary terms (Baño, Calificación vigente, Check-in, Usuario, Cuenta) are used consistently with the PRD in both files — no drift found there. The other two checks fail.

### Findings
- **high** Component names are not identical across the two files' component sections — see § 3 above for the full list (Pin de mapa/Map pin badge, Toggle Mapa/Lista/Mapa-Lista toggle pill, etc.). This is the exact failure mode this check exists to catch.
- **medium** `sources:` frontmatter is incomplete and inconsistent between the two files. `.memlog.md` line 6 records that the user confirmed `brief.md`, `addendum.md`, and `prd.md` as sources, and `addendum.md` exists at `_bmad-output/planning-artifacts/briefs/brief-cagapp2.0-2026-09-10/addendum.md` (confirmed present) — yet neither DESIGN.md's `sources` (lines 6–13) nor EXPERIENCE.md's `sources` (lines 6–8) lists it. Separately, EXPERIENCE.md's `sources` list omits `.memlog.md` and the three mock files even though its own body cites and depends on both repeatedly (e.g. line 21's direct memlog citation, the entire Mock-status column) — DESIGN.md lists all of these correctly. *Fix:* align EXPERIENCE.md's `sources` list with DESIGN.md's practice and add `addendum.md` to both.
- **critical (cross-ref)** The broken `{colors.background}` reference from § 2 is also, strictly, an inheritance-discipline failure (an EXPERIENCE.md token reference that does not resolve into DESIGN.md by name) — not re-counted here to avoid double-scoring, but it belongs to this check too.

## 8. Shape fit — adequate

Checked: DESIGN.md's canonical section order, EXPERIENCE.md's required-default section set, and whether triggered/omitted sections are defensible.

DESIGN.md's eight sections appear in exactly the canonical order (Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts). EXPERIENCE.md's eight required defaults are all present, in the documented order, plus a well-justified "Responsive & Platform" section (correctly triggered by the hard geolocation/platform dependency).

### Findings
- **high** EXPERIENCE.md's Foundation section (line 17) argues for omitting "Inspiration & Anti-patterns" — "no other aesthetic inspiration reference exists for this product" — in the very same sentence that states the IA pattern "is lifted from Foursquare's check-in pattern." That is itself an inspiration citation, and it is not the only one: the product's own name references "Foursquare de los baños" (PRD Vision, line 16), and DESIGN.md's Colors section names the accent color as "inspirado en el acento de marca de Foursquare/Swarm" (DESIGN.md line 145). The PRD's competitive section also supplies ready anti-pattern material (Flush "sin personalidad," SitOrSquat's marketing-driven death, Refuge Restrooms' narrow niche — PRD lines 20) that maps directly onto a "Rejected" bullet list, exactly as modeled in `experience-example-mobile.md`'s own Inspiration & Anti-patterns section. The trigger condition for this required-when-applicable section is clearly met; omitting it drops real rationale (why this specific mechanic, why not a gamification-first competitor model) that a downstream consumer would otherwise have to reconstruct from the PRD alone. *Fix:* add a short Inspiration & Anti-patterns section — it can be brief.
- **low** EXPERIENCE.md's frontmatter (lines 1–9) has no `name` field, unlike `experience-example-mobile.md`'s frontmatter (which carries `name: Quill`). Both CagApp files also carry `title`/`status`/`created` keys not defined in `references/design-md-spec.md`'s frontmatter token list — this reads as a consistent house convention layered on top of the Google Labs spec rather than an error, but is worth confirming intentional. *Fix:* none required if this is a deliberate project-wide convention; add `name` for parity with the example otherwise.

## Mechanical notes

- One broken cross-reference confirmed: `{colors.background}` (EXPERIENCE.md line 115) should be `{colors.bg}` (DESIGN.md line 18).
- `sources` frontmatter is present and mostly resolves in both files, but is incomplete (see § 7): `addendum.md` missing from both; `.memlog.md` and the three mocks missing from EXPERIENCE.md's list despite being relied on throughout its body.
- Both files carry `status: draft` — this pair has not been through the Finalize polish/promotion step yet (mocks still in `.working/`, not promoted to `mockups/`); treat this review as pre-handoff feedback, not a final-contract audit.
- A separate `reconcile-sources.md` already exists in this workspace and independently surfaced five "why-behind-the-decision" gaps (data-retention rationale, the two-persona flywheel framing, the no-notifications design principle behind SM-2, the missing privacy-constraint acknowledgment, and Perfil's emotional framing) plus a naming-ambiguity note on "Lo que dice la gente" vs. the Rating scale list. These are orthogonal to this rubric but should be resolved in the same pass, since two of them touch findings above (Perfil's empty-state priority; the undocumented "Lo que dice la gente" component).
- No Mermaid diagrams present in either file — not applicable.
