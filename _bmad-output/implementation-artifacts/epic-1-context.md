# Epic 1 Context: Cuenta y Acceso

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Cualquier visitante debe poder crear una cuenta, iniciar sesión y recuperar el acceso antes de hacer cualquier otra cosa en CagApp — no existe modo de navegación anónima ni ninguna pantalla alcanzable sin sesión autenticada. Esta épica es la puerta de entrada obligatoria del producto: también cubre la configuración manual inicial del proyecto (frontend + backend + proyecto de Supabase conectados) sobre la que se construye cada épica posterior.

## Stories

- Story 1.1: Registro de cuenta (+ configuración inicial del proyecto: frontend Vite, backend Express, proyecto de Supabase conectado)
- Story 1.2: Inicio de sesión y puerta de entrada obligatoria
- Story 1.3: Recuperar acceso

## Requirements & Constraints

- El registro admite correo/contraseña y proveedores sociales (Google/Facebook), capturando siempre un nombre para mostrar (`nombre_para_mostrar`).
- Un correo duplicado en el registro debe rechazarse con un mensaje claro; nunca sobrescribir ni fusionar cuentas en silencio.
- Longitud mínima de contraseña: se aplica el valor por defecto de Supabase Auth — no hay política propia definida, no debe construirse ninguna.
- El login usa las mismas credenciales creadas en el registro; credenciales incorrectas producen un error claro.
- Tras el primer login, la sesión persiste entre visitas hasta el cierre de sesión explícito o la expiración propia de Supabase — nunca se vuelve a pedir login en cada apertura.
- Cualquier apertura de la app sin autenticar (cold open) siempre redirige primero a Login/Registro, antes de cualquier otra pantalla — es una puerta obligatoria, no un default flexible.
- Cerrar sesión explícitamente debe forzar un nuevo login en la siguiente apertura.
- La recuperación de contraseña solo funciona con cuentas de correo; a las cuentas de login social se les debe indicar que la recuperación no aplica.
- Todos los mensajes de éxito/error deben mantener el tono de marca (ver sección UX) — nunca strings genéricos/técnicos como "Autenticación fallida" o "Debes autenticarte."

## Technical Decisions

**Stack para la configuración inicial (Story 1.1):** React 19.3 + Vite 8.3.0 (frontend, `frontend/`), Node.js 24 LTS + Express 5.2.1 (backend, `backend/`), `@supabase/supabase-js` 2.116.0, Postgres vía Supabase. El backend sigue una estructura en capas estricta: `rutas → controladores → servicios → datos`, dependencia de una sola vía (sin saltar capas, sin importar hacia arriba). Estructura de carpetas sugerida: `frontend/src/{paginas,componentes,auth}`, `backend/src/{rutas,controladores,servicios,datos}`.

**AD-1 (límite frontend/backend):** el frontend solo puede llamar al SDK de Supabase para login/registro/sesión. Cualquier otra lectura/escritura (perfil, baños, etc.) pasa por la API de Node, que es la única que tiene la `service role key`. El frontend nunca toca datos de negocio directo contra Supabase.

**AD-5 / AD-12 (identidad y credenciales):** Supabase Auth es la única fuente de identidad; el backend nunca almacena contraseñas. Cada petición protegida del backend verifica el JWT emitido por Supabase, enviado como `Authorization: Bearer <token>`. La longitud mínima de contraseña y la duración/renovación de la sesión JWT son valores por defecto de Supabase Auth — no reimplementar ni reconfigurar ninguno en el backend.

**AD-10 (creación de perfil):** el flujo de registro es: (1) el frontend llama al SDK de Supabase Auth para crear el usuario, (2) el frontend llama de inmediato a `POST /perfiles` (autenticado) en el backend, que crea la fila de `perfiles` con `id = auth.uid()` y el `nombre_para_mostrar` capturado en el formulario. No se usa ningún trigger de base de datos — la creación del perfil es explícita y pasa por el backend, consistente con AD-1. El mismo flujo aplica para el registro social.

**Convenciones generales de la API relevantes aquí:** las respuestas exitosas devuelven el recurso directo con el código HTTP correspondiente; los errores devuelven `{ "error": "<mensaje>" }` (sin envoltorio `{data: ...}`). El vocabulario de dominio (tablas, columnas de negocio, rutas, campos JSON) va en español (`perfiles`, `nombre_para_mostrar`, etc.); las columnas técnicas genéricas (`id`, `created_at`) se quedan en inglés por convención de Postgres/Supabase. Los secretos (service role key, etc.) viven solo en variables de entorno (`.env` excluido de git en local; variables de entorno de Render/Vercel en producción) — nunca se commitean.

**Contexto de despliegue:** el backend se despliega en el plan gratuito de Render (cold-start de 30-60s tras 15min de inactividad — no es específico de esta épica, pero afecta la latencia percibida del login tras inactividad); el frontend en el plan gratuito de Vercel; Supabase aloja Auth + Postgres, probablemente el mismo proyecto se reutiliza para dev y prod.

## UX & Interaction Patterns

Login/Registro es la puerta obligatoria: es la única superficie alcanzable para un usuario no autenticado, y no existe una vía de lectura anónima.

- **Wordmark/logo** — insignia circular `surface`+`border` con un emoji 💩 al centro, seguido de "Cag**App**" (tipografía `display`, "App" en color `primary`). Es el único lugar donde se usa el rol tipográfico `display`.
- **Pestañas segmentadas** (Iniciar sesión / Crear cuenta) — un solo toque cambia de pestaña; el cambio conserva los valores ya escritos en campos compartidos (ej. correo), solo resetea los campos exclusivos de la otra pestaña; sin estado de carga entre pestañas.
- **Campo de texto** — la etiqueta visible siempre se muestra encima del input (nunca solo placeholder); cada input necesita un `id` real ligado a su `<label for>`; el campo de contraseña debe usar `type="password"` con el `autocomplete` correcto. En error de validación: el borde/etiqueta cambian a un tratamiento de error y aparece un mensaje en línea debajo del campo; el foco se mueve al primer campo inválido al enviar.
- **Botón primario (ancho completo)** — fondo `primary` relleno, texto `primary-ink`, copy siempre en patrón "verbo + emoji" (ej. "Entrar y encontrar baño 💩").
- **Botón social** (Google/Facebook) — con borde, jerarquía visual menor que el botón primario.
- El link de "olvidé mi contraseña" siempre es visible en el formulario de login; al tocarlo, si la cuenta es solo social, se le indica al usuario que la recuperación no aplica en vez de proceder.

**Tokens de color para esta pantalla:** `bg` #FFFFFF, `surface` #FFF8F3 (usado en el contenedor del segmented-control y fondos de inputs), `primary` #D53C19, `primary-ink` #FFFFFF, `text` #2B1B12, `muted` #8A6A5A (placeholders, texto de ayuda), `border` #F2D9CC, `warning` #CB3E48 (reservado para estados de error — ningún mockup aprobado lo muestra todavía, así que se trata como la elección por defecto para errores de validación en Campo de texto).

**Tipografía:** pila del sistema únicamente (sin webfont). Roles usados aquí: `display` 24px/800 (solo wordmark), `label` 13px/700 (etiquetas de formulario, texto de pestañas, texto de botón social), `button` 15px/800 (copy verbo+emoji de los CTA), `body` 14px/400 (texto de inputs), `caption` 11px/400 en `muted` (fine print/ayuda bajo un CTA).

**Forma/elevación:** inputs y la pestaña activa del segmented-control usan radio de 10px; botones y el contenedor del segmented-control usan radio de 12px; el marco del logo en la tarjeta de login usa radio de 16px. La tarjeta de login no lleva sombra — se distingue solo con relleno `surface` + borde de 1px.

**Voz y tono:** el copy debe ser "chusco" (divertido, nunca corporativo neutro), con emojis solo en momentos clave (no decoración constante). Ejemplos a seguir directamente: usar "Entrar y encontrar baño 💩" en vez de "Iniciar sesión"; usar "Necesitas cuenta para todo en CagApp — hasta para nomás ver el mapa." en vez de "Debes autenticarte para continuar." Aplicar el mismo registro a los mensajes de correo duplicado, credenciales incorrectas, contraseña débil y recuperación de contraseña — claros, con el tono de marca, nunca un string técnico genérico.

**Accesibilidad:** el contraste debe cumplir AA usando exactamente los tokens de arriba (ya corregidos para AA — no oscurecer/aclarar `muted` más sin volver a verificar). El campo de contraseña debe ser `type="password"` real con el `autocomplete` correcto. La asociación etiqueta/input vía `for`/`id` es un requisito explícito, no solo proximidad visual.

Existe un mockup de referencia a nivel píxel para esta pantalla: `ux-designs/ux-cagapp2.0-2026-09-11/mockups/key-login.html`.

## Cross-Story Dependencies

- La configuración inicial del proyecto en Story 1.1 (frontend, backend y proyecto de Supabase corriendo y comunicándose entre sí) es un prerequisito para cualquier otra historia de cualquier épica — nada más se puede construir ni probar sin esto.
- El flujo de creación de `POST /perfiles` de Story 1.1 (AD-10) también lo depende la Épica 4 (FR11 Perfil), ya que la fila de `perfiles` es lo que Perfil lee/muestra después.
- Story 1.3 (recuperar acceso) solo aplica a cuentas de correo/contraseña creadas en Story 1.1 — debe detectar y rechazar correctamente los intentos de recuperación en cuentas sociales.
