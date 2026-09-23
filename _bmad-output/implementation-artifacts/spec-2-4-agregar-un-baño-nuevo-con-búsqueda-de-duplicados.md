---
title: 'Agregar un baño nuevo (con búsqueda de duplicados)'
type: 'feature'
created: '2026-09-22'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '1c2e22a98ae5d0089f721d65c605eebbc4f192e6'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El botón "Agregar Baño" es un stub sin funcionalidad desde Story 2.1. Story 2.4 (`epics.md` FR7/FR8) exige que, antes de crear un baño, el sistema busque duplicados en un radio de 1.5km de forma obligatoria, y solo si no hay ninguno habilite el formulario de creación.

**Approach:** Nueva pantalla `CrearBano.jsx` (overlay a pantalla completa, mismo patrón que `Detalle`): Paso 1 reutiliza los `banos` ya cargados en `Mapa.jsx` (con `distancia_metros` ya calculado contra la ubicación actual) y filtra por `<= 1500m` — sin pedirle nada nuevo al backend, sin reimplementar Haversine. Si hay un duplicado, se muestra ese baño (reusando `Detalle`) y ahí termina el flujo, sin opción de "crear de todos modos". Si no hay duplicado, Paso 2 es un formulario (nombre, zona, tipo de lugar — mismo tratamiento de "Campo de texto" que Login) que llama a un nuevo `POST /banos` (mismo patrón rutas→controladores→servicios→datos que `GET /banos`). Al crearse, el baño queda visible de inmediato en Mapa/Lista (se refresca `banos`) y el usuario aterriza en el Detalle del baño recién creado, no de vuelta en Mapa.

## Boundaries & Constraints

**Always:** La búsqueda de duplicados es obligatoria y nunca salteable — el formulario solo se habilita si no hay ningún baño a <=1.5km. La ubicación del baño nuevo es la del dispositivo (`ubicacion` ya resuelta por `Mapa.jsx`), capturada una sola vez al abrir el flujo — nunca un campo editable ni un picker de mapa. `creado_por` sale de `req.usuarioId` (JWT verificado), nunca del body. `POST /banos` sigue rutas→controladores→servicios→datos con cliente Supabase inyectable, igual que `GET /banos`. Vocabulario en español (AD-6); reusar `.campo`/`.mensaje-error`/`.boton-primario` de Login/CompletarPerfil para el formulario.

**Never:** No picker de mapa ni edición manual de lat/lng. No permitir "crear de todos modos" cuando hay duplicado. No reimplementar `calcularDistanciaMetros` en el frontend — reusar `distancia_metros` que ya trae `GET /banos`. No agregar paginación ni un tipo de lugar con opciones fijas (sigue siendo texto libre, como `nombre`/`zona`).

**Decisión (Open Question resuelta):** Si se niega/no hay geolocalización (`ubicacion` es null) al tocar "Agregar Baño", se muestra un mensaje bloqueante pidiendo activar la ubicación con un botón para reintentar el permiso — sin geolocalización no se puede agregar un baño en esta historia (sin picker de mapa ni ubicación aproximada por zona).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Toco "Agregar Baño" con ubicación conocida | `ubicacion` resuelta, `banos` cargados | Busca duplicados en `banos` (<=1500m); si no hay, pasa directo al formulario | N/A |
| Hay un baño existente a <=1.5km | `banos` con `distancia_metros <= 1500` | Se muestra ese baño (Detalle); no se ofrece continuar creando | N/A |
| No hay ningún baño a <=1.5km | `banos` sin ninguno bajo el radio | Se habilita el formulario (nombre, zona, tipo de lugar) | N/A |
| Envío el formulario con datos válidos | `nombre`, `zona`, `tipo_lugar` no vacíos | `POST /banos` crea el baño; se refresca `banos`; aterrizo en el Detalle del nuevo baño | N/A |
| Envío el formulario con un campo vacío | `nombre`/`zona`/`tipo_lugar` vacío | Error en línea en el primer campo inválido, foco ahí, no se envía | Mensaje igual al de Login |
| `POST /banos` falla en el servidor | Error 500/red | Mensaje de marca, formulario no se pierde (puedo reintentar) | N/A |
| Toco "Agregar Baño" sin ubicación conocida | `ubicacion` es null (permiso denegado o no resuelto aún) | Mensaje bloqueante pidiendo activar ubicación, con botón para reintentar el permiso; no se llega al formulario | N/A |

</frozen-after-approval>

## Code Map

- `backend/src/servicios/banosService.js` -- ya tiene `listarBanos`/`calcularDistanciaMetros`; agregar `crearBano({ nombre, lat, lng, tipoLugar, zona, creadoPor }, cliente)` con `.insert(...).select().single()`, mismo patrón que `crearOActualizarPerfil` en `perfilesService.js`.
- `backend/src/controladores/banosController.js` -- agregar `postBano(req, res)`, mismo patrón de validación que `postPerfil` en `perfilesController.js` (400 por campo faltante/inválido, `req.usuarioId` para `creado_por`, 500 formato AD-7).
- `backend/src/rutas/banos.js` -- agregar `router.post('/', verificarSesion, postBano)`.
- `frontend/src/api/perfilesApi.js` (`crearPerfil`) -- patrón exacto a replicar en `banosApi.js` para `crearBano` (POST con JSON body, mismo manejo de error).
- `frontend/src/paginas/CompletarPerfil.jsx` -- patrón de formulario a replicar (label visible, error en línea, foco al campo inválido, `ref` + `aria-invalid`).
- `frontend/src/paginas/Detalle.jsx` -- reusar tal cual para mostrar el duplicado encontrado y para aterrizar tras crear.
- `frontend/src/paginas/Mapa.jsx` -- dueño de `ubicacion`/`banos`/`cargarBanos`; el botón `.fab-agregar` (línea con "Agregar Baño") es un stub a reemplazar; agregar overlay de `CrearBano` con el mismo patrón de no desmontar el mapa que `Detalle`.
- `backend/test/perfiles.routes.test.js`, `backend/test/perfilesService.test.js` -- patrón de test a replicar para las pruebas nuevas de `banos`.

## Tasks & Acceptance

**Execution:**
- [x] `backend/src/servicios/banosService.js` -- `crearBano({ nombre, lat, lng, tipoLugar, zona, creadoPor }, cliente)`
- [x] `backend/src/controladores/banosController.js` -- `postBano` valida campos y llama al servicio
- [x] `backend/src/rutas/banos.js` -- `POST /banos` protegido por `verificarSesion`
- [x] `backend/test/banosService.test.js`, `backend/test/banos.routes.test.js` -- cubrir creación exitosa, validación y error 500
- [x] `frontend/src/api/banosApi.js` -- `crearBano({ nombre, zona, tipoLugar, lat, lng })`
- [x] `frontend/src/paginas/CrearBano.jsx` -- overlay nuevo: Paso 1 (duplicados, filtra `banos` prop por <=1500m) y Paso 2 (formulario), según la resolución de la Open Question
- [x] `frontend/src/paginas/Mapa.jsx` -- estado para abrir/cerrar `CrearBano`; el FAB lo abre; al crear con éxito, refresca `banos` y abre el Detalle del nuevo baño
- [x] `frontend/src/index.css` -- clases del overlay/formulario de `CrearBano`, reusando `.campo`/`.mensaje-error`/`.boton-primario`/`.detalle-*`
- [x] `frontend/test/CrearBano.test.jsx` -- cubrir la I/O & Edge-Case Matrix de arriba
- [x] `frontend/test/Mapa.test.jsx` -- el FAB abre `CrearBano`; crear con éxito aterriza en el Detalle del nuevo baño

**Acceptance Criteria:**
- Given que toco el botón "Agregar Baño", when indico la ubicación, then el sistema busca baños existentes en un radio de 1.5km antes de dejarme continuar.
- Given que se encuentra un baño existente cercano, when reviso los resultados, then se me muestra ese baño en vez de dejarme crear un duplicado.
- Given que no existe ningún baño cercano, when confirmo que quiero crear uno nuevo, then puedo llenar nombre, ubicación, zona y tipo de lugar.
- Given que creo el baño, when se guarda, then queda inmediatamente visible en el mapa y la lista para todos los usuarios.

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Hallazgo | Capa | Veredicto | Ruta | Evidencia |
|----------|------|-----------|------|-----------|
| `banosApi.crearBano` real nunca se ejecuta en un test (ambos test files mockean todo el módulo) | verification-gap | medium | patch | Un rename equivocado de `tipo_lugar`/`tipoLugar` o un header faltante no se detectaría. |
| `crearBano` en `banosApi.js` no envuelve `fetch`/`.json()` en try/catch, a diferencia de `obtenerBanosCercanos` | blind | medium | patch | Una falla de red muestra un error técnico crudo en vez del mensaje de marca. |
| Sin límite de longitud en `nombre`/`zona`/`tipo_lugar` (backend ni frontend) | blind, edge-case | low | patch | Mismo patrón ya usado en `postPerfil` (100 caracteres); corrección directa y consistente. |
| `onCreado` pasa la respuesta cruda de `POST /banos` (sin `calificacion_promedio`, columna que no existe en la tabla) a `banoSeleccionado` | blind | low | patch | Rompe el invariante documentado de "misma forma que `banos`"; hoy no causa un bug visible (`Detalle` trata `undefined` igual que `null`), pero un futuro chequeo más estricto sí fallaría. |
| Los mensajes de validación del frontend no llevan el mismo emoji que los equivalentes del backend | blind | low | patch | Corrección directa de texto, consistencia de tono. |
| Sin test para el límite exacto de 1500m del radio de duplicados | blind | low | patch | Es el umbral central de la regla de negocio de esta historia, vale la pena fijarlo con un test. |
| `serviciosMock.crearBano.mockReset()` duplicado en el `beforeEach` externo e interno de `banos.routes.test.js` | blind | low | patch | Borrado de una línea redundante, sin riesgo. |
| Doble envío del formulario (doble clic/Enter) puede disparar dos `crearBano` concurrentes | blind, edge-case | low | patch | `disabled={enviando}` no protege la primera invocación síncrona; guard `if (enviando) return` es la corrección mínima. |
| Sin enforcement de servidor del radio de 1.5km (solo se aplica en el frontend contra `banos` posiblemente desactualizado) | blind | medium | defer | El spec y el epic lo describen como paso obligatorio del flujo de UI, no como garantía de servidor contra clientes directos o carreras; la corrección completa es funcionalidad nueva, registrada en deferred-work.md. |
| Ventana de carrera entre `watchPosition`/`cargarBanos` podría dejar `banos` sin `distancia_metros` al abrir Crear Baño | blind | low | rechazado | Ventana de una fracción de segundo, requiere una secuencia de eventos muy específica; el fix agregaría complejidad desproporcionada al riesgo. |
| Insert con `error: null` y `data: null` | edge-case | false | rechazado | `.select().single()` de Supabase garantiza una fila o un error — ese estado no ocurre. |
| `banos` con un elemento `null`/`undefined` rompe el filtro de duplicados | edge-case | false | rechazado | El flujo de datos (`listarBanos` → `.map`) nunca produce elementos nulos en el arreglo. |
| "Activar ubicación" no hace nada si `navigator.geolocation` no existe | edge-case | low | rechazado | Capacidad del navegador cada vez más rara (distinto de permiso denegado, que sí está bien manejado); el fix agrega una rama nueva de mensajes para un caso improbable. |
| El AC dice "puedo llenar ... ubicación" pero el formulario entregado tiene 3 campos (ubicación es automática) | edge-case | n/a | rechazado | Correcto por diseño — la Open Question resuelta en este mismo spec decidió que la ubicación nunca es editable; el único "fix" sería editar el texto del AC, y esta build rechaza cambios al propio spec. |

## Design Notes

## Verification

**Commands:**
- `cd backend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de creación de `banos`
- `cd frontend && npx vitest run` -- expected: todos los tests pasan, incluido el nuevo de `CrearBano`
- `cd frontend && npx oxlint` -- expected: sin hallazgos
- `cd frontend && npm run build` -- expected: build exitoso

**Manual checks (if no CLI):**
- Crear un baño real en el navegador cerca de un baño existente (debe mostrar el duplicado) y lejos de todos (debe dejar crear y aterrizar en su Detalle).
