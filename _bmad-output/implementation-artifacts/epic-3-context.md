# Epic 3 Context: Check-in y Calificación

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Un usuario autenticado (Épica 1) que ya puede descubrir y abrir el detalle de un baño (Épica 2) debe poder hacer check-in verificado por ubicación y, solo inmediatamente después de ese check-in exitoso, calificarlo de 1 a 5 estrellas. Esta es la pieza central de confianza de todo el producto: una calificación solo existe porque el dispositivo de alguien probó que estuvo físicamente en el baño — sin este mecanismo, los datos de CagApp no tendrían más credibilidad que cualquier directorio genérico.

## Stories

- Story 3.1: Hacer check-in en un baño
- Story 3.2: Calificar un baño tras el check-in

## Requirements & Constraints

- El check-in solo es válido dentro de 150m del baño; fuera de rango se rechaza con explicación, nunca en silencio.
- Cuando la precisión del GPS no permite confirmar los 150m, el sistema lo indica y ofrece reintentar — es un estado distinto de "fuera de rango", nunca un rechazo silencioso.
- El check-in exitoso solo persiste la asociación usuario-baño-momento; no se guarda historial de ubicación continua, y la ubicación exacta del dispositivo nunca se muestra a otros usuarios ni se persiste más allá de validar ese intento.
- Solo se puede calificar (1-5 estrellas) un baño inmediatamente después de un check-in exitoso en ese baño — ninguna vía (interfaz o URL directa) puede exponer un camino para calificar sin ese check-in previo.
- Una nueva calificación de un usuario que ya había calificado ese baño reemplaza cuál cuenta como vigente para el promedio; el registro anterior se conserva, nunca se borra ni se sobrescribe.
- El promedio del baño se recalcula de inmediato al publicarse una nueva calificación vigente.
- Cada estrella seleccionada muestra su caption chusca correspondiente (ver UX).
- Métrica de éxito que valida esta épica: al menos 20% de quienes hacen su primer check-in+calificación repiten un segundo check-in+calificación dentro de 60 días, sin ningún recordatorio/notificación de por medio — no agregar notificaciones de re-enganche como "solución" a esta métrica.
- Producto solo en español, enfocado en CDMX.

## Technical Decisions

- **Distancia compartida (AD-4):** la misma función Haversine `calcularDistanciaMetros(a, b)` ya introducida para la deduplicación de 1.5km (Épica 2) debe reutilizarse para el radio de 150m del check-in — una sola implementación en la capa de servicios, nunca una fórmula separada.
- **Precisión de GPS (AD-8):** el frontend envía `{lat, lng, accuracy}` en cada intento de check-in. El backend resta `accuracy` a la distancia reportada para obtener la distancia mínima posible; si esa distancia mínima ya excede 150m, responde "fuera de rango". Si `accuracy` es demasiado grande (>100m) para confirmar o descartar el rango con certeza, responde un error distinto de "precisión insuficiente" para que el frontend ofrezca reintentar en vez de rechazar de forma definitiva.
- **Ubicación nunca persistida (AD-13):** las coordenadas `{lat, lng, accuracy}` de un intento de check-in se usan solo en memoria durante esa petición para calcular distancia — nunca se escriben en `calificaciones` ni en ninguna otra tabla. Solo persiste el resultado (válido/inválido) y, si es válido, la fila de `calificaciones` resultante (que no tiene columnas de ubicación).
- **Calificaciones append-only (AD-3):** la tabla `calificaciones` solo recibe `INSERT`, nunca `UPDATE`/`DELETE`. Cada fila lleva `secuencia` (`bigserial`) exclusivamente para desempatar timestamps idénticos. La calificación "vigente" de un usuario para un baño (y el promedio del baño) siempre se calcula tomando la fila más reciente por `created_at`, desempatada por `secuencia`, por par `(usuario_id, baño_id)` — nunca se cachea en una columna mutable.
- **Gap de modelo de datos a resolver en el build:** el diagrama ER de arquitectura no define una tabla de "check-in" separada — el único rastro persistido de un check-in válido es la fila de `calificaciones` que produce cuando se envía una calificación. Esto significa que "check-in exitoso" (3.1) necesita algún mecanismo (estado efímero del lado del servidor, o una transacción combinada de check-in+calificar) para que 3.2 pueda confiar en que hubo un check-in real y todavía vigente antes de aceptar la calificación — este mecanismo no está especificado en ningún documento de planeación y debe diseñarse durante la implementación, preservando siempre la regla de que ninguna vía (ni por interfaz ni por URL directa) permita calificar sin ese check-in previo, validado en el backend y no solo en la UI.
- **Forma de la API (AD-7):** recurso directo en JSON + código HTTP; errores como `{ "error": "<mensaje>" }`.
- **Vocabulario en español (AD-6):** `calificaciones`, `estrellas`, `secuencia`, etc.; columnas técnicas genéricas (`id`, `created_at`) en inglés por convención de Postgres/Supabase.
- RLS permanece habilitado y deny-by-default en `calificaciones` — solo la `service role key` del backend lee/escribe esta tabla.

## UX & Interaction Patterns

- **Chip de rango** (Tarjeta hero de Detalle): binario, dentro de rango (tratamiento `success`, "✅ ... dentro del rango") vs fuera de rango (sin mockup — derivar del tratamiento de "dentro de rango"). El botón de check-in solo se habilita cuando está dentro de rango.
- Precisión de GPS insuficiente es un estado distinto de "fuera de rango": debe ofrecer reintentar, nunca rechazar en silencio.
- Al hacer check-in exitoso: aparece el **Banner de confirmación** ("¡Check-in registrado! ... 🕵️") y, en la misma vista, se desbloquea el **Selector de calificación** (5 estrellas de 34px, `primary` activas / `star-off` inactivas, `aria-label="Calificar N de 5"`) — nunca se muestra antes de un check-in exitoso.
- El Selector de calificación actualiza en vivo una caption-pill con una de 5 captions fijas al tocar cada estrella (sin medias estrellas): 1 💩 Un desastre, 2 😬 Sobrevivible, de panza, 3 😐 Normalito, ni fu ni fa, 4 🙂 Bien limpio, sin drama, 5 🤩 Limpio, amplio y hasta huele bien.
- **Lista de referencia de calificaciones**: lista estática con las mismas 5 captions junto al selector, resaltando la fila seleccionada; no es tappable de forma independiente.
- Re-check-in/re-calificar un baño ya calificado por el mismo usuario está permitido pero no tiene tratamiento visual propio diseñado todavía — construir contra la regla de "se permite, reemplaza la vigente".
- Voz y tono: toda la copy de estos estados (dentro/fuera de rango, precisión insuficiente, confirmación, rechazo) debe ser chusca, nunca neutra/técnica ("Ubicación validada" está explícitamente prohibido como ejemplo).
- Accesibilidad: los botones de estrella necesitan semántica real de botón/radio con `aria-label="Calificar N de 5"` y área táctil ≥44×44px por estrella, aunque el glifo visual sea de 34px.

## Cross-Story Dependencies

- 3.2 depende por completo de 3.1: solo se puede calificar inmediatamente después de un check-in exitoso en ese mismo baño, dentro de la misma vista Detalle/Check-in-Calificar.
- Ambas historias dependen de la función Haversine y de la superficie Detalle de Baño ya construidas en la Épica 2 — esta épica no las reconstruye, solo agrega la capa de check-in/calificación encima.
- El promedio y las calificaciones que produce esta épica alimentan el estado vacío "sin calificaciones todavía" de Story 2.3, y son la fuente directa del Perfil (actividad propia) y de la lista pública "Lo que dice la gente" de la Épica 4 — ambas consumen las mismas filas de `calificaciones` que esta épica crea, solo con distinto filtro/forma según la épica.
