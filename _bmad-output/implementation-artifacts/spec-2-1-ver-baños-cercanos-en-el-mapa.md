---
title: 'Ver baños cercanos en el mapa'
type: 'feature'
created: '2026-09-17'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'adc05ee57cd6d2eac9e10cc63efc30ef17fb1964'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tras el login no existe ninguna forma de ver baños cercanos — `App.jsx` solo muestra "Bienvenida", el placeholder mínimo de Story 1.1. Story 2.1 (`epics.md` FR4) exige que el usuario autenticado vea un mapa con su ubicación y los baños cercanos marcados con su calificación, con fallback a búsqueda por zona si niega geolocalización.

**Approach:** Nueva pantalla "Mapa" que reemplaza a "Bienvenida" como pantalla post-login. Pide geolocalización del navegador y llama a un nuevo endpoint backend `GET /banos` (patrón rutas→controladores→servicios→datos de `perfiles`) que devuelve todos los baños con distancia calculada (Haversine, AD-4) desde la ubicación dada. Si se niega el permiso, cae a un buscador por `zona` (`ILIKE`) contra el mismo endpoint. Sin baños en DB, muestra estado vacío invitando a agregar el primero.

**Decisión (Open Question resuelta):** El mapa se renderiza con Leaflet + tiles de OpenStreetMap (gratis, sin API key ni cuenta de facturación); la atribución OSM debe quedar visible en el mapa.

## Boundaries & Constraints

**Always:** Backend sigue el patrón rutas→controladores→servicios→datos ya usado por `perfiles` (AD-1), con cliente Supabase inyectable para tests. Tabla `baños` con RLS deny-by-default, solo `service role key` (AD-9). Función compartida `calcularDistanciaMetros(a, b)` (Haversine) en la capa de servicios (AD-4), reutilizable por la Épica 3. Sin paginación (diferido explícitamente en el epic). Vocabulario en español (AD-6). Reusar los tokens de color ya definidos (`--primary`/`--success`/`--warning`) para el badge de calificación por nivel.

**Never:** El frontend nunca lee/escribe `baños` directo contra Supabase. No construir el formulario real de creación de baño (Story 2.4) — el botón de "Agregar Baño" de esta historia es un stub sin funcionalidad, igual que el placeholder que tuvo "recuperar acceso" antes de Story 1.3. No implementar calificaciones/check-in (Épica 3) — todo baño muestra "sin calificaciones" por ahora, es el estado esperado. No introducir router ni librería de manejo de estado nueva.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mapa con ubicación concedida, hay baños cercanos | lat/lng del navegador, baños en DB | Mapa interactivo con pines: badge de calificación (o "sin calificaciones") + número exacto | N/A |
| Permiso de geolocalización denegado | Error `PERMISSION_DENIED` del navegador | Se muestra buscador por zona en vez del mapa geolocalizado | N/A |
| Sin baños registrados (ni por ubicación ni por zona) | DB vacía o sin resultados | Mensaje explícito + invitación a agregar el primero | N/A |
| Falla de red/servidor al pedir baños | `GET /banos` falla | Mensaje fallback en tono de marca, no deja la UI colgada | N/A |
| Búsqueda por zona sin resultados | Texto de zona sin coincidencias `ILIKE` | Mismo mensaje de "sin baños" que el mapa geolocalizado | N/A |

</frozen-after-approval>

## Code Map

- `backend/src/rutas/perfiles.js`, `backend/src/controladores/perfilesController.js`, `backend/src/servicios/perfilesService.js` -- patrón exacto rutas→controladores→servicios→datos a replicar para `banos` (cliente inyectable, ver `backend/test/perfilesService.test.js`).
- `backend/src/middleware/auth.js` -- `verificarSesion` ya disponible, reusar tal cual para proteger `GET /banos`.
- `backend/src/app.js` -- montar el nuevo router en `/banos`, mismo patrón que `perfilesRouter` (línea con `app.use('/perfiles', perfilesRouter)`).
- `supabase/sql/001_perfiles.sql` -- patrón de migración a replicar en `supabase/sql/002_banos.sql` (RLS enable, sin políticas, comentario AD-9); esquema de `baños` ya decidido en `epic-2-context.md` (id, nombre, lat, lng, tipo_lugar, zona, creado_por, created_at).
- `frontend/src/App.jsx` -- máquina de estados por sesión (líneas 30-107); sustituir el componente `Bienvenida` por la nueva pantalla `Mapa` cuando `perfil` ya existe.
- `frontend/src/api/perfilesApi.js` -- patrón de llamada autenticada al backend (`obtenerTokenActual`, manejo de error) a replicar en un nuevo `frontend/src/api/banosApi.js`.
- `frontend/src/index.css` -- tokens de color ya definidos (`--primary`, `--success`, `--warning`, líneas 3-11) para el badge de calificación por nivel.
- `backend/test/perfiles.routes.test.js` -- patrón de test de rutas con supertest a replicar para `banos.routes.test.js`.

## Tasks & Acceptance

**Execution:**
- [x] `supabase/sql/002_banos.sql` -- crear tabla `baños` con RLS deny-by-default -- AD-9, esquema ya decidido
- [x] `backend/src/servicios/banosService.js` -- `calcularDistanciaMetros(a, b)` (Haversine) + `listarBanos({ lat, lng, zona })` -- AD-4, cliente inyectable
- [x] `backend/src/controladores/banosController.js` -- `getBanos` valida query params (lat+lng o zona), llama al servicio, responde JSON
- [x] `backend/src/rutas/banos.js` + registro en `backend/src/app.js` -- `GET /banos` protegido por `verificarSesion`
- [x] `frontend/src/api/banosApi.js` -- `obtenerBanosCercanos({ lat, lng, zona })` -- mismo patrón que `perfilesApi.js`
- [x] `frontend/package.json` -- agregar `leaflet` (sin wrapper de React, usarlo directo en un `useEffect`) -- decisión de librería de mapa
- [x] `frontend/src/paginas/Mapa.jsx` -- pantalla nueva: geolocalización, pines con badge de calificación, fallback a buscador por zona, estado vacío, botón "Agregar Baño" (stub)
- [x] `frontend/src/App.jsx` -- sustituir `Bienvenida` por `Mapa` como pantalla post-perfil
- [x] `frontend/src/index.css` -- clases nuevas: pill/badge de calificación, fab, surface -- sobre los tokens ya definidos
- [x] `backend/test/banosService.test.js`, `backend/test/banos.routes.test.js`, `frontend/test/Mapa.test.jsx` -- cubrir la I/O & Edge-Case Matrix de arriba

**Acceptance Criteria:**
- Given que abro CagApp autenticado y ya tengo perfil, when se carga el Mapa, then veo mi ubicación y los baños cercanos marcados con su calificación (o "sin calificaciones").
- Given que los pines se colorean por nivel de calificación, when veo el mapa, then cada pin también muestra el número exacto, no solo el color.
- Given que no hay ningún baño registrado cerca, when veo el Mapa, then la app me lo dice claramente y me invita a ser el primero en agregar uno.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|----------|------|-----------|------|-----------|
| `fetch` rechazado/JSON inválido muestra "Failed to fetch" sin marca | edge-case | medium | patch | `banosApi.js` no captura el rechazo de `fetch`; `Mapa` muestra `falla.message` tal cual. |
| `banosApi.js` sin test que ejecute la función real | verification-gap | medium | patch | `Mapa.test.jsx` mockea todo el módulo; ninguna prueba cubre URL/header/errores. |
| Truncado por `max-rows` (1000) en `select('*')` | edge-case, blind | medium | defer | Real a escala; el spec difiere paginación. Registrado en deferred-work. |
| Error en modo `ubicado` sin reintento ni fallback a zona | blind, edge-case | low | rechazado | El mensaje de marca se muestra (cumple la matriz); recuperar exige UI nueva y estado extra; recargar la página basta. |
| setState/callback tras desmontar; doble efecto en StrictMode | blind, edge-case | low | rechazado | React no advierte ya; el peor caso es un fetch que falla y se captura; solo dev. |
| `fitBounds` omitido con `ubicacion` | blind, edge-case | false | rechazado | Con ubicación el mapa se centra en el usuario por diseño; el buscador de zona solo existe sin ubicación. |
| Filas con lat/lng nulos o fuera de rango | edge-case, blind | low | rechazado | Columnas `not null`; las filas entran por la API de Story 2.4. Guardas añaden complejidad. |
| `lat=&lng=&zona=` vacíos da 400; `Number('0x10')`/`1e1` aceptados | edge-case | low | rechazado | El frontend nunca los envía; valores numéricos válidos e inofensivos. |
| `perfil` ya no llega a `Mapa` | blind, edge-case | false | rechazado | El spec reemplaza `Bienvenida` por `Mapa`; nombre en pantalla no es requisito. |
| HTML por string en `divIcon` / XSS | blind | false | rechazado | La etiqueta solo se deriva de números; el popup usa `textContent`. |
| Borrar pines previos si falla otra búsqueda; sin botón de recentrar | edge-case | low | rechazado | Comportamiento aceptable; funcionalidad nueva fuera de alcance. |
| Índices/CHECK en SQL, colores hex, `API_URL` por defecto, política de tiles OSM | blind | low | rechazado | Cosmético o igual al patrón de `perfilesApi`; índice sobre `ILIKE '%x%'` no ayudaría. |
| Combinación zona+lat/lng, 401 con token inválido, fake de `ilike`, logout sin test | verification-gap, blind | low | rechazado | Ninguna ruta del producto lo dispara hoy; cubrirlo agrega pruebas sin riesgo demostrado. |
| Cierre de sesión agregado fuera del spec (`Cerrar sesión`) | (informe del implementador) | n/a | señalado | Necesario porque `Bienvenida` era el único acceso; se presenta al humano. |

## Design Notes

El botón "Agregar Baño" de esta historia es un stub sin funcionalidad real (mismo patrón que tuvo el link de "recuperar acceso" en `Login.jsx` antes de Story 1.3) -- Story 2.4 lo reemplaza con el formulario real y la búsqueda de duplicados. Todo baño mostrará "sin calificaciones" en esta historia porque el check-in/calificación (Épica 3) no existe todavía -- es el estado esperado, no un bug a resolver aquí. Sin paginación ni filtrado por radio en el backend: `GET /banos` devuelve todos los baños con su distancia calculada: a la escala actual de CDMX y sin datos todavía, el propio viewport del mapa/orden de la lista resuelve la relevancia.

## Verification

**Commands:**
- `cd backend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `banos`
- `cd frontend && npx vitest run` -- expected: todos los tests pasan, incluido el nuevo de `Mapa`
- `cd frontend && npx oxlint` -- expected: sin hallazgos
- `cd frontend && npm run build` -- expected: build exitoso

**Manual checks (if no CLI):**
- Correr `supabase/sql/002_banos.sql` en el SQL Editor del dashboard de Supabase antes de probar el flujo real (no automatizable).
