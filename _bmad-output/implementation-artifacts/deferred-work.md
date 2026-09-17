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
