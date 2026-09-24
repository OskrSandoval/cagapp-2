---
title: 'Calificar un baño tras el check-in'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '8827b733784971d43eda3b70b3ca99ec168ab6db'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 3.1 dejó el check-in funcionando, pero calificar (FR10) no existe: `calificacion_promedio` sigue codificado a `null` en `banosService.js` desde Story 2.1. El gap de modelo de datos que `epic-3-context.md` marcó como pendiente ("cómo confía 3.2 en que hubo un check-in vigente") se resuelve aquí con la tabla `checkins` que Story 3.1 ya creó.

**Approach:** En `Detalle.jsx`, justo cuando `estadoCheckin === 'confirmado'` (mismo estado local de 3.1, en la misma vista), se desbloquea el Selector de calificación (5 estrellas, caption chusca en vivo, lista de referencia de las 5 captions) y un botón "Confirmar calificación" que llama a un nuevo `POST /calificaciones`. El backend (nueva tabla `calificaciones`, append-only, patrón rutas→controladores→servicios→datos) primero verifica que exista un check-in **vigente** del usuario para ese baño (fila más reciente en `checkins` dentro de una ventana de 15 minutos) — sin eso, rechaza sin importar por dónde se intente. Si es válido, inserta la calificación y recalcula el promedio del baño (tomando la fila más reciente por `usuario_id`+`baño_id`, nunca cacheado) para devolverlo en la misma respuesta. `banosService.js#listarBanos` deja de devolver `calificacion_promedio: null` fijo y calcula el promedio real con la misma lógica.

## Boundaries & Constraints

**Always:** El backend es la única autoridad sobre "hay un check-in vigente" — ninguna vía (interfaz o llamada directa a la API) puede calificar sin esa verificación en el servidor. `calificaciones` es append-only (AD-3): solo `INSERT`, nunca `UPDATE`/`DELETE`; la calificación vigente de un usuario para un baño es siempre la fila más reciente (`created_at`, desempatada por `secuencia`), nunca una columna mutable. El Selector de calificación nunca aparece antes de un check-in exitoso en la misma vista. Reusar `CAPTIONS_CALIFICACION` de `frontend/src/paginas/calificacion.js` (ya existe desde Story 2.3) para las captions del picker — ninguna tabla de captions nueva. RLS deny-by-default en `calificaciones` (AD-9). Vocabulario en español (AD-6).

**Never:** No agregar medias estrellas ni comentarios de texto/fotos (fuera del alcance del producto v1). No cachear el promedio en una columna — siempre se calcula de las filas vigentes. No implementar la lista pública "Lo que dice la gente" (Épica 4) ni la actividad de Perfil (Épica 4) — esta historia solo produce las filas de `calificaciones` que esas épicas consumirán después. No reabrir el Selector si el usuario cierra y reabre el Detalle sin haber calificado — vuelve a aparecer el flujo de check-in (simplificación deliberada, ver Design Notes).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Hice check-in exitoso, elijo 1-5 estrellas y confirmo | Check-in vigente (< 15 min) | Se publica; veo el promedio del baño actualizado de inmediato | N/A |
| No hice check-in en ese baño (o expiró) e intento calificar por la API directamente | Sin check-in vigente para ese `bano_id` | El backend rechaza (403), explica el motivo | N/A |
| Ya había calificado antes este baño; vuelvo a hacer check-in y calificar | Segunda fila para el mismo `(usuario_id, baño_id)` | La nueva cuenta para el promedio; la anterior sigue en la tabla, nunca se borra | N/A |
| Toco cada número de estrella | 1 a 5 | Veo la caption chusca correspondiente en vivo, antes de confirmar | N/A |
| `POST /calificaciones` falla (red/servidor) | Error 500/red | Mensaje de marca; la estrella elegida no se pierde, puedo reintentar | N/A |
| Mi check-in vigente expira mientras decido la calificación | Han pasado más de 15 min desde el check-in | El backend rechaza (403); el frontend regresa al flujo de "Hacer check-in" en vez de dejar el selector colgado | N/A |

</frozen-after-approval>

## Code Map

- `backend/src/servicios/checkinsService.js` -- tabla `checkins` de Story 3.1, fuente de verdad para "hay un check-in vigente"; se consulta, nunca se reimplementa su lógica de distancia.
- `backend/src/servicios/banosService.js` (`listarBanos`) -- hoy fija `calificacion_promedio: null`; cambiar para calcular el promedio real vía el nuevo helper de `calificacionesService.js`.
- `backend/src/controladores/checkinsController.js`, `backend/src/rutas/checkins.js` -- patrón exacto rutas→controladores→servicios→datos a replicar para `calificaciones`.
- `backend/src/app.js` -- montar el nuevo router en `/calificaciones`, mismo patrón que `/checkins`.
- `supabase/sql/003_checkins.sql` -- patrón de migración a replicar en `supabase/sql/004_calificaciones.sql`; esta migración también agrega el índice en `checkins(usuario_id, baño_id, created_at)` que Story 3.1 dejó pendiente (ahora sí hay una consulta real que lo necesita).
- `frontend/src/paginas/calificacion.js` -- `CAPTIONS_CALIFICACION`/`bandaCalificacion` (Story 2.3), reusar tal cual para el picker, no duplicar la tabla de captions.
- `frontend/src/paginas/Detalle.jsx` -- ya tiene `estadoCheckin === 'confirmado'` (Story 3.1); ahí mismo se agrega el Selector de calificación.
- `frontend/src/paginas/Mapa.jsx` (`onCreado` de Story 2.4) -- patrón de refrescar `banos` tras una mutación exitosa, a replicar para `onCalificado`.
- `frontend/src/api/checkinsApi.js` -- patrón de POST autenticado a replicar en un nuevo `frontend/src/api/calificacionesApi.js`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/sql/004_calificaciones.sql` -- tabla `calificaciones` (`id`, `usuario_id`, `baño_id`, `estrellas` con `check` 1-5, `secuencia bigserial`, `created_at`) con RLS deny-by-default; agregar índice en `checkins(usuario_id, "baño_id", created_at)`
- [x] `backend/src/servicios/calificacionesService.js` -- `obtenerCheckinVigente({usuarioId, banoId}, cliente)` (ventana de 15 min), `obtenerPromediosPorBano(banoIds, cliente)` (más reciente por `usuario_id`+`baño_id`, promedio por baño), `calificarBano({usuarioId, banoId, estrellas}, cliente)` (verifica vigencia, inserta, devuelve el promedio actualizado)
- [x] `backend/src/servicios/banosService.js` -- `listarBanos` usa `obtenerPromediosPorBano` en vez de `calificacion_promedio: null` fijo
- [x] `backend/src/controladores/calificacionesController.js` -- `postCalificacion` valida `bano_id`/`estrellas` (entero 1-5), mapea el resultado a 201 (con `calificacion_promedio` actualizado) / 403 (sin check-in vigente) / 400 (inválido)
- [x] `backend/src/rutas/calificaciones.js` + registro en `backend/src/app.js` -- `POST /calificaciones` protegido por `verificarSesion`
- [x] `backend/test/calificacionesService.test.js`, `backend/test/calificaciones.routes.test.js`, `backend/test/banosService.test.js` -- cubrir la I/O & Edge-Case Matrix de arriba, incluida la lógica de "más reciente por usuario cuenta para el promedio"
- [x] `frontend/src/api/calificacionesApi.js` -- `calificarBano({banoId, estrellas})`, mismo patrón que `hacerCheckin`
- [x] `frontend/src/paginas/Detalle.jsx` -- Selector de calificación (5 estrellas, `aria-label="Calificar N de 5"`, caption en vivo vía `CAPTIONS_CALIFICACION`, lista de referencia de las 5 captions resaltando la seleccionada) tras `estadoCheckin === 'confirmado'`; botón "Confirmar calificación" llama a la API y actualiza el promedio mostrado; prop `onCalificado` hacia `Mapa.jsx`
- [x] `frontend/src/paginas/Mapa.jsx` -- pasa `onCalificado` a `Detalle`, refresca `banos` tras calificar (mismo patrón que `onCreado` de 2.4)
- [x] `frontend/src/index.css` -- clases nuevas para el selector de estrellas, caption-pill y lista de referencia, sobre los tokens ya definidos
- [x] `frontend/test/Detalle.test.jsx` -- cubrir la I/O & Edge-Case Matrix de arriba
- [x] `frontend/test/Mapa.test.jsx` -- calificar con éxito refresca `banos`

**Acceptance Criteria:**
- Given que hice check-in exitoso, when elijo una calificación de 1 a 5 estrellas, then se publica y el promedio del baño se recalcula de inmediato.
- Given que no he hecho check-in en ese baño, when intento calificar (por interfaz o URL directa), then el sistema no me lo permite.
- Given que ya había calificado este baño antes, when hago check-in y califico de nuevo, then mi nueva calificación reemplaza cuál cuenta como vigente para el promedio, sin borrar el historial anterior.
- Given que elijo cada número de estrella, when lo selecciono, then veo el mensaje chusco correspondiente.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|----------|------|-----------|------|-----------|
| `aria-pressed` solo es `true` en la estrella exacta clicada, pero visualmente se rellenan todas las estrellas hasta esa — señal distinta para lector de pantalla que para vista | blind | low | patch | Corrección directa: `valor <= estrellasSeleccionadas` en vez de `===`. |
| Regex `PATRON_UUID` duplicado literal entre `checkinsController.js` y `calificacionesController.js` | blind | low | patch | Extraer a un helper compartido evita que diverjan si uno se ajusta. |
| `onCalificado` solo refresca `banos` si `ubicacion` está resuelta; en modo zona (geolocalización denegada) el pin/lista se queda con el promedio viejo tras calificar | edge-case | medium | patch | Agregar fallback a `cargarBanos({ zona: textoZona })` cuando no hay `ubicacion`, mismo dato que ya usa el buscador por zona. |
| `Detalle` sin `key` por `bano.id` podría arrastrar estado (`promedioLocal`, `calificacionEnviada`) de un baño a otro | blind | false | rechazado | El overlay es exclusivo a pantalla completa desde Story 2.3 — no hay forma de abrir otro baño sin antes cerrar (desmontar) el actual; siempre se remonta desde cero. |
| `usuario_id` con `on delete cascade` podría borrar historial de calificaciones si se borrara una cuenta | blind | medium | defer | Mismo patrón de FK ya usado en `baños`/`checkins` desde Épica 2/3.1; hoy no existe borrado de cuenta que lo dispare. Registrado en `deferred-work.md`. |
| `obtenerPromediosPorBano` trae todo el historial sin límite en cada `GET /banos` | blind | medium | defer | Misma categoría que el truncado por `max-rows` ya diferido en la Story 2.1; el epic difiere explícitamente optimizar a esta escala. |
| Insert y recálculo del promedio son dos llamadas separadas; si la segunda falla tras un insert exitoso, se muestra un 500 aunque la calificación sí se guardó | blind | low | rechazado | Ventana angosta y consecuencia inofensiva: un reintento del usuario solo agrega otra fila "vigente" con el mismo valor (el diseño append-only + más-reciente-gana ya tolera esto); mismo patrón no-transaccional que ya usa `checkinsService.js`. |
| `postCalificacion` no valida que el baño exista antes de insertar | blind | false | rechazado | Verificado por el edge-case-hunter: `checkins` ya referencia `baños` por FK, así que un `bano_id` inexistente nunca puede tener un check-in vigente — el flujo cae en 403 antes de llegar al insert. |
| La migración 004 también crea un índice en la tabla `checkins` (no solo en `calificaciones`) | blind | n/a | rechazado | Instrucción explícita del Code Map de este mismo spec (resolvía el índice pendiente de la Story 3.1); no es un descuido del implementador. |
| `epic-3-context.md` no se actualizó para reflejar que el gap ya se resolvió | blind | low | rechazado | El propio encabezado del archivo dice "Edit freely. Regenerate..." — no es una fuente de verdad que deba mantenerse sincronizada a mano; sin daño demostrado. |
| Sin política de retención/limpieza para el historial de `calificaciones` | blind | n/a | rechazado | Es el diseño a propósito (AD-3 append-only, recalificar sin límite ya confirmado como permitido) — no un defecto. |
| Catches sin loguear el error real en `calificacionesService`/`calificacionesController` | blind | medium | rechazado | Ya cubierto por la entrada de `deferred-work.md` de la Story 3.1 sobre logging en todo el backend; no se duplica la entrada. |
| Sin guarda de desmontaje en el flujo async de `confirmarCalificacion` | edge-case | low | rechazado | Mismo tipo de hallazgo ya rechazado en el Triage Log de 2.1, 2.2 y 3.1 por bajo riesgo real en producción. |

## Design Notes

**Ventana de vigencia (15 minutos):** ninguna fuente de planeación fija un número — se elige porque el flujo diseñado (mockup + UX docs) es check-in→calificar en una sola interacción continua; nadie que siga el flujo esperado la nota, y protege contra calificar referenciando un check-in viejo sin volver a estar ahí.

**El Selector no persiste entre aperturas de Detalle:** si el usuario cierra el Detalle tras el check-in sin calificar y lo vuelve a abrir (incluso dentro de los 15 min), el flujo vuelve a mostrar "Hacer check-in" en vez de reabrir el selector directamente. Detectar un check-in vigente al montar exigiría un endpoint de lectura nuevo solo para este caso raro; se prefiere la simplificación (volver a hacer check-in no tiene costo, Story 3.1 lo permite sin límite) sobre la complejidad adicional. El backend sigue siendo quien decide si la calificación es válida, independientemente de lo que muestre el frontend.

El promedio se calcula tomando, por cada `(usuario_id, baño_id)`, solo la fila más reciente (`created_at`, desempate por `secuencia`) y promediando esas filas "vigentes" por baño — nunca todas las filas históricas. Se computa en Node (mismo estilo que el resto del backend), no con una vista o función SQL nueva.

## Verification

**Commands:**
- `cd backend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `calificaciones` y los de `banosService` actualizados
- `cd frontend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `Detalle`
- `cd frontend && npx oxlint` -- expected: sin hallazgos
- `cd frontend && npm run build` -- expected: build exitoso

**Manual checks (if no CLI):**
- Correr `supabase/sql/004_calificaciones.sql` en el SQL Editor de Supabase antes de probar el flujo real.
- Hacer check-in y calificar un baño real; confirmar que el promedio se ve actualizado en el Mapa/Lista al volver.
