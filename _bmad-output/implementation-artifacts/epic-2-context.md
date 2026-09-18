# Epic 2 Context: Baños — Descubrir y Agregar

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Un usuario ya autenticado (la puerta de entrada de la Épica 1 es prerequisito) debe poder descubrir baños cercanos — en mapa o en lista — abrir el detalle de cualquiera, y agregar uno nuevo cuando de verdad no existe. Esta épica sostiene el lado "Buscador con Urgencia" del producto (encontrar rápido algo confiable) y arranca el lado "Reseñador Entusiasta" (poblar el mapa), sin todavía tocar check-in ni calificación (Épica 3) ni las calificaciones públicas de otros usuarios (Épica 4). El requisito no negociable es que crear un baño nunca sea más fácil que buscarlo primero: la deduplicación por radio de 1.5km es un paso obligatorio, no una sugerencia opcional.

## Stories

- Story 2.1: Ver baños cercanos en el mapa
- Story 2.2: Alternar a vista de lista
- Story 2.3: Ver el detalle de un baño
- Story 2.4: Agregar un baño nuevo (con búsqueda de duplicados)

## Requirements & Constraints

- El mapa se centra en la ubicación del usuario y marca los baños cercanos con su calificación promedio; debe volverse interactivo (ubicación + pines visibles) en menos de 3 segundos en conexión móvil típica — cuando el backend ya está "despierto" (el cold-start de Render de 30-60s tras inactividad es una excepción aceptada, no un bug a resolver aquí).
- Si se niega el permiso de geolocalización, el mapa cae a un buscador por nombre de zona en vez de bloquear la pantalla — nunca deja al usuario sin forma de encontrar baños.
- Si no hay ningún baño registrado cerca, la app lo dice explícitamente e invita a agregar el primero — nunca un mapa/lista vacíos sin explicación.
- La lista muestra los mismos baños que el mapa, ordenada por cercanía, y se reordena si cambia la ubicación del dispositivo; alternar entre mapa y lista es un toggle de un solo toque, sin estado intermedio.
- El detalle de un baño muestra nombre, ubicación, tipo de lugar, calificación promedio y distancia; si el baño no tiene calificaciones, se indica explícitamente en vez de mostrar un promedio vacío o en cero.
- Antes de crear un baño, el sistema busca duplicados existentes en un radio de 1.5km y, si encuentra uno, muestra ese baño en vez de dejar continuar la creación — este paso es obligatorio, nunca salteable.
- Solo si no hay duplicado se habilita el formulario de creación (nombre, ubicación, zona, tipo de lugar); al guardarse, el baño queda inmediatamente visible en mapa y lista para todos los usuarios.
- La ubicación exacta del dispositivo de un usuario nunca se muestra a otros usuarios ni se persiste más allá de lo necesario para centrar su propio mapa/lista — esta épica no introduce ningún nuevo punto de exposición de ubicación ajena.
- Producto solo en español, enfocado en CDMX, sin selector de idioma.

## Technical Decisions

- **Límite frontend/backend (AD-1):** el frontend nunca lee/escribe baños directo contra Supabase — todo pasa por la API de Node (rutas → controladores → servicios → datos), que es la única con la `service role key`. El frontend solo usa el SDK de Supabase para sesión.
- **Cálculo de distancia único (AD-4):** existe una sola función `calcularDistanciaMetros(a, b)` (Haversine) en la capa de servicios del backend. La búsqueda de duplicados de esta épica (1.5km) y el radio de check-in de la Épica 3 (150m) deben importar y llamar esta misma función — no reimplementar la fórmula en ningún otro lugar. Diseñarla ahora pensando en ambos usos, aunque el check-in llegue después.
- **Modelo de datos `baños`:** tabla con `id` (uuid), `nombre`, `lat`, `lng`, `tipo_lugar`, `zona` (colonia/barrio, texto libre — soporta el fallback de búsqueda por zona de 2.1 con un filtro simple `ILIKE`, sin geocodificación), `creado_por` (FK), `created_at`. RLS habilitado y deny-by-default (AD-9) — solo la `service role key` del backend accede; sin políticas públicas vía `anon key`.
- **Vocabulario en español (AD-6):** tablas, columnas de negocio, rutas y campos JSON en español (`baños`, `zona`, `tipo_lugar`, etc.); columnas técnicas genéricas (`id`, `created_at`) en inglés por convención Postgres/Supabase.
- **Forma de respuestas de la API (AD-7):** recursos directos en JSON con el código HTTP correspondiente; errores como `{ "error": "<mensaje>" }`, sin envoltorio `{data: ...}`.
- **Secretos y despliegue:** `service role key` y demás credenciales solo en variables de entorno (nunca committeadas); backend en Render (plan gratis, cold-start 30-60s tras 15min inactivo, en tensión conocida con el requisito de <3s del mapa); frontend en Vercel; datos/Auth en Supabase.
- **Diferido explícitamente:** PostGIS/índices geoespaciales (Haversine en JS basta a la escala actual de CDMX); paginación de listados; estrategia de pruebas automatizadas.

## UX & Interaction Patterns

- **Navegación:** sin barra inferior. Ícono de Perfil fijo arriba-izquierda y Toggle Mapa/Lista fijo arriba-derecha, ambos flotando sobre el mapa; FAB Agregar Baño flotante centrado abajo, siempre visible y habilitado en Mapa y Lista independientemente del estado de geolocalización. Detalle usa navegación por flecha de retroceso (`aria-label="Volver"`, ~40-44px), un nivel a la vez.
- **Pin de mapa:** badge tipo pill "🚽 X.X★", coloreado por nivel de calificación (`success` alto / `primary` medio / `warning` bajo) — el color nunca es la única señal, el número exacto siempre acompaña. Área táctil real ≥24×24px aunque el badge visual sea más pequeño.
- **Toggle Mapa/Lista:** pill con ícono + label que siempre nombra la superficie *contraria* ("Ver lista" estando en Mapa); un solo toque, sin estado intermedio.
- **Tarjeta hero de Detalle:** `surface` + borde, sin sombra; encabezado con ícono-círculo, nombre (`heading`), subtítulo (`meta`); fila de estrellas estáticas + etiqueta de calificación cualitativa (banda más cercana de las 5 captions estándar), línea de distancia. (El chip de rango y el botón de check-in que también viven en esta tarjeta son funcionalidad de la Épica 3, no de esta.)
- **Paso de búsqueda de duplicados y Formulario de creación (Crear Baño):** sin mockup pixel-level — construir con el mismo lenguaje visual de tarjeta/pill/botón ya establecido. El formulario usa el mismo tratamiento de error de "Campo de texto" que Login (label visible, error en línea, foco al primer campo inválido); campos requeridos: nombre, ubicación, tipo de lugar (zona también se captura para el fallback de búsqueda).
- **Estados clave de esta épica:** carga inicial del mapa (skeleton/spinner ligero que no bloquee el primer pintado); geolocalización denegada → buscador por zona; sin baños cercanos → invitación a agregar el primero (mismo copy/trigger compartido entre Mapa y Lista); baño sin calificaciones → indicador explícito, nunca promedio vacío o en cero; duplicado encontrado en Crear Baño → bloquea el formulario y ofrece acceso directo al baño existente en vez de dejar crear; error de validación en el formulario de creación; confirmación de creación exitosa → debe aterrizar al usuario en el Detalle del baño recién creado (no de vuelta en Mapa), porque por construcción queda en rango para check-in (Épica 3).
- **Voz y tono:** copy "chusca" en todos estos estados (vacíos, errores, confirmaciones) — nunca mensajes técnicos neutros tipo "No se encontraron resultados."
- **Accesibilidad:** contraste AA con los tokens ya corregidos (`primary` #D53C19, `success` #1F7A45, `warning` #CB3E48, etc.); controles solo-ícono (Perfil, Toggle, retroceso) con `aria-label`; tap targets ≥40-44px para controles principales.

## Cross-Story Dependencies

- 2.2 (Lista) y 2.3 (Detalle) dependen de que 2.1 ya resuelva la ubicación del usuario y el listado de baños cercanos (o el fallback por zona) — comparten la misma fuente de datos y el mismo estado vacío "sin baños cercanos".
- 2.4 depende de 2.3: al crear un baño exitosamente, el flujo debe aterrizar en el Detalle del nuevo baño, no regresar a Mapa/Lista.
- La función Haversine que 2.4 usa para el radio de 1.5km (AD-4) es la misma que la Épica 3 usará para el radio de check-in de 150m — debe implementarse como una única función compartida en la capa de servicios desde ahora, aunque la Épica 3 no exista todavía.
- El campo `zona` introducido para el fallback de búsqueda de 2.1 se reutiliza como campo del formulario de creación en 2.4 — mismo dato, no dos representaciones distintas.
- Toda esta épica asume la configuración inicial del proyecto y el login obligatorio de la Épica 1 como prerequisito (ningún baño, mapa o lista es alcanzable sin sesión autenticada).
- El Detalle de baño (2.3) es la superficie sobre la que la Épica 3 (check-in/calificación) y la Épica 4 (lista pública "Lo que dice la gente") se construyen encima — esta épica solo entrega su contenido base (nombre, ubicación, tipo, promedio, distancia), no esas extensiones.
