---
title: 'Barras de navegación superior e inferior responsivas'
type: 'bugfix'
created: '2026-09-29'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En Mapa y Lista, los controles flotan sobre el mapa. El botón de Perfil (`.control-izquierda`, top 12px) cae encima del zoom de Leaflet, que por defecto va arriba a la izquierda. `.fab-agregar` está en `bottom: 24px` dentro de `.mapa-pantalla { height: 100vh }`, y en el celular `100vh` es más alto que el área visible cuando se ve la barra del navegador, así que "Agregar Baño" queda escondido debajo de esa barra.

**Approach:** `.mapa-pantalla` pasa a ser una columna flex con altura `100dvh` (y `100vh` como fallback). Tiene tres partes: una `<header>` Barra superior (Perfil a la izquierda, Toggle Mapa/Lista a la derecha), un área central `position: relative; flex: 1; min-height: 0` que contiene el lienzo del mapa, la Lista y la capa de estado, y una `<footer>` Barra inferior con solo "Agregar Baño". Las dos barras son sólidas (`--bg` con borde `--border`), sin sombra y con padding `env(safe-area-inset-*)`. `index.html` agrega `viewport-fit=cover` para que esas variables tengan valor. Nada flota sobre el mapa, así que el zoom de Leaflet se queda arriba a la izquierda dentro del área central. Los overlays (Detalle, Perfil, Crear Baño) siguen cubriendo toda la `.mapa-pantalla`, barras incluidas. Se quitan los paddings de compensación de `.lista-banos` (118px/96px) y el `top: 68px` de `.capa-estado`. Solo scrollea la lista.

</frozen-after-approval>

## Implementation Notes

- `Mapa.jsx`: `<header className="barra-superior">` (Perfil y Toggle), `<main className="area-contenido">` (lienzo, Lista y capa de estado) y `<footer className="barra-inferior">` (solo "Agregar Baño"). Los overlays siguen como hermanos al final y cubren toda la pantalla.
- `index.css`: `.mapa-pantalla` es una columna flex con `height: 100vh; height: 100dvh`. `.barra-superior` y `.barra-inferior` son sólidas, con borde y padding `env(safe-area-inset-*, 0px)`. `.control-flotante`, `.control-izquierda` y `.control-derecha` se reemplazaron por `.control-barra`. `.fab-agregar` ya no es absoluto: tiene ancho completo hasta 320px y sombra `primary` contenida. Quité los paddings de compensación de `.lista-banos`, y `.capa-estado` quedó en `top: 12px; left: 56px` para no tapar el zoom.
- **Desviación del Approach:** al final **no** se agregó `viewport-fit=cover` a `index.html` (ver el Review Triage Log). Sin `cover`, los `env()` valen 0 y el navegador respeta el notch en todas las pantallas. Si en el futuro se activa `cover`, primero hay que dar safe areas a los overlays y al login.
- Tests en `Mapa.test.jsx`: estructura de barras y `main` en Mapa y en Lista, y aserciones sobre el CSS (100dvh, safe areas, la capa de estado sin tapar el zoom, sin `cover`). Resultado: 145/145, `oxlint` sin errores y `vite build` sin errores.
- Pendiente: no se verificó visualmente en el navegador porque la app exige login real de Supabase. Queda como prueba manual de skr en su celular (360×640, 375×667, 390×844).

## Review Triage Log

| Hallazgo | Veredicto | Ruta | Evidencia |
|---|---|---|---|
| `viewport-fit=cover` global deja los overlays y el login bajo el notch | medium | patch | Es cierto: `.detalle-nav` y `.pantalla-login` no tienen safe areas. Quité `cover` en lugar de agregar safe areas en 6 pantallas. |
| `.capa-estado` en `top: 12px` tapa y bloquea el zoom de Leaflet | medium | patch | Es cierto: el zoom por defecto va arriba a la izquierda (`L.map` sin opciones, `Mapa.jsx:64`). La capa ahora usa `left: 56px`. |
| Falta `<main>` | low | patch | Arreglo trivial. El test ahora usa `getByRole('main')`. |
| `.pantalla-login` y `#root` siguen con `100vh` | low | defer | Es anterior a este cambio y usa `min-height` (no esconde contenido, solo agrega scroll). |
| No hay `ResizeObserver` que llame a `invalidateSize` | maybe-false | reject | Leaflet escucha `resize` de window y el alto de las barras es fijo. Si fuera real sería low (franjas grises tras rotar); se confirmaría rotando el celular en Mapa. |
| La sombra usa un `rgba` literal | low | reject | DESIGN.md define la sombra como literal; cosmético. |
| Los nombres `.fab-agregar` y `control-icono` no coinciden con el diseño nuevo | low | reject | Cosmético. `.control-icono` va declarado después, así que su prioridad es intencional. |
| El test de CSS depende de `process.cwd()` y de reglas en una sola línea | low | reject | Vitest corre siempre desde `frontend/` (el config está ahí). `import.meta.url` no es `file:` en jsdom (se probó). |
| No hay tests de overlays sobre las barras | low | reject | Los overlays son `absolute` con `z-index: 600` sobre barras estáticas, y los tests existentes de Detalle, Perfil y CrearBano siguen en verde. |
| La barra superior no tiene título | false | reject | Queda fuera de la historia (UX-DR4 no lo pide). |
