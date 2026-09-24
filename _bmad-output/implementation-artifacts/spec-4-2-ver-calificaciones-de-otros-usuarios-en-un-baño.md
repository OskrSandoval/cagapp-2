---
title: 'Ver calificaciones de otros usuarios en un baño'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '10d106e83d0e8c3f2687bb136c033e12343ae701'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El Detalle de un baño (Épica 2/3) muestra el promedio de calificación pero nunca quién calificó qué. Story 4.2 (`epics.md` FR12) exige la lista pública "Lo que dice la gente" con nombre para mostrar, estrellas y fecha relativa de cada calificación — nunca un identificador interno ni ubicación (AD-11).

**Approach:** En `Detalle.jsx`, debajo de la fila de calificación existente, se agrega "Lo que dice la gente": se pide un nuevo `GET /calificaciones?bano_id=` (mismo router de `POST /calificaciones` de Story 3.2, patrón rutas→controladores→servicios→datos) solo cuando el baño ya tiene promedio (`tieneCalificacion`) — si no hay promedio, ya no hay nada que listar, así que ni se pide. El backend cruza la calificación vigente de cada usuario (reusa `filtrarVigentesPorUsuarioYBano`, nunca reimplementa esa lógica) con `perfiles.nombre_para_mostrar`, y arma la forma pública restringida `{nombre_para_mostrar, estrellas, created_at}` — `usuario_id` nunca sale de esta capa. El frontend agrega el primer formateo de fecha relativa del proyecto (`hace N días/semanas/meses/años`, copy tomada del mockup aprobado de Detalle).

## Boundaries & Constraints

**Always:** La respuesta pública nunca incluye `usuario_id` ni ninguna otra forma de identificar/ubicar al usuario — solo `{nombre_para_mostrar, estrellas, created_at}` (AD-11). Reusar `filtrarVigentesPorUsuarioYBano` de `calificacionesService.js` — ninguna lógica nueva de "más reciente". Reusar `esUuidValido` de `backend/src/validacion.js` (ya extraído en Story 3.2) para validar `bano_id`. Sin calificaciones, la sección no duplica un segundo estado vacío: se apoya en el mismo "Sin calificaciones todavía 🤷" que ya muestra el badge de promedio — un solo estado combinado, nunca dos (epic-4-context.md). Vocabulario en español (AD-6).

**Never:** No paginar todavía (epic-4-context.md permite empezar simple: todas las calificaciones, más recientes primero). No refrescar esta lista en vivo justo después de que el propio usuario califique en la misma sesión de Detalle — la vería reflejada la próxima vez que abra ese baño; el AC solo pide verla al abrir, no un refresco instantáneo del propio voto (ver Design Notes). No mostrar la sección si el baño no tiene promedio — evita duplicar el estado vacío.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Abro el Detalle de un baño con calificaciones | `calificacion_promedio` no nulo | Aparece "Lo que dice la gente" con nombre, estrellas y fecha relativa de cada calificación vigente | N/A |
| Inspecciono la respuesta de la API | Cualquier fila de la lista pública | Nunca incluye `usuario_id` ni ubicación — solo `nombre_para_mostrar`/`estrellas`/`created_at` | N/A |
| El baño no tiene calificaciones todavía | `calificacion_promedio` nulo | No se pide ni se muestra "Lo que dice la gente"; el badge de promedio ya cubre el único estado vacío | N/A |
| `bano_id` inválido o inexistente en la query | Formato no-uuid | 400 claro, no un 500 genérico | N/A |
| `GET /calificaciones` falla (red/servidor) | Error 500/red | Mensaje de marca en la sección, no deja el resto del Detalle colgado | N/A |

</frozen-after-approval>

## Code Map

- `backend/src/servicios/calificacionesService.js` (`filtrarVigentesPorUsuarioYBano`) -- reusar tal cual para quedarse con la calificación vigente de cada usuario en este baño.
- `backend/src/validacion.js` (`esUuidValido`) -- reusar para validar `bano_id` en el nuevo GET, mismo criterio que `checkinsController.js`/`calificacionesController.js`.
- `backend/src/servicios/perfilesService.js` (`obtenerActividad`) -- patrón de "buscar filas por un conjunto de ids" (ahí para `baños`) a replicar aquí para buscar `perfiles.nombre_para_mostrar` por `usuario_id`.
- `backend/src/rutas/calificaciones.js`, `backend/src/controladores/calificacionesController.js` -- ya tienen `POST /calificaciones` (Story 3.2); agregar el `GET` en el mismo router/controlador, mismo patrón que `banos.js` (GET y POST en la misma ruta).
- `frontend/src/paginas/Detalle.jsx` -- ya tiene la fila de calificación/promedio y el badge "Sin calificaciones todavía"; agregar la sección nueva debajo, reusando ese mismo badge para el caso vacío.
- `_bmad-output/planning-artifacts/ux-designs/ux-cagapp2.0-2026-09-11/mockups/key-detalle-checkin.html` -- sección `.section-mini`/`.mini-row` (líneas 384-393) es la referencia exacta de copy para la fecha relativa ("hace 2 días", "hace 1 semana", "hace 2 semanas").
- `frontend/src/paginas/distancia.js`, `frontend/src/paginas/calificacion.js` -- patrón de módulo compartido pequeño a replicar para el nuevo `fechaRelativa.js`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/servicios/calificacionesService.js` -- `obtenerCalificacionesPublicas(banoId, cliente)`: trae calificaciones del baño, filtra vigentes por usuario, cruza con `perfiles.nombre_para_mostrar`, devuelve `[{nombre_para_mostrar, estrellas, created_at}]` sin `usuario_id`, más recientes primero
- [x] `backend/src/controladores/calificacionesController.js` -- `getCalificacionesPublicas` valida `bano_id` (query, uuid vía `esUuidValido`), responde 200 con la lista (vacía si no hay)
- [x] `backend/src/rutas/calificaciones.js` -- `GET /calificaciones` protegido por `verificarSesion`, junto al `POST` ya existente
- [x] `backend/test/calificacionesService.test.js`, `backend/test/calificaciones.routes.test.js` -- cubrir la I/O & Edge-Case Matrix de arriba, incluida la ausencia de `usuario_id` en cada fila
- [x] `frontend/src/paginas/fechaRelativa.js` -- `formatearFechaRelativa(fechaIso)`: "hace N días" (<7), "hace N semana(s)" (<30), "hace N mes(es)" (<365), "hace N año(s)"
- [x] `frontend/src/api/calificacionesApi.js` -- `obtenerCalificacionesPublicas(banoId)`, mismo patrón que `hacerCheckin`/`calificarBano`
- [x] `frontend/src/paginas/Detalle.jsx` -- sección "Lo que dice la gente": se pide solo si `tieneCalificacion`; filas con nombre, estrellas estáticas y fecha relativa; sin duplicar el estado vacío
- [x] `frontend/src/index.css` -- clases nuevas para la sección y sus filas, sobre los tokens ya definidos
- [x] `frontend/test/Detalle.test.jsx` -- cubrir la I/O & Edge-Case Matrix de arriba, incluidos los casos de `formatearFechaRelativa`

**Acceptance Criteria:**
- Given que abro el Detalle de un baño con calificaciones, when lo veo, then aparece una lista "Lo que dice la gente" con el nombre para mostrar, las estrellas y la fecha relativa de cada calificación.
- Given que veo esa lista, when inspecciono los datos que expone, then nunca incluye un identificador interno del usuario ni su ubicación.
- Given que el baño no tiene calificaciones todavía, when veo esa sección, then se aplica el mismo estado vacío del Detalle.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|----------|------|-----------|------|-----------|
| El test "no vuelve a pedir tras calificar" usa un baño sin promedio, así que el efecto de fetch nunca se dispara y el test pasa trivialmente sin probar el escenario real | blind | medium | patch | Real: hace falta un baño que ya muestre "Lo que dice la gente" antes de calificar, para probar que calificar en esa misma sesión no dispara un refetch. |
| `created_at` se ordena con comparación de strings, no de fechas | blind | low | patch | Corrección directa y barata (`new Date(...)` en vez de comparar strings) aunque hoy el formato de Supabase lo hace funcionar igual. |
| `formatearFechaRelativa` puede dar negativo (`hace -1 días`) por desfase de reloj o `created_at` futuro | blind, edge-case | low | patch | Corrección directa: acotar a `Math.max(0, ...)`. `created_at` siempre lo genera Postgres (`default now()`), así que el caso `NaN`/fecha no parseable es inalcanzable — solo el desfase de reloj es real. |
| El nombre para mostrar + estrellas + fecha + baño permitiría rastrear "quién calificó qué y cuándo", más de lo que AD-11 pretendía cubrir (que solo excluye `usuario_id`) | blind | n/a | rechazado | Decisión de producto ya confirmada explícitamente en el material de planeación ("Lo que dice la gente" muestra nombre y calificación públicamente — memlog, decisión final, "no es un gap"); no es un descuido de esta historia. |
| Un `usuario_id` sin fila en `perfiles` mostraría un nombre en blanco | blind, edge-case | false | rechazado | `calificaciones.usuario_id` tiene FK contra `perfiles` y no existe borrado de cuentas en la app — inalcanzable hoy, mismo razonamiento ya usado en Stories 3.1/3.2/4.1. |
| Con `calificacion_promedio` no nulo pero la lista pública resuelve `[]`, la sección se queda sin filas y sin mensaje | blind, edge-case | false | rechazado | El promedio y la lista pública leen la misma tabla append-only (nunca se borra); si el promedio ya es no-nulo, siempre hay al menos una fila vigente — el escenario no es alcanzable con los datos reales de la app. |
| `fetch` en curso no se cancela con `AbortController` al desmontar/cambiar de baño | blind | low | rechazado | Ya cubierto por la entrada de `deferred-work.md` de la Story 4.1 sobre falta de timeout/`AbortController` en todos los `api/*.js`; no se duplica. |
| Sin copy para "hoy" (`hace 0 días` se ve raro) | blind | low | rechazado | Ningún mockup ni fuente de planeación da copy para ese caso; inventar una nueva frase no pedida es más que una corrección directa. |
| `new Set(...)` para deduplicar `usuario_id` es redundante (ya viene deduplicado) | blind | low | rechazado | No cambia el comportamiento, código correcto tal cual; no vale la pena tocarlo. |
| Sin límite/paginación en la lista pública | blind | medium | rechazado | Misma categoría de escala ya diferida desde 2.1/3.2/4.1; no se duplica la entrada. |
| `getCalificacionesPublicas` traga el error real sin loguear | blind | medium | rechazado | Ya cubierto por la entrada de `deferred-work.md` de la Story 3.1 sobre logging en todo el backend. |

## Design Notes

Copy de fecha relativa tomada literalmente del mockup aprobado (`key-detalle-checkin.html`): "hace 2 días", "hace 1 semana", "hace 2 semanas" — no es una decisión inventada, es la única referencia de tono para este dato en todo el material de planeación.

"Un solo estado combinado, no dos" (epic-4-context.md) se resuelve sin código extra: la sección solo se pide/renderiza cuando `tieneCalificacion` es verdadero, así que si no hay promedio, tampoco hay sección — el badge "Sin calificaciones todavía 🤷" que ya existe es todo lo que se ve, nunca un segundo mensaje vacío redundante.

Esta historia no refresca "Lo que dice la gente" justo después de que el propio usuario califique en la misma apertura de Detalle (haría falta plomear su `nombre_para_mostrar` hasta acá o volver a pedir la lista) — verían su propio voto reflejado la próxima vez que abran ese baño. Ningún AC pide un refresco instantáneo del propio voto en esa lista pública.

## Verification

**Commands:**
- `cd backend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de calificaciones públicas
- `cd frontend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `Detalle`
- `cd frontend && npx oxlint` -- expected: sin hallazgos
- `cd frontend && npm run build` -- expected: build exitoso

**Manual checks (if no CLI):**
- Calificar un baño con dos cuentas distintas y confirmar que "Lo que dice la gente" muestra ambas calificaciones con nombre, estrellas y fecha relativa correctos.
