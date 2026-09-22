---
title: 'Alternar a vista de lista'
type: 'feature'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'edb00e85afb945435b927ddc97065bfef4aba6cd'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hoy `Mapa.jsx` es la única superficie para ver baños cercanos. Story 2.2 (`epics.md` FR5) exige un toggle para alternar a una vista de Lista con los mismos baños ordenados por cercanía, que se reordena si cambia la ubicación del usuario.

**Approach:** Botón-pill "☰ Ver lista"/"☰ Ver mapa" arriba a la derecha (mismo patrón que "Cerrar sesión" arriba a la izquierda) alterna un estado `vista` local en `Mapa.jsx`, que ya posee `banos`/`ubicacion`/`error`/`cargando`/`modo`. Al pasar a Lista se oculta el lienzo de Leaflet (nunca se desmonta, para no romper la instancia de `L.map`) y se renderiza un nuevo componente `Lista` con filas de los mismos `banos`. La tarjeta de estado (carga, buscador por zona, vacío, error) sigue viviendo en `Mapa.jsx` y se comparte entre ambas vistas sin duplicarse. Para que la Lista se reordene sola al moverse el usuario, la geolocalización pasa de `getCurrentPosition` (un solo tiro) a `watchPosition`, con un umbral de cambio de coordenadas antes de volver a pedir baños.

## Boundaries & Constraints

**Always:** Lista y Mapa comparten la misma fuente de datos (`banos`/`ubicacion`/`error`/`cargando`/`modo` de `Mapa.jsx`) — nunca un segundo fetch independiente. El toggle es un solo tap sin estado intermedio y su label siempre nombra la superficie contraria. El badge de calificación de cada fila reutiliza `nivelCalificacion`/`etiquetaPin` de `pinMapa.js`, igual que el pin del mapa. `watchPosition` se limpia con `clearWatch` al desmontar. Vocabulario en español (AD-6); reusar tokens de color y clases ya definidas (`surface-tarjeta`, `control-flotante`).

**Never:** No navegar al Detalle de un baño al tocar una fila (Story 2.3 no existe todavía) — la fila no es interactiva más allá de un posible estado visual de "presionado". No reimplementar Haversine ni duplicar el cálculo de distancia en el frontend — `distancia_metros` ya viene del backend. No introducir router ni librería de manejo de estado nueva. No pedir baños en cada evento de `watchPosition` sin umbral — evitar tormenta de requests.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Toco el toggle estando en Mapa | `vista = 'mapa'`, hay `banos` cargados | Cambia a Lista: mismas filas, mismo orden por cercanía que traían los pines | N/A |
| Toco el toggle estando en Lista | `vista = 'lista'` | Vuelve a Mapa; el lienzo de Leaflet se ve completo (sin recorte por tamaño stale) | N/A |
| La ubicación del dispositivo cambia mientras estoy en Lista | `watchPosition` entrega coords distintas a las últimas usadas (> umbral) | Se vuelve a pedir `/banos` con la nueva ubicación y la Lista se reordena sola | N/A |
| La ubicación cambia por debajo del umbral (ruido de GPS) | `watchPosition` entrega coords casi iguales | No se dispara un nuevo fetch | N/A |
| Estoy en modo zona (permiso denegado) y alterno a Lista | `modo = 'zona'` | El buscador por zona sigue visible sobre la Lista, igual que sobre el Mapa | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/paginas/Mapa.jsx` -- dueño de `banos`/`ubicacion`/`error`/`cargando`/`modo`; agregar estado `vista` ('mapa'|'lista'), botón toggle, ocultar `.mapa-lienzo` con CSS (no desmontar), invalidar tamaño de Leaflet al volver a 'mapa', cambiar geolocalización de `getCurrentPosition` a `watchPosition` + `clearWatch`.
- `frontend/src/paginas/pinMapa.js` -- `nivelCalificacion`/`etiquetaPin`, reusar tal cual para el badge de cada fila de la Lista.
- `frontend/src/index.css` -- clases `.control-flotante`/`.control-izquierda`/`.surface-tarjeta` ya definidas (líneas 203-218); agregar `.control-derecha`, `.lista-banos`, `.fila-bano`, `.pin-en-fila`.
- `frontend/test/Mapa.test.jsx` -- el mock de geolocalización usa `getCurrentPosition`; actualizar a `watchPosition`/`clearWatch` y el mock de `mapa` a incluir `invalidateSize`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/paginas/Lista.jsx` -- componente nuevo: recibe `banos`, renderiza filas (badge + nombre + zona + distancia formateada en m/km); `null` cuando `banos` es `null`/vacío (la tarjeta de estado de `Mapa.jsx` ya cubre carga/vacío/error)
- [x] `frontend/src/paginas/Mapa.jsx` -- estado `vista`, botón toggle `control-derecha`, ocultar/mostrar `.mapa-lienzo` vía clase CSS, `invalidateSize()` al volver a Mapa, `watchPosition`+`clearWatch` con umbral de coordenadas (~0.0003°) antes de refetch
- [x] `frontend/src/index.css` -- `.control-derecha`, `.lista-banos`, `.fila-bano`, `.pin-en-fila` (badge de fila sin el `transform` de pin de mapa)
- [x] `frontend/test/Mapa.test.jsx` -- actualizar mock de geolocalización a `watchPosition`/`clearWatch`; cubrir la I/O & Edge-Case Matrix de arriba
- [x] `frontend/test/Lista.test.jsx` -- filas muestran nombre, badge con número exacto, distancia formateada; `null`-safe sin baños

**Acceptance Criteria:**
- Given que estoy viendo el Mapa, when toco el botón de alternar arriba a la derecha, then veo la Lista con los mismos baños ordenados por cercanía.
- Given que cambia mi ubicación, when estoy en la Lista, then se reordena automáticamente.
- Given que estoy en la Lista, when toco el botón de alternar, then regreso al Mapa.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|----------|------|-----------|------|-----------|
| `setView` recentra el mapa a zoom 15 en cada tick de `watchPosition`, sin el umbral que sí gatea el refetch de baños | verification-gap, blind | medium | patch | El efecto "Dibuja mi ubicación" llama `mapa.setView` en cada cambio de `ubicacion`, y ahora `ubicacion` se actualiza en cada evento de GPS (incluido ruido bajo el umbral) — pelea con el pan/zoom manual del usuario. |
| El callback de error de `watchPosition` regresa a `modo: 'zona'` aunque ya hubiera una ubicación buena (`modo === 'ubicado'`) | edge-case | medium | patch | Un timeout/pérdida de señal transitoria tras ya tener mapa/lista con baños cargados bota al usuario al buscador por zona sin necesidad. |
| Orden de filas de la Lista nunca se afirma en un test pese al AC "ordenados por cercanía" | blind | low | patch | Fix trivial: aserción de orden en `Lista.test.jsx`; el array ya viene ordenado del backend (Story 2.1), es solo cobertura faltante. |
| Botón toggle sin `aria-pressed` | blind | low | patch | Adición de un atributo, corrección directa sin complejidad nueva. |
| Comentario llama "debounce" a un filtro de distancia (no de tiempo) | blind | low | patch | Renombrar el comentario es una corrección directa de una línea. |
| `distancia_metros` podría ser `NaN`/negativo y mostrar "NaN km" | edge-case | false | rechazado | `lat`/`lng` son `not null double precision` en el esquema y `calcularDistanciaMetros` siempre da un valor finito y no negativo para números válidos — mismo razonamiento ya asentado en el Triage Log de la Story 2.1 para filas inválidas. |
| Vacío + vista Lista sin test dedicado | blind | false | rechazado | `capa-estado`/`sinBanos` no está condicionado por `vista` en el JSX — el mismo bloque se renderiza sin importar la vista, verificado en el diff. |
| `.lista-banos` con `#ededed` sin tokenizar | blind | false | rechazado | `body` ya usa el mismo literal sin tokenizar (`index.css` línea 26); no es una inconsistencia nueva. |
| Sin test que confirme la clase CSS `.mapa-lienzo--oculto` directamente | blind | low | rechazado | El comportamiento ya se verifica funcionalmente (contenido de Lista visible/oculto); aserción redundante. |
| Sin tests de frontera para `formatearDistancia` (1000m, 0, negativo) | blind | low | rechazado | Lógica trivial (`< 1000`), sin defecto demostrado; el caso negativo ya se cubre arriba como no alcanzable. |
| Falta `aria-live` que anuncie el cambio de vista | blind | low | rechazado | El control tiene label de texto visible (no es solo-ícono); agregar una región `aria-live` es una pieza nueva de markup, no una corrección directa. |

## Design Notes

No hay mockup para la fila de Lista (`DESIGN.md` lo marca como `[GAP]`); se construye con el mismo lenguaje de tarjeta/pill ya establecido, no pixel-level. El umbral de ~0.0003° (~30m en CDMX) es un debounce de coordenadas crudo, no un cálculo de distancia real — no viola AD-4 (única Haversine, en el backend). Tocar una fila no hace nada todavía; Story 2.3 la conecta al Detalle.

## Verification

**Commands:**
- `cd frontend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `Lista` y los actualizados de `Mapa`
- `cd frontend && npx oxlint` -- expected: sin hallazgos
- `cd frontend && npm run build` -- expected: build exitoso

**Manual checks (if no CLI):**
- Alternar Mapa↔Lista en el navegador con baños cargados; confirmar que el mapa no se ve recortado al volver de Lista.
