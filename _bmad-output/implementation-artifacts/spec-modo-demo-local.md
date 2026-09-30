---
title: 'Modo demo local para verificación visual'
type: 'chore'
created: '2026-09-30'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'c61fc01f05e7f8d8cd1d24ea65351f9f112935ce'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El agente no puede ejecutar la app para verificarla visualmente, porque exige login real de Supabase y la única base de datos es la de producción. Dos bugs se escaparon por eso (`100vh` en la 5.2 y el foco con el GPS, R1). Es la acción `epic-5-retro-item-10` de la retro de la épica 5. skr eligió un modo demo local en lugar de un usuario de prueba en producción o de una segunda base de datos (2026-09-30).

**Approach:** `npm run dev:demo` arranca Vite en modo `demo`. Antes del primer render, `main.jsx` instala por import dinámico tres piezas falsas:
- **Sesión:** `supabase.auth` se reemplaza (`getSession` devuelve una sesión falsa, `onAuthStateChange` no dispara nada y `signOut` no hace nada), así que la app entra directo al Mapa con un perfil autorizado.
- **API:** `window.fetch` se reemplaza solo para las URLs que empiezan con `VITE_API_URL` por una API en memoria que imita las respuestas del backend real. El resto de `fetch` (los tiles del mapa) sigue siendo real.
- **GPS:** `navigator.geolocation` se reemplaza por uno falso, controlable desde la consola con `window.cagappDemo`.

Nada de esto se conecta a Supabase ni a producción, y el build de producción no incluye el módulo.

## Boundaries & Constraints

**Always:**
- Se activa solo con `import.meta.env.DEV && import.meta.env.VITE_MODO_DEMO === 'true'`, y el import de `src/demo/` es dinámico y va dentro de esa condición para que `vite build` lo elimine.
- `frontend/.env.demo` se commitea sin secretos: `VITE_MODO_DEMO=true` y valores placeholder para `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, para que `createClient` no falle.
- La API falsa imita las formas y los códigos de estado de los controladores reales, que son la fuente de verdad: `GET/POST /banos` (con `distancia_metros` y `calificacion_promedio`), `POST /checkins` (201/403/422 con las mismas reglas de 150m y accuracy de `checkinsService.evaluarDistanciaCheckin`), `GET/POST /calificaciones`, `GET /perfiles/yo`, `GET /perfiles/yo/actividad`, `GET /sugerencias/estado` y `POST /sugerencias`, con los mensajes de error en el mismo formato `{ error }`.
- Datos: unos 6 baños alrededor de la Roma Norte y la Condesa. Al menos uno a ≤200m y otro entre 150 y 200m del punto inicial, y el resto más lejos. Algunos con calificaciones y otros sin ellas. Se guardan en memoria y se reinician al recargar.
- `window.cagappDemo` expone:
  - `moverA(lat, lng, accuracy?)`: emite una posición nueva a los `watchPosition` activos y a los `getCurrentPosition` pendientes.
  - `sacudirGps()`: vuelve a emitir la posición actual como un objeto nuevo.
  - `fallarSiguiente(ruta)`: la siguiente petición a esa ruta responde 500.
  - `buzon(activo)`: prende o apaga el switch de sugerencias.
  - `estado()`: devuelve los baños, check-ins, calificaciones y sugerencias en memoria.
- `document.title` lleva el prefijo `[DEMO]`, y al arrancar se hace un `console.info` con la lista de comandos.
- La distancia en la API falsa usa Haversine propio. Es aceptable porque es un backend falso de desarrollo; AD-4 aplica al código de producción.

**Never:**
- Ningún cambio al comportamiento de producción ni a los módulos `src/api/*`, `App.jsx` o las páginas; el modo demo se instala desde afuera.
- Ninguna llamada de red a Supabase ni al backend en modo demo.
- Nada de `localStorage` ni persistencia.
- No se agrega al build de producción ni a Vercel.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Arranque demo | `npm run dev:demo` | Entra directo al Mapa, sin login, con pines y la ubicación falsa; título `[DEMO] …` | N/A |
| Arranque normal | `npm run dev` | Comportamiento actual, con login real; no se carga nada de `src/demo/` | N/A |
| Build de producción | `npm run build` | `dist/` no contiene `cagappDemo` ni código de `src/demo/` | N/A |
| Crear baño | Formulario válido | `POST /banos` falso → 201; el baño aparece en la lista y el mapa con distancia 0 | Campos faltantes → 400 como el real |
| Check-in lejos | `moverA` a >150m del baño | 403 con el mismo mensaje de "fuera de rango" | N/A |
| Falla forzada | `fallarSiguiente('/banos')` y después recargar baños | Esa petición responde 500 y la siguiente vuelve a funcionar | Mensaje `{ error }` de marca |
| GPS sacudido | `sacudirGps()` mientras se escribe en Crear Baño | El `watchPosition` recibe un objeto nuevo con las mismas coordenadas | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/main.jsx`: aquí se agrega la condición de demo y el `await import('./demo/instalarDemo.js')` antes de `createRoot(...).render`.
- `frontend/src/auth/supabaseClient.js`: exporta `supabase`; la demo reemplaza los métodos de `supabase.auth` en el mismo objeto. No hay que modificar este archivo.
- `frontend/src/App.jsx`: flujo de `getSession` → `GET /perfiles/yo` → `perfil.autorizado`. Sirve para saber qué debe responder la demo; no se modifica.
- `frontend/src/api/*.js`: todas las llamadas usan `fetch(`${API_URL}/…`)` con `Authorization: Bearer <token>`. La API falsa acepta cualquier token.
- `backend/src/controladores/*.js` y `backend/src/servicios/*.js`: formas de respuesta, códigos, mensajes y reglas (`evaluarDistanciaCheckin`, `listarBanos`, `calificarBano`, `obtenerActividad`, `obtenerCalificacionesPublicas`, `sugerenciasActivas`) que la API falsa imita.
- `frontend/test/*.test.jsx`: patrón de tests con vitest y jsdom.
- `frontend/package.json`: aquí se agrega el script `"dev:demo": "vite --mode demo"`.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/.env.demo`: `VITE_MODO_DEMO=true`, `VITE_API_URL=http://demo.local`, y placeholders para Supabase (con comentario: "solo desarrollo, sin secretos").
- [x] `frontend/package.json`: script `dev:demo`.
- [x] `frontend/src/demo/datosDemo.js`: los baños semilla, el perfil y la ubicación inicial.
- [x] `frontend/src/demo/apiDemo.js`: el router en memoria (`manejarPeticion(metodo, ruta, cuerpo)` → `{ status, cuerpo }`), puro y testeable.
- [x] `frontend/src/demo/gpsDemo.js`: la geolocalización falsa (`watchPosition`, `clearWatch`, `getCurrentPosition`, `moverA`, `sacudir`).
- [x] `frontend/src/demo/instalarDemo.js`: parchea `supabase.auth`, `window.fetch` (solo para `VITE_API_URL`) y `navigator.geolocation`; expone `window.cagappDemo`; pone el prefijo `[DEMO]` al título y hace el `console.info`.
- [x] `frontend/src/main.jsx`: la condición y el import dinámico antes del render.
- [x] `frontend/test/apiDemo.test.js` y `frontend/test/gpsDemo.test.js`: cubren la matriz (formas y códigos por ruta, regla de 150m, `fallarSiguiente`, `buzon`, `sacudir` que emite un objeto nuevo).
- [x] `frontend/test/modoDemoBuild.test.js`: comprueba que `main.jsx` solo importa `./demo/` dentro de la condición `import.meta.env.DEV`.
- [x] `frontend/DEMO.md`: cómo arrancarlo y los comandos de `cagappDemo`, en español.

**Acceptance Criteria:**
- Dado `npm run dev:demo`, cuando abro `http://localhost:5173` en un navegador con viewport de celular, entonces veo el Mapa con pines, puedo usar Lista, Detalle, check-in, calificar, Agregar Baño, Perfil y Sugerencias sin ninguna llamada de red a Supabase ni al backend.
- Dado `npm run build`, cuando busco `cagappDemo` en `dist/`, entonces no aparece.

## Verification

**Commands:**
- `cd frontend && npx vitest run`: todo en verde.
- `cd frontend && npm run lint`: sin errores.
- `cd frontend && npm run build && ! grep -rq cagappDemo dist`: el build pasa y no incluye la demo.

**Manual checks:**
- El agente arranca `npm run dev:demo`, lo abre en el navegador a 360×640 y 390×844, recorre los flujos principales, prueba `sacudirGps()` mientras escribe en Crear Baño y toma capturas.

## Implementation Notes

- Lo implementó un subagente siguiendo la spec. Hay 6 baños semilla a 78m, 178m, 611m, 872m, 1.2km y 1.4km del punto inicial (19.4195, -99.162). El perfil demo ya tiene actividad previa. `gpsDemo` tarda 300ms en dar la primera posición y el `fetch` falso agrega 150ms de latencia.
- **Verificación visual (agente, 2026-09-30):** Chrome no deja encoger la ventana a menos de 570px, así que las pantallas de celular se probaron con un `iframe` de 360×640 en el mismo origen (`localhost:5199`), donde `100dvh` es la altura del marco. Se vieron:
  - Mapa: barras bien, "Agregar Baño" completo, zoom libre.
  - Lista ordenada por distancia.
  - Agregar Baño con la lista de cercanos (78m y 178m).
  - "Ninguno es este" abre el formulario.
  - **R1 comprobado en pantalla:** se escribió "Tacos", luego `sacudirGps()` y `moverA(...)`, luego " El Güero"; el foco siguió en `crearBanoNombre` y el valor quedó completo.
- **Parches de la revisión:**
  - Nuevo `instalarDemo.test.js`: prueba GET y POST reales de `banosApi` pasando por la demo, el paso directo de los tiles, el GPS falso, la sesión falsa y el título.
  - `modoDemoBuild.test.js` ahora corre `vite build()` de verdad y revisa `dist/`. Tuvo que forzar `NODE_ENV=production`: con `NODE_ENV=test`, Vite deja `DEV=true` y la demo **sí** entraba al bundle. El test la detectó, y un `npm run build` normal no se ve afectado.
  - `instalarDemo` falla si falta `VITE_API_URL`.
  - `buzon()` exige un booleano y `estado()` incluye los perfiles.
  - `DEMO.md` corregido (los ejemplos de `fallarSiguiente` y de fuera de rango) y con una sección nueva de "Límites".
  - Resultado: 216/216, `oxlint` sin errores y el build sin la demo.

## Review Triage Log

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|---|---|---|---|---|
| `instalarDemo.js` (el pegamento entre fetch, auth y GPS) no tiene test | verification-gap + blind | medium | patch | Solo se prueban los módulos puros; un error de prefijo o de body rompería `dev:demo` y la suite seguiría en verde. |
| "La demo no se va a producción" solo se verifica leyendo el texto del código | verification-gap + blind | medium | patch | Un cambio en `define` o en `mode` de `vite.config.js` metería la demo al bundle sin que falle ningún test. Se agrega un test con `build()`. |
| Sin `VITE_API_URL`, las llamadas caerían en `localhost:3001` (el backend real local) | edge | low | patch | Las API usan `VITE_API_URL \|\| 'http://localhost:3001'` y la demo solo intercepta el prefijo configurado. Se agrega un guard que falla ruidoso. |
| El ejemplo de `fallarSiguiente` en `DEMO.md` no dispara nada (mueve al mismo punto, bajo el umbral) y la falla puede caerle a un POST | blind + edge | low | patch (doc) | `UMBRAL_COORDENADAS = 0.0003` en `Mapa.jsx`; la falla se registra por ruta sin importar el método. |
| El ejemplo de "fuera de rango" queda dentro del rango de otro baño | blind | low | patch (doc) | Queda a unos 156m de Librería Orizaba; con accuracy 15 eso es un check-in válido. |
| "Cerrar sesión" no hace nada en demo, y las pantallas previas al Mapa no se alcanzan | blind + verification-gap | low | patch (doc) | El stub de `onAuthStateChange` nunca llama al callback. Se documenta como limitación. |
| `buzon()` sin argumento apaga el buzón; `estado()` no incluye perfiles | blind + edge | low | patch | Arreglo trivial. |
| No hay comandos para simular fallas de GPS, perfil sin autorizar o sin perfil, ni errores de red o 401 | blind | low | defer | Serían capacidades nuevas del modo demo; se registró en deferred-work. |
| Los mensajes de la API falsa pueden desfasarse de los del backend | verification-gap + blind | medium | defer | Hoy coinciden (verification-gap lo revisó a mano). `DEMO.md` ya acepta la alineación manual; el test cruzado entre paquetes se difiere. |
| `fetch` con `null` o con un `Request` (el body se pierde) | edge + verification-gap | low | reject | Ninguna llamada en `src/api` usa esa forma. |
| Si un callback del GPS lanza un error, `getCurrentPosition` resuelve síncrono dentro de `emitir`; se acepta accuracy negativa | edge | low | reject | Es una herramienta de desarrollo; los callbacks de la app no lanzan errores. |
| `main.jsx` sin `catch` alrededor de la instalación de la demo | edge | low | reject | Solo pasa en desarrollo; si la demo falla, la página en blanco con el error en consola es lo correcto. Renderizar la app "real" con credenciales placeholder confundiría más. |
| El reloj inyectado no llega a los datos semilla | blind | low | reject | Solo afecta a tests con relojes lejanos al tiempo real; los tests actuales no lo usan así. |
