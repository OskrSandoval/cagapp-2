---
title: 'Registro de cuenta y configuración inicial del proyecto'
type: 'feature'
created: '2026-09-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '714883b1216a7d65d1d88b793adaeb74c2e2f31c'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CagApp 2.0 todavía no existe como código, y sin cuenta nadie puede usar la app (el login es obligatorio, no hay modo anónimo).

**Approach:** Levantar el esqueleto del proyecto (frontend Vite + backend Express, ambos conectados a un proyecto de Supabase nuevo que se crea como parte de esta historia, con confirmación de correo desactivada) e implementar el registro de cuenta **solo por correo/contraseña** (login social queda diferido a una historia de seguimiento), asegurando también que exista la fila de perfil del usuario (creada o completada) antes de dejarlo usar la app (AD-10).

## Boundaries & Constraints

**Always:**
- El frontend solo llama al SDK de Supabase para registro/sesión (AD-1); cualquier otra escritura de negocio pasa por la API de Node.
- Backend en capas: `rutas → controladores → servicios → datos`, sin saltar niveles (AD-2).
- Vocabulario de dominio en español (tablas, columnas de negocio, rutas, campos JSON); columnas técnicas (`id`, `created_at`) en inglés (AD-6).
- Secretos (service role key, etc.) solo en variables de entorno, nunca committeados.
- Política de contraseña y expiración de sesión = defaults de Supabase Auth, sin reimplementar nada propio (AD-12).
- Tabla `perfiles` con RLS habilitado, sin políticas públicas — solo la `service role key` del backend accede (AD-9). Su columna `id` referencia `auth.users(id)` con `ON DELETE CASCADE`, para que borrar un usuario de Auth nunca deje un perfil huérfano.
- Copy en tono "chusco" con emojis en momentos clave, según `EXPERIENCE.md § Voice and Tone`.
- `POST /perfiles` es **idempotente** (upsert por `id`): reintentarlo tras una falla nunca produce un error de llave duplicada ni un segundo perfil — reintentar siempre es seguro.
- `POST /perfiles` toma el `id` del JWT ya verificado (`auth.uid()`), nunca del body — el body solo trae `{ nombre_para_mostrar }`.
- Al iniciar sesión, si el Usuario no tiene fila en `perfiles` todavía (vía `GET /perfiles/yo`), el frontend le pide completar su nombre para mostrar antes de continuar, en vez de fallar o dejarlo entrar sin perfil.
- El proyecto de Supabase se crea desde cero como parte de esta historia (el usuario no tenía uno), con la confirmación de correo (email confirmation) **desactivada** en Authentication → Providers → Email, para que el registro autentique de inmediato sin esperar un clic de confirmación; las llaves resultantes (URL, anon key, service role key) se documentan en `.env.example` sin valores reales.
- El backend habilita CORS para el origen del frontend (configurable por variable de entorno).
- `.gitignore` excluye `.env` (raíz, `frontend/`, `backend/`) desde el primer commit.
- Los tests usan **Vitest**.

**Never:**
- No construir lógica de baños/calificaciones en esta historia — es de épicas futuras.
- No usar un trigger de base de datos para crear `perfiles` — debe ser una llamada explícita del backend (AD-10).
- No usar TypeScript ni un starter distinto a Vite/Express estándar — proyecto de aprendizaje, simplicidad ante todo.
- No configurar login social (Google/Facebook) en esta historia — decisión explícita del usuario, queda para una historia de seguimiento inmediata (ver `deferred-work.md`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Registro por correo | correo nuevo, contraseña válida, nombre para mostrar | Se crea usuario en Supabase Auth (autenticado de inmediato, sin confirmar correo) + fila en `perfiles` vía `POST /perfiles` | N/A |
| Correo duplicado | correo ya registrado | Rechaza con mensaje claro en tono de marca | Supabase Auth error mapeado a mensaje de UI |
| Contraseña débil | no cumple el mínimo de Supabase Auth | Rechaza, muestra el motivo | Error de Supabase Auth mostrado en el campo |
| `POST /perfiles` falla y se reintenta | red cae o backend no responde, usuario reintenta | El reintento crea (o no cambia) la misma fila, sin duplicados ni error | Upsert idempotente por `id`; reintento manual desde la UI |
| Login sin perfil existente | usuario autenticado pero `GET /perfiles/yo` responde 404 | Frontend pide completar nombre para mostrar y llama `POST /perfiles` antes de dejarlo continuar | N/A |

</frozen-after-approval>

## Code Map

- Repositorio vacío salvo `_bmad/` y `_bmad-output/` — no hay código previo que reutilizar ni convenciones existentes que romper.
- `frontend/` -- nuevo, proyecto Vite (React, JavaScript, sin TypeScript)
- `backend/` -- nuevo, proyecto Node + Express
- No existe proyecto de Supabase todavía — se crea como parte de esta historia (guía paso a paso al usuario, no automatizable sin sus credenciales de dashboard)

## Tasks & Acceptance

**Execution:**
- [x] Guiar a skr paso a paso para crear el proyecto de Supabase en supabase.com y desactivar "Confirm email" en Authentication → Providers → Email -- prerequisito de todo lo demás -- ejecutado por skr, confirmado (ver Verification)
- [x] `supabase/sql/001_perfiles.sql` -- script SQL: crear tabla `perfiles` (`id` uuid PK, FK a `auth.users(id)` con `ON DELETE CASCADE`, `nombre_para_mostrar` text, `created_at` timestamptz), habilitar RLS sin políticas públicas -- AD-9, AD-10, para correr en el SQL Editor de Supabase
- [x] `frontend/` -- iniciar con Vite (plantilla react) -- base del cliente
- [x] `frontend/.env.example` -- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` -- config del SDK cliente
- [x] `frontend/src/auth/supabaseClient.js` -- inicializar cliente Supabase del navegador -- AD-1
- [x] `frontend/src/paginas/Login.jsx` -- pestañas Login/Registro, campos con label+id, botón primario -- FR1, FR2, mockup `key-login.html` (sin botones sociales por ahora)
- [x] `frontend/src/paginas/CompletarPerfil.jsx` -- pantalla para pedir el nombre para mostrar cuando `GET /perfiles/yo` responde 404 tras login -- decisión de esta revisión
- [x] `backend/` -- iniciar con Express -- base del servidor
- [x] `backend/.env.example` -- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`, `FRONTEND_ORIGIN` -- config del backend
- [x] `backend/src/index.js` -- configurar CORS restringido a `FRONTEND_ORIGIN` -- decisión de esta revisión
- [x] `backend/src/datos/supabaseAdmin.js` -- cliente Supabase con service role key -- AD-1
- [x] `backend/src/middleware/auth.js` -- verifica JWT Bearer de Supabase -- AD-5, AD-12
- [x] `backend/src/rutas/perfiles.js` + `controladores/perfilesController.js` + `servicios/perfilesService.js` -- `POST /perfiles` (upsert idempotente, `id` del token, body `{nombre_para_mostrar}`) y `GET /perfiles/yo` (200 con el perfil o 404 si no existe) -- AD-10, capas AD-2
- [x] `.gitignore` -- excluir `.env` en raíz, `frontend/` y `backend/` -- decisión de esta revisión
- [x] Tests con **Vitest** para los edge cases de la matriz I/O (correo duplicado, contraseña débil, reintento idempotente de `POST /perfiles`, `GET /perfiles/yo` 404)

**Acceptance Criteria:**
- Given que no tengo cuenta, when lleno el formulario con correo/contraseña/nombre para mostrar, then se crea mi cuenta (autenticada de inmediato, sin confirmar correo) y mi perfil, and quedo autenticado.
- Given que el correo ya está registrado, when intento crear la cuenta, then el sistema lo rechaza con mensaje claro.
- Given que mi contraseña no cumple el mínimo, when intento registrarme, then veo el error correspondiente.
- Given que `POST /perfiles` falló antes y lo reintento, when se reenvía la misma petición, then no se crea un perfil duplicado ni falla por llave repetida.
- Given que inicio sesión y `GET /perfiles/yo` no encuentra mi perfil, when la app lo detecta, then me pide completar mi nombre para mostrar antes de continuar.
- Given que es la primera vez que se levanta el proyecto, when sigo la configuración inicial (incluyendo crear el proyecto de Supabase con confirmación de correo desactivada), then frontend y backend corren localmente, con CORS habilitado, y se comunican con Supabase.

## Implementation Notes

- **Proyecto de Supabase (paso manual pendiente):** no puedo crear el proyecto en supabase.com por ti (requiere tus credenciales del dashboard). Pasos exactos para ejecutar antes de correr algo end-to-end:
  1. Entra a https://supabase.com/dashboard y crea un proyecto nuevo (elige región, guarda la contraseña de la base de datos).
  2. Ve a Authentication → Providers → Email y desactiva "Confirm email" (para que el registro autentique de inmediato, sin esperar clic de confirmación).
  3. Ve a Project Settings → API y copia `Project URL`, `anon public key` y `service_role key`.
  4. Copia `frontend/.env.example` a `frontend/.env` y llena `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (deja `VITE_API_URL` como está si el backend corre en `localhost:3001`).
  5. Copia `backend/.env.example` a `backend/.env` y llena `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (`PORT` y `FRONTEND_ORIGIN` ya traen defaults razonables para dev).
  6. En el SQL Editor del proyecto, corre `supabase/sql/001_perfiles.sql` para crear la tabla `perfiles` con RLS habilitado.
- **`VITE_API_URL` añadido al frontend (no estaba en la lista original de la tarea):** el frontend necesita saber la URL base del backend para llamar a `POST /perfiles` / `GET /perfiles/yo` (AD-1: cualquier escritura de negocio pasa por la API de Node). Se agregó como tercera variable en `frontend/.env.example` con default `http://localhost:3001`; sin esto la app no podría comunicarse con el backend en ningún entorno.
- **`backend/src/app.js` separado de `backend/src/index.js`:** `app.js` exporta `crearApp()` (Express + CORS + rutas, sin levantar el server) y `index.js` solo hace `app.listen(...)`. Esto permite montar la app en los tests de integración con `supertest` sin pelear por puertos ni depender de variables de entorno reales en cada test run. `index.js` sigue siendo el entry point que configura CORS (vía `crearApp`) como pedía la tarea.
- **Tests de Vitest también en el frontend (no solo backend):** la matriz de edge cases incluye "correo duplicado" y "contraseña débil", que son errores de Supabase Auth SDK del lado del frontend (AD-1: el frontend es quien llama `signUp`). Se extrajo el mapeo de esos errores a copy con tono de marca en `frontend/src/auth/mapearErrorAuth.js` y se cubre con Vitest en `frontend/test/mapearErrorAuth.test.js`. Se agregó `vitest` como devDependency y el script `npm test` en `frontend/package.json`. La sección Verification original solo listaba `cd backend && npx vitest run`; `cd frontend && npx vitest run` corre el resto de esos dos edge cases.
- **`backend/vitest.config.js` con env dummy:** `datos/supabaseAdmin.js` llama `createClient()` al importarse, lo que revienta si `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` no existen. Se agregó `vitest.config.js` con valores dummy (`https://example.supabase.co`, etc.) solo para que el módulo se pueda importar en tests; ningún test le pega a Supabase real — usan un cliente inyectado (falso) o `vi.mock`.
- **Pantalla "Bienvenida" placeholder en `frontend/src/App.jsx`:** ninguna otra épica/historia existe todavía, así que tras login+perfil completo se muestra una pantalla mínima ("Ya estás dentro") con botón de cerrar sesión, solo para poder verificar el flujo de punta a punta (AC #6). Se reemplaza por completo cuando llegue Story 1.2 / el Mapa real.
- **Link "¿Se te olvidó?" en Login.jsx:** presente por fidelidad al mockup `key-login.html` y porque UX dice que siempre debe ser visible, pero la recuperación de contraseña es Story 1.3 (fuera de alcance aquí) — al hacer clic solo muestra un aviso ("Muy pronto..."), sin llamar a ningún endpoint de recuperación.
- **Botones sociales omitidos del formulario** (a propósito, por el `Never` de la spec): `Login.jsx` no incluye Google/Facebook, a diferencia del mockup de referencia.
- **Versiones instaladas:** `frontend`: React 19.2.8, Vite 8.3.0 (via `create-vite`), `@supabase/supabase-js` 2.116.0. `backend`: Express 5.2.1, `@supabase/supabase-js` 2.116.0, `cors`, `dotenv`; devDependencies `vitest` 5.0.0 y `supertest` para los tests de rutas. Coinciden con las versiones sugeridas en `epic-1-context.md` (Node local usado para desarrollar es 22.18.0, no 24 LTS — no se detectó incompatibilidad en la instalación ni en los tests).

## Spec Change Log

- 2026-09-14 — Se agregó `VITE_API_URL` a `frontend/.env.example` (no listado en la tarea original) porque el frontend necesita la URL base del backend para llamar a `POST /perfiles` / `GET /perfiles/yo`; ver Implementation Notes.
- 2026-09-14 — Se agregó `backend/src/app.js` (no listado explícitamente) para separar la construcción de la app Express de `index.js` y poder testear las rutas con `supertest`; `index.js` se mantiene como el archivo que configura CORS, según pedía la tarea.
- 2026-09-14 — Se añadió Vitest también al frontend (`frontend/test/mapearErrorAuth.test.js`, script `npm test`) para cubrir los edge cases "correo duplicado" y "contraseña débil" de la matriz I/O, que ocurren del lado del cliente (llamada a `supabase.auth.signUp`) y no tienen equivalente directo en el backend.

## Review Triage Log

- **medium / patch** — `backend/src/app.js:6` — `cors({ origin: process.env.FRONTEND_ORIGIN })`: si `FRONTEND_ORIGIN` falta en un despliegue real, el paquete `cors` trata un `origin` falsy como "reflejar cualquier origen", abriendo la API a cualquier dominio en vez de restringirla — contradice el `Always` de CORS restringido. Verificado leyendo el código y el comportamiento documentado del paquete `cors`.
- **medium / patch** — `frontend/src/App.jsx:39-42` + `frontend/src/api/perfilesApi.js:52-63` — el `.catch()` de `obtenerMiPerfil()` trata *cualquier* error (500, red caída, sesión sin token) igual que un 404 real, mandando al usuario a `CompletarPerfil`, cuyo `POST /perfiles` es upsert — un error transitorio podría sobrescribir el `nombre_para_mostrar` ya guardado. Además esta rama no tiene ningún test (confirmado: solo existe `frontend/test/mapearErrorAuth.test.js`, ningún test toca `perfilesApi.js` ni `App.jsx`). Verificado leyendo ambos archivos.
- **low / patch** — `backend/src/datos/supabaseAdmin.js:9-16` y `frontend/src/auth/supabaseClient.js:8-14` — tras el `console.error` amigable si faltan las env vars, el código igual llama `createClient(undefined, undefined)`, que revienta con un stack trace crudo en vez de fallar limpio. Verificado en el código.
- **low / patch** — `frontend/src/paginas/Login.jsx:75-86` — en el branch de registro solo se chequea `error` tras `signUp`, nunca si `data.session` viene vacío (pasaría si "Confirm email" se reactivara por error); el usuario se queda sin feedback. Verificado en el código.
- **low / patch** — `backend/src/controladores/perfilesController.js:6-14` — `nombre_para_mostrar` se coacciona con `String(...)` sin chequear tipo ni longitud; un valor no-string (ej. objeto) pasa la validación como `"[object Object]"`, y no hay tope de longitud. Verificado en el código.
- **low / patch** — `_bmad-output/planning-artifacts/epics.md` (Story 1.1 Acceptance Criteria) — sigue describiendo registro con Google/Facebook creando cuenta y perfil igual, contradiciendo el `Never` de esta spec; no referencia `deferred-work.md`. Verificado comparando ambos archivos.
- **low / patch** — `frontend/src/paginas/Login.jsx:150-160` (aprox., link "¿Se te olvidó?") — es un `<a href="#">` con `preventDefault()` usado solo para cambiar estado local, en vez de un `<button>` semántico, pese al énfasis de la spec en accesibilidad real. Verificado en el código.
- **low / patch** — `backend/src/middleware/auth.js:7-8` — `encabezado.split(' ')` no tolera espacios extra ni variantes de mayúsculas en "Bearer"; poco probable en uso normal (el único cliente es este mismo frontend, que siempre envía el formato exacto) pero el fix es trivial. Verificado en el código.
- **low / patch** — `frontend/index.html` — `lang="en"` y `<title>frontend</title>` sin localizar/marcar, pese a que el producto es 100% en español y con marca CagApp. Verificado en el código.
- **low / patch** — `_bmad-output/implementation-artifacts/sprint-status.yaml` — sigue en `in-progress` para `1-1-registro-de-cuenta` y `epic-1`, desincronizado con el `status: in-review` del spec. Verificado comparando ambos archivos.
- **false** — `backend/src/middleware/auth.js` sin try/catch alrededor de `supabaseAdmin.auth.getUser(token)`: Express 5 reenvía automáticamente los rechazos de promesas de middleware async al error handler genérico ya definido en `app.js` (responde 500 con copy de marca) — no hay crash ni rechazo sin manejar. Verificado: `express: "^5.2.1"` en `package.json`, comportamiento documentado de Express 5.
- **false** — "AC1 promete perfil incondicional pero `crearPerfil()` en el registro atrapa y descarta el error en silencio": es el diseño documentado a propósito — la fila de matriz "Login sin perfil existente" cubre exactamente este camino (`GET /perfiles/yo` 404 → `CompletarPerfil` → reintento idempotente). Verificado end-to-end: un registro cuyo `POST /perfiles` inicial fallara igual termina con perfil creado vía el flujo de reintento, ya probado contra Supabase real.
- **false** — `frontend/src/App.jsx` pasa `onAutenticado={() => {}}` (no-op) a `<Login>`: la transición real de sesión la maneja `supabase.auth.onAuthStateChange`, ya verificado funcionando end-to-end; el callback no-op no produce ningún defecto observable.
- **false** — `## Review Triage Log` vacío mientras `## Verification` ya tenía resultados: es el orden esperado del workflow (step-03 verifica antes de que step-04 llene este log), no un defecto.
- **false / out-of-scope** — "Falta un workflow de CI": `_bmad-output/planning-artifacts/epics.md` § Additional Requirements declara explícitamente "Sin estrategia de pruebas automatizadas definida para el MVP (diferido explícitamente en Arquitectura)" — exclusión a nivel de intención del proyecto completo, no de esta historia.

## Verification

**Commands:**
- `cd frontend && npm run dev` -- expected: la app carga en el navegador sin errores de consola
- `cd backend && npm run dev` -- expected: el servidor arranca y responde en el puerto configurado, con CORS habilitado para `FRONTEND_ORIGIN`
- `cd backend && npx vitest run` -- expected: todos los tests pasan
- `curl -X POST http://localhost:PORT/perfiles -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"nombre_para_mostrar":"skr"}'` -- expected: 200/201 con la fila creada o actualizada; repetir el mismo comando no falla ni duplica
- `curl http://localhost:PORT/perfiles/yo -H "Authorization: Bearer <token>"` -- expected: 200 con el perfil si existe, 404 si no

**Manual checks (if no CLI):**
- Registrar una cuenta nueva por correo y verificar en el dashboard de Supabase que aparece en `auth.users` (ya confirmado, sin esperar email) y en `perfiles`.

**Resultados de verificación end-to-end (2026-09-14, contra proyecto Supabase real de skr, ya con `frontend/.env` y `backend/.env` completados y `supabase/sql/001_perfiles.sql` ejecutado):**
- `cd backend && npx vitest run` -- 12/12 tests pasaron.
- `cd frontend && npx vitest run` -- 6/6 tests pasaron.
- Backend arrancado con `node src/index.js` contra credenciales reales -- `GET /` respondió 200; header `Access-Control-Allow-Origin: http://localhost:5173` presente.
- Frontend arrancado con `npm run dev` -- sirvió en `http://localhost:5173` (200).
- AC1 (registro nuevo): `POST {SUPABASE_URL}/auth/v1/signup` con correo nuevo devolvió `access_token` y `email_confirmed_at` ya seteado (confirma "Confirm email" desactivado); `POST /perfiles` con ese token devolvió 200 con la fila creada.
- AC4 (reintento idempotente): mismo `POST /perfiles` repetido devolvió el mismo `id`/`created_at`, sin duplicar.
- AC5 (login sin perfil): usuario recién registrado sin llamar `POST /perfiles` -- `GET /perfiles/yo` devolvió 404; tras crear el perfil, devolvió 200.
- AC2 (correo duplicado): reintentar `signup` con el mismo correo devolvió 422 `user_already_exists` (mapeado a copy de marca por `mapearErrorAuth`, cubierto en tests).
- AC3 (contraseña débil): `signup` con contraseña de 3 caracteres devolvió 422 `weak_password` (mapeado igual, cubierto en tests).
- AC6 (levantar el proyecto): confirmado arriba -- frontend y backend corren localmente, CORS habilitado, backend se comunica con Supabase real.
- Los servidores de verificación se detuvieron al terminar (no quedan procesos en 3001/5173).

**Re-verificación post-patches de revisión (2026-09-14, mismo proyecto Supabase real):**
- `cd backend && npx vitest run` -- 12/12 pasaron.
- `cd frontend && npx vitest run` -- 9/9 pasaron (incluye el nuevo `frontend/test/perfilesApi.test.js`).
- Backend re-arrancado -- `GET /` 200, sigue comunicándose con Supabase real.
- Repetido el flujo AC1/AC2/AC3/AC4/AC5 completo contra Supabase real -- mismos resultados que antes de los patches (200 con perfil creado, reintento idempotente sin duplicar, 404 antes de crear perfil, 422 `user_already_exists`, 422 `weak_password`).
- `POST /perfiles` con `nombre_para_mostrar` no-string -- 400. Con 150 caracteres -- 400 "muy largo". Confirma el nuevo guard de tipo/longitud.
- `GET /perfiles/yo` con header `bearer   <token>` (minúscula + espacios extra) -- pasó la autenticación (404 por perfil inexistente, no 401). Confirma el parseo tolerante del Bearer.
- Arrancar `crearApp()` con `FRONTEND_ORIGIN` vacío lanza `Error: Falta FRONTEND_ORIGIN...` en vez de abrir CORS a cualquier origen. Confirma el fail-fast.
- Servidores de verificación detenidos al terminar.
