---
title: Reconciliation — ARCHITECTURE-SPINE.md vs. PRD / UX / Brief inputs
scope: CagApp 2.0
created: 2026-09-11
---

# Reconciliation: Architecture Spine vs. Source Inputs

Method: read PRD, DESIGN.md, EXPERIENCE.md, brief.md, and the architecture session's `.memlog.md` (for what was *deliberately* decided, not to be re-flagged) in full, then checked the spine's Invariants, Consistency Conventions, ERD, Structural Seed, Deployment section, and Deferred list against every FR, glossary entity, cross-cutting NFR, and IA surface.

## 1. Functional Requirements (FR-1 – FR-12)

| FR | Need | Spine coverage | Verdict |
|---|---|---|---|
| FR-1 Registro | email/password + social; reject duplicate email; display name field; password minimum length | AD-5 (Supabase Auth = identity, no local password storage) covers hashing/duplicate-email (Supabase default). ERD's `USUARIOS.nombre_para_mostrar` covers display name. | Mostly covered. **Password minimum-length policy is a genuine gap** — PRD explicitly assigns this "a definir en arquitectura" (§9 Índice de Supuestos) and the spine never states a policy nor defers it. |
| FR-2 Login | Persistent session until logout or "expira el periodo definido por arquitectura" | AD-5 covers JWT verification per request. | **Gap.** Session/token expiry & refresh policy is explicitly assigned to architecture by the PRD and is not defined, decided, or listed in Deferred anywhere in the spine. |
| FR-3 Recuperar acceso | Password reset via email, N/A for social accounts | Not explicitly named, but implied by AD-5 ("Supabase Auth es la única fuente de identidad") — this is a Supabase Auth default flow. | Acceptable — implicitly covered by AD-5's blanket delegation to Supabase Auth. Not a real gap, though an explicit one-line note ("password reset delegated to Supabase Auth defaults") would remove ambiguity. |
| FR-4 Mapa | Geolocated map; **fallback to search-by-zone-name when permission denied** | Geolocated map itself is covered by the FE/BE split and BAÑOS lat/lng. | **Gap.** The zone-name-search fallback (confirmed in PRD, detailed as a required state in EXPERIENCE.md) has no home in the data model (no zona/colonia/address field on `BAÑOS`) or in any API-boundary rule, and is not mentioned in Deferred. |
| FR-5 Lista | Distance-sorted list, reorders on location change | Covered — same data, computed client/query-side. | OK |
| FR-6 Detalle | Name, location, type, avg rating; explicit empty state when no ratings | Covered by ERD fields + query-time average from `CALIFICACIONES`. | OK |
| FR-7 Buscar antes de crear | 1.5 km duplicate search | AD-4 (Haversine once, in backend service layer) explicitly binds FR-7. | OK |
| FR-8 Crear baño | name, location, tipo_lugar, `creado_por` | Covered by `BAÑOS` ERD fields. | OK |
| FR-9 Check-in | 150 m radius; **GPS-imprecision → offer retry, never silent rejection** | AD-4 explicitly binds FR-9 for the distance check itself. | **Gap.** The GPS-imprecision/retry behavior — explicitly called out as its own required state in EXPERIENCE.md ("distinct state from simple out-of-range") and explicitly left "para arquitectura" in the PRD's Índice de Supuestos — is not mentioned anywhere in the spine, not even in Deferred. AD-7's generic `{error: string}` response shape doesn't distinguish "out of range" from "insufficient GPS precision, retry" either. |
| FR-10 Calificar tras check-in | Append-only history; vigente = most recent row; average recalculated live | AD-3 explicitly and correctly models this. | OK — well covered |
| FR-11 Ver mi actividad | Perfil shows only own check-ins/ratings | Naturally supported by `CALIFICACIONES.usuario_id` FK; not separately called out but trivially derivable. | OK |
| FR-12 Ver calificaciones de otros | Public list: display name, stars, relative date; never exposes rater's current location; pagination undefined | AD-3 binds FR-12. Deferred section explicitly defers pagination/ordering with a stated reason. | OK — correctly deferred, not a silent gap |

## 2. Glossary / Entity coverage

| Entity (PRD Glossary / UX) | Spine coverage |
|---|---|
| Baño | `BAÑOS` table — covered |
| Calificación | `CALIFICACIONES` table — covered |
| Check-in | Deliberately merged into `CALIFICACIONES` as a single append-only row (per `.memlog.md` decision: "una sola tabla append-only (check_ins/calificaciones)") — intentional, not a gap |
| Usuario | `USUARIOS` table, extending Supabase Auth's identity table — covered, and explicitly notes it "extiende... no la reemplaza" |
| Cuenta | Explicitly covered by Supabase Auth defaults (AD-5); spine states this directly |
| Buscador con Urgencia / Reseñador Entusiasta | Usage personas, not data entities — correctly not modeled as tables |

No entity from the PRD Glossary or UX docs is silently missing from the ERD.

## 3. Cross-cutting NFRs

- **Map load <3s (PRD Cross-Cutting NFRs):** **Not addressed — and contradicted.** The spine's Deferred/Deployment section states the Render free-tier backend "se duerme tras 15 min sin tráfico y tarda unos segundos en responder la siguiente petición — aceptable para el tráfico esperado del MVP." This directly conflicts with the explicit <3s "mapa interactivo" requirement: a cold Render free-tier instance commonly takes well over 3 seconds (often 30+) to wake, which would make the very first map load after any 15-minute idle period miss the NFR. The spine never acknowledges or reconciles this tension — it isn't listed as a deliberate trade-off in Deferred, it's stated as "acceptable" for a different reason (learning-project traffic) without reference to the performance NFR at all.
- **Privacy — never expose user location:** Substantively satisfied by omission — no table in the ERD stores a user's device location or a continuous location history (`CALIFICACIONES` only stores `usuario_id`, `baño_id`, `estrellas`, `created_at`; `BAÑOS` stores only the bathroom's own location). This is the correct outcome. However, unlike AD-3 (append-only) or AD-4 (single Haversine implementation), this guardrail is never codified as its own explicit invariant/AD with a "Prevents" clause. Minor documentation gap: a future contributor adding a "usuarios cercanos" or "quién más está aquí" feature would have no explicit rule in the spine telling them not to persist/expose device location — only the PRD's Constraints section would stop them. Worth a short AD-8 style entry, not a functional miss.
- **GPS-imprecision retry for check-in:** See FR-9 above — genuine silent gap, not deferred.

## 4. UX Information Architecture surfaces vs. structural seed

PRD/UX top-level surfaces: Login/Registro, Mapa, Lista, Detalle de Baño, Check-in/Calificar, Crear Baño, Perfil.

Spine's `frontend/src/paginas/` lists: `Mapa, Lista, Detalle, CrearBaño, CheckIn, Login, Perfil`.

All seven surfaces are represented with no naming contradiction, and the container diagram / AD-1 boundary rule (frontend → Supabase Auth for login only; frontend → backend API for everything else) accommodates all of them without contradiction — including Check-in/Calificar and Crear Baño, which are the two surfaces most dependent on backend business logic (AD-4 radius checks, AD-3 append-only writes).

## Summary of genuine silent gaps (not already covered by Deferred or memlog decisions)

1. **GPS-imprecision/retry behavior for check-in (FR-9)** — PRD explicitly assigns this to architecture; UX treats it as a distinct required state; spine never mentions it, not even in Deferred.
2. **<3s map-load NFR vs. Render free-tier cold start** — a real, unacknowledged contradiction between the Deployment section and the PRD's Cross-Cutting NFR.
3. **FR-4's "buscador por nombre de zona" fallback** (geolocation denied) — no supporting field in the data model, no API-boundary rule, not deferred.
4. **Session/JWT expiration policy (FR-2)** — explicitly assigned to architecture by the PRD, undefined and undeferred in the spine.
5. **Password minimum-length policy (FR-1)** — same pattern: explicitly assigned to architecture, undefined and undeferred.
6. **(Minor/documentation only)** Privacy guardrail against exposing user location is satisfied by the data model but never stated as its own explicit invariant, unlike the other cross-cutting rules (AD-1 through AD-7).

Everything else checked — all 12 FRs' core needs, all glossary/UX entities, the append-only/monetization data-preservation directive, and all seven IA surfaces — is either explicitly covered by an AD/ERD element or legitimately and explicitly deferred with a stated reason.
