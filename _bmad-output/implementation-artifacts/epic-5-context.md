# Epic 5 Context: Pulido para Friends and Family

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Hacer que CagApp sea usable de verdad para los usuarios autorizados de la Fase Friends and Family. La épica corrige los dos bugs que reportó skr. El primero: la regla anterior bloqueaba la creación si existía cualquier baño a ≤1.5km, y en la práctica solo dejaba registrar un baño por zona. El segundo: el botón "Agregar Baño" quedaba oculto bajo la barra del navegador móvil. Además agrega un buzón privado para que los usuarios manden bugs y sugerencias desde la app. El resultado es que se pueden agregar todos los baños reales sin duplicar uno existente, los controles no se enciman en ningún celular y el fundador recibe retroalimentación sin que los usuarios salgan de CagApp.

## Stories

- Story 5.1: Lista de baños cercanos antes de crear uno nuevo
- Story 5.2: Barras de navegación superior e inferior responsivas
- Story 5.3: Enviar sugerencias y reportar bugs

## Requirements & Constraints

- **Crear baño (FR-7 actualizado):** al tocar "Agregar Baño" siempre se muestra primero una lista con **todos** los baños existentes a ≤**200 m**, ordenados por cercanía. Cada fila muestra nombre, tipo de lugar y distancia. Tocar una fila abre su Detalle, donde el usuario puede hacer check-in. La acción explícita "Ninguno es este, crear nuevo" habilita el formulario. Si no hay baños a ≤200 m, la app pasa directo al formulario con una nota en tono de marca. La creación ya no se bloquea nunca, y un baño que está a más de 200 m no aparece ni bloquea. El formulario nunca se muestra sin pasar antes por la lista.
- Tras crear un baño se conserva el comportamiento actual: queda visible de inmediato en el mapa y en la lista, y el usuario aterriza en su Detalle.
- **NFR7:** el Botón Agregar Baño se ve completo y se puede tocar sin scroll en ≈360×640, 375×667 y 390×844 con la barra del navegador visible. Ningún control de navegación se encima con el zoom del mapa. En Lista, solo la lista hace scroll y las barras quedan fijas.
- **Sugerencias (FR-13):**
  - Cada sugerencia tiene tipo (bug o sugerencia) y un texto libre obligatorio.
  - El usuario y la fecha se toman del servidor o del JWT, nunca del formulario.
  - Son privadas: ningún usuario puede leer las ajenas y no hay endpoint de lectura. El fundador las lee directamente en la BD y no hay panel de administración.
  - Si el envío falla, el texto y el tipo elegido se conservan para reintentar.
- **Switch de Fase Friends and Family:** cuando está apagado, el botón 💬 desaparece y el endpoint de envío rechaza sugerencias nuevas. Planeación no define el mecanismo del switch (bandera de configuración o de BD). La arquitectura tampoco lo resuelve, así que se decide en la historia.
- El endpoint de sugerencias está detrás del gate de Usuario Autorizado y rechaza a los no autorizados igual que el resto de endpoints protegidos.
- Fuera de alcance: capturas de pantalla, adjuntos, seguimiento de estado y respuesta al usuario.
- Producto solo en español y enfocado en CDMX.

## Technical Decisions

- **Distancia (AD-4):** existe una sola función Haversine, `calcularDistanciaMetros`, en la capa de servicios del backend. La búsqueda de cercanos a 200 m debe reutilizarla y no reimplementar la fórmula. El documento de arquitectura todavía cita 1.5 km; el valor vigente es 200 m.
- **Deuda relacionada:** el radio de duplicados se aplicaba solo en el frontend, sobre los `banos` ya cargados. Planeación no exige que la validación de 200 m viva en el servidor, pero moverla ahí (una consulta de proximidad en el backend) atiende ese hallazgo.
- **Límite frontend/backend (AD-1):** el frontend usa Supabase solo para auth. Leer los baños cercanos e insertar sugerencias pasa por la API Express con `service role key`, y el JWT se envía como `Authorization: Bearer` (AD-5/AD-12).
- **Tabla nueva de sugerencias:**
  - Vocabulario en español (AD-6); `id` y `created_at` en inglés.
  - RLS habilitado y deny-by-default, sin políticas públicas.
  - Solo INSERT desde el backend, con `usuario_id` tomado del JWT.
- **Arquitectura en capas (AD-2):** rutas → controladores → servicios → acceso a datos.
- **Forma de la API (AD-7):** el recurso va directo en JSON con su código HTTP, y los errores como `{ "error": "<mensaje>" }`.
- **Gate `verificarAutorizado`:** es opt-in por ruta. Hay que encadenarlo explícitamente en el router nuevo de sugerencias y agregar la ruta a la lista `rutasConGate` del test de autorización.
- Los secretos y la bandera del switch, si es de entorno, van en variables de entorno de Render/Vercel y nunca se commitean.

## UX & Interaction Patterns

- **Barra superior (Mapa/Lista):**
  - Fondo `bg` y borde inferior de 1px `border`, sin sombra.
  - Ícono de Perfil (círculo de 42px, `aria-label="Perfil"`) a la izquierda.
  - Botón de Sugerencias 💬 junto a Perfil, con el mismo tratamiento circular y `aria-label="Sugerencias"`. Solo aparece en la Fase Friends and Family y, cuando se oculta, la barra se reacomoda sin dejar hueco.
  - Toggle Mapa/Lista (pill) a la derecha.
- **Barra inferior:** contiene solo el Botón Agregar Baño: pill `primary`, alto ≥48px, ancho de hasta ~320px, centrado. El padding es `12px gutter` + `env(safe-area-inset-bottom)`. Es una barra de acción y **no** una tab bar.
- El layout usa `100dvh` (no `100vh`) y safe areas. Nada flota sobre el mapa.
- Detalle, Crear Baño, Perfil y Sugerencias no muestran las dos barras. Se navega con la flecha de retroceso (`aria-label="Volver"`), un nivel a la vez.
- Los controles tienen áreas táctiles ≥44×44px y los controles de solo ícono llevan `aria-label`.
- La Lista de baños cercanos reutiliza el patrón de fila de Lista. Ejemplo de nota vacía: "No hay baños a la redonda — ¡estrénalo tú! 🚽".
- **Pantalla de Sugerencias:**
  - Selector de tipo, Campo de texto con label visible y flecha de retroceso.
  - Con el texto vacío aparece un error en línea, el foco se mueve al campo y no se envía.
  - Al enviar con éxito se muestra una confirmación en tono de marca (p. ej. "¡Recibido! Lo leemos con lupa 🔍") y se regresa a la pantalla de origen.
  - Si el envío falla, se muestra un error en tono de marca y se conserva lo escrito.
- No hay mockups para las pantallas nuevas. Se construyen con los tokens y patrones existentes (tarjeta, pill, fila de Lista), sin introducir patrones nuevos. El tono es chusco, nunca corporativo.

## Cross-Story Dependencies

- La 5.3 coloca el Botón de Sugerencias en la Barra superior que crea la 5.2, así que conviene implementar la 5.2 primero.
- La 5.1 modifica el flujo Crear Baño de la Story 2.4 y reutiliza el Detalle de la Story 2.3. Su punto de entrada es el Botón Agregar Baño, que la 5.2 mueve a la Barra inferior. Las dos historias son independientes en lógica.
- La 5.3 depende del gate de Usuario Autorizado ya construido (spec-gate-autorizado-backend).
