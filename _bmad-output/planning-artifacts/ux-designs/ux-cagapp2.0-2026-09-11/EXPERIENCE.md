---
title: "EXPERIENCE.md: CagApp 2.0"
name: CagApp 2.0
status: final
created: 2026-09-11
updated: 2026-09-11
sources:
  - ../../prds/prd-cagapp2.0-2026-09-11/prd.md
  - ../../briefs/brief-cagapp2.0-2026-09-10/brief.md
  - ../../briefs/brief-cagapp2.0-2026-09-10/addendum.md
  - .memlog.md
  - mockups/key-login.html
  - mockups/key-mapa.html
  - mockups/key-detalle-checkin.html
---

# CagApp 2.0 — Experience Spine

> Foursquare-style bathroom finder/check-in/rating app for Ciudad de México, Spanish-only v1. Mobile-first responsive web (no native apps). Paired with `DESIGN.md` (visual identity — colors, typography, components), authored in parallel; this spine cross-references its tokens by name using `{path.to.token}` syntax and never restates hex values or type sizes. Spines win on conflict with any mock, wireframe, or import.

## Foundation

Mobile-first responsive web, single codebase, no native iOS/Android app in v1 (`[confirmado por skr]`, PRD §5/Platform). No named UI system — `DESIGN.md` is the visual identity reference; this document owns behavior. Structural IA (map ⇄ list, tap-to-detail, check-in-gates-rating) is lifted from Foursquare's check-in pattern — see § Inspiration & Anti-patterns below for the full rationale and the rejected competitor models.

Brand posture: "chusco" (playful, irreverent but not sloppy) — see Voice and Tone. This tone is not just personality: it is what sustains the Reseñador Entusiasta's engagement (the payoff of calificar, of seeing their activity reflected in Perfil), and that engagement is what keeps the bathroom database populated between the Buscador con Urgencia's urgency spikes. The PRD is explicit that the two personas are **"el motor de crecimiento del producto, no dos audiencias separadas"** (PRD §2.1) — not two independent audiences to support in isolation, but one growth flywheel. See Key Flows below: UJ-1 and UJ-2 are presented as separate flows for clarity, but they feed each other (see cross-reference at the end of UJ-2). `DESIGN.md § Brand & Style` carries the same cross-link on the visual side.

Core loop is trust-through-verification: a rating only exists because someone's device proved they were physically at the bathroom (FR-9, FR-10).

**Privacy Floor.** The PRD confirms, as a hard guardrail (Constraints and Guardrails / Privacidad, `[confirmado por skr]`): a user's exact device location is **never shown to other users** — it is used only internally to validate a check-in and to center that same user's own map/list. This is why the map never shows "other users near you," and it is not satisfied-by-design just because it isn't mentioned elsewhere — it is a real, confirmed constraint that shapes what can be built here. It also directly interacts with the newly-confirmed "Lista 'Lo que dice la gente'" component (see § Component Patterns and § State Patterns): that list shows **who** rated a bathroom and **when**, which is a different disclosure than **where that user currently is** — the two must not be confused during build. Publicly attributing a rating to a name is a confirmed product decision (memlog, final decision); publicly exposing a user's live or historical location is not, and remains explicitly out of scope.

**⚠️ Confirmed divergence from current PRD text:** the memlog (`.memlog.md`, *change*, line 9) records that the user changed login/registration to be **mandatory before reaching the map** — there is no anonymous read-only browsing. This directly contradicts the PRD's current FR-4 and §4.1 ("Sin Cuenta, se puede navegar el mapa y la lista de Baños en modo lectura"). This spine treats the memlog decision as ground truth (it is the more recent, explicit UX decision and is baked into the approved `key-login.html` / `key-mapa.html` mockups). **The PRD needs a follow-up update pass (`bmad-prd`, Update mode) to reconcile FR-4/§4.1 with this decision** — flagged here, not resolved silently.

## Inspiration & Anti-patterns

**Inspiration.** The core IA pattern — map ⇄ list, check-in, tap-to-detail — is explicitly modeled on Foursquare's check-in mechanic (PRD Vision: "un Foursquare de los baños"; `DESIGN.md § Colors` names the accent color as inspired by the Foursquare/Swarm brand orange). This isn't a stylistic nod: check-in-as-verification is the entire trust mechanism the product's data quality depends on (FR-9, FR-10).

**Rejected models** (PRD §1 competitive section):
- **Flush** — a pure utility bathroom finder with, in the PRD's own words, "sin personalidad." Rejected as a UX model because CagApp's fun/community engagement (the Reseñador Entusiasta side of the flywheel) is core to the product, not incidental polish on top of a utility tool.
- **SitOrSquat** — a brand-sponsored novelty app that died once the sponsor's marketing interest lapsed. Rejected as a cautionary tale, not a UX model: it's the reason CagApp doesn't lean on a single sponsor-driven gimmick as its reason to exist.
- **Refuge Restrooms** — a narrow-niche-only finder (a specific category of bathroom, not general coverage). Rejected as a scope model because CagApp is meant to cover any bathroom type — gas stations, restaurants, malls, public street bathrooms — not one category.

## Information Architecture

| Surface | Reached from | Purpose | Mock status |
|---|---|---|---|
| Login / Registro | App open (cold, always, until authenticated) | Mandatory gate — email/password or Google/Facebook (FR-1, FR-2, FR-3) | Mocked — `mockups/key-login.html` |
| Mapa (home) | Successful login/registration | Default landing surface; pins colored by average rating within geolocated radius (FR-4) | Mocked — `mockups/key-mapa.html` |
| Lista | Toggle Mapa/Lista, top-right of Mapa/Lista | Same bathrooms as Mapa, sorted by distance (FR-5) | Spine-only — no HTML mock (memlog line 15) |
| Detalle de Baño | Tap a pin (Mapa) or a row (Lista) | Name, place type, avg rating, distance, check-in button (enabled only within 150 m, FR-9), plus the public "Lo que dice la gente" list of other users' ratings | Mocked — `mockups/key-detalle-checkin.html` (Estado A) |
| Check-in / Calificar | "Hacer check-in" on Detalle, when in range | Confirms check-in, then unlocks 1–5 star picker with playful captions (FR-10) | Mocked — `mockups/key-detalle-checkin.html` (Estado B) |
| Crear Baño | FAB Agregar Baño (floating, bottom, over Mapa/Lista) | Step 1: search existing bathrooms within 1.5 km (FR-7) → Step 2: creation form (name, location, place type) only after no duplicate confirmed (FR-8) | Spine-only — no HTML mock (memlog line 15) |
| Perfil | Ícono de Perfil, top-left of Mapa/Lista | Own check-in/rating activity only, no editing, no public profile (FR-11). **Design principle:** Perfil exists to make the Reseñador Entusiasta *feel their contribution counts* ("sentir que su calificación cuenta," brief/PRD JTBD) — it is an emotional payoff, not just a data view. Whoever mocks this surface should design against that bar, not against "list the rows." | Spine-only — no HTML mock (memlog line 15) |

Navigation model: **no bottom tab bar.** A persistent top bar carries a circular Ícono de Perfil (top-left) and a pill-shaped Toggle Mapa/Lista (top-right); both float over the map content (memlog decision, line 10/12). The FAB Agregar Baño is the only bottom-anchored persistent control, present on both Mapa and Lista. Detalle de Baño, Check-in/Calificar, and Crear Baño are all reached by drilling in (back arrow returns, one level at a time — no deep modal stacks).

Composition reference: `mockups/key-login.html`, `mockups/key-mapa.html`, `mockups/key-detalle-checkin.html`. Spine wins on conflict.

## Voice and Tone

Microcopy only. Brand aesthetic and posture live in `DESIGN.md.Brand & Style`. PRD's "Aesthetic and Tone" section sets the bar: chusco, emoji as part of the language (not decoration), never corporate-neutral — copy should read like something a Reseñador Entusiasta would share for fun.

| Do | Don't |
|---|---|
| "Entrar y encontrar baño 💩" | "Iniciar sesión" |
| "Necesitas cuenta para todo en CagApp — hasta para nomás ver el mapa." | "Debes autenticarte para continuar" |
| "Estás a tiro de piedra — dentro del rango para check-in ✅" | "Ubicación validada" |
| "¿Cómo estuvo el baño? Sé honesto, aquí nadie te juzga 👀" | "Califica tu experiencia" |
| "¡Check-in registrado! Quedó constancia de que sí estuviste aquí 🕵️" | "Check-in exitoso" |
| Emoji at a meaningful beat (confirmation, empty state, rating). | Emoji as constant decoration on every label. |

Star-rating captions (1–5) — used in the Check-in/Calificar star picker and anywhere an average rating needs a qualitative label:

| Stars | Caption | Status |
|---|---|---|
| 1 | 💩 Un desastre | Canonical (PRD Glossary, §3 "Calificación") |
| 2 | 😬 Sobrevivible, de panza | Inferred — matches brand voice, not PRD-literal text (per `key-detalle-checkin.html` authoring note); confirm before ship |
| 3 | 😐 Normalito, ni fu ni fa | Inferred — same as above |
| 4 | 🙂 Bien limpio, sin drama | Inferred — same as above |
| 5 | 🤩 Limpio, amplio y hasta huele bien | Canonical (PRD Glossary, §3 "Calificación") |

All 5 captions are confirmed (`[confirmado por skr]`) — 1 and 5 are PRD-literal glossary text, 2–4 are UX-authored and explicitly approved.

## Component Patterns

Behavioral only. Visual specs (color, radius, elevation, type) live in `DESIGN.md.Components`. Component names below are held identical to `DESIGN.md § Components` — join the two tables by name.

| Component | Used on | Behavioral rules |
|---|---|---|
| Pin de mapa | Mapa | Shows 🚽 + avg rating (e.g. "4.5★"). Color-coded by rating tier using `{colors.success}` (good), `{colors.primary}` (mid), `{colors.warning}` (bad) — tier thresholds are a product decision not yet made; flag as open. Tap target extends beyond the visual badge (≥24×24px, see `DESIGN.md`). Tap opens Detalle. |
| Toggle Mapa/Lista | Top-right, persistent | Two states only (Mapa ⇄ Lista); single tap flips the current surface, no intermediate state. Label always names the *other* surface ("Ver lista" while on Mapa). |
| Ícono de Perfil | Top-left, persistent | Circular tap target, `aria-label="Perfil"` (icon-only control, no visible text). Opens Perfil (own activity only, read-only). |
| FAB Agregar Baño | Bottom-center, floats over Mapa/Lista | Always visible and enabled regardless of geolocation state; tapping always routes through the FR-7 Paso de búsqueda de duplicados first, never straight to the Formulario de creación. |
| Tarjeta hero de Detalle | Detalle de Baño | Shows icon, name, place type, static star average, distance line, and a Chip de rango. Check-in button state depends entirely on the 150 m range check (see State Patterns). Back button, `aria-label="Volver"`, ~40–44px (see `DESIGN.md`). |
| Chip de rango | Tarjeta hero de Detalle | Binary: in-range (`{colors.success}`-toned, "✅ … dentro del rango") vs. out-of-range. Out-of-range copy/treatment is not mocked — spine-only gap, author before build. |
| Banner de confirmación | Detalle de Baño → Check-in/Calificar, immediately after a successful check-in | Distinct from the Chip de rango (that one is about eligibility, this one confirms an action already taken): appears once, right after check-in succeeds ("¡Check-in registrado! ... 🕵️"), then the Selector de calificación unlocks in the same view (mocked, Estado B). Not dismissible by the user — it simply precedes the star picker in the flow, it doesn't block it. |
| Pestañas segmentadas | Login/Registro | Single tap switches Iniciar sesión ⇄ Crear cuenta. Switching tabs **preserves whatever the user already typed** in fields common to both (e.g., email) — it does not clear the form; only fields exclusive to one tab reset. No intermediate/loading state between tabs. |
| Campo de texto | Login/Registro (and, once designed, Crear Baño) | Visible label always present (never placeholder-only). On validation error: field border/label switch to an error treatment (exact color TBD, not yet mocked — author against `{colors.warning}` if a color is needed) and an inline error message appears below the field; focus moves to the first invalid field on submit attempt. `id`/`for` association and, for the password field, `type="password"` are stated requirements — see `DESIGN.md § Components`. |
| Selector de calificación | Check-in/Calificar (only after a successful check-in) | 5 tappable stars, 1–5. Tapping a star fills it and every star to its left, and swaps the caption pill live. No half-stars. Never rendered before a check-in exists for this visit. Implemented as 5 real buttons/radios, each `aria-label="Calificar N de 5"`. |
| Etiqueta de calificación | Tarjeta hero de Detalle (and anywhere an average rating needs a qualitative label) | The qualitative suffix ("— ¡una joya!", etc.) is chosen by score band, using the same 5-point scale as the Lista de referencia de calificaciones / Voice and Tone's star-rating captions table — a score rounds to its nearest whole-star band for the purpose of picking a caption. Exact per-decimal rounding rule (e.g. how a 4.5 average picks between the 4- and 5-star caption) is not specified anywhere in source material — `[GAP]`, author at build time using the nearest-band rule as the default. |
| Lista de referencia de calificaciones | Check-in/Calificar | Static reference list of all 5 captions; the currently-selected row is visually distinguished. Purely informational, not independently tappable (the stars are the input). This is the component that `DESIGN.md`'s `meta` typography note originally called "filas de 'lo que dice la gente'" — that label was a naming collision with the separate, real Lista "Lo que dice la gente" component below; the two are unrelated and must not be conflated. |
| Lista "Lo que dice la gente" | Tarjeta hero de Detalle | **Confirmed feature** (memlog, final decision) — other users' ratings on this bathroom show publicly with their name; this is not a gap or an exploratory mockup element. Always visible on Detalle de Baño when the bathroom has at least one rating (see State Patterns for the zero-rater case). Shows recent check-ins/ratings, newest first; exact cap on number of entries (all check-ins vs. a capped "recent" window, e.g. last 10) is not specified in any source material — `[GAP]`, default to a capped "most recent N" list at build time rather than an unbounded feed, and revisit if product wants a "see all" expansion. `[NOTE FOR PM]` The PRD's Cuenta/Usuario FRs (§4.1) define no display-name field for a Usuario — FR-11's Perfil is explicitly private/own-activity-only and never establishes what name (real name? chosen handle?) shows on a *public* attribution surface. This is a new requirement this feature surfaces, not yet in the PRD; needs a decision before build (does registration collect/require a display name, and is it distinct from login email?). Per the Privacy Floor above, this list may show **who** rated and **when**, never **where** that user is/was beyond the fact that they were once at this specific bathroom (which is inherent to what a check-in is). |
| Paso de búsqueda de duplicados | Crear Baño (step 1) | Required gate before the Formulario de creación renders; searches existing bathrooms within 1.5 km (FR-7). No UI mock exists yet — author against this table only. See State Patterns for what happens when a duplicate *is* found. |
| Formulario de creación | Crear Baño (step 2) | Name, location (from device), place type. Only reachable after the Paso de búsqueda de duplicados reports no match. See State Patterns for validation-error and success states. |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Cold open, not authenticated | Any | Always routes to Login/Registro first — there is no anonymous read path (see Foundation divergence note). |
| Duplicate email at registration | Login/Registro | Reject with a clear, in-voice message (FR-1); do not silently overwrite or merge accounts. |
| Weak/invalid password at registration | Login/Registro | FR-1 requires a minimum password length (`[SUPUESTO]` in PRD — exact policy left to architecture); reject with an in-voice inline error on the Campo de texto, do not submit silently or truncate. Exact copy and minimum length not yet authored — not mocked. |
| Wrong credentials | Login/Registro | Reject with a clear message; forgot-password link always visible (does not apply to social accounts, FR-3). |
| Geolocation permission denied | Mapa (post-login) | Falls back to a search-by-zone-name input in place of the geolocated map centering (`[confirmado por skr]`). Exact search UI (autocomplete, list of CDMX neighborhoods, free text) not yet designed — author against this behavioral rule; no HTML mock exists. |
| Mapa loading / cold fetch | Mapa (post-login, before pins resolve) | Brief in-flight state while location + nearest pins load — load-bearing because of the Cross-Cutting NFR requiring Mapa interactive in <3s (see § Responsive & Platform). Not mocked; author a lightweight skeleton/spinner that doesn't block first paint of the map surface itself, only the pin layer. |
| No bathrooms registered nearby | Mapa / Lista | App states this plainly and invites the user to be first to add one (PRD UJ-1 edge case) — exact copy not yet authored; mock shows a generic `.zone-empty-hint` placeholder only. Lista shares this exact empty-result state with Mapa (same copy, same trigger) and additionally needs its own loading state, matching the Mapa loading/cold-fetch row above — not independently mocked. |
| Bathroom has no ratings yet | Detalle de Baño | Explicit "sin calificaciones todavía" style indicator — never shows an empty or zero average (FR-6 consequence). Exact copy not yet authored. |
| "Lo que dice la gente" with zero raters | Detalle de Baño | Conceptually the same pattern as "Bathroom has no ratings yet" above (never an empty list with no explanation) — reuse that copy/treatment rather than inventing a second empty-state pattern. In practice this state and the zero-average state above co-occur (no ratings at all means no raters to list), so they should render as one combined empty treatment, not two stacked ones. Not mocked. |
| Stale/invalid deep link (bathroom no longer exists) | Detalle de Baño | Low priority. Direct/deep link to a Baño that has been removed or never existed should show a brief "este baño ya no existe" style message and a way back to Mapa/Lista, rather than a raw error or blank screen. Not mocked, not urgent pre-launch. |
| In range for check-in (≤150 m) | Detalle de Baño | Check-in button enabled; Chip de rango shows success treatment (mocked, Estado A). |
| Out of range for check-in (>150 m) | Detalle de Baño | Check-in button disabled; system explains why (FR-9 consequence). Not mocked — author using the in-range Chip de rango as the visual counterpart. |
| GPS accuracy insufficient for check-in | Detalle de Baño / check-in attempt | System indicates the precision problem and **offers a retry — never a silent rejection** (FR-9 consequence, `[SUPUESTO]` in PRD for exact retry/tolerance mechanism, deferred to architecture). Treat this as a distinct state from simple out-of-range. |
| Check-in succeeds | Detalle de Baño → Check-in/Calificar | Banner de confirmación ("¡Check-in registrado! ... 🕵️") then Selector de calificación unlocks immediately in the same view (mocked, Estado B). |
| Attempt to rate without a prior check-in | Any entry point (deep link, direct URL, or UI) | Rejected; system explains the user must be physically checked in first (PRD UJ-2 edge case, FR-10 consequence). No UI route to the star picker may exist outside the post-check-in flow. |
| Re-check-in / re-rate a bathroom already rated by this user | Detalle de Baño → Check-in/Calificar | Allowed. New rating becomes the user's sole *vigente* rating for that bathroom and replaces the prior one in the average; the prior check-in/rating record is retained in data, not deleted (PRD Glossary "Calificación", FR-10). **Why retained, not hard-deleted:** this supports a future data-as-asset direction (PRD §Monetización, brief addendum) — the full check-in/rating history is meant to remain a structured, licenseable long-term dataset, not just a "current state" table. A future contributor should not "simplify" this into a hard-delete without revisiting that goal. No distinct UI treatment has been designed for "you've rated this before" — spine-only gap. |
| Duplicate found during the 1.5 km search (Crear Baño, step 1) | Crear Baño — Paso de búsqueda de duplicados | The Formulario de creación stays blocked — the app does not let the user proceed to create a new bathroom when a plausible match exists (FR-7). Instead it should offer a shortcut into the matched bathroom's own Detalle/check-in flow, so the user's actual goal (rate this bathroom) is still reachable without creating a duplicate. Exact match-list UI (single best match vs. a short list of candidates) not yet designed — not mocked, author against this rule. |
| Creation form validation error (Crear Baño, step 2) | Crear Baño — Formulario de creación | Same Campo de texto error treatment as Login/Registro (inline error, focus to first invalid field); required fields are name, location, place type (FR-8). Not mocked. |
| Creation success confirmation (Crear Baño, step 2) | Crear Baño — Formulario de creación → Detalle de Baño | On success the new Baño is immediately visible on Mapa/Lista for everyone (FR-8 consequence); the flow should land the creator on the new bathroom's own Detalle de Baño (where, per UJ-2, they are in range by construction and can check in immediately) rather than back on Mapa. Exact confirmation copy not authored — not mocked. |
| Perfil — no activity yet (new account) | Perfil | A brand-new user's Perfil has zero check-ins/ratings. Do not treat this as a generic "no data" empty state — per the design principle in § Information Architecture, Perfil's job is to make the Reseñador Entusiasta feel their contribution counts, so the empty state should read as an invitation ("todavía no has calificado nada — anímate" style, in-voice) rather than a flat data-table blank. Exact copy not authored — not mocked. |
| Session persistence | Any, after first login | Session persists across visits until explicit logout or expiry defined by architecture (FR-2) — never re-prompts login on every open. |

## Interaction Primitives

- Tap is the only required input — no gestures assumed beyond standard scroll.
- Mapa/Lista toggle is a single tap, instant swap, no transition semantics specified (defer animation choices to build; nothing here mandates one).
- Star picker: tap a star to set the rating; caption updates live with the tap, no separate "preview" step.
- FAB is always reachable without scrolling, on both Mapa and Lista.
- Back navigation is a single top-left arrow, one level at a time (Detalle → Mapa/Lista; Check-in/Calificar lives inside Detalle, not a separate stack level).
- **Not specified / do not invent:** pull-to-refresh, swipe actions, long-press, carousels. None appear in any mockup or memlog entry — treat as out of scope for v1 unless a future decision adds them.
- **Deliberately excluded — push notifications / re-engagement reminders:** the PRD's success metric SM-2 (≥20% of first-time raters repeat a check-in+rating within 60 days) is explicitly measured **"sin ningún recordatorio/notificación de por medio"** `[confirmado por skr]`. This is a design principle, not an oversight: organic return has to come from the experience itself (tone, community, the Perfil payoff), not from notification-driven re-engagement. A future contributor must not add "come back and rate again" push notifications as an obvious growth lever without first revisiting this metric's premise — doing so would undermine the very thing SM-2 is trying to measure.

## Accessibility Floor

Behavioral only. Visual contrast values live in `DESIGN.md`.

**Real gap:** the PRD contains no WCAG, screen-reader, or assistive-technology requirement anywhere in its NFRs or Constraints. This is not an oversight to quietly patch — it is an open scope question for a consumer public-facing product that should probably be resolved explicitly with the founder before launch. The floor below is a light, reasonable default for consumer mobile web, not a compliance claim:

- Tap targets should meet a minimum comfortable size (≈44×44 px) — the FAB, Ícono de Perfil, Toggle Mapa/Lista, and star targets in the mockups are already generously sized; hold that line in build. Two named exceptions currently undercut this: the map pin badge (visual pill is smaller than 24×24px and needs an invisible tap-area extension) and the Detalle back button (32px in the mock; must be ~40–44px, matching the profile icon) — see `DESIGN.md § Components` for the exact numbers.
- Text contrast against `{colors.bg}` / `{colors.surface}` should stay readable in direct outdoor sunlight (a realistic condition for this use case — "buscando baño en la calle"), independent of whatever exact ratios `DESIGN.md` specifies. `DESIGN.md § Colors` now states the load-bearing contrast ratios explicitly (all pass AA at the current, darkened token values) — this floor is about the real-world sunlight condition on top of the on-paper ratio, which no source material measures directly.
- The pin-badge rating tiers (good/mid/bad) currently encode meaning **by color alone** (`{colors.success}` / `{colors.primary}` / `{colors.warning}`); the numeric rating text is co-present on the badge, which partially mitigates this, but this should not be treated as solved — flag for a colorblind-safety pass.
- Icon-only controls (Ícono de Perfil, Detalle's back button) carry no visible text and need an explicit accessible name (`aria-label="Perfil"` / `aria-label="Volver"`) — see `DESIGN.md § Components`.
- Form fields (Login/Registro) have visible text labels, not placeholder-only labeling — keep this pattern for the Crear Baño form too. Each Campo de texto needs a real `id`/`for` association (not just visual proximity) and the password field needs `type="password"` — see Campo de texto's row in § Component Patterns.
- No screen-reader labeling, focus order, or reduced-motion behavior has been specified anywhere in source material — treat as open, not silently assumed "fine."

## Key Flows

### UJ-1 — Mario encuentra un baño confiable a media calle (buscador con urgencia)

Mirrors PRD §2.3 UJ-1, with screen-level behavioral detail the PRD's journey didn't specify.

1. Mario opens CagApp on his phone browser. He has an account from a previous session but is not currently authenticated.
2. **Mandatory gate:** Login/Registro appears — there is no way to see the map first. He logs in (email/password or social). This gate's own failure paths (duplicate email, wrong credentials, weak password at registration) aren't dramatized as their own flow here — see State Patterns rows "Duplicate email at registration," "Wrong credentials," and "Weak/invalid password at registration" for the behavior if this step doesn't go smoothly.
3. On success, Mapa opens automatically, requesting geolocation permission to center on him.
4. Pins render, color-coded by average rating, within his radius.
5. Mario taps the Toggle Mapa/Lista top-right → switches to Lista, sorted by distance.
6. He picks the best-rated bathroom three blocks away and taps its row.
7. Detalle de Baño opens: name, place type, "★★★★☆ 4.5 ⭐" tag, distance ("320 m de ti — como 4 min caminando"), plus the "Lo que dice la gente" list of what other users said.
8. **Climax:** the Chip de rango confirms he's within 150 m once he arrives ("✅ Estás a tiro de piedra"), and the check-in button becomes enabled — Mario has a confidence signal before he ever pushes the door.
9. Resolution: check-in/rating is optional here (Mario may or may not bother) — full rating flow is UJ-2.

Edge case (per PRD): if no bathroom is registered nearby, Mapa/Lista states this plainly and invites him to add the first one when he arrives somewhere — see State Patterns, copy not yet authored.

If Mario denies geolocation at step 3, Mapa falls back to a search-by-zone-name input instead of centering on him — see State Patterns, "Geolocation permission denied."

### UJ-2 — Ana registra y califica un baño nuevo por gusto (reseñadora entusiasta)

Mirrors PRD §2.3 UJ-2, with screen-level behavioral detail added.

1. Ana is already authenticated (mandatory gate already passed in an earlier session) and is physically inside a new café.
2. She opens CagApp → lands on Mapa (home).
3. She taps the FAB Agregar Baño.
4. **Paso de búsqueda de duplicados (FR-7)** runs first: the app checks for existing bathrooms within 1.5 km. None match this café. (If one had matched, she'd be routed into that bathroom's own Detalle/check-in instead — see State Patterns, "Duplicate found during the 1.5 km search.")
5. The Formulario de creación unlocks (FR-8): she enters name, confirms location (from device), and place type ("Cafetería").
6. The new bathroom is immediately visible to everyone on Mapa/Lista.
7. Ana opens its Detalle — she's inside the 150 m range by construction, so the check-in button is enabled. Her rating will also become the first entry in this bathroom's "Lo que dice la gente" list, publicly attributed to her name.
8. She taps "🚽 Hacer check-in aquí."
9. Banner de confirmación appears ("¡Check-in registrado! ... 🕵️"), and the Selector de calificación unlocks in the same view.
10. She taps 4 stars; caption swaps live to "🙂 4 — Bien limpio, sin drama."
11. **Climax:** she taps "Confirmar calificación 🚀" — her rating is published immediately, tied to her verified check-in, and the bathroom's average recalculates.
12. Resolution: Ana can later see this activity reflected in Perfil (her own check-ins/ratings only, per FR-11) — Perfil itself has no HTML mock; build against the Information Architecture table, including the emotional-framing design principle noted there.

Edge case (per PRD): if Ana attempts to rate without a valid check-in (e.g., she's too far away), the system rejects the rating and explains she must be physically present — see State Patterns, "Attempt to rate without a prior check-in."

**This is the other half of the growth flywheel** (see Foundation): Ana's UJ-2 activity is what populates the database that Mario's UJ-1 search above depends on. Neither journey is complete in isolation — a product with only urgency-driven searchers and no enthusiast reviewers has nothing to search, and vice versa.

## Responsive & Platform

Single mobile-first responsive web codebase — no native iOS/Android app in v1 (`[confirmado por skr]`). The three approved mockups are authored device-frame-first (375px reference width); layout must scale up gracefully for wider viewports (tablet/desktop browser) but no distinct desktop IA or navigation pattern has been designed — treat wider breakpoints as a fluid reflow of the same mobile-first structure, not a new surface, unless a future decision says otherwise.

Hard platform dependency: browser geolocation API, required for Mapa centering, Lista distance sorting, and check-in verification (FR-4, FR-9). When denied, the app degrades to search-by-zone-name (see State Patterns) rather than blocking entirely — but check-in itself (FR-9) has no non-geolocation path, since it exists specifically to verify physical presence.

Performance constraint carried into experience: per PRD Cross-Cutting NFRs, Mapa must become interactive (user location + nearest pins visible) in under 3 seconds on a typical mobile connection — this bounds how much can gate the first paint of the home surface (e.g., avoid blocking Mapa render on non-essential data).
