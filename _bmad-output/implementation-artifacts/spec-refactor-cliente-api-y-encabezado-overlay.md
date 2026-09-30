---
title: 'Refactor: cliente de API compartido y encabezado de overlay'
type: 'refactor'
created: '2026-09-30'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La acción `epic-5-retro-item-11` de la retro de la épica 5 detectó dos duplicaciones. `API_URL`, `obtenerTokenActual()` y `leerCuerpoError()` están copiados de forma idéntica en los 5 archivos `frontend/src/api/*Api.js`. El encabezado de overlay (`.detalle-nav` con el botón "←" `aria-label="Volver"` y el título) está copiado 8 veces: 5 en `CrearBano.jsx` y una en `Detalle.jsx`, `Perfil.jsx` y `Sugerencias.jsx`. Un cambio en cualquiera de ellos hay que repetirlo a mano en cada copia.

**Approach:**
- `frontend/src/api/cliente.js` exporta `API_URL`, `obtenerTokenActual` y `leerCuerpoError`, con el mismo código y los mismos mensajes. Los 5 archivos de API los importan y borran sus copias.
- `frontend/src/paginas/EncabezadoOverlay.jsx` recibe `{ titulo, onVolver, refVolver }` y renderiza exactamente el mismo markup (clases `detalle-nav` y `detalle-volver`, `aria-label="Volver"`, "←", `<span>` con el título). Las 8 copias lo usan. El foco sigue funcionando porque el ref llega como prop.
- Sin cambios de comportamiento, de texto ni de estilos. No se tocan el modo demo, el backend ni los tests existentes, salvo que su mock dependa de una ruta que cambie.

</frozen-after-approval>

## Implementation Notes

- Archivos nuevos:
  - `frontend/src/api/cliente.js`: `API_URL`, `obtenerTokenActual` y `leerCuerpoError`, con el mismo código de antes.
  - `frontend/src/paginas/EncabezadoOverlay.jsx`: recibe `titulo`, `onVolver` y `refVolver`, y renderiza el mismo markup de antes.
- Los 5 `*Api.js` importan de `./cliente`, y las 8 copias del encabezado usan `EncabezadoOverlay`. El `onVolver` condicional del formulario de CrearBano se conserva tal cual.
- Resultado: −137 líneas netas en `src/`, sin cambios de comportamiento.
- Tests nuevos:
  - `cliente.test.js`: `API_URL` con y sin variable, usando `stubEnv`.
  - `EncabezadoOverlay.test.jsx`.
  - `calificacionesApi.test.js`: era el único módulo de API sin tests.
- Suite: 230/230, `oxlint` sin errores y `vite build` sin errores.

## Review Triage Log

| Hallazgo | Veredicto | Ruta | Evidencia |
|---|---|---|---|
| El test de `API_URL` compara contra la misma fórmula y no puede fallar | low | patch | Ahora usa `vi.stubEnv` + `resetModules` y prueba el caso con variable y el caso por defecto. |
| `calificacionesApi.js` es el único módulo de API sin tests | low | patch | Agregué `calificacionesApi.test.js` (POST, error con status, red caída, GET codificado y sin sesión). |
| No se extrajo toda la secuencia de petición (`pedirApi`) | low | reject | Queda fuera del intent: la acción de la retro pedía quitar los helpers duplicados. Unificar la secuencia completa cambiaría el manejo de errores de cada módulo. |
| `perfilesApi` y `obtenerEstadoSugerencias` no tienen try/catch de red ni protección en `.json()` | medium | defer | Ya existía antes del refactor. Es justo el pitfall de AGENTS.md sobre llevar un patrón de resiliencia a los archivos hermanos; se registró en deferred-work. |
| `API_URL` no quita la barra final, pero la demo sí | low | reject | Es el mismo comportamiento de antes, y `.env.example` y los `.env` no llevan barra final. |
| `leerCuerpoError` devuelve `undefined` o `null`, y un `error` no-string | false | reject | Todos los que llaman usan `mensaje \|\| FALLBACK`, así que `undefined` y `null` dan lo mismo. El backend siempre manda `error` como string (AD-7). |
| El título no es heading ni está ligado con `aria-labelledby` | low | reject | Sería un cambio de accesibilidad y queda fuera de un refactor sin cambios de comportamiento. |
| Sigue repetido el wrapper `detalle-pantalla` y el efecto de foco | low | defer | Sería un `PantallaOverlay` completo; es una idea que se registró en deferred-work. |
| Falta un test del Volver condicional del formulario de CrearBano | false | reject | Ya existe: "Volver en el formulario tras 'Ninguno es este' regresa a la lista" en `CrearBano.test.jsx`, y pasa. |
| El componente vive en `paginas/` y las clases dicen `detalle-` | low | reject | Cosmético; renombrar las clases tocaría CSS y tests sin ningún beneficio funcional. |
| El comentario AD-1 aparece en cada módulo y también en `cliente.js` | low | reject | Cada módulo tiene su propia versión del comentario ("los baños…", "los check-in…"); no estorba. |
