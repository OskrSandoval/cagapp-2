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
