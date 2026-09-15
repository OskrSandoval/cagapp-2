---
title: 'Inicio de sesión y puerta de entrada obligatoria'
type: 'feature'
created: '2026-09-14'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 1.2 (`epics.md`) exige que un usuario con cuenta pueda iniciar sesión, que su sesión persista entre visitas, que un correo/contraseña incorrectos muestren un error claro, que cualquier apertura sin sesión redirija a Login antes de cualquier otra pantalla, y que cerrar sesión fuerce un nuevo login la próxima vez — pero ninguno de estos cuatro comportamientos tiene todavía un test dedicado que lo confirme y lo proteja de regresiones futuras.

**Approach:** Story 1.1 ya construyó toda la mecánica necesaria (`Login.jsx` con pestaña "Iniciar sesión" vía `signInWithPassword` + `mapearErrorAuth`, `App.jsx` con la puerta obligatoria basada en `supabase.auth.getSession()`/`onAuthStateChange`, y el botón "Cerrar sesión" que llama `signOut()`), así que esta historia no agrega pantallas ni endpoints nuevos: agrega cobertura de test (Vitest + Testing Library) para los cuatro comportamientos de la AC sobre `App.jsx` y el flujo de login de `Login.jsx`, y corrige cualquier gap real que la verificación descubra.

</frozen-after-approval>

## Implementation Notes

- **Confirmado: no hacía falta código de producto nuevo.** Los cuatro comportamientos de la AC de Story 1.2 ya funcionaban gracias a Story 1.1 (`App.jsx` usa `supabase.auth.getSession()`/`onAuthStateChange` para la puerta obligatoria y la persistencia de sesión — Supabase persiste en `localStorage` por default —, `Login.jsx` ya tenía la pestaña "Iniciar sesión" con `signInWithPassword` + `mapearErrorAuth`, y el botón "Cerrar sesión" en `Bienvenida` ya llama `signOut()`). El trabajo real de esta historia fue solo cobertura de test.
- **`frontend/vite.config.js`:** el proyecto no tenía entorno de test configurado (los tests existentes eran lógica pura, sin DOM). Se agregó `test: { environment: 'jsdom', globals: true, setupFiles: ['./test/setup.js'] }` para poder renderizar componentes React. `globals: true` es necesario para que `@testing-library/react` registre su `afterEach(cleanup)` automático — sin eso, el DOM se acumulaba entre tests del mismo archivo (los primeros intentos fallaban por elementos duplicados). Los archivos de test existentes siguen importando `describe/it/expect/vi` explícito de `vitest`, sin conflicto con `globals: true`.
- **Nuevas devDependencies:** `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` — necesarias para renderizar y consultar componentes React en Vitest.
- **`frontend/test/setup.js`** (nuevo): importa `@testing-library/jest-dom/vitest` para habilitar matchers como `toBeInTheDocument`.
- **`frontend/test/App.test.jsx`** (nuevo): cubre las 3 AC de la puerta de entrada — sin sesión muestra Login (nunca la app), una sesión ya persistida (`getSession` la resuelve sola, simulando un reload) entra directo sin pedir login de nuevo, y cerrar sesión regresa a Login. El mock de `onAuthStateChange` captura el callback para poder simular manualmente el evento `SIGNED_OUT` que el `signOut()` real dispara — el mock de Supabase no ejecuta esa mecánica interna por sí solo.
- **`frontend/test/Login.test.jsx`** (nuevo): cubre las 2 AC del login mismo — credenciales correctas llaman `signInWithPassword` y notifican autenticación; credenciales incorrectas (`Invalid login credentials`) muestran el mensaje mapeado por `mapearErrorAuth` (`role="alert"`) y no notifican autenticación.
- **Matcher de texto por `getByRole('heading', ...)` en vez de `getByText`:** el `<h1>` de `Bienvenida` parte el texto "Ya estás dentro" en tres nodos (`"Ya "`, `<span>estás</span>`, `" dentro"`), así que `getByText` con regex no lo encuentra — el nombre accesible de `getByRole('heading', ...)` sí concatena todos los nodos hijos.
- **Verificado:** `cd frontend && npx vitest run` -- 14/14 (incluye los 6 tests previos de `mapearErrorAuth`/`perfilesApi`); `cd backend && npx vitest run` -- 12/12 sin cambios; `cd frontend && npx oxlint` -- sin hallazgos; `cd frontend && npm run build` -- exitoso (confirma que el cambio a `vite.config.js` no rompe el build de producción).
- **Renombrado a `spec-1-2-inicio-de-sesión-y-puerta-de-entrada-obligatoria.md`** (con acento) para que coincida con la key ya existente en `sprint-status.yaml` (`1-2-inicio-de-sesión-y-puerta-de-entrada-obligatoria`) — el nombre original sin acento que generé al planear esta historia no coincidía con esa key. Ver Review Triage Log.
- **`frontend/test/mapearErrorAuth.test.js` y `frontend/test/perfilesApi.test.js`** ganaron el directivo `// @vitest-environment node`: son tests de lógica pura sin DOM, y no deben pagar el costo de bootstrap de `jsdom` que ahora es el entorno global por default (`vite.config.js`).

## Review Triage Log

Revisor: `blind-hunter` (subagente sin contexto previo), 8 hallazgos. N = min(floor(sqrt(62.9) + 1), 10) = 8.

- **medium / patch** — `epic-1-context.md` (recompilado al inicio de esta historia) había perdido las etiquetas de trazabilidad `AD-1`, `AD-5`/`AD-12`, `AD-10` y `(FR11 Perfil)` que la versión anterior sí tenía en Technical Decisions / Cross-Story Dependencies — el subagente de compilación las interpretó de más como "cita de fuente" (prohibida por la regla de compile-epic-context.md) cuando en realidad son identificadores de decisión estables, no números de sección de un doc que cambia. Restauradas verbatim.
- **low / patch** — El spec de esta historia (`spec-1-2-inicio-de-sesion-y-puerta-de-entrada-obligatoria.md`, sin acento) no coincidía con la key ya existente en `sprint-status.yaml` (`1-2-inicio-de-sesión-y-puerta-de-entrada-obligatoria`, con acento) — mismatch introducido por esta misma sesión al derivar el slug del archivo en step-02. Renombrado el archivo para usar el acento y quedar consistente con el tracker.
- **medium / patch** — El test "sesión ya persistida" solo verificaba el estado final resuelto, no que Login se mantuviera ausente durante el hueco de carga entre el montaje y que `getSession()` resuelva — un futuro cambio que reemplazara el guard `sesion === undefined` por `!sesion` produciría un parpadeo a Login que este test no habría detectado, justo lo que la AC de "sesión persiste... nunca se vuelve a pedir login" protege. Agregada una aserción síncrona inmediatamente después de `render()`.
- **low / patch** — `App.test.jsx` disparaba el click de "Cerrar sesión" con `.click()` crudo del DOM en vez de `userEvent`/`fireEvent`, inconsistente con `Login.test.jsx` en el mismo cambio y fuera del patrón act-aware que usa el resto de la suite. Cambiado a `userEvent.click`.
- **low / patch** — `vite.config.js` puso `environment: 'jsdom'` como default global, pagando el costo de bootstrap de jsdom también en los tests de lógica pura preexistentes (`mapearErrorAuth.test.js`, `perfilesApi.test.js`) que no lo necesitan. Agregado `// @vitest-environment node` a ambos.
- **defer** — `sprint-status.yaml` sigue marcando `1-1-registro-de-cuenta: review`, desincronizado del `status: done` real de ese spec; ya había sido flagged en el propio Review Triage Log de spec-1-1 y sigue sin corregirse. No causado por esta historia. Ver `deferred-work.md`.
- **defer** — `App.jsx`'s `onCerrarSesion` no maneja un `signOut()` que falle (red caída): sin feedback al usuario, el botón parece no hacer nada. Preexistente de Story 1.1, fuera de la AC de esta historia (que solo cubre el camino feliz). Ver `deferred-work.md`.
- **defer** — Falta cobertura a nivel de `App.jsx` de la interacción entre sesión persistida y los estados intermedios de `GET /perfiles/yo` (pendiente/404/error) durante el cold-open — hoy `perfilesApi.test.js` los prueba aislados, no vía el enrutamiento real de `App.jsx`. Es superficie de la máquina de estados de perfil de Story 1.1 (ya verificada manualmente end-to-end), no de la AC de login de esta historia. Ver `deferred-work.md`.
- **low / rejected** — El test de logout dispara `SIGNED_OUT` manualmente sobre el callback capturado en vez de que el mock de Supabase lo emita "de verdad": es la técnica estándar para testear este patrón a nivel de componente sin un backend real; verificarlo de otra forma requeriría infraestructura de integración/E2E fuera de alcance para un test unitario, y no cambia el comportamiento real observado por el usuario.
- **false** — "El spec de esta historia no sigue la estructura completa de `spec-1-1` (Boundaries, Code Map, Tasks & Acceptance, Verification)": es el comportamiento esperado de la ruta `oneshot` de step-02, que explícitamente autoriza un spec mínimo (solo Intent + Implementation Notes) cuando no hay intent gaps, nada irreversible y el cambio es pequeño — no un defecto.

