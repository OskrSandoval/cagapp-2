---
title: 'Hacer check-in en un baño'
type: 'feature'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '1b2ef27ce77131b3bdb5252f1fa8737966aa0351'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `Detalle.jsx` (Story 2.3) excluyó a propósito el chip de rango y el botón de check-in por ser Épica 3. Story 3.1 (`epics.md` FR9) exige que el usuario pueda hacer check-in verificado por ubicación (dentro de 150m), con manejo explícito de "fuera de rango" y "GPS impreciso" — nunca un rechazo silencioso.

**Approach:** Agregar a `Detalle.jsx` un Chip de rango (usa el `distancia_metros` que el `bano` ya trae, mismo dato que colorea pines/filas — sin recalcular Haversine en el frontend) y un botón "Hacer check-in" que, al tocarlo, pide una lectura fresca de geolocalización (`getCurrentPosition`, mismo patrón que `reintentarUbicacion` de `Mapa.jsx`) y llama a un nuevo `POST /checkins` con `{bano_id, lat, lng, accuracy}`. El backend (nueva tabla `checkins`, patrón rutas→controladores→servicios→datos) resta `accuracy` a la distancia real (AD-8) para decidir entre tres resultados: check-in válido (se inserta y se confirma), fuera de rango (se explica y no se guarda nada), o precisión insuficiente (se ofrece reintentar, no es un rechazo). El chip es solo informativo — el botón siempre se puede tocar; la validación real y autoritativa ocurre en el servidor en cada intento.

## Boundaries & Constraints

**Always:** El backend es la única autoridad sobre "dentro de rango" — el chip del frontend es un indicador, nunca bloquea el botón. Reusar `calcularDistanciaMetros` de `banosService.js` (AD-4) — ninguna fórmula nueva. Las coordenadas del intento (`lat`/`lng`/`accuracy`) se usan solo en memoria durante esa petición para calcular distancia — nunca se persisten (AD-13); solo persiste el resultado (la fila de `checkins` si es válido). Tabla `checkins` con RLS deny-by-default, solo `service role key` (AD-9). Vocabulario en español (AD-6); reusar `.surface-tarjeta`/`.mensaje-error`/`.boton-primario` ya establecidos.

**Never:** No implementar el Selector de calificación ni desbloquear calificar — eso es Story 3.2. No guardar historial de ubicación continua ni exponer la ubicación de nadie a otros usuarios. No deshabilitar el botón de check-in por el chip (posiblemente desactualizado) — siempre se puede intentar y el servidor decide. No resolver aquí cómo Story 3.2 confirmará que un check-in sigue "vigente" para calificar — eso se define cuando se planee 3.2.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dentro de 150m, `accuracy` razonable | `distanciaReal - accuracy <= 150` | Se crea el check-in; veo el Banner de confirmación | N/A |
| Fuera de 150m | `distanciaReal - accuracy > 150` | Rechazo explícito con el motivo; nada se guarda | N/A |
| `accuracy` > 100m | GPS impreciso | Mensaje distinto de "fuera de rango": no puede confirmar, ofrece reintentar | N/A |
| El `bano_id` no existe | id inválido/borrado | Rechazo claro, no un 500 genérico | N/A |
| `POST /checkins` falla (red/servidor) | Error 500/red | Mensaje de marca, no deja la UI colgada, puedo reintentar | N/A |
| Falla obtener una lectura fresca de ubicación al tocar el botón | Permiso revocado o timeout | Mensaje pidiendo reintentar, no truena la pantalla | N/A |

</frozen-after-approval>

## Code Map

- `backend/src/servicios/banosService.js` (`calcularDistanciaMetros`) -- reusar tal cual para el radio de 150m (AD-4), no reimplementar.
- `backend/src/servicios/perfilesService.js`, `backend/src/controladores/banosController.js` (`postBano`) -- patrón exacto rutas→controladores→servicios→datos y de validación a replicar para `checkins`.
- `backend/src/middleware/auth.js` -- `verificarSesion` ya disponible, reusar tal cual.
- `backend/src/app.js` -- montar el nuevo router en `/checkins`, mismo patrón que `app.use('/banos', banosRouter)`.
- `supabase/sql/002_banos.sql` -- patrón de migración a replicar en `supabase/sql/003_checkins.sql` (RLS enable, sin políticas, comentario AD-9).
- `frontend/src/paginas/Mapa.jsx` (`reintentarUbicacion`) -- patrón de `getCurrentPosition` puntual (no el `watchPosition` continuo) a replicar para pedir una lectura fresca al tocar "Hacer check-in".
- `frontend/src/paginas/Detalle.jsx` -- ya muestra `bano.distancia_metros`; agregar el Chip de rango y el flujo de check-in debajo de la fila de calificación existente.
- `frontend/src/api/banosApi.js` (`crearBano`) -- patrón de llamada POST autenticada a replicar en un nuevo `frontend/src/api/checkinsApi.js`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/sql/003_checkins.sql` -- tabla `checkins` (`id`, `usuario_id` → `perfiles`, `baño_id` → `baños`, `created_at`) con RLS deny-by-default
- [x] `backend/src/servicios/checkinsService.js` -- `evaluarDistanciaCheckin({lat,lng,accuracy}, bano)` (pura, reusa `calcularDistanciaMetros`) + `crearCheckin({usuarioId, banoId, lat, lng, accuracy}, cliente)`: busca el baño por id, evalúa, inserta si es válido
- [x] `backend/src/controladores/checkinsController.js` -- `postCheckin` valida body (`bano_id`, `lat`, `lng`, `accuracy` numéricos), mapea el resultado del servicio a 201 (válido) / 403 (fuera de rango) / 422 (precisión insuficiente) / 400 (baño inexistente o campos inválidos)
- [x] `backend/src/rutas/checkins.js` + registro en `backend/src/app.js` -- `POST /checkins` protegido por `verificarSesion`
- [x] `backend/test/checkinsService.test.js`, `backend/test/checkins.routes.test.js` -- cubrir la I/O & Edge-Case Matrix de arriba
- [x] `frontend/src/api/checkinsApi.js` -- `hacerCheckin({banoId, lat, lng, accuracy})`, mismo patrón que `crearBano`
- [x] `frontend/src/paginas/Detalle.jsx` -- Chip de rango (dentro/fuera, usa `bano.distancia_metros`), botón "Hacer check-in" (pide lectura fresca, llama a la API, muestra banner de confirmación / mensaje de fuera de rango / mensaje de precisión insuficiente con reintentar)
- [x] `frontend/src/index.css` -- clases nuevas para el chip y el banner, sobre los tokens ya definidos
- [x] `frontend/test/Detalle.test.jsx` -- cubrir la I/O & Edge-Case Matrix de arriba

**Acceptance Criteria:**
- Given que estoy dentro de 150m de un baño, when toco "Hacer check-in", then el check-in se registra exitosamente y veo confirmación.
- Given que estoy fuera de 150m, when intento hacer check-in, then el sistema lo rechaza y explica el motivo.
- Given que mi GPS no tiene suficiente precisión para confirmar los 150m, when intento el check-in, then el sistema me indica que no puede confirmar y me ofrece reintentar, en vez de rechazar en silencio.
- Given que el check-in es exitoso, when se guarda, then solo se registra la asociación usuario-baño-momento, sin historial de ubicación continua ni exposición de mi ubicación a otros usuarios.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|----------|------|-----------|------|-----------|
| `hacerCheckin` real nunca se ejecuta en un test (ambos test files mockean todo el módulo) | verification-gap | medium | patch | Mismo patrón ya visto en Story 2.4 con `crearBano`; un rename o un `.status` mal poblado no se detectaría. |
| `bano_id` malformado (no-UUID) cae en un 500 genérico en vez del 400 que el propio I/O Matrix de esta historia promete | blind, edge-case | medium | patch | Verificado: `postCheckin` solo valida no-vacío; el error de sintaxis de Postgres se re-lanza y el `catch` genérico del controlador lo convierte en 500. |
| `getCurrentPosition` en `pedirCheckin` no tiene `timeout` | blind | medium | patch | Si el GPS nunca resuelve, "Verificando ubicación…" se queda colgado para siempre, sin escape — contradice el AC de nunca dejar sin opción de reintentar. |
| `getCurrentPosition` en `pedirCheckin` no pide `enableHighAccuracy: true` | blind | medium | patch | Sin ese flag muchos navegadores usan ubicación de red (imprecisa), lo que puede producir "fuera de rango"/"precisión insuficiente" falsos en una función cuyo punto central es la precisión de 150m. |
| Sin prevención de check-ins duplicados al mismo baño | blind | false | rechazado | Permitido a propósito — "Re-check-in ... está permitido" (epic-3-context.md); la métrica de éxito de la épica depende literalmente de check-ins repetidos. |
| Baño borrado entre el `select` y el `insert` (condición de carrera) | edge-case | false | rechazado | No existe ningún endpoint de borrado de baños todavía; la ventana de carrera no es alcanzable hoy. |
| `distancia_metros` podría ser `NaN` y el chip mostraría "fuera de rango" en vez de ocultarse | edge-case | false | rechazado | Mismo razonamiento ya asentado en Stories 2.1/2.2: `calcularDistanciaMetros` siempre da un valor finito para coordenadas válidas. |
| Sin guarda de desmontaje en el flujo async de geolocalización/`hacerCheckin` | blind | low | rechazado | Mismo tipo de hallazgo ya rechazado en el Triage Log de 2.1 y 2.2 por bajo riesgo real en producción. |
| El check-in no se muestra en ningún lado todavía (sin "ya hiciste check-in aquí", sin actividad en Perfil) | blind | n/a | rechazado | Fuera de alcance a propósito — el consumo de estos datos es de Story 3.2 y Épica 4, ya señalado en el Design Notes de este mismo spec. |
| Sin rate limiting, catch-alls sin loguear el error real, sin test de que RLS siga sin políticas, sin índices en las FK de `checkins` | blind | medium | defer | Reales pero ninguno es una regresión de esta historia (mismo patrón ya usado en `perfiles`/`banos` desde la Épica 1); registrado en `deferred-work.md`. |

## Design Notes

El diagrama ER de arquitectura no traía una tabla de check-ins; se crea aquí porque el AC de esta historia literalmente pide persistir "la asociación usuario-baño-momento". Cómo Story 3.2 confirmará que un check-in sigue vigente para calificar queda sin resolver a propósito — no se necesita para esta historia (que solo inserta, nunca lee de vuelta) y se decide cuando se planee 3.2.

Los códigos HTTP (201/403/422/400) son una elección interna de la API, invisible para el usuario final — lo único que importa de cara al usuario es el mensaje mostrado, ya cubierto por el I/O Matrix. 403 para "fuera de rango" (autenticado pero no autorizado para esta acción ahora), 422 para "precisión insuficiente" (la petición no se pudo procesar con certeza), distintos entre sí para que el frontend no tenga que adivinar por el texto del mensaje.

Sin copy exacta en las fuentes para "fuera de rango" (el mockup solo cubre el caso "dentro de rango"); se autora en el mismo tono chusco ya establecido.

## Verification

**Commands:**
- `cd backend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `checkins`
- `cd frontend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `Detalle`
- `cd frontend && npx oxlint` -- expected: sin hallazgos
- `cd frontend && npm run build` -- expected: build exitoso

**Manual checks (if no CLI):**
- Correr `supabase/sql/003_checkins.sql` en el SQL Editor de Supabase antes de probar el flujo real.
- Hacer check-in real cerca y lejos de un baño; confirmar el mensaje de precisión insuficiente si el GPS del dispositivo/navegador reporta baja precisión.
