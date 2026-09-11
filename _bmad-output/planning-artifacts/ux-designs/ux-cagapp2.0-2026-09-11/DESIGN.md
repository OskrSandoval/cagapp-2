---
title: "DESIGN.md: CagApp 2.0"
status: final
created: 2026-09-11
updated: 2026-09-11
sources:
  - ../../prds/prd-cagapp2.0-2026-09-11/prd.md
  - ../../briefs/brief-cagapp2.0-2026-09-10/brief.md
  - ../../briefs/brief-cagapp2.0-2026-09-10/addendum.md
  - .memlog.md
  - .working/color-themes-1.html
  - mockups/key-login.html
  - mockups/key-mapa.html
  - mockups/key-detalle-checkin.html
name: CagApp 2.0
description: App web mobile-first (sin apps nativas) para encontrar, hacer check-in y calificar baños públicos en la Ciudad de México, en español, con tono chusco. Un "Foursquare de los baños".
colors:
  bg: '#FFFFFF'
  surface: '#FFF8F3'
  primary: '#D53C19'
  primary-ink: '#FFFFFF'
  text: '#2B1B12'
  muted: '#8A6A5A'
  success: '#1F7A45'
  success-surface: '#E6F4EB'
  success-border: '#BFE6CC'
  warning: '#CB3E48'
  border: '#F2D9CC'
  star-off: '#E8D9CE'
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 24px
    fontWeight: 800
    letterSpacing: -0.01em
  heading:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 16px
    fontWeight: 800
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 13px
    fontWeight: 700
  button:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 15px
    fontWeight: 800
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 14px
    fontWeight: 400
  meta:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 12.5px
    fontWeight: 400
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: 11px
    fontWeight: 400
rounded:
  sm: 10px
  md: 12px
  lg: 16px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  gutter: 20px
  section-gap: 24px
components:
  button-primary:
    background: '{colors.primary}'
    color: '{colors.primary-ink}'
    radius: '{rounded.md}'
    font: '{typography.button}'
    width: full
  button-social:
    background: '{colors.bg}'
    color: '{colors.text}'
    border: '1px solid {colors.border}'
    radius: '{rounded.md}'
    font: '{typography.label}'
  input:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    radius: '{rounded.sm}'
    placeholderColor: '{colors.muted}'
    font: '{typography.body}'
  segmented-tabs:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    radius: '{rounded.md}'
    activeBackground: '{colors.primary}'
    activeColor: '{colors.primary-ink}'
    activeRadius: '{rounded.sm}'
  fab:
    background: '{colors.primary}'
    color: '{colors.primary-ink}'
    radius: '{rounded.full}'
    shadow: '0 10px 22px rgba(213,60,25,.45)'
  overlay-icon-button:
    background: '{colors.bg}'
    border: '1px solid {colors.border}'
    radius: '{rounded.full}'
    shadow: '0 3px 10px rgba(0,0,0,.15)'
  toggle-pill:
    background: '{colors.bg}'
    border: '1px solid {colors.border}'
    radius: '{rounded.full}'
    shadow: '0 3px 10px rgba(0,0,0,.15)'
    iconColor: '{colors.primary}'
    font: '{typography.label}'
  map-pin:
    radius: '{rounded.full}'
    tierColors:
      good: '{colors.success}'
      mid: '{colors.primary}'
      bad: '{colors.warning}'
    textColor: '{colors.primary-ink}'
  card-surface:
    background: '{colors.surface}'
    border: '1px solid {colors.border}'
    radius: '{rounded.lg}'
  score-tag:
    background: '{colors.success-surface}'
    color: '{colors.success}'
    radius: '{rounded.full}'
    font: '{typography.label}'
  banner-success:
    background: '{colors.success-surface}'
    border: '1px solid {colors.success-border}'
    color: '{colors.success}'
    radius: '{rounded.sm}'
  star-picker:
    onColor: '{colors.primary}'
    offColor: '{colors.star-off}'
    size: 34px
    captionBackground: '{colors.primary}'
    captionColor: '{colors.primary-ink}'
    captionRadius: '{rounded.full}'
---

## Brand & Style

CagApp 2.0 es una app web mobile-first (sin apps nativas) que le pone cara de "Foursquare de los baños" a un problema que Google Maps nunca resolvió: encontrar un baño público decente en la Ciudad de México. No hay identidad visual previa — todo lo definido aquí parte de cero, decidido durante esta sesión de UX.

El registro de marca es explícitamente **chusco**: divertido, ligero, que no se toma en serio a sí mismo aunque el producto sí resuelva una necesidad real. El nombre "CagApp" ya marca la pauta, y el logo/ícono principal usa 💩 (no 🚽) tras un ajuste tardío durante esta sesión — encaja mejor con el nombre y el tono que un ícono de sanitario genérico. Los emojis son parte del lenguaje visual en **momentos clave** (marca, llamadas a la acción, confirmaciones, calificación) y no decoración constante de relleno.

Visualmente esto se traduce en: fondo claro y limpio (sin ambición editorial ni corporativa), un solo acento cromático fuerte inspirado en el naranja de marca de Foursquare/Swarm, formas redondeadas y pastilla (pills) por todos lados, tipografía del sistema (sin webfont propia) con el peso haciendo la jerarquía en vez de tamaños grandes, y copy que se lee como algo que compartiría con gusto el "Reseñador Entusiasta" (persona del PRD), no un texto corporativo neutro.

El tono chusco no es solo personalidad de marca: es lo que sostiene el compromiso del Reseñador Entusiasta (el pago emocional de calificar, ver su actividad en Perfil, sentir que su aporte cuenta), y ese compromiso es lo que mantiene poblada la base de datos de baños entre los picos de urgencia del Buscador con Urgencia — ver EXPERIENCE.md § Foundation para el detalle de este flywheel de dos personas.

Alcance de plataforma y localización — ver EXPERIENCE.md § Foundation / § Responsive & Platform (solo español, solo CDMX, solo web responsiva mobile-first, sin apps nativas).

## Colors

Paleta confirmada: **"Naranja Foursquare"**, de `.working/color-themes-1.html` (variación 1 de 6 evaluadas). Fondo claro en todos los casos — no hay modo oscuro decidido (ver Do's and Don'ts).

- **`bg` (`#FFFFFF`)** — Lienzo base de toda pantalla. Nunca lleva textura ni tinte.
- **`surface` (`#FFF8F3`)** — Tinte cálido apenas perceptible sobre `bg`, usado para superficies que necesitan distinguirse sin recurrir a sombra: tarjetas (hero del detalle, tarjeta de calificar), fondo de inputs, contenedor del segmented-control de login. Nunca se usa como fondo de pantalla completa.
- **`primary` (`#D53C19`)** — El único acento cromático fuerte de la app. Botones primarios, pestaña activa, FAB "Agregar Baño", ícono-círculo del baño, estrellas activas del selector de calificación, pin de mapa "nivel medio". Es el color que carga la personalidad chusca — se usa con confianza, no se diluye en degradados. `[NOTA]` Valor oscurecido respecto al naranja original del comparador (`#FF5A36`) por la ronda de accesibilidad de esta sesión (memlog, decisión final) — mismo tono/familia, solo más oscuro, para que el texto blanco sobre `primary` y `primary` como texto pasen contraste AA (ver tabla de contraste abajo).
- **`primary-ink` (`#FFFFFF`)** — Texto/ícono sobre fondos `primary` (botones, FAB, badges de pin, ícono-círculo).
- **`text` (`#2B1B12`)** — Texto principal. Un café-negro cálido, nunca negro puro ni gris frío — coherente con la calidez del resto de la paleta.
- **`muted` (`#8A6A5A`)** — Texto secundario: subtítulos, distancias, placeholders, texto de ayuda/fine print, etiquetas de calle en el mapa.
- **`success` (`#1F7A45`)** / **`success-surface` (`#E6F4EB`)** / **`success-border` (`#BFE6CC`)** — Reservado para señales positivas verificables: calificación alta (etiqueta de calificación "4.5 ⭐"), pin de mapa "buena calificación", chip de rango "dentro de rango para check-in", banner de confirmación post-check-in. Los tonos `-surface`/`-border` son los valores literales usados en los mockups aprobados para fondos de banner (no una fórmula `color-mix()` — esa técnica solo se usó en el comparador exploratorio, no en los mockups finales). `[NOTA]` Igual que `primary`, oscurecido respecto al valor original (`#2E9E5B`) por la ronda de accesibilidad.
- **`warning` (`#CB3E48`)** — Reservado para señales negativas: pin de mapa "baja calificación". Ningún mockup aprobado muestra todavía un estado de error/deshabilitado con este color (ver gap en Components), pero el token existe para eso. `[NOTA]` Igual que `primary`/`success`, oscurecido respecto al valor original (`#D64550`) por la ronda de accesibilidad.
- **`border` (`#F2D9CC`)** — Bordes de tarjetas, inputs, contenedores de pills, divisores. Siempre 1px, nunca decorativo por sí solo.
- **`star-off` (`#E8D9CE`)** — Estrella no seleccionada en el selector de calificación (post-check-in), para diferenciarla del `border` funcional aunque el tono sea cercano.

Evitar: cualquier segundo color cromático de acento fuera de `primary`/`success`/`warning` en sus roles definidos; degradados; texto puro `#000000` (siempre `text`).

### Contraste (WCAG AA)

Valores de contraste para los pares de color de mayor tráfico de la app (calculados sobre los hex vigentes en este documento, tras la ronda de oscurecimiento confirmada en el memlog):

| Par | Uso | Ratio aprox. | AA texto normal (≥4.5:1) |
|---|---|---|---|
| `primary-ink` sobre `primary` | Botón primario, FAB, pestaña activa, badge de pin "nivel medio" | ~4.68:1 | Pasa |
| `text` sobre `bg` | Texto principal en pantalla | Alto contraste (café-negro sobre blanco) | Pasa |
| `text` sobre `surface` | Texto principal en tarjetas/inputs | Alto contraste (tinte de `surface` es mínimo) | Pasa |
| `muted` sobre `bg` | Subtítulos, distancia, fine print | ~4.9:1 | Pasa, con poco margen |
| `muted` sobre `surface` | Subtítulos dentro de tarjetas | ~4.66:1 | Pasa, con poco margen |
| `success` sobre `success-surface` | Etiqueta de calificación, chip de rango, banner de confirmación | ~4.71:1 | Pasa |
| `warning` con `primary-ink` | Pin de mapa "baja calificación" | ~4.86:1 | Pasa |

`muted` pasa AA en ambos usos pero con margen estrecho — **no oscurecer/aclarar `muted` más sin volver a medir**, especialmente si se usa alguna vez a opacidad reducida o sobre un fondo más claro que `surface` (p. ej. las etiquetas de calle semitransparentes sobre el mapa, no verificadas de forma independiente). Los valores nuevos de `success`/`warning` (ronda de accesibilidad, memlog) también pasan AA en sus superficies de uso típico y no solo en teoría.

## Typography

Pila tipográfica del sistema operativo (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`) en todos los roles — no se carga webfont propia, lo cual mantiene ligera una web mobile-first. Roles extraídos directamente de los mockups aprobados:

- **`display`** (24px / 800 / `-0.01em`) — Uso único: el wordmark "CagApp" en la pantalla de login (con "App" en `{colors.primary}`).
- **`heading`** (16px / 800) — Nombres de baño y títulos de tarjeta ("El Rincón — Café Toldo").
- **`label`** (13px / 700) — Etiquetas de formulario, texto de pestañas, texto de nav, botones sociales.
- **`button`** (15px / 800) — Texto de botones primarios/CTA de ancho completo. Siempre en el patrón "verbo + emoji" (p. ej. "Hacer check-in aquí 🚽", "Confirmar calificación 🚀").
- **`body`** (14px / 400) — Texto de inputs y párrafo estándar.
- **`meta`** (12.5px / 400, en `{colors.muted}`) — Subtítulos, distancia, filas de "lo que dice la gente".
- **`caption`** (11px / 400, en `{colors.muted}`) — Fine print, texto de ayuda bajo un CTA.

La jerarquía se construye con **peso** (700–800 para todo lo interactivo o importante) más que con saltos grandes de tamaño — la pantalla es angosta (mobile-first) y no hay espacio para una escala tipográfica dramática. Los emojis se insertan en línea dentro del texto al tamaño nativo del glifo — no son iconografía de librería.

## Layout & Spacing

Escala: `4 / 8 / 12 / 16 / 20 / 24 px`. `gutter` (20px) es el margen lateral de contenido en mobile, extraído del padding de contenido de los tres mockups (18–22px, redondeado al token más cercano). `section-gap` (24px) separa bloques mayores (p. ej. tarjeta hero → sección "Lo que dice la gente").

Estructura: **una sola columna siempre**, sin excepción — mobile-first responsivo, pensado para pantalla de teléfono. Un único CTA primario de ancho completo por pantalla (botón de login, botón de check-in, botón de confirmar calificación), nunca CTAs primarios compitiendo entre sí.

Navegación: **sin barra de navegación inferior** — decisión explícita registrada en el memlog. En su lugar:
- El **Mapa** (pantalla de inicio post-login) lleva una barra superior flotante *sobre* el mapa: ícono de Perfil (círculo) arriba a la izquierda, botón-pill "Ver lista" arriba a la derecha para alternar Mapa/Lista.
- El **FAB Agregar Baño** flota centrado en la parte inferior, sobre el Mapa/Lista, según decisión del memlog.
- El **Detalle de Baño** usa navegación por back-button (←) en una barra superior simple, no overlay.

`[GAP]` Ningún artefacto de esta sesión especifica comportamiento en viewport de tablet/escritorio más allá del término "responsivo" del brief/PRD — los tres mockups aprobados son exclusivamente marco de teléfono. Hasta que se decida lo contrario, asumir que el layout de una sola columna se mantiene centrado con el mismo ancho de contenido mobile en viewports más anchos, sin un layout de escritorio dedicado.

## Elevation & Depth

CagApp usa sombra de forma muy selectiva: solo para elementos que **flotan sobre otro contenido**, nunca para dar jerarquía a superficies estáticas. El Mapa es la superficie con más elevación real: el ícono de Perfil, el toggle Mapa/Lista y el FAB llevan una sombra suave (`0 3px 10px rgba(0,0,0,.15)` para los botones-ícono flotantes; `0 10px 22px rgba(213,60,25,.45)` — sombra teñida del propio `primary` — para el FAB) porque literalmente están superpuestos sobre el mapa.

Las tarjetas de contenido estático (tarjeta hero del detalle, tarjeta de calificar, tabs de login) **no llevan sombra** — se distinguen del fondo únicamente con `{colors.surface}` + `1px solid {colors.border}`. La jerarquía viene de tono y tipografía, no de sombra.

(El marco de dispositivo — bordes negros redondeados con sombra grande — que aparece en los tres archivos `mockups/key-*.html` es solo la puesta en escena del entregable para mostrar "pantalla de teléfono"; no es parte del sistema visual de la app en sí.)

## Shapes

- `{rounded.sm}` (10px) — inputs de formulario, pestaña activa dentro del segmented-control.
- `{rounded.md}` (12px) — botones (primario y social), contenedor del segmented-control, banners.
- `{rounded.lg}` (16px) — tarjetas grandes: hero del detalle, tarjeta de calificar, marco `surface` del logo en login.
- `{rounded.full}` (9999px) — todo lo tipo pill: badges/score-tags, pin de mapa, FAB, botón-toggle Mapa/Lista, caption de calificación seleccionada. Este es el gesto de forma que más carga la personalidad chusca de la marca.
- Círculos perfectos (border-radius 50%, fuera de la escala de tokens por ser 1:1) para avatares/íconos: botón de Perfil, ícono-círculo del baño, marco del logo emoji.

Las imágenes/emoji dentro de contenedores siguen la esquina del contenedor que los aloja.

## Components

Solo **Login, Mapa y Detalle+Check-in/Calificar** tienen mockup visual aprobado (confirmado en memlog). Lista, Crear Baño y Perfil existen solo como spine en EXPERIENCE.md — sus patrones de componente abajo son extrapolados de los mismos tokens, no mockups verificados.

Nombres de componente abajo son **canónicos** — EXPERIENCE.md § Component Patterns usa exactamente los mismos nombres para sus filas de comportamiento; una unión por nombre literal entre ambas tablas debe funcionar.

- **Wordmark / logo** (`mockups/key-login.html`) — Círculo `{colors.surface}` + `{colors.border}` con emoji 💩 al centro (44px), seguido de "Cag**App**" en `{typography.display}` con "App" en `{colors.primary}`. Único uso de `{typography.display}`.
- **Pestañas segmentadas** (Iniciar sesión / Crear cuenta) (`mockups/key-login.html`) — Contenedor `{colors.surface}` + borde, pill exterior `{rounded.md}`; segmento activo relleno `{colors.primary}` con `{rounded.sm}` interior.
- **Campo de texto** (`mockups/key-login.html`) — Fondo `{colors.surface}`, borde `{colors.border}`, `{rounded.sm}`, placeholder en `{colors.muted}`. Etiqueta encima en `{typography.label}`. Requisito de accesibilidad (ver Do's and Don'ts): cada campo lleva `id` en el input asociado a `for` en su `<label>`, y el campo de contraseña en Login/Registro usa `type="password"` — la especificación visual no cambia, esto documenta el requisito de implementación.
- **Botón primario (ancho completo)** (`mockups/key-login.html`, `mockups/key-detalle-checkin.html`) — Relleno `{colors.primary}`, texto `{colors.primary-ink}` en `{typography.button}`, `{rounded.md}`. Copy siempre "verbo + emoji" — ver convención completa en Typography (`{typography.button}`), no repetida aquí.
- **Botón social (Google/Facebook)** (`mockups/key-login.html`) — Fondo `{colors.bg}`, borde `{colors.border}`, ícono + label centrados, `{typography.label}`, jerarquía visual menor que el botón primario.
- **Ícono de Perfil** (`mockups/key-mapa.html`) — Círculo `{colors.bg}` + borde + sombra suave, 42px, posición fija arriba-izquierda sobre el mapa. Al no llevar texto visible, requiere `aria-label="Perfil"` (accesibilidad — nombre accesible de un control solo-ícono).
- **Toggle Mapa/Lista** (`mockups/key-mapa.html`) — Pill `{colors.bg}` + borde + sombra suave, ícono "☰" en `{colors.primary}` + label en `{typography.label}`, arriba-derecha sobre el mapa. Token de frontmatter: `toggle-pill`.
- **FAB Agregar Baño** (`mockups/key-mapa.html`) — Pill `{colors.primary}`/`{colors.primary-ink}`, sombra teñida de `primary`, centrado abajo sobre Mapa/Lista. Único punto de entrada visual para registrar un baño nuevo.
- **Pin de mapa** (`mockups/key-mapa.html`) — Badge pill de color por nivel de calificación (`success` alto / `primary` medio / `warning` bajo) mostrando "🚽 X.X★", con un pequeño vástago (stem) hacia el punto exacto, del mismo color que el badge. El badge visual es pequeño (~19px de alto); el área táctil real debe extenderse más allá del pill visible hasta un mínimo de **24×24px** (padding invisible / wrapper clicable), especialmente en Mapa, donde varios pines pueden quedar muy cerca entre sí.
- **Tarjeta hero de Detalle** (`mockups/key-detalle-checkin.html`) — `{colors.surface}` + borde, `{rounded.lg}`. Encabezado: ícono-círculo `{colors.primary}` + nombre (`{typography.heading}`) + subtítulo (`{typography.meta}`). Debajo: fila de estrellas estáticas + etiqueta de calificación, línea de distancia, chip de rango (si aplica), CTA primario de check-in. El botón de regreso (←) de esta pantalla debe medir **~40–44px** (no 32px), a la par del Ícono de Perfil, y llevar `aria-label="Volver"` al ser un control solo-ícono.
- **Etiqueta de calificación** (`mockups/key-detalle-checkin.html`) — Pill `{colors.success-surface}`/`{colors.success}`, `{typography.label}`, copy tipo "4.5 ⭐ — ¡una joya!". La regla de qué sufijo cualitativo corresponde a cada banda de calificación vive en EXPERIENCE.md § Component Patterns (fila "Etiqueta de calificación"), atada a la misma lista de 5 captions de abajo.
- **Chip de rango** (`mockups/key-detalle-checkin.html`, Estado A) — `{colors.success-surface}` + `{colors.success-border}`, `{rounded.sm}`, emoji + texto corto. Muestra si el usuario está dentro (✅ "Estás a tiro de piedra") o fuera del rango de 150 m para check-in.
- **Banner de confirmación** (`mockups/key-detalle-checkin.html`, Estado B) — `{colors.success-surface}` + `{colors.success-border}`, `{rounded.sm}`, emoji + texto corto. Aparece tras un check-in exitoso ("¡Check-in registrado! ... 🕵️"), distinto del Chip de rango aunque comparte tratamiento visual.
- **Selector de calificación** (`mockups/key-detalle-checkin.html`, Estado B) — 5 estrellas grandes (34px), `{colors.primary}` activas / `{colors.star-off}` inactivas. Al seleccionar, aparece una caption-pill `{colors.primary}`/`{colors.primary-ink}` con el número + copy chusca. Solo aparece **inmediatamente después de un check-in exitoso**, nunca antes (regla de producto, FR-10). Accesibilidad: implementar como 5 botones/radios reales con `aria-label="Calificar N de 5"` y padding suficiente para un área táctil ≥44×44px por estrella (el glyph de 34px por sí solo no basta).
- **Lista de referencia de calificaciones** (`mockups/key-detalle-checkin.html`, Estado B) — Debajo del Selector de calificación, lista estática con las 5 calificaciones (la seleccionada en negrita/`{colors.text}`, el resto en `{colors.muted}`); no es tappable de forma independiente (las estrellas son el input).
  Copy exacta de las 5 calificaciones (1 y 5 son copy literal del glosario del PRD; 2–4 son copy chusca definida y aprobada en el mockup de esta sesión):
  1. 💩 Un desastre
  2. 😬 Sobrevivible, de panza
  3. 😐 Normalito, ni fu ni fa
  4. 🙂 Bien limpio, sin drama
  5. 🤩 Limpio, amplio y hasta huele bien
- **Lista "Lo que dice la gente"** (`mockups/key-detalle-checkin.html`, Estado A) — Sección de la Tarjeta hero de Detalle, debajo del chip de rango/CTA de check-in, separada por `section-gap`. Muestra las calificaciones recientes de otros usuarios sobre ese baño: por fila, nombre del usuario + su calificación en estrellas + fecha relativa ("hace 3 días"), con el nombre en `{typography.body}`/`{colors.text}` y la fecha relativa en `{typography.meta}`/`{colors.muted}` (el mismo rol tipográfico ya referenciado en Typography). Sin foto/avatar (no hay ese dato en el modelo v1). `[NOTA]` Esta es la lectura visual de un componente **confirmado como función real** (memlog, decisión final: las calificaciones de otros usuarios sí se muestran públicamente con su nombre) — no una pieza exploratoria del mockup. Ver EXPERIENCE.md § Component Patterns y § State Patterns para las reglas de comportamiento (orden, cantidad de filas, fuente del nombre) y el `[NOTE FOR PM]` sobre el campo de nombre a mostrar.

`[GAP]` No hay mockup para: la fila de **Lista** (vista alternativa al mapa), el formulario de **Crear Baño** (**Paso de búsqueda de duplicados** y **Formulario de creación**), la pantalla de **Perfil** (actividad propia), el estado del botón de check-in **fuera de rango/deshabilitado**, ni el estado de **permiso de ubicación denegado** (este último ya señalado como pendiente de arquitectura en el propio PRD, §Open Questions). Al construir estas piezas, derivar del mismo lenguaje de tarjeta/pill/botón de arriba en vez de introducir un patrón nuevo, y confirmar visualmente antes de darlas por definitivas.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Un solo acento cromático fuerte (`primary`), usado con confianza en CTAs y elementos clave | Introducir un segundo color de acento fuera de `primary`/`success`/`warning` |
| Emoji en momentos clave: marca, CTAs, confirmaciones, calificación | Emoji como decoración constante o relleno sin significado |
| Formas pill (`{rounded.full}`) para badges, toggles, FAB, tags | Esquinas totalmente cuadradas en elementos interactivos |
| Sombra solo en elementos que flotan sobre otro contenido (mapa) | Sombra en tarjetas estáticas para simular jerarquía |
| Copy chusca, informal, en primera persona con el usuario ("aquí nadie te juzga 👀") | Copy corporativa neutra o de tono solemne |
| Navegación superior/overlay + FAB | Barra de navegación inferior tipo tab bar |
| Una sola columna, un CTA primario por pantalla | Múltiples CTAs primarios compitiendo en la misma vista |
| `warning` reservado para señales negativas reales (pin de baja calificación) | Usar `warning` decorativamente o como segundo acento |

`[NOTA]` La paleta se evaluó también en una variante de modo oscuro ("Noche Chusca", en el comparador `.working/color-themes-1.html`), pero ningún registro del memlog confirma su adopción y los tres mockups aprobados son exclusivamente modo claro. Este documento define **solo tema claro**; modo oscuro queda fuera de alcance hasta que se decida explícitamente.
