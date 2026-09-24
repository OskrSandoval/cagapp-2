# Trabajo Diferido

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-registro-de-cuenta.md`
  summary: Login social (Google y Facebook) para el registro/inicio de sesión.
  evidence: skr eligió empezar solo con correo/contraseña para entregar y probar más rápido; el login social requiere configurar apps OAuth externas en Google Cloud Console y Facebook Developers antes de poder implementarse.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-registro-de-cuenta.md`
  summary: "`sprint-status.yaml` sigue marcando `1-1-registro-de-cuenta` como `review`, desincronizado del `status: done` real en el spec (con Verification y Review Triage Log ya completos)."
  evidence: Encontrado por el revisor blind-hunter de la Story 1.2; ya había sido flagged como low/patch en el Review Triage Log de spec-1-1 (entonces contra `in-progress`) y sigue sin corregirse. No es un problema causado por esta historia — es una corrección de datos de tracking de una historia ya cerrada.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-inicio-de-sesión-y-puerta-de-entrada-obligatoria.md`
  summary: "`App.jsx` no maneja el caso en que `supabase.auth.signOut()` falla (ej. red caída al cerrar sesión) — sin manejo de error ni feedback al usuario, el botón 'Cerrar sesión' no hace nada visible."
  evidence: Encontrado por el revisor blind-hunter. Es un comportamiento preexistente de Story 1.1, no causado por esta historia, y fuera de la AC de Story 1.2 (que solo cubre el camino feliz de cerrar sesión). Sería medium si un usuario lo topa: se queda atorado sin saber qué pasó.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-2-inicio-de-sesión-y-puerta-de-entrada-obligatoria.md`
  summary: Falta cobertura de test a nivel de `App.jsx` para la interacción entre una sesión persistida y los estados intermedios de `GET /perfiles/yo` (pendiente, 404, error) durante el cold-open — hoy solo `perfilesApi.test.js` prueba esos casos de forma aislada, sin pasar por el enrutamiento real de `App.jsx`.
  evidence: Encontrado por el revisor blind-hunter. Es principalmente superficie de Story 1.1 (la máquina de estados de perfil, ya verificada manualmente end-to-end contra Supabase real en esa historia), no de la AC de Story 1.2 (que es sobre login, no sobre el estado del perfil); ampliar esta historia para cubrirlo excede su alcance planeado.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-recuperar-acceso.md`
  summary: AC2 de Story 1.3 ("cuenta social → recuperación indica que no aplica") queda sin implementar; esta historia solo cubre AC1 (recuperación para cuentas de correo/contraseña).
  evidence: Hoy no existen cuentas sociales que probar (login social diferido desde Story 1.1). `supabase.auth.resetPasswordForEmail` no revela si un correo existe ni su proveedor (por diseño, evita enumeración de usuarios), así que detectar "cuenta social" requeriría un endpoint backend nuevo contra el admin API de Supabase — expondría si un correo está registrado, una superficie de enumeración nueva, para un caso sin datos reales que probar hoy. Decisión tomada por skr en el checkpoint de planeación de esta historia: retomar AC2 junto con la implementación real del login social.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-3-recuperar-acceso.md`
  summary: "Posible carrera en `App.jsx` entre `getSession()` y el evento `PASSWORD_RECOVERY`: si `getSession()` resolviera después de que el usuario completó el reset de contraseña, podría sobrescribir la sesión y rebotar a Login."
  evidence: Encontrado por el revisor edge-case-hunter, verdict maybe-false — `getSession()` en supabase-js v2 resuelve casi instantáneamente desde local storage, mucho antes de que un usuario termine de escribir y confirmar una nueva contraseña (interacción de varios segundos), así que no se demuestra que la ventana de carrera sea alcanzable en la práctica. Si fuera real, sería medium (rebote confuso pero no destructivo, el password sí quedó actualizado). Para asentarlo haría falta confirmar si `getSession()` puede demorarse más allá de la interacción completa del usuario (ej. latencia de red al refrescar el token).

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-ver-baños-cercanos-en-el-mapa.md`
  summary: "`GET /banos` hace `select('*')` sin `range`/`order`: por encima del límite `max-rows` de Supabase (1000 por defecto) el resultado se trunca en silencio y, como la distancia se ordena en Node después, podrían faltar los baños más cercanos."
  evidence: Verificado como real (medium a escala) por el edge-case-hunter y el blind-hunter. No se corrige aquí porque el spec difiere explícitamente la paginación/filtro por radio; se atiende con la Story 2.2 o cuando crezca la tabla (filtro por bounding box en SQL antes de ordenar).

- source_spec: `_bmad-output/implementation-artifacts/spec-2-4-agregar-un-baño-nuevo-con-búsqueda-de-duplicados.md`
  summary: "El radio de duplicados de 1.5km solo se aplica en el frontend contra el `banos` ya cargado (posiblemente desactualizado); un `POST /banos` directo o dos usuarios creando casi al mismo tiempo pueden saltarse la validación."
  evidence: Verificado como real por el blind-hunter. No se corrige aquí porque el spec y el epic describen este paso como obligatorio en el flujo de la UI (el usuario nunca puede saltárselo desde la app), no como una garantía de servidor contra clientes directos o carreras; la corrección completa (consulta de proximidad en el backend + manejo de condición de carrera) es una funcionalidad nueva, no un parche mínimo.

- source_spec: `_bmad-output/implementation-artifacts/spec-3-1-hacer-check-in-en-un-baño.md`
  summary: "Controles operacionales pendientes en todo el backend, no solo en `checkins`: ningún endpoint autenticado tiene rate limiting, los `catch` genéricos no loguean el error real (mismo patrón ya usado en `perfiles`/`banos`), ninguna prueba automatizada verifica que las tablas con RLS sigan sin políticas públicas, y la tabla `checkins` no tiene índices en sus columnas FK (`usuario_id`/`baño_id`) para cuando Story 3.2 empiece a leerla."
  evidence: Verificado como real por el blind-hunter; ninguno es una regresión de esta historia (rate limiting y logging ya faltan en todos los controladores existentes desde la Épica 1) ni bloquea la corrección de 3.1 (la tabla es solo-insert hoy, sin patrón de lectura todavía que justifique un índice específico).

- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-calificar-un-baño-tras-el-check-in.md`
  summary: "`calificaciones.usuario_id` usa `on delete cascade` hacia `perfiles`: si alguna vez existiera borrado de cuenta, borraría en silencio todo el historial de calificaciones de ese usuario, contradiciendo la garantía de append-only/auditoría de AD-3."
  evidence: Verificado como real por el blind-hunter, pero es el mismo patrón de FK ya usado en `baños.creado_por` y `checkins.usuario_id` desde las Épicas 2 y 3.1 — no es una regresión de esta historia, y hoy no existe ninguna funcionalidad de borrado de cuenta que lo dispare.
- source_spec: `_bmad-output/implementation-artifacts/spec-3-2-calificar-un-baño-tras-el-check-in.md`
  summary: "`obtenerPromediosPorBano` trae todo el historial de `calificaciones` de los baños pedidos en cada `GET /banos` y promedia en Node, sin límite — a escala, esto crece sin control por ser append-only con recalificación ilimitada."
  evidence: Verificado como real por el blind-hunter; misma categoría que el truncado por `max-rows` ya diferido desde la Story 2.1 (`GET /banos` sin paginación) — el epic difiere explícitamente optimizar a esta escala.
