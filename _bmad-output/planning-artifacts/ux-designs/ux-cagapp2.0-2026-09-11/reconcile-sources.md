---
title: "Reconciliation: UX docs vs. source inputs — CagApp 2.0"
status: draft
created: 2026-09-11
---

# Reconciliation: DESIGN.md / EXPERIENCE.md vs. brief.md / addendum.md / prd.md

Scope of this pass: only gaps where something meaningful from the source documents has
**no trace at all** in DESIGN.md or EXPERIENCE.md, or where the UX docs restate a mechanic
but silently drop the *reasoning* behind it. Excluded per instructions (already honestly
flagged inside the UX docs themselves): missing mockups for Lista/Crear Baño/Perfil, no
WCAG requirement, undefined pin-color-tier thresholds, and the mandatory-login-vs-FR4
divergence (EXPERIENCE.md Foundation section).

---

## Gap 1 — The "why" behind data retention on re-rating is dropped

**Source:** PRD FR-10 is explicit that a new rating replaces the *vigente* rating for
display/average purposes only, and the old check-in/rating record is deliberately kept:
*"El registro de cada Check-in y Calificación anterior se conserva en el modelo de datos —
no se borra — para sostener el activo de datos de largo plazo descrito en §Monetización."*
This is a conscious strategic decision (data-as-future-asset), not an implementation detail.

**In the UX docs:** EXPERIENCE.md's State Patterns table ("Re-check-in / re-rate a bathroom
already rated by this user") restates the mechanic correctly — "the prior check-in/rating
record is retained in data, not deleted" — but never mentions *why*. A reader of the UX docs
alone would have no idea this retention exists to support a future data-licensing asset; it
reads as an arbitrary data-hygiene choice instead of a deliberate strategic one.

**Why it matters:** if this rationale isn't preserved anywhere near the design/experience
spec, a future contributor could "simplify" the data model (e.g., hard-delete superseded
ratings) without realizing that breaks a stated business goal.

---

## Gap 2 — The two-persona "flywheel" framing is flattened into two separate journeys

**Source:** Both the brief and PRD are explicit that the Buscador-con-Urgencia and
Reseñador-Entusiasta aren't just two use cases to support independently — they are one
growth mechanism. Brief: *"el mismo gancho que hizo crecer a Foursquare, y que mantiene viva
la base de datos entre un pico de urgencia y otro."* PRD §2.1: *"Ese ciclo es el motor de
crecimiento del producto, no dos audiencias separadas."*

**In the UX docs:** EXPERIENCE.md's Key Flows section presents UJ-1 and UJ-2 as two
independent, self-contained flows with no cross-reference back to this systemic framing.
DESIGN.md's Brand & Style section treats "chusco" tone purely as an aesthetic/personality
choice ("no se toma en serio a sí misma") — it never connects the tone back to *why* it
exists: to keep enthusiast reviewers engaged enough, for its own sake, to keep the database
alive between urgency spikes so the urgency-driven persona has something to find.

**Why it matters:** this is exactly the kind of "why behind a decision" a spec-table mindset
drops — the tone and the Perfil/activity feature aren't just style/features, they're load-
bearing for the product's core growth loop, and nothing in the UX docs says so.

---

## Gap 3 — No design principle capturing "organic return, no reminders"

**Source:** PRD success metric SM-2 is explicit: at least 20% of first-time raters repeat a
check-in+rating within 60 days, *"sin ningún recordatorio/notificación de por medio"*
`[confirmado por skr]`. This is a deliberate product philosophy — engagement has to come
from the experience itself (tone, community, feeling of contribution), not from
notification-driven re-engagement tactics.

**In the UX docs:** EXPERIENCE.md's Interaction Primitives section has a "Not specified / do
not invent" list (pull-to-refresh, swipe, long-press, carousels) but never mentions
push notifications or reminder mechanics — the one exclusion that actually has an explicit
metric and rationale behind it in the PRD. Nothing in either doc states that re-engagement
notifications are deliberately out of the design space for v1, or why.

**Why it matters:** without this being stated as a principle, a future contributor could
add a "come back and rate again" push notification as an obvious growth lever, directly
undermining the metric it would supposedly help.

---

## Gap 4 — No privacy note anywhere in the UX docs (PRD has an explicit constraint)

**Source:** PRD Constraints and Guardrails ("Privacidad") and the FR-9 NFR both state,
as confirmed decisions: the check-in only stores a Usuario–Baño–momento association (no
continuous location history), and *"la ubicación exacta del dispositivo de un Usuario nunca
se muestra a otros usuarios — solo se usa internamente para validar el check-in y centrar
el mapa/lista del propio Usuario."*

**In the UX docs:** neither DESIGN.md nor EXPERIENCE.md has any section addressing user
location privacy. EXPERIENCE.md has a dedicated "Accessibility Floor" section that
explicitly audits the PRD for a missing NFR (WCAG) and calls it a real gap to resolve — the
same treatment is never given to the privacy constraint, even though it's one of the few
NFRs the PRD confirms with certainty (`[confirmado por skr]`) rather than leaving open. It
is simply never mentioned, acknowledged, or ruled satisfied-by-design.

**Why it matters:** this is a case where the UX docs are silent rather than honest — every
other similarly-firm PRD constraint gets at least a line of acknowledgment; this one has
none, even though it has real UX surface area (e.g., it rules out ever showing "other users
near you" on the map without a redesign of this constraint).

---

## Gap 5 — Perfil's emotional purpose is reduced to a functional description

**Source:** Brief and PRD both frame Perfil-type activity not as a data view but as an
emotional payoff for the Reseñador Entusiasta: *"Éxito para esta persona: sentir que su
calificación cuenta y ver su actividad reflejada en la app"* (brief); PRD JTBD: *"quiero...
sentir que mi aporte cuenta."*

**In the UX docs:** EXPERIENCE.md's Information Architecture table describes Perfil purely
functionally — "Own check-in/rating activity only, no editing, no public profile (FR-11)" —
and the Key Flows resolution for UJ-2 says only "Ana can later see this activity reflected
in Perfil." The *feeling-that-your-contribution-matters* rationale that the source documents
use to justify Perfil's existence at all is never restated, even as a design principle to
honor once Perfil gets its first mockup.

**Why it matters:** without this "why" carried forward, whoever eventually designs Perfil's
missing mockup has no signal that the bar is "make the user feel their contribution counts,"
not just "list the rows" — the exact kind of intangible framing a spec-table approach drops.

---

## Minor note (not a full gap, flagging for clarity only)

DESIGN.md's Typography section (`meta` role) references *"filas de 'lo que dice la gente'"*
as an existing mockup element on the Detalle screen. Neither DESIGN.md's Components section
nor EXPERIENCE.md's Component Patterns table defines what this row actually contains. Given
the PRD is explicit that v1 has no text comments (only the star rating), this label could be
misread as implying a comments/reviews feed. It most likely refers to the static 5-caption
rating-reference list (called "Rating scale list" in EXPERIENCE.md), but neither document
states that equivalence explicitly. Recommend a one-line clarification tying the two names
together so a future reader doesn't mistake it for an out-of-scope comments feature.

---

## Summary

| # | Gap | Type |
|---|---|---|
| 1 | Data-retention-on-re-rate: mechanic kept, strategic "why" (future data asset) dropped | Why-behind-decision |
| 2 | Two-persona flywheel framing flattened into two unrelated journeys; tone's growth rationale lost | Strategic framing |
| 3 | "Organic return, no notifications" philosophy (SM-2) never stated as a design principle | Why-behind-decision |
| 4 | User-location privacy constraint (PRD Guardrails, FR-9 NFR) has zero acknowledgment anywhere in UX docs | Silent drop of a confirmed constraint |
| 5 | Perfil's emotional purpose ("sentir que su calificación cuenta") reduced to functional bullet | Emotional framing |
| — | "Lo que dice la gente" label left undefined/unreconciled with "no comments in v1" | Minor clarity note |
