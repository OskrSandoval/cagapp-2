---
title: 'Gate "friends and family" en el backend'
type: 'feature'
created: '2026-09-29'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El gate de `perfil.autorizado` (spec-acceso-friends-and-family) solo vive en `App.jsx`; ningún endpoint del backend lo revisa, así que un usuario autenticado pero no autorizado puede usar la API directamente (ver baños, hacer check-ins, calificar, crear baños) sin pasar nunca por `EnEspera`. Origen: entrada correspondiente en `deferred-work.md`.

**Approach:** Un middleware nuevo, encadenado después de `verificarSesion`, que lee el perfil del usuario y responde 403 con error de marca (AD-7) si `perfil.autorizado === false` o si el usuario no tiene perfil. Se aplica a todas las rutas protegidas excepto `POST /perfiles` y `GET /perfiles/yo`, que deben seguir abiertas porque el registro es libre y el frontend necesita leer `autorizado` para mostrar `EnEspera`.

</frozen-after-approval>

## Implementation Notes

- Decisiones (no visibles para usuarios autorizados; tomadas en planeación):
  - `autorizado === false` → 403. Campo ausente/`undefined` (migración 005 aún no corrida) → se permite, mismo criterio que `App.jsx` (`=== false`, nunca `!autorizado`), para no bloquear a todos si falta la columna.
  - Sin fila de perfil → 403: sin perfil no hay autorización posible (y `checkins`/`calificaciones` tienen FK a `perfiles` de todos modos).
  - Falla al leer el perfil → 500 con error de marca, sin llamar `next()`.
  - Rutas con gate: `GET/POST /banos`, `POST /checkins`, `GET/POST /calificaciones`, `GET /perfiles/yo/actividad`. Sin gate: `POST /perfiles`, `GET /perfiles/yo`.
  - El middleware usa `obtenerPerfilPorId` de `perfilesService.js` (no importa `supabaseAdmin` directo), respetando capas.
  - Frontend sin cambios: un usuario autorizado nunca recibe este 403 y uno no autorizado nunca llega al Mapa. Si skr des-autoriza a alguien a media sesión, verá los mensajes de error normales de cada pantalla hasta recargar (y entonces `EnEspera`) — aceptable, fuera de alcance.
  - Los tests de rutas de `banos`/`checkins`/`calificaciones` ahora deben mockear `perfilesService.obtenerPerfilPorId` (hoy su mock de `supabaseAdmin` no tiene `.from`, así que el middleware tronaría con 500).
- Implementación: nuevo `backend/src/middleware/autorizacion.js` (`verificarAutorizado`), encadenado en `rutas/banos.js`, `rutas/checkins.js`, `rutas/calificaciones.js` y `rutas/perfiles.js` (solo `/yo/actividad`). Tests: `test/autorizacion.routes.test.js` nuevo (27 casos, ruta por ruta vía la app real: `false`→403, sin perfil→403, error→500, sin token→401 antes de consultar perfil, campo ausente→pasa, `GET /perfiles/yo` y `POST /perfiles` siguen abiertos); los 4 `*.routes.test.js` existentes ahora mockean `obtenerPerfilPorId` como autorizado por defecto.
- Verificación: `cd backend && npx vitest run` → 139/139 (antes 112). Prueba de mutación: quitar el gate de `rutas/checkins.js` hace fallar sus 3 casos en `autorizacion.routes.test.js`; restaurado.
- Costo: una lectura extra de `perfiles` por petición protegida — aceptable a escala friends-and-family.
- Parches de la revisión: `console.error` del error real en el `catch` del middleware; el caso "sin perfil" ahora también verifica `body.error` y la llamada a `obtenerPerfilPorId('user-1')`. `npx vitest run` → 139/139.

## Review Triage Log

- **verdict: medium → patch** — el `catch` de `verificarAutorizado` descartaba el error sin loguear; cada 500 del gate quedaba invisible. Corregido con `console.error` (el patrón de `catch` mudos en controladores sigue diferido aparte).
- **verdict: low → patch** — el caso "sin perfil → 403" no verificaba `body.error` ni la llamada a `obtenerPerfilPorId`. Fix trivial aplicado.
- **verdict: medium → defer** — gate opt-in por ruta; rutas nuevas podrían olvidarlo. Registrado en `deferred-work.md` (mismo patrón preexistente de `verificarSesion`).
- **verdict: low, rechazado** — 403 sin código legible por máquina (`codigo: 'no_autorizado'`): solo importa si skr des-autoriza a alguien a media sesión, caso raro ya aceptado como fuera de alcance; agrega API nueva.
- **verdict: false** — "no hay prueba del camino feliz": los ~100 tests de rutas existentes pasan por el gate con `autorizado: true` y fallarían si el middleware devolviera 403 para `true`; el caso "siempre `next()`" lo cubren los 18 tests de 403/500.
- **verdict: low, rechazado** — aserciones que no distinguen el texto del 403 vs 500 y "campo ausente" probado en una sola ruta: el código de estado ya los distingue; iterar todas las rutas exige cuerpos válidos por ruta, costo desproporcionado.
- **verdict: false** — `req.usuarioId` ausente: el middleware solo se monta después de `verificarSesion` en las 4 rutas; no es alcanzable hoy y además falla cerrado (403).
- **verdict: low, rechazado** — mocks por defecto "frágiles" ante `restoreMocks`/`resetAllMocks`: la config de vitest no usa ninguno y los `beforeEach` solo resetean los mocks de su propio servicio; hipotético.
- **verdict: false** — "el perfil se lee dos veces por petición": ninguna ruta con gate vuelve a leer `perfiles` en su controlador (`getActividad` lee `checkins`/`baños`/`calificaciones`).
- **verdict: low, rechazado** — `autorizado: null` pasa el gate: la columna es `not null` (005), inalcanzable.
- **verdict: false** — spec en `in-progress`: se cierra en este mismo paso de finalización.
