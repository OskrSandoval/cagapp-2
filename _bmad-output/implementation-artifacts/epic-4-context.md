# Epic 4 Context: Actividad y Comunidad

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Un usuario autenticado que ya puede hacer check-in y calificar baños (Épica 3) necesita dos ventanas sobre esos mismos datos: una privada, donde ve su propia actividad de check-ins y calificaciones en su Perfil, y una pública, donde el Detalle de cada baño muestra lo que otros usuarios calificaron. Esta épica no crea datos nuevos — consume las filas de `calificaciones` que produce la Épica 3 — pero le da al Reseñador Entusiasta el pago emocional de sentir que su aporte cuenta (motor de retención del producto) y le da al Buscador con Urgencia contexto social antes de decidir ir a un baño.

## Stories

- Story 4.1: Ver mi actividad en el Perfil
- Story 4.2: Ver calificaciones de otros usuarios en un baño

## Requirements & Constraints

- El Perfil solo muestra la actividad del propio usuario autenticado (baños en los que hizo check-in y su calificación vigente en cada uno) — nunca la actividad de otros usuarios, sin excepción.
- El alcance del Perfil es mínimo a propósito: sin edición de perfil, sin foto, sin bio más allá de esta lista de actividad.
- La lista pública "Lo que dice la gente" en el Detalle de un baño expone únicamente nombre para mostrar, estrellas y fecha (relativa) de cada calificación — nunca un identificador interno del usuario ni su ubicación.
- Cuando un baño no tiene calificaciones todavía, "Lo que dice la gente" no se muestra como lista vacía sin contexto: se aplica el mismo tratamiento explícito de "sin calificaciones todavía" ya usado en el Detalle (Épica 2) — es un solo estado combinado, no dos.
- Un usuario nuevo sin actividad ve, en su Perfil, una invitación a calificar su primer baño en tono de marca — no una lista vacía sin contexto ni un "no data" genérico.
- Cantidad de entradas, orden y paginación de "Lo que dice la gente" no están definidos por planeación; es aceptable empezar simple (todas las calificaciones, más recientes primero) y ajustar después sin romper el contrato de la API.
- Producto solo en español, enfocado en CDMX; sin selector de idioma.

## Technical Decisions

- **Forma pública restringida (AD-11):** el JSON de la lista pública de calificaciones (FR-12) incluye exclusivamente `{ nombre_para_mostrar, estrellas, created_at }` por cada calificación — nunca `usuario_id` ni ningún otro identificador interno. El endpoint de Perfil (datos propios, FR-11) sí puede incluir más detalle porque solo se sirve al dueño de esos datos vía su JWT.
- **Fuente de datos compartida:** ambas historias leen de la misma tabla `calificaciones` (append-only, ver AD-3/Épica 3) — Perfil filtra por `usuario_id = auth.uid()`, la lista pública filtra por `baño_id`. Ninguna de las dos escribe en `calificaciones`; esta épica es de solo lectura.
- **Calificación vigente:** igual que en Épica 3, la calificación "vigente" de un usuario para un baño (la que se muestra en Perfil) es la fila más reciente por `created_at` desempatada por `secuencia`, nunca una columna cacheada — reutilizar la misma lógica de cómputo, no reimplementarla.
- Los endpoints de esta épica son de solo lectura pero permanecen detrás del backend Express con `service role key` (AD-1): el frontend nunca consulta `calificaciones` o `perfiles` directo contra Supabase.
- Forma de la API (AD-7): recurso directo en JSON + código HTTP; errores como `{ "error": "<mensaje>" }`.
- Vocabulario en español (AD-6) en tablas/columnas/rutas de dominio (`perfiles`, `calificaciones`, `nombre_para_mostrar`); columnas técnicas genéricas (`id`, `created_at`) en inglés.
- RLS permanece habilitado y deny-by-default en `perfiles` y `calificaciones` — solo la `service role key` del backend lee estas tablas; ningún acceso directo con la `anon key`.

## UX & Interaction Patterns

- Perfil se abre desde el Ícono de Perfil (círculo fijo arriba-izquierda, flotando sobre Mapa/Lista, `aria-label="Perfil"`) — sin mockup pixel-level, se construye desde la spine de EXPERIENCE.md.
- Principio de diseño explícito para Perfil: no es solo "listar filas de datos" — su función es que el Reseñador Entusiasta *sienta que su aporte cuenta*, un pago emocional, no una vista de datos plana. El estado vacío de un usuario nuevo debe leerse como invitación en el tono chusco de la marca, no como un "sin actividad" genérico.
- "Lo que dice la gente" vive en el Detalle de Baño, debajo de la tarjeta hero, usando el rol tipográfico `meta` (12.5px/400, color muted) para nombre/estrellas/fecha de cada fila.
- El estado vacío de "Lo que dice la gente" reutiliza el mismo copy/tratamiento que "baño sin calificaciones todavía" del Detalle (Épica 2) — no inventar un segundo patrón de estado vacío.
- Tono chusco en toda la copy de estos estados (invitación del Perfil vacío, estado vacío de calificaciones) — nunca corporativo/neutro.
- Accesibilidad: el Ícono de Perfil es un control solo-ícono y necesita `aria-label="Perfil"` y área táctil ≥40-44px (ya así en el mockup de Mapa).

## Cross-Story Dependencies

- Ambas historias dependen por completo de que la Épica 3 ya esté generando filas de `calificaciones` — esta épica no funciona con datos vacíos de check-in/calificación reales, solo con estados vacíos de diseño.
- Story 4.2 reutiliza la superficie Detalle de Baño construida en la Épica 2 (Story 2.3) y su tratamiento existente de "sin calificaciones todavía" — no la reconstruye.
- 4.1 y 4.2 son independientes entre sí (una es privada/propia, otra es pública/de terceros) y pueden implementarse en cualquier orden.
