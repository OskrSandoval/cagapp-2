---
title: 'Hotfix épica 5: R1–R4 (Agregar Baño y capa de estado en Lista)'
type: 'bugfix'
created: '2026-09-29'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La retro de la épica 5 (`epic-5-retro-2026-09-29.md`, veredicto rejected) encontró cuatro defectos en producción:
- **R1:** el efecto de foco de `CrearBano` depende del objeto `ubicacion`, que `Mapa` recrea en cada lectura de `watchPosition`. Mientras el usuario escribe, el foco salta a Volver.
- **R2:** si `GET /banos` falla, `CrearBano` se queda en "Buscando baños cerca" para siempre.
- **R3:** `cercanos` se congela con el `banos` de modo zona (distancias null → `[]`) antes de que llegue la ubicación, así que se salta la lista. Además, un baño reabierto desde la lista muestra el promedio viejo.
- **R4:** en la vista de Lista, `.capa-estado` tapa las primeras filas.

**Approach:**
- **R1:** el foco se mueve solo cuando cambia la *pantalla* del overlay (`bloqueo` | `error` | `buscando` | `lista` | `detalle` | `formulario`), nunca por props nuevas con el mismo contenido.
- **R2:** `Mapa` le pasa a `CrearBano` `cargandoBanos`, `errorBanos` y `onReintentarBanos` (recarga por la ubicación actual). Si no hay lista congelada, no está cargando y hay error, se muestra una tarjeta de error de marca con "Reintentar".
- **R3:** `cercanos` se congela solo cuando hay `ubicacion`, `!cargandoBanos` y `banos` no es null. El baño seleccionado se resuelve por `id` contra el `banos` actual, así que el Detalle siempre muestra datos frescos (la membresía de la lista sigue congelada).
- **R4:** en la vista de Lista, `<main>` agrega `area-contenido--lista`. Ahí `.capa-estado` va en el flujo normal arriba de la lista (sin `position: absolute` y sin `left: 56px`), la lista ocupa el espacio que queda y hace scroll, y una capa vacía no ocupa espacio. En la vista de mapa nada cambia.

Cada caso lleva un test donde cambian las props (acción 3 de la retro). No se toca el backend.

</frozen-after-approval>

## Implementation Notes

- `CrearBano.jsx`:
  - Props nuevas `cargandoBanos`, `errorBanos` y `onReintentarBanos`.
  - Un valor derivado `pantalla` decide qué se renderiza y es la única dependencia del efecto de foco (R1).
  - `cercanos` se congela solo cuando se cumple `puedeCongelar` (hay `ubicacion`, no está cargando y `banos` no es null) (R3).
  - `seleccionadoActual` resuelve el baño abierto por `id` contra el `banos` actual (R3/R5).
  - Nueva pantalla `error` con "Reintentar 🔄" (R2).
- `Mapa.jsx`:
  - Le pasa a CrearBano `cargando`, `error` y un `onReintentarBanos` que recarga por la ubicación actual.
  - `<main>` agrega `area-contenido--lista` en la vista de Lista.
- `index.css`: en `.area-contenido--lista`, `<main>` es una columna flex, y `.capa-estado` y `.lista-banos` quedan en el flujo (`position: static`). `.capa-estado:empty` no ocupa espacio (R4). En la vista de mapa nada cambia.
- Tests:
  - 5 nuevos en `CrearBano.test.jsx`, todos con props que cambian (objeto `ubicacion` nuevo mientras se escribe, error → recarga → lista, de modo zona a ubicación, promedio fresco al reabrir).
  - 2 nuevos en `Mapa.test.jsx` (clase de lista más CSS, y GET que falla → Reintentar dentro de Agregar Baño).
  - Suite: 172/172, `oxlint` sin errores, `vite build` sin errores.
- Parches de la revisión:
  - En `Mapa.jsx`, `.capa-estado` ahora se renderiza **antes** que `<Lista>`, para que en la columna flex quede arriba.
  - La capa en la vista de lista tiene `max-height: 50%`, `overflow-y: auto` y `flex-shrink: 0`.
  - El fondo `#ededed` se movió a `.area-contenido--lista`.
  - `refrescarTrasCalificar` se renombró a `recargarBanos` y es la única vía de recarga (calificar, crear, reintentar).
  - 1 test nuevo (un refresco fallido con la lista ya congelada no cambia la pantalla) y aserciones nuevas (orden en el DOM, `max-height`, recarga por lat/lng).
  - Resultado: 173/173, `oxlint` sin errores y `vite build` sin errores.

## Review Triage Log

| Hallazgo | Veredicto | Ruta | Evidencia |
|---|---|---|---|
| En la vista de Lista, la capa de estado queda debajo de la lista, no arriba | medium | patch | Es cierto: en el DOM `<Lista>` iba antes que `.capa-estado` dentro de la columna flex. La capa se movió antes de la Lista y el test verifica el orden con `compareDocumentPosition`. |
| El test nuevo de Mapa no detecta ese bug de posición | low | patch | Se resolvió con la aserción de orden en el DOM. |
| La lista brinca con cada refetch; la capa sin tope puede aplastar la lista | low | patch parcial | Le puse tope a la capa (`max-height: 50%`, scroll propio). El brinco al aparecer "Buscando baños…" se acepta: es preferible a tapar las filas, que era R4. |
| Fondo en dos tonos en la vista de lista | low | patch | El fondo se movió a `.area-contenido--lista`. |
| "Buscando" aparece al abrir Agregar Baño durante un refetch en segundo plano | low | reject | Es a propósito: con un refetch en curso las distancias son del punto anterior, y en un radio de 200m eso puede cambiar la lista. La espera dura lo que tarda la petición. |
| La pantalla de error no deja crear de todos modos | false | reject | Es la decisión que skr confirmó en la acción 1 de la retro (error con reintento). Sin la lista no se pueden evitar duplicados, y ese es el objetivo de FR-7. |
| Dos `role="alert"` con el mismo mensaje | low | reject | El alert de Mapa queda bajo un overlay con `aria-modal="true"`. Es el mismo patrón en todos los overlays. |
| El foco se va a Volver al reintentar y al regresar de un Detalle | low | reject | Es el patrón de todos los overlays. El regreso del foco a la fila ya está diferido (R8 de la retro). |
| La lógica de recarga está triplicada en Mapa | low | patch | Ahora solo existe `recargarBanos`. |
| Faltan tests de un refresco fallido con la lista congelada, de la recarga por lat/lng y de un Detalle abierto que se actualiza | low | patch parcial | Agregué los dos primeros. Que un Detalle abierto se actualice depende del estado interno de `Detalle`; ya está cubierto de forma indirecta por el test de reapertura. |
