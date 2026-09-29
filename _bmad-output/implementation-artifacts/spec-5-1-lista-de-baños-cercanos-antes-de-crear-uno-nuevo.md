---
title: 'Lista de baños cercanos antes de crear uno nuevo'
type: 'bugfix'
created: '2026-09-29'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `CrearBano.jsx` bloquea la creación si existe *cualquier* baño a ≤1.5km (`RADIO_DUPLICADOS_METROS = 1500`) y muestra solo el más cercano, sin opción de continuar. En CDMX eso deja un solo baño por zona: skr solo ve "el Jajarro" y no puede agregar ningún otro. El PRD FR-7 se actualizó el 2026-09-29.

**Approach:** Paso 1 de `CrearBano` pasa de bloqueo a **lista**: todos los `banos` con `distancia_metros <= 200`, ordenados por cercanía, cada fila con nombre, tipo de lugar y distancia. Tocar una fila abre `Detalle` de ese baño dentro del mismo overlay, y "Volver" desde ahí regresa a la lista (un nivel a la vez, EXPERIENCE.md). Un botón secundario "Ninguno es este, crear nuevo" abre el formulario existente. Si la lista está vacía, se pasa directo al formulario con una nota en tono de marca. El formulario, el `POST /banos`, `onCreado` y el bloqueo sin ubicación no cambian. `Mapa.jsx` pasa a `CrearBano` un `onCalificado` para refrescar `banos` si el usuario califica desde ese `Detalle`. Se sigue reusando `distancia_metros` del backend (AD-4): no se reimplementa Haversine. La deduplicación en el servidor sigue diferida (deferred-work, spec 2.4).

</frozen-after-approval>

## Implementation Notes

- `frontend/src/paginas/CrearBano.jsx`: `RADIO_BANOS_CERCANOS_METROS = 200` (límite inclusivo). Estados: `paso` ('lista' | 'formulario') inicializado a 'formulario' cuando no hay cercanos, y `seleccionado` para el `Detalle`. Filas con clases `.lista-banos`/`.fila-bano`/`.fila-bano-boton` de `Lista.jsx`, meta `tipo_lugar · formatearDistancia(distancia_metros)` (en vez de la zona). Botón "Ninguno es este, crear nuevo" con clase secundaria. Si ya existe una clase secundaria en `index.css` se reusa; si no, se agrega una mínima con los tokens actuales.
- `frontend/src/paginas/Mapa.jsx`: se pasa `onCalificado` a `CrearBano` con la misma lógica de refresco que el overlay de detalle.
- `frontend/test/CrearBano.test.jsx`: se reemplazan los tests de 1.5km por los de la lista: orden por cercanía, el límite de 200m inclusivo, un baño a 800m no aparece y el formulario se abre directo, fila → Detalle → Volver regresa a la lista, "Ninguno es este" → formulario y lista vacía → formulario con nota.

**Implementado (2026-09-29):**
- `CrearBano.jsx`: en lugar de `paso` uso dos estados, `quiereCrear` y `seleccionado`. Así el formulario se abre directo cuando no hay cercanos sin necesitar un efecto. La lista usa `ul.lista-cercanos` nueva porque `.lista-banos` está posicionada en absoluto para la pantalla del mapa y no se puede reusar. El foco regresa a Volver al salir de un `Detalle` o al pasar al formulario. El texto introductorio del formulario cambia según venga de "Ninguno es este" o de la lista vacía.
- `Mapa.jsx`: la lógica de refresco se extrajo a `refrescarTrasCalificar()` y la comparten el overlay de detalle y `CrearBano`.
- `index.css`: agregué `.lista-cercanos` y `.boton-secundario`. No existía ninguna clase secundaria, así que la armé con los tokens `--bg`, `--primary` y `--border`.
- Tests: `CrearBano.test.jsx` (14) y `Mapa.test.jsx` (21, reemplacé el test de 1.5km y agregué el de refresco al calificar desde la lista). Suite completa: 139/139 en verde, `oxlint` sin errores y `vite build` sin errores.
- Parches de la revisión: la lista de cercanos se fija con la primera carga de `banos`, y mientras `banos` es `null` se muestra el estado "Buscando baños cerca 🔍…". Volver en el formulario regresa a la lista cuando se llegó desde ahí. `ubicacion` se agregó a las dependencias del efecto de foco. Las filas usan `<span>` en lugar de `<div>`/`<p>` dentro del `<button>`. Agregué 4 tests y reforcé la aserción de Mapa. Resultado: 143/143.

## Review Triage Log

| Hallazgo | Veredicto | Ruta | Evidencia |
|---|---|---|---|
| La lista y el formulario se reemplazan entre sí cuando `banos` llega tarde o es `null` al abrir el flujo | medium | patch | El botón Agregar Baño está visible mientras `banos === null`. Antes se mostraba "No hay baños a la redonda" sin haber buscado. Ahora la lista se fija con la primera carga y hay estado "buscando". |
| Un refresco fallido tras calificar vacía `cercanos` y Volver lleva al formulario | medium | patch (misma causa que el anterior) | `cargarBanos` hace `setBanos(null)` al fallar (`Mapa.jsx` ~l.120). Se resolvió con la lista fija. |
| El formulario no tiene forma de volver a la lista | low | patch | Volver llamaba `onVolver` y cerraba el flujo. Ahora regresa a la lista si hay cercanos. |
| El foco va a Volver y no a la fila tocada; faltaba `ubicacion` en las dependencias | low | patch parcial | Agregué `ubicacion` a las dependencias. No restauro el foco a la fila: Mapa y Lista tampoco lo hacen hoy y el arreglo requiere refs por fila. |
| Las filas no muestran pin ni zona; `tipo_lugar` faltante | false | reject | La spec pide nombre, tipo y distancia. `POST /banos` exige `tipo_lugar` (`banosController.js:72`). |
| `<p>` y `<div>` dentro de `<button>` | low | patch | Arreglo simple con `<span>` en el código nuevo. `Lista.jsx` conserva el patrón previo. |
| `.boton-secundario` no tiene `:hover`, `:focus-visible` ni `:disabled` | low | reject | Cosmético: el navegador ya dibuja un anillo de foco y el botón nunca se deshabilita. |
| Huecos de cobertura de tests | low | patch | Agregué tests de carga, lista fija, formulario estable, Volver a la lista y la nota "gracias por revisar". |
| El stub de geolocalización no se restaura | false | reject | `geolocalizacion()` redefine `navigator.geolocation` con `defineProperty` en cada test (`Mapa.test.jsx:82`). |
| El test de Mapa no comprueba que el usuario sigue en el Detalle | low | patch | Agregué aserciones para el Detalle después del refresco y para Volver regresando a la lista. |
