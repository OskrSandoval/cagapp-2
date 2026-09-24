---
title: 'Ver mi actividad en el Perfil'
type: 'feature'
created: '2026-09-23'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '11738713bb573b0ebf7991275c9f3ad7482f6cef'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Hoy no hay forma de ver la propia actividad de check-ins/calificaciones. El botón top-left de `Mapa.jsx` sigue siendo el "Cerrar sesión" que Story 2.1 dejó como stopgap (marcado explícitamente como desviación del spec en su Review Triage Log) porque el Perfil real todavía no existía.

**Approach:** Reemplazar ese botón por el Ícono de Perfil real (`aria-label="Perfil"`) que abre una nueva pantalla `Perfil.jsx` (overlay a pantalla completa, mismo patrón que `Detalle`/`CrearBano`). Un nuevo `GET /perfiles/yo/actividad` (patrón rutas→controladores→servicios→datos) junta, para el usuario del JWT: los baños donde hizo check-in (tabla `checkins`, Épica 3) con su calificación vigente en cada uno (misma lógica de "fila más reciente por usuario+baño" ya construida en `calificacionesService.js`, reusada, nunca reimplementada). Sin actividad, se muestra una invitación en tono chusco a calificar el primer baño, nunca una lista vacía sin contexto. "Cerrar sesión" se muda al propio Perfil.

## Boundaries & Constraints

**Always:** `usuario_id` sale siempre de `req.usuarioId` (JWT verificado) — nunca de un parámetro, nunca se puede pedir la actividad de otro usuario. Reusar `filtrarVigentesPorUsuarioYBano` de `calificacionesService.js` para la calificación vigente — ninguna lógica de "más reciente" nueva. El overlay de Perfil nunca desmonta `.mapa-lienzo`. Vocabulario en español (AD-6); reusar `.detalle-*`/`.surface-tarjeta`/`.boton-primario` ya establecidos.

**Never:** No edición de perfil, sin foto, sin bio — el alcance es deliberadamente mínimo (epic-4-context.md). No fecha relativa en esta lista — no está pedida por el AC y evita construir el formateo de fechas antes de que 4.2 lo necesite de verdad. No navegar de una fila de actividad al Detalle del baño — el Perfil es de solo lectura, sin interacción adicional (alcance mínimo a propósito). No mostrar actividad ajena bajo ninguna circunstancia.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Abro mi Perfil con check-ins y calificaciones previas | `checkins`/`calificaciones` con filas mías | Lista de baños visitados, cada uno con mi calificación vigente | N/A |
| Hice check-in en un baño pero nunca lo califiqué | Fila en `checkins`, ninguna en `calificaciones` para ese par | El baño aparece en la lista con un indicador explícito de "sin calificar todavía", nunca vacío o en blanco | N/A |
| Usuario nuevo sin ningún check-in | Sin filas en `checkins` para este usuario | Estado vacío que invita a calificar el primer baño, tono chusco, nunca "sin actividad" genérico | N/A |
| `GET /perfiles/yo/actividad` falla (red/servidor) | Error 500/red | Mensaje de marca, puedo reintentar, no deja la pantalla colgada | N/A |

</frozen-after-approval>

## Code Map

- `backend/src/servicios/perfilesService.js` -- ya tiene `obtenerPerfilPorId`/`crearOActualizarPerfil`; agregar `obtenerActividad(usuarioId, cliente)`.
- `backend/src/servicios/calificacionesService.js` (`filtrarVigentesPorUsuarioYBano`) -- reusar tal cual para quedarse con la calificación vigente por baño de este usuario.
- `backend/src/controladores/perfilesController.js`, `backend/src/rutas/perfiles.js` -- patrón `GET /perfiles/yo` ya existente a extender con `/yo/actividad`, mismo middleware `verificarSesion`.
- `frontend/src/paginas/Mapa.jsx` -- botón top-left `Cerrar sesión` (línea con `control-flotante control-izquierda`) es el stopgap de 2.1 a reemplazar por el Ícono de Perfil; agregar overlay de `Perfil` con el mismo patrón de no desmontar el mapa que `Detalle`/`CrearBano`.
- `frontend/src/paginas/Detalle.jsx` -- patrón de overlay (nav + botón Volver + `detalle-pantalla`) a replicar para `Perfil.jsx`.
- `frontend/src/api/perfilesApi.js` (`obtenerMiPerfil`) -- patrón de GET autenticado a replicar para `obtenerMiActividad`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/servicios/perfilesService.js` -- `obtenerActividad(usuarioId, cliente)`: lee `checkins` del usuario (baños distintos, más reciente primero), cruza con la calificación vigente de cada baño (`filtrarVigentesPorUsuarioYBano`) y con los datos del baño (`nombre`, `tipo_lugar`, `zona`)
- [x] `backend/src/controladores/perfilesController.js` -- `getActividad` llama al servicio y responde 200 con la lista (vacía si no hay actividad)
- [x] `backend/src/rutas/perfiles.js` -- `GET /perfiles/yo/actividad` protegido por `verificarSesion`
- [x] `backend/test/perfilesService.test.js`, `backend/test/perfiles.routes.test.js` -- cubrir la I/O & Edge-Case Matrix de arriba
- [x] `frontend/src/api/perfilesApi.js` -- `obtenerMiActividad()`, mismo patrón que `obtenerMiPerfil`
- [x] `frontend/src/paginas/Perfil.jsx` -- overlay nuevo: nav con Volver, lista de actividad (baño + calificación vigente o "sin calificar todavía") o invitación chusca si está vacía, botón "Cerrar sesión"
- [x] `frontend/src/paginas/Mapa.jsx` -- reemplazar el botón "Cerrar sesión" por el Ícono de Perfil (`aria-label="Perfil"`); estado para abrir/cerrar `Perfil`; pasar `onCerrarSesion` hacia `Perfil`
- [x] `frontend/src/index.css` -- clases nuevas para el ícono de Perfil y las filas de actividad, sobre los tokens ya definidos
- [x] `frontend/test/Perfil.test.jsx` -- cubrir la I/O & Edge-Case Matrix de arriba
- [x] `frontend/test/Mapa.test.jsx` -- el Ícono de Perfil abre el overlay; ya no existe un botón "Cerrar sesión" directo en Mapa

**Acceptance Criteria:**
- Given que he hecho check-in y calificado baños, when abro mi Perfil, then veo la lista de baños en los que hice check-in y mi calificación vigente en cada uno.
- Given que soy un usuario nuevo sin actividad, when abro mi Perfil, then veo un estado vacío que me invita a calificar mi primer baño, no una lista vacía sin contexto.
- Given que abro mi Perfil, when veo mi actividad, then nunca se muestra la actividad de otros usuarios.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|----------|------|-----------|------|-----------|
| `obtenerMiActividad` real nunca se ejecuta en un test (ambos test files mockean todo el módulo) | verification-gap | medium | patch | Mismo patrón ya visto en Stories 2.4/3.1/3.2; un typo en la URL o en el header no se detectaría. |
| La calificación en Perfil es `aria-hidden` sin ninguna alternativa textual con el número — a diferencia de `Detalle.jsx`, que siempre empareja las estrellas ocultas con una pill visible con el número | blind | medium | patch | Corrección directa: reemplazar `aria-hidden` por un `aria-label` con el valor numérico. |
| `estrellasEstaticas` truena (`RangeError`) si `estrellas` está fuera de 1-5 | blind, edge-case | false | rechazado | La columna `calificaciones.estrellas` tiene `check (estrellas between 1 and 5)` (Story 3.2) y el controlador ya valida el rango antes de insertar — inalcanzable por cualquier vía legítima. |
| `checkins` se ordena solo por `created_at`, sin desempate tipo `secuencia` | blind | low | rechazado | Solo afecta el orden de despliegue entre dos baños distintos con timestamp idéntico (sin impacto de corrección, a diferencia del desempate de `calificaciones` que sí decide cuál calificación cuenta). |
| Un `baño_id` huérfano (baño borrado) mostraría nombre en blanco | blind, edge-case | false | rechazado | No existe ninguna función de borrado de baños en la app — inalcanzable hoy, mismo razonamiento ya usado en Stories 3.1/3.2. |
| `getActividad` traga el error real sin loguear | blind | medium | rechazado | Ya cubierto por la entrada de `deferred-work.md` de la Story 3.1 sobre logging en todo el backend; no se duplica la entrada. |
| Los fakes de test no verifican el string de `.select(...)` de cada tabla | blind | low | rechazado | Mismo estilo de fake usado en todos los tests de servicios desde la Épica 2 — no es un hueco nuevo de esta historia. |
| Sin test con varios baños calificados simultáneamente en una sola petición | blind | low | rechazado | La agregación reusada (`filtrarVigentesPorUsuarioYBano`/mapa por baño) ya tiene cobertura multi-baño equivalente en los tests de la Story 3.2. |
| Sin límite en las consultas de `obtenerActividad`; sin timeout/`AbortController` en los `fetch` del frontend (incluido el nuevo) | blind, edge-case | medium | defer | Primero es la misma categoría de escala ya diferida desde 2.1/3.2; segundo es un patrón preexistente en todos los `api/*.js`, no algo nuevo de esta historia. Registrado en `deferred-work.md`. |
| Sin guarda de desmontaje en el flujo async de `cargarActividad` | edge-case | low | rechazado | Mismo tipo de hallazgo ya rechazado en el Triage Log de 2.1, 2.2, 3.1 y 3.2 por bajo riesgo real en producción. |

## Design Notes

El botón "Cerrar sesión" que hoy vive suelto en `Mapa.jsx` fue un stopgap explícito de Story 2.1 (documentado como desviación en su propio Review Triage Log) porque el Perfil no existía. Esta historia lo resuelve: el Ícono de Perfil ocupa su lugar y "Cerrar sesión" se muda dentro de la pantalla de Perfil, que es donde pertenece.

Sin fecha relativa ni navegación desde una fila de actividad al Detalle: ninguna de las dos la pide el AC, y el alcance del Perfil es mínimo a propósito (epic-4-context.md) — agregar cualquiera de las dos sería construir más de lo pedido.

## Verification

**Commands:**
- `cd backend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de actividad
- `cd frontend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `Perfil`
- `cd frontend && npx oxlint` -- expected: sin hallazgos
- `cd frontend && npm run build` -- expected: build exitoso

**Manual checks (if no CLI):**
- Hacer check-in y calificar un baño real, abrir el Perfil y confirmar que aparece; probar con una cuenta sin actividad para ver la invitación.
