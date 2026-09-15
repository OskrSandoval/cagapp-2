# Epic 1 Context: Cuenta y Acceso

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Cualquier visitante debe poder crear una cuenta, iniciar sesión y recuperar el acceso antes de hacer cualquier otra cosa en CagApp — no existe modo de navegación anónima ni ninguna pantalla alcanzable sin sesión autenticada. Esta épica es la puerta de entrada obligatoria del producto; también cubre la configuración manual inicial del proyecto (frontend + backend + proyecto de Supabase conectados) sobre la que se construye cada épica posterior. Nota de alcance: el login/registro social (Google/Facebook) quedó diferido — la implementación actual de Story 1.1 cubre solo correo/contraseña (ver `_bmad-output/implementation-artifacts/deferred-work.md`).

## Stories

- Story 1.1: Registro de cuenta con correo/contraseña (+ configuración inicial del proyecto: frontend Vite, backend Express, proyecto de Supabase conectado). Login social diferido, no incluido.
- Story 1.2: Inicio de sesión y puerta de entrada obligatoria
- Story 1.3: Recuperar acceso

## Requirements & Constraints

- El registro captura correo, contraseña y un nombre para mostrar (`nombre_para_mostrar`), usado luego para atribuir públicamente las calificaciones del usuario.
- El registro/login social (Google/Facebook) está diferido para una iteración futura; no construir esa vía en esta épica.
- Un correo duplicado en el registro debe rechazarse con un mensaje claro; nunca sobrescribir ni fusionar cuentas en silencio.
- Longitud mínima de contraseña: se aplica el valor por defecto de Supabase Auth — no hay política propia definida, no debe construirse ninguna.
- El login usa las mismas credenciales creadas en el registro; credenciales incorrectas producen un error claro.
- Tras el primer login, la sesión persiste entre visitas hasta el cierre de sesión explícito o la expiración propia de Supabase — nunca se vuelve a pedir login en cada apertura.
- Cualquier apertura de la app sin autenticar (cold open) siempre redirige primero a Login/Registro, antes de cualquier otra pantalla — es una puerta obligatoria, no un default flexible.
- Cerrar sesión explícitamente debe forzar un nuevo login en la siguiente apertura.
- La recuperación de contraseña solo funciona con cuentas de correo; a las cuentas de login social se les debe indicar que la recuperación no aplica (relevante ya para cuando el login social se implemente; mientras tanto no hay cuentas sociales que probar).
- Todos los mensajes de éxito/error deben mantener el tono de marca (ver sección UX) — nunca strings genéricos/técnicos como "Autenticación fallida" o "Debes autenticarte."

## Technical Decisions

**Stack para la configuración inicial (Story 1.1):** React 19.3 + Vite 8.3.0 (frontend, `frontend/`), Node.js 24 LTS + Express 5.2.1 (backend, `backend/`), `@supabase/supabase-js` 2.116.0, Postgres vía Supabase. El backend sigue una estructura en capas estricta: `rutas → controladores → servicios → datos`, dependencia de una sola vía (sin saltar capas, sin importar hacia arriba). Estructura de carpetas sugerida: `frontend/src/{paginas,componentes,auth}`, `backend/src/{rutas,controladores,servicios,datos}`.

**AD-1 (límite frontend/backend):** el frontend solo puede llamar al SDK de Supabase para login/registro/sesión. Cualquier otra lectura/escritura (perfil, baños, etc.) pasa por la API de Node, que es la única que tiene la `service role key`. El frontend nunca toca datos de negocio directo contra Supabase.

**AD-5 / AD-12 (identidad y credenciales):** Supabase Auth es la única fuente de identidad; el backend nunca almacena contraseñas. Cada petición protegida del backend verifica el JWT emitido por Supabase, enviado como `Authorization: Bearer <token>`. La longitud mínima de contraseña y la duración/renovación de la sesión JWT son valores por defecto de Supabase Auth — no reimplementar ni reconfigurar ninguno en el backend.

**AD-10 (creación de perfil):** el flujo de registro es (1) el frontend llama al SDK de Supabase Auth para crear el usuario, (2) el frontend llama de inmediato a `POST /perfiles` (autenticado) en el backend, que crea la fila de `perfiles` con `id = auth.uid()` y el `nombre_para_mostrar` capturado en el formulario. No se usa ningún trigger de base de datos — la creación del perfil es explícita y pasa por el backend.

**Convenciones generales de la API relevantes aquí:** las respuestas exitosas devuelven el recurso directo con el código HTTP correspondiente; los errores devuelven `{ "error": "<mensaje>" }` (sin envoltorio `{data: ...}`). El vocabulario de dominio (tablas, columnas de negocio, rutas, campos JSON) va en español (`perfiles`, `nombre_para_mostrar`, etc.); las columnas técnicas genéricas (`id`, `created_at`) se quedan en inglés por convención de Postgres/Supabase. Los secretos (service role key, etc.) viven solo en variables de entorno (`.env` excluido de git en local; variables de entorno de Render/Vercel en producción) — nunca se commitean. RLS está habilitado y deny-by-default en las tablas de negocio (incluida `perfiles`), como defensa en profundidad, aunque el backend accede vía service role.

**Contexto de despliegue:** el backend se despliega en el plan gratuito de Render (cold-start de 30-60s tras 15min de inactividad, afecta la latencia percibida del login tras inactividad); el frontend en el plan gratuito de Vercel; Supabase aloja Auth + Postgres, probablemente el mismo proyecto se reutiliza para dev y prod.

## UX & Interaction Patterns

Login/Registro es la puerta obligatoria: es la única superficie alcanzable para un usuario no autenticado, sin vía de lectura anónima. Existe un mockup de referencia a nivel píxel: `ux-designs/ux-cagapp2.0-2026-09-11/mockups/key-login.html`.

- **Wordmark/logo** — insignia circular `surface`+`border` con un emoji 💩 al centro, seguido de "Cag**App**" (tipografía `display`, "App" en color `primary`). Único uso del rol tipográfico `display`.
- **Pestañas segmentadas** (Iniciar sesión / Crear cuenta) — un solo toque cambia de pestaña; el cambio conserva los valores ya escritos en campos compartidos (ej. correo), solo resetea los campos exclusivos de la otra pestaña; sin estado de carga entre pestañas.
- **Campo de texto** — la etiqueta siempre visible encima del input (nunca solo placeholder); cada input necesita un `id` real ligado a su `<label for>`; el campo de contraseña usa `type="password"` con `autocomplete` correcto. En error de validación: borde/etiqueta cambian a tratamiento de error, mensaje en línea debajo del campo, y el foco se mueve al primer campo inválido al enviar.
- **Botón primario (ancho completo)** — fondo `primary`, texto `primary-ink`, copy en patrón "verbo + emoji" (ej. "Entrar y encontrar baño 💩").
- El componente "Botón social" está especificado visualmente pero no se construye en esta épica (login social diferido).
- El link de "olvidé mi contraseña" siempre es visible en el formulario de login; al tocarlo, si la cuenta es solo social, se indica que la recuperación no aplica en vez de proceder.

**Tokens de color para esta pantalla:** `bg` #FFFFFF, `surface` #FFF8F3 (contenedor del segmented-control y fondos de inputs), `primary` #D53C19, `primary-ink` #FFFFFF, `text` #2B1B12, `muted` #8A6A5A (placeholders, texto de ayuda), `border` #F2D9CC, `warning` #CB3E48 (errores de validación).

**Tipografía:** pila del sistema, sin webfont. Roles usados aquí: `display` 24px/800 (solo wordmark), `label` 13px/700 (etiquetas de formulario, texto de pestañas), `button` 15px/800 (copy de los CTA), `body` 14px/400 (texto de inputs), `caption` 11px/400 en `muted` (fine print/ayuda bajo un CTA).

**Forma/elevación:** inputs y pestaña activa del segmented-control con radio de 10px; botones y contenedor del segmented-control con radio de 12px; marco del logo con radio de 16px. La tarjeta de login no lleva sombra — se distingue solo con relleno `surface` + borde de 1px.

**Voz y tono:** copy "chusco" (divertido, nunca corporativo neutro), con emojis solo en momentos clave. Ejemplo a seguir: "Entrar y encontrar baño 💩" en vez de "Iniciar sesión"; "Necesitas cuenta para todo en CagApp — hasta para nomás ver el mapa." en vez de "Debes autenticarte para continuar." Aplicar el mismo registro a correo duplicado, credenciales incorrectas, contraseña débil y recuperación de contraseña.

**Accesibilidad:** contraste AA con los tokens de arriba (ya corregidos, no oscurecer/aclarar `muted` sin reverificar). Contraseña con `type="password"` real y `autocomplete` correcto. Asociación etiqueta/input vía `for`/`id` es requisito explícito, no solo proximidad visual.

## Cross-Story Dependencies

- La configuración inicial del proyecto en Story 1.1 (frontend, backend y proyecto de Supabase corriendo y comunicándose entre sí) es un prerequisito para cualquier otra historia de cualquier épica.
- El flujo de creación de `POST /perfiles` de Story 1.1 (AD-10) también lo depende la Épica 4 (FR11 Perfil), ya que la fila de `perfiles` es lo que Perfil lee/muestra después.
- Story 1.3 (recuperar acceso) solo aplica a cuentas de correo/contraseña creadas en Story 1.1 — debe detectar y rechazar correctamente los intentos de recuperación en cuentas sociales (hoy inexistentes, dado el diferimiento del login social).
