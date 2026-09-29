---
title: 'Enviar sugerencias y reportar bugs'
type: 'feature'
created: '2026-09-29'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'fcd583ddd31ae5bffa2db76bac42bc5f69d97ce4'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-5-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Durante la fase friends and family, los usuarios no tienen cómo avisarle a skr de un bug o proponer una mejora sin salir de la app. PRD FR-13.

**Approach:** Se agrega un Botón de Sugerencias 💬 en la Barra superior, junto a Perfil. Abre un overlay de pantalla completa (mismo patrón que `Perfil`) donde el usuario elige el tipo (bug o sugerencia), escribe un texto libre y envía. El envío va a un nuevo `POST /sugerencias` (rutas → controladores → servicios → datos), que guarda `usuario_id` (del JWT), `tipo`, `texto` y `created_at` en una tabla nueva `sugerencias` con RLS deny-by-default, sin endpoint de lectura. skr lee las sugerencias en el dashboard de Supabase. Un switch de fase apaga a la vez el botón y el endpoint.

## Boundaries & Constraints

**Always:** `usuario_id` sale de `req.usuarioId`, nunca del body. `POST /sugerencias` lleva `verificarSesion` + `verificarAutorizado` y se agrega a `rutasConGate` en `autorizacion.routes.test.js`. El texto es obligatorio, se recorta con trim y tiene un máximo de 2000 caracteres. `tipo` solo puede ser `bug` o `sugerencia`. Con el switch apagado, el botón no se renderiza (la barra se reacomoda sin dejar hueco) y `POST /sugerencias` responde 404 con el mensaje de marca. La copy va en tono chusco y el vocabulario en español (AD-6). El formulario reusa `.campo`, `.mensaje-error` y `.boton-primario`.

**Never:** No se agrega ningún endpoint ni pantalla para leer o listar sugerencias. No se agregan capturas, adjuntos, estado de seguimiento ni respuesta al usuario. No se guardan ubicación, user-agent ni ningún otro dato que no esté en esta lista.

**Decisión (Open Question resuelta por skr, 2026-09-29):** el switch es una tabla de Supabase `configuracion` de una sola fila (`id smallint pk check (id = 1)`, `sugerencias_activas boolean not null default true`), con RLS sin policies. skr la cambia desde el SQL Editor y surte efecto al instante, sin redeploy. `GET /sugerencias/estado` (sesión + gate) responde `{ activas: boolean }`. Si la fila no existe, cuenta como apagada. El frontend oculta el botón mientras carga o ante cualquier error. `POST /sugerencias` también lee el switch y responde 404 si está apagado. La spec supera los 1600 tokens; skr decidió mantenerla completa porque es un solo objetivo.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Envío válido | tipo `bug`/`sugerencia`, texto no vacío ≤2000 | 201; confirmación de marca ("¡Recibido! Lo leemos con lupa 🔍"); botón para volver | N/A |
| Texto vacío o solo espacios | `texto: '  '` | Error en línea en el campo, foco ahí, no se envía; el backend responde 400 si llega | Mensaje de marca |
| Texto > 2000 | 2001 caracteres | El frontend lo impide (`maxLength`); el backend responde 400 | Mensaje de marca |
| Tipo inválido | `tipo: 'otro'` | 400 | Mensaje de marca |
| Falla de red o 500 | fetch rechaza o responde 500 | Error de marca; se conservan el texto y el tipo para reintentar | N/A |
| Usuario no autorizado | `autorizado === false` | 403 del gate | Igual que el resto de endpoints |
| Switch apagado | `sugerencias_activas = false` o sin fila | `GET /estado` → `{activas:false}`; no hay botón; `POST` responde 404 | N/A |
| Estado no disponible | `GET /estado` falla o sigue cargando | No se muestra el botón (nunca un botón que después falle) | Silencioso |

</frozen-after-approval>

## Code Map

- `supabase/sql/005_perfiles_autorizacion.sql` y `003_checkins.sql`: patrón de migración a copiar (encabezado, RLS sin policies). La nueva es `006_sugerencias.sql`: tabla `sugerencias (id uuid pk, usuario_id uuid not null references perfiles(id) on delete cascade, tipo text not null check (tipo in ('bug','sugerencia')), texto text not null check (char_length(texto) between 1 and 2000), created_at timestamptz default now())` + RLS habilitado sin policies. Mismo archivo: `configuracion` (una fila, `insert ... on conflict do nothing` con `sugerencias_activas = true`) y RLS sin policies.
- `backend/src/rutas/checkins.js`: patrón de router (`verificarSesion`, `verificarAutorizado`, handler). La nueva es `rutas/sugerencias.js`, que se monta en `app.js` como `/sugerencias`.
- `backend/src/controladores/checkinsController.js`: patrón de validación y códigos de estado, y copy de marca en constantes. `perfilesController.js` tiene el caso más cercano de texto requerido (se puede reusar `leerTextoRequerido` si está en `validacion.js`; si no, se replica el patrón de `banosController.js:52`).
- `backend/src/servicios/checkinsService.js` (`crearCheckin`): patrón `.insert().select().single()` con cliente inyectable. El nuevo es `servicios/sugerenciasService.js`.
- `backend/src/middleware/autorizacion.js`: gate opt-in por ruta (deferred-work: hay que encadenarlo explícitamente).
- `backend/test/checkins.routes.test.js`, `checkinsService.test.js` y `autorizacion.routes.test.js`: patrones de test (supertest + mocks con `vi.hoisted`). A `rutasConGate` se agrega `{ metodo: 'post', ruta: '/sugerencias' }` y el mock del servicio nuevo.
- `frontend/src/api/checkinsApi.js`: patrón de POST autenticado (`obtenerTokenActual`, `leerCuerpoError`, `MENSAJE_FALLBACK`). El nuevo es `api/sugerenciasApi.js`.
- `frontend/src/paginas/Perfil.jsx` y `CrearBano.jsx`: overlay con `.detalle-pantalla`/`.detalle-nav`, foco en Volver y formulario accesible con error en línea. La nueva es `paginas/Sugerencias.jsx`.
- `frontend/src/paginas/Mapa.jsx`: la `<header className="barra-superior">` (5.2) recibe el botón `control-barra control-icono` con `aria-label="Sugerencias"` junto a Perfil (envueltos en un grupo a la izquierda) y un `overlay.tipo === 'sugerencias'`.
- `frontend/test/Mapa.test.jsx` y `Perfil.test.jsx`: patrones de test de overlay y barra.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/sql/006_sugerencias.sql`: tablas `sugerencias` + `configuracion`, fila inicial y RLS; se corre a mano en el SQL Editor de Supabase.
- [x] `backend/src/servicios/sugerenciasService.js`: `crearSugerencia({ usuarioId, tipo, texto }, cliente)` y `sugerenciasActivas(cliente)` (lee `configuracion` id=1; sin fila → false).
- [x] `backend/src/controladores/sugerenciasController.js`: `postSugerencia` y `getEstado`: validación y códigos de la matriz.
- [x] `backend/src/rutas/sugerencias.js` + `backend/src/app.js`: montar `GET /sugerencias/estado` y `POST /sugerencias`, ambos con los dos middlewares.
- [x] `backend/test/sugerencias.routes.test.js`, `sugerenciasService.test.js`, `autorizacion.routes.test.js`: cubrir la matriz y el gate (las dos rutas en `rutasConGate`).
- [x] `frontend/src/api/sugerenciasApi.js`: `enviarSugerencia` y `obtenerEstadoSugerencias`.
- [x] `frontend/src/paginas/Sugerencias.jsx` + `index.css`: overlay con selector de tipo (2 radios accesibles), textarea, confirmación y errores.
- [x] `frontend/src/paginas/Mapa.jsx`: botón 💬 condicionado al switch y overlay.
- [x] `frontend/test/Sugerencias.test.jsx`, `Mapa.test.jsx`, `sugerenciasApi.test.js`: cubrir la matriz, el botón con switch encendido y apagado, y la barra sin hueco.

**Acceptance Criteria:**
- Dado que la fase está activa, cuando abro Mapa o Lista, veo 💬 junto a Perfil en la Barra superior, y al tocarlo se abre Sugerencias con flecha de Volver.
- Dado que envío una sugerencia válida, cuando se guarda, la fila tiene mi usuario, tipo, texto y fecha, y ningún otro usuario ni endpoint puede leerla.
- Dado que la fase está apagada, cuando abro Mapa, no hay botón 💬, y un `POST /sugerencias` directo es rechazado.

## Verification

**Commands:**
- `cd backend && npx vitest run` -- todo en verde
- `cd frontend && npx vitest run && npm run lint && npm run build` -- todo en verde

**Manual checks:**
- skr corre `006_sugerencias.sql` en Supabase, envía una sugerencia desde el preview y la ve en Table Editor → `sugerencias`.

## Review Triage Log

Capas: blind-hunter, edge-case-hunter y verification-gap (esta última sin huecos: cada comportamiento cambiado tiene un test que corre normalmente).

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|---|---|---|---|---|
| Si el switch se apaga con la app abierta, el botón 💬 sigue visible y el 404 del POST se trata como error genérico que invita a reintentar | blind + edge | medium | patch | `Mapa.jsx` consulta el estado solo al montar, y `Sugerencias.jsx` no distingue `status 404`. Se arregló con el estado de buzón cerrado y `onBuzonCerrado`, que oculta el botón. |
| `obtenerEstadoSugerencias` falla porque la sesión no está lista al montar Mapa | edge | false | reject | `App.jsx` solo renderiza `Mapa` con sesión y perfil autorizado ya resueltos, así que el token existe al montar. |
| El comentario "nunca se prende por omisión" contradice el `default true` de la migración | blind | false | reject | El comentario habla de la fila faltante (que se trata como apagada). El `true` inicial es la decisión de la spec: la fase está activa hoy. |
| 404 no es el código correcto para un buzón cerrado | blind | false | reject | La matriz aprobada en el bloque frozen fija 404. Cambiarlo es editar la spec. |
| No hay rate limit en `POST /sugerencias` | blind + edge | medium | defer | Es anterior a este cambio: ningún endpoint autenticado tiene rate limit (deferred-work, spec 3.1). |
| Un `\u0000` en `texto` provoca un 500 que nunca se resuelve reintentando | blind + edge | low | reject | Es real, pero un usuario no escribe NUL por accidente, y el arreglo agrega un guard nuevo. |
| Doble envío en el mismo tick inserta duplicados | edge | low | reject | `enviando` deshabilita el botón en el siguiente render; el mismo tick solo se alcanza con un script. |
| El switch puede cambiar entre la lectura y el insert | blind + edge | low | reject | La ventana es de milisegundos y el costo es aceptar una sugerencia de más. |
| `obtenerEstadoSugerencias` lanza errores crudos sin marca | edge | low | reject | Su único caller (`Mapa`) los silencia a propósito para ocultar el botón. |
| Constantes y copy duplicados (2000, tipos, mensajes) entre SQL, backend y frontend | blind | low | reject | Es el mismo patrón que el resto del código (radios de 150m, mensajes de check-in). No hay daño concreto hoy. |
| `maxLength` corta en silencio el texto pegado, y no hay contador | blind | low | reject | Pegar más de 2000 caracteres es raro, y el contador sería UI nueva. |
| `on delete cascade` borra las sugerencias junto con el perfil | blind | low | reject | Es el mismo patrón ya diferido en la spec 3.2, y hoy no existe borrado de cuenta. |
| La confirmación con `role="status"` puede no anunciarse; el foco va a Volver | blind | low | reject | El foco en Volver es el patrón de todos los overlays. El aviso del lector de pantalla es una mejora de accesibilidad para toda la app. |
| `Sugerencias.jsx` reusa la clase `crear-bano-intro` | blind | low | reject | Cosmético: es la misma regla de margen. |
| Huecos de tests (404 en frontend, estado sin sesión, body no JSON, guard `vigente`) | blind | low | patch parcial | El test del 404 entra con el parche. Lo demás tiene poco valor o no es observable (verification-gap lo confirmó). |
