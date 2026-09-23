---
title: 'Ver el detalle de un baño'
type: 'feature'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '4967e5f4ceb8482724dd948cdf637a93121397a8'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hoy tocar un pin del Mapa solo abre un popup con el nombre, y las filas de la Lista no hacen nada (stub explícito de Story 2.2). Story 2.3 (`epics.md` FR6) exige un Detalle que muestre nombre, ubicación, tipo de lugar, calificación promedio y distancia.

**Approach:** Nueva pantalla `Detalle.jsx`, fiel al mockup aprobado `key-detalle-checkin.html` (Estado A) recortado a esta historia: nav con botón "Volver" (`aria-label="Volver"`, ~42px) + tarjeta hero (ícono-círculo, nombre, subtítulo `tipo_lugar · zona`, estrellas + pill de calificación o "sin calificaciones todavía", distancia). Overlay a pantalla completa dentro de `mapa-pantalla` (nunca desmonta el lienzo de Leaflet, mismo patrón que la Lista en 2.2). Usa el objeto `bano` ya en memoria (mismos campos que `GET /banos` desde 2.1) — sin backend nuevo. Un pin o una fila lo abre; "Volver" cierra el overlay y regresa a la superficie de origen.

## Boundaries & Constraints

**Always:** El pill de calificación usa las 5 captions canónicas de `EXPERIENCE.md` § Voice and Tone (1 "💩 Un desastre" … 5 "🤩 Limpio, amplio y hasta huele bien"), banda más cercana por `Math.round(promedio)` (regla `[GAP]` ya resuelta como default). Sin calificaciones (`calificacion_promedio` null, el único caso alcanzable hoy — Épica 3 no existe) se indica explícito, nunca un promedio vacío/cero. La distancia reutiliza el mismo formateo m/km de la Lista (extraer a un módulo compartido, no duplicar). El overlay de Detalle nunca desmonta `.mapa-lienzo` (Leaflet sigue vivo debajo). Vocabulario en español (AD-6); reusar tokens y componentes ya establecidos (`surface`, pills).

**Never:** No chip de rango, no botón de check-in, no lista "Lo que dice la gente" — son de la Épica 3/4, aunque el mockup las incluya. No pedir un baño por id al backend — usar el objeto ya cargado en `banos`. No introducir router — el Detalle es estado local (`banoSeleccionado`) en `Mapa.jsx`, no una ruta. No inventar un estimado de tiempo caminando (el mockup lo sugiere pero no hay regla fuente para calcularlo) — solo la distancia formateada.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Toco un pin del Mapa | `bano` con datos completos | Se abre el Detalle con nombre, tipo de lugar, zona y distancia de ese baño | N/A |
| Toco una fila de la Lista | `bano` con datos completos | Mismo Detalle que abrir desde el Mapa, mismos datos | N/A |
| El baño no tiene calificaciones | `calificacion_promedio: null` | Indicador explícito "sin calificaciones todavía", nunca estrellas vacías o "0" | N/A |
| El baño sí tiene una calificación promedio | `calificacion_promedio: 4.5` (aunque hoy inalcanzable en producción) | Fila de estrellas (redondeo a la banda más cercana) + pill con el promedio y la caption cualitativa correspondiente | N/A |
| Toco "Volver" | Vine del Mapa o de la Lista | Cierro el Detalle y regreso exactamente a esa superficie, sin perder `vista` | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/paginas/Mapa.jsx` -- agregar estado `banoSeleccionado`; en el efecto que dibuja pines, cambiar `marcador.bindPopup(...)` (stub de 2.1) por `marcador.on('click', () => setBanoSeleccionado(bano))`; pasar `onSeleccionar={setBanoSeleccionado}` a `<Lista>`; renderizar `<Detalle>` como overlay cuando `banoSeleccionado` no es null (mismo patrón de no desmontar el lienzo que usó el toggle de 2.2).
- `frontend/src/paginas/Lista.jsx` -- filas actualmente no interactivas (stub de 2.2); agregar prop `onSeleccionar` y hacer cada `<li>` tappable (botón real dentro, no solo `onClick` en el `<li>`, para accesibilidad de teclado).
- `_bmad-output/planning-artifacts/ux-designs/ux-cagapp2.0-2026-09-11/mockups/key-detalle-checkin.html` -- Estado A (líneas 356-382) es la referencia pixel-level para nav + hero; el resto del archivo (range-ok, btn check-in, "Lo que dice la gente", Estado B completo) es Épica 3/4, no replicar.
- `_bmad-output/planning-artifacts/ux-designs/ux-cagapp2.0-2026-09-11/EXPERIENCE.md` -- líneas 71-81 (tabla de 5 captions canónicas), línea 99 (regla de banda más cercana).
- `frontend/src/index.css` -- tokens `--primary`/`--success`/`--surface`/`--border` ya definidos; agregar clases `.detalle-*` para el overlay a pantalla completa.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/paginas/distancia.js` -- extraer `formatearDistancia` de `Lista.jsx` a un módulo compartido (m si <1000, si no km con un decimal); actualizar `Lista.jsx` para importarlo
- [x] `frontend/src/paginas/Detalle.jsx` -- pantalla nueva: nav con botón Volver, tarjeta hero (ícono, nombre, `tipo_lugar · zona`, estrellas + pill de calificación o "sin calificaciones todavía", distancia)
- [x] `frontend/src/paginas/Mapa.jsx` -- estado `banoSeleccionado`, click de pin abre Detalle (reemplaza el popup-stub), overlay de Detalle sin desmontar el mapa, prop `onSeleccionar` a `<Lista>`
- [x] `frontend/src/paginas/Lista.jsx` -- filas tappables que llaman `onSeleccionar(bano)`
- [x] `frontend/src/index.css` -- clases nuevas para el overlay de Detalle (nav, hero, pill, estrellas)
- [x] `frontend/test/Detalle.test.jsx` -- cubrir la I/O & Edge-Case Matrix de arriba, incluida la banda de calificación correcta para varios promedios
- [x] `frontend/test/Mapa.test.jsx` -- click de pin abre Detalle con los datos del baño; Volver lo cierra
- [x] `frontend/test/Lista.test.jsx` -- click de fila llama `onSeleccionar` con el baño correcto

**Acceptance Criteria:**
- Given que toco un pin del mapa o una fila de la lista, when se abre el Detalle, then veo nombre, ubicación, tipo de lugar, calificación promedio y distancia.
- Given que el baño no tiene ninguna calificación todavía, when veo su Detalle, then se indica explícitamente en vez de mostrar un promedio vacío o en cero.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|----------|------|-----------|------|-----------|
| Test de click de pin solo usa un baño; un bug que abriera siempre el Detalle equivocado no se detectaría | verification-gap | medium | patch | Con un solo elemento, `bano` y `banos[0]` son indistinguibles; la Lista sí prueba atribución con 2 filas, el Mapa no. |
| `Detalle` tiene `role="dialog"` pero sin `aria-modal` ni foco inicial al abrir | blind | low | patch | Corrección directa y barata (atributo + foco al montar); no se agrega Escape para mantener el parche mínimo. |
| Emojis decorativos inconsistentes (`🚽`/`📍` sin `aria-hidden`, las estrellas sí lo tienen) | blind | low | patch | Adición de un atributo, corrección directa. |
| `bandaCalificacion(promedio)` se llama dos veces por render | blind | low | patch | Cómputo redundante trivial de corregir. |
| Comentario en `distancia.js` atribuye la extracción a AD-4, que en `epic-2-context.md` es específicamente el Haversine único del backend | blind | low | patch | Corrección de una línea de comentario. |
| Comentario "copia al momento del tap" en `Mapa.jsx` es inexacto (es la misma referencia, no un clon) | blind | low | patch | Corrección de una línea de comentario. |
| Solo la caption de la banda 5 se afirma vía render completo; una banda 1-4 mal escrita en `CAPTIONS_CALIFICACION` no se detectaría | blind | low | patch | Cobertura barata de agregar sobre una tabla estática fácil de transcribir mal. |
| `calificacion_promedio` podría ser `NaN` → "NaN ⭐ — undefined" | edge-case | false | rechazado | El backend siempre pone `calificacion_promedio: null` a mano (no lo calcula) hasta la Épica 3; no alcanzable hoy. |
| `distancia_metros` podría ser `NaN` → "📍 NaN m de ti" | edge-case | false | rechazado | Mismo razonamiento ya asentado en la Story 2.2: `calcularDistanciaMetros` siempre da un valor finito para números válidos. |
| Detalle podría quedar mostrando un baño que ya no está en `banos` tras un refetch | edge-case | false | rechazado | `listarBanos` nunca filtra (devuelve todo); el buscador por zona (única forma de traer un set distinto) queda inalcanzable detrás del overlay de Detalle a pantalla completa. El drift de distancia/calificación ya está documentado y aceptado en Design Notes. |
| `.detalle-pill-calificacion` con `#e6f4eb` sin tokenizar | blind | false | rechazado | Mismo literal que usa el mockup aprobado (`key-detalle-checkin.html` `.score-tag`), no una inconsistencia nueva. |
| Sin test dedicado para límites de `formatearDistancia` (1000m, 0, negativo) | blind | low | rechazado | Mismo precedente ya asentado en el Triage Log de la Story 2.2. |

## Design Notes

El mockup muestra un estimado de tiempo caminando sin regla fuente para calcularlo — se omite, solo distancia formateada. Su pill dice "4.5 ⭐ — ¡una joya!", frase ausente de la tabla de captions canónicas de `EXPERIENCE.md`; se usa la caption real (p. ej. "4.5 ⭐ — 🤩 Limpio, amplio y hasta huele bien"). Su subtítulo combina tres datos ("Cafetería · Baño mixto · Condesa"); nuestro esquema de `baños` no tiene "tipo de baño", así que queda `tipo_lugar · zona`. El `bano` que recibe Detalle es una copia al momento del tap, no una referencia viva — no se actualiza si el listado se refresca mientras está abierto (sin impacto hoy, `calificacion_promedio` no cambia hasta la Épica 3).

## Verification

**Commands:**
- `cd frontend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `Detalle`
- `cd frontend && npx oxlint` -- expected: sin hallazgos
- `cd frontend && npm run build` -- expected: build exitoso

**Manual checks (if no CLI):**
- Tocar un pin y una fila de la Lista en el navegador; confirmar que "Volver" regresa a la superficie correcta (Mapa o Lista) sin perder el lienzo de Leaflet.
