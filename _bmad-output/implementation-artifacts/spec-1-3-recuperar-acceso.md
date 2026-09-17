---
title: 'Recuperar acceso'
type: 'feature'
created: '2026-09-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '9f96ef93d37f42763105ba7e429c0f065865e90b'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** El link "¿Se te olvidó? Recupérala aquí 🔑" en `Login.jsx` solo muestra un aviso placeholder ("Muy pronto podrás recuperar tu contraseña desde aquí 🔧") — Story 1.3 (`epics.md` FR3) exige que un usuario con cuenta de correo pueda solicitar y completar la recuperación de su contraseña por correo, y que una cuenta social reciba un mensaje de que no aplica.

**Approach:** Sustituir el placeholder por un flujo real de dos pantallas sobre el SDK de Supabase Auth: (1) "Recuperar acceso" pide el correo y llama `supabase.auth.resetPasswordForEmail`; (2) "Restablecer contraseña", que `App.jsx` muestra cuando Supabase dispara el evento `PASSWORD_RECOVERY` (el usuario llegó desde el link del correo), permite fijar una nueva contraseña vía `supabase.auth.updateUser`.

**Decisión (Open Question resuelta):** Esta historia cubre solo AC1 (recuperación para cuentas de correo/contraseña, el único tipo que existe hoy). AC2 ("cuenta social → no aplica") queda diferido a `deferred-work.md`: hoy no hay cuentas sociales que probar (login social diferido) y detectarlas requeriría un endpoint backend nuevo contra el admin API de Supabase, lo que abriría una superficie de enumeración de cuentas — se retoma junto con el login social real.

## Boundaries & Constraints

**Always:** Usar solo el SDK de Supabase para este flujo (`resetPasswordForEmail`, `updateUser`, `onAuthStateChange`) — sin llamadas nuevas al backend (AD-1). Reusar clases/patrones existentes (`pantalla-login`, `tarjeta-login`, `campo`, `mensaje-error`, `boton-primario`, `aviso`) y el tono de marca vía `mapearErrorAuth.js` — nunca strings técnicos genéricos. `redirectTo` de `resetPasswordForEmail` debe usar `window.location.origin` (funciona en dev y prod sin config extra).

**Never:** No tocar `backend/` — este flujo es 100% frontend/Supabase. No introducir un router — seguir el patrón de renderizado condicional por estado que ya usa `App.jsx`. No construir login/registro social ni infraestructura nueva para detectarlo (diferido, ver `deferred-work.md`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Solicitud feliz | Correo válido en pantalla "Recuperar acceso" | `resetPasswordForEmail` se llama; UI confirma "revisa tu correo" sin revelar si la cuenta existe | N/A |
| Correo vacío/inválido | Campo correo vacío o sin formato de email | Error inline, mismo patrón de validación que `Login.jsx` | Foco al campo con error |
| Llega desde el link del correo | Sesión de recuperación (`onAuthStateChange` emite `PASSWORD_RECOVERY`) | Se muestra "Restablecer contraseña" antes que cualquier otra pantalla | N/A |
| Nueva contraseña débil | Contraseña < mínimo de Supabase Auth | Error inline vía `mapearErrorAuth` | No se envía `updateUser` |
| Restablecimiento exitoso | Nueva contraseña válida enviada | `updateUser` la actualiza; usuario queda autenticado y pasa al flujo normal post-login | N/A |
| Falla de red/servidor | Cualquier paso, error inesperado de Supabase | Mensaje fallback en tono de marca (`mapearErrorAuth`) | No deja la UI en estado de carga colgado |

</frozen-after-approval>

## Code Map

- `frontend/src/paginas/Login.jsx` -- placeholder "olvide" (líneas 209-220) a reemplazar por navegación real; reusar patrón de pestañas/campo/validación de este mismo archivo.
- `frontend/src/App.jsx` -- máquina de estados por sesión (líneas 30-94); agregar detección del evento `PASSWORD_RECOVERY` en el callback de `onAuthStateChange` (línea 37) para enrutar a la nueva pantalla.
- `frontend/src/auth/supabaseClient.js` -- cliente ya expuesto (`supabase`), se reusa tal cual, sin cambios.
- `frontend/src/auth/mapearErrorAuth.js` -- extender con mapeos para errores de `resetPasswordForEmail`/`updateUser` (ej. contraseña débil, sesión de recuperación expirada) siguiendo el mismo patrón de `mensaje.includes(...)`.
- `frontend/src/paginas/CompletarPerfil.jsx` -- patrón de referencia (pantalla single-purpose post-auth, `useRef` + validación + submit) a replicar para "Restablecer contraseña".
- `frontend/src/index.css` -- clases reutilizables ya existentes: `.pantalla-login`, `.tarjeta-login`, `.campo`, `.mensaje-error`, `.mensaje-error-general`, `.aviso`, `.boton-primario`, `.nota-final` (líneas ~140-200).
- `frontend/test/Login.test.jsx`, `frontend/test/App.test.jsx` -- patrón de mocks de `supabase.auth` y captura del callback de `onAuthStateChange` a replicar en los tests nuevos.

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/paginas/RecuperarAcceso.jsx` -- nueva pantalla: pide correo, llama `resetPasswordForEmail`, confirma envío -- cubre AC1 (`epics.md` Story 1.3)
- [x] `frontend/src/paginas/Login.jsx` -- reemplazar el aviso placeholder por navegación a `RecuperarAcceso` -- conecta el entry point ya existente en el link "olvide"
- [x] `frontend/src/paginas/RestablecerContrasena.jsx` -- nueva pantalla: fija nueva contraseña vía `updateUser` tras llegar desde el link del correo -- completa el flujo end-to-end
- [x] `frontend/src/App.jsx` -- detectar `PASSWORD_RECOVERY` en `onAuthStateChange` y enrutar a `RestablecerContrasena` antes que cualquier otra pantalla -- puerta obligatoria también aplica a este flujo
- [x] `frontend/src/auth/mapearErrorAuth.js` -- agregar mapeos de error del reset, en tono de marca -- evita strings técnicos
- [x] `frontend/test/RecuperarAcceso.test.jsx`, `frontend/test/RestablecerContrasena.test.jsx`, ajuste a `frontend/test/App.test.jsx` -- cubrir la I/O & Edge-Case Matrix de arriba

**Acceptance Criteria:**
- Given un correo de cuenta de correo/contraseña, when se solicita recuperación desde "Recuperar acceso", then Supabase envía instrucciones y la UI confirma en tono de marca sin revelar si la cuenta existe.
- Given que el usuario abre el link del correo, when `App.jsx` detecta la sesión de recuperación, then se muestra "Restablecer contraseña" antes que cualquier otra pantalla.
- Given una nueva contraseña válida enviada en "Restablecer contraseña", when se confirma, then la cuenta queda actualizada y el usuario pasa al flujo normal post-login (`Bienvenida`/`CompletarPerfil` según corresponda).

## Implementation Notes

- `Login.jsx` gestiona la navegación a "Recuperar acceso" con un estado local (`vista`: `'formulario' | 'recuperar'`), sin router — al hacer clic en el link "olvide" renderiza `RecuperarAcceso` en su lugar; `onVolver` regresa al formulario de login/registro.
- `App.jsx` agrega el estado `enRecuperacion`, activado cuando `onAuthStateChange` emite el evento `'PASSWORD_RECOVERY'`. Se revisa antes que el chequeo de `!sesion`, garantizando que "Restablecer contraseña" gana incluso si ya hay una sesión persistida (getSession) al mismo tiempo. `onCompletado` de `RestablecerContrasena` limpia el flag y deja paso a la máquina de estados normal (perfil → Bienvenida/CompletarPerfil).
- `RestablecerContrasena.jsx` valida la contraseña débil en el cliente (longitud < 6, el mínimo por defecto de Supabase Auth) reutilizando `mapearErrorAuth` con un mensaje sintético (`{ message: 'Password should be at least 6 characters.' }`) para no duplicar el copy de "contraseña floja" ni llamar a `updateUser` con un valor que Supabase rechazaría de todos modos.
- `mapearErrorAuth.js` gana dos mapeos nuevos: contraseña igual a la anterior (`updateUser`) y sesión de recuperación vencida/ausente. El branch de "contraseña distinta" se coloca *antes* del branch genérico existente de contraseña floja porque el mensaje real de Supabase para ese caso comparte la palabra clave `password` con el branch preexistente y quedaría enmascarado si se evaluara después. (Un tercer branch para "link vencido/inválido" se agregó originalmente pero se quitó en la ronda de revisión: ningún call site de este flujo produce ese mensaje -- ver Review Triage Log #7/#12.)
- Ambas pantallas nuevas envuelven la llamada a Supabase en `try/catch/finally` (no solo `if (error)`) para que una falla de red que rechace la promesa también muestre el mensaje de fallback de marca y libere el estado de carga -- el patrón original de `Login.jsx` no lo necesitaba porque sus tests no ejercitan ese camino, pero la Matrix de esta historia sí lo exige explícitamente.
- No se tocó `backend/` ni se agregó ningún endpoint nuevo (AD-1); AC2 (cuentas sociales) permanece diferido, ya registrado en `deferred-work.md` antes de este trabajo.
- Ronda de revisión (patches): `RestablecerContrasena.jsx` gana un botón "Cancelar y volver" (reusa `onCompletado`, sin prop nuevo) para no dejar al usuario atrapado si la sesión de recuperación es inválida o quiere cancelar. `EMAIL_REGEX` se extrajo a `frontend/src/auth/validacionEmail.js`, compartido entre `Login.jsx` y `RecuperarAcceso.jsx`. El aviso de envío exitoso en `RecuperarAcceso.jsx` gana `role="status"`. Su botón "Volver a iniciar sesión" superior ahora se deshabilita mientras la solicitud está en vuelo (`disabled={cargando}`), evitando un unmount a mitad de la promesa.

## Spec Change Log

## Review Triage Log

| # | Finding | Verdict | Evidence |
|---|---------|---------|----------|
| 1 | `RestablecerContrasena.jsx` no tiene campo de confirmar contraseña (blind-hunter) | low — reject | Un typo es recuperable pidiendo un nuevo link vía el flujo de "olvide" ya existente; agregar el campo (estado + validación de coincidencia) es más que una corrección directa. |
| 2 | `RestablecerContrasena.jsx` no tiene botón "volver"/cancelar (blind-hunter) | medium — patch | Verificado en el archivo: no existe ningún control de salida salvo el submit exitoso. Agrupado con #8 y #13 (misma causa raíz). |
| 3 | `EMAIL_REGEX` y su lógica de validación duplicadas entre `Login.jsx` y `RecuperarAcceso.jsx` (blind-hunter) | low — patch | Confirmado: mismo regex/lógica en ambos archivos. Riesgo de divergencia si la regla cambia; extraerlo a un módulo compartido es una corrección trivial. |
| 4 | Mensaje de éxito en `RecuperarAcceso.jsx` (`enviado`) sin `role="status"`/`aria-live`, a diferencia de los errores que usan `role="alert"` (blind-hunter) | low — patch | Confirmado en el JSX (líneas ~76-79). Brecha de accesibilidad real para lectores de pantalla; agregar el atributo es trivial. |
| 5 | Botones de submit no cambian de texto mientras cargan, solo `disabled` (blind-hunter) | false | `Login.jsx` (línea 227-229, código preexistente) usa exactamente el mismo patrón — texto estático + `disabled={cargando}` — no es una desviación introducida por esta historia. |
| 6 | Sin manejo específico de rate-limit de `resetPasswordForEmail` ni cooldown en el botón (blind-hunter) | low — reject | El fallback genérico de marca ya cubre este caso con degradación aceptable; disparar rate-limit real requiere solicitudes repetidas (poco común) y el fix (cooldown/copy dedicado) no es trivial. |
| 7 | El branch "link" en `mapearErrorAuth.js` (líneas 22-24) parece inalcanzable/sin test (blind-hunter) | low — patch | Verificado: ningún call site en el diff produce un mensaje con "link" — `resetPasswordForEmail` y `updateUser` no generan ese texto. Código muerto; eliminar el branch es trivial. Agrupado con #12. |
| 8 | Sin manejo si la sesión de recuperación expira mientras el usuario está en `RestablecerContrasena`; sin test (blind-hunter) | medium — patch | Mismo root cause que #2: no hay control de salida. Agrupado. |
| 9 | Ningún test de `RecuperarAcceso` ejercita un correo con espacios (trim) (blind-hunter) | low — patch | Confirmado: ningún test en `RecuperarAcceso.test.jsx` pasa un valor con espacios. Agregar un caso de test es trivial. |
| 10 | `redirectTo: window.location.origin` sería frágil si la app se sirviera bajo un subpath (blind-hunter) | false | No hay evidencia de despliegue bajo subpath en el repo; el comportamiento actual cumple exactamente la restricción AD-1 de la spec ("funciona en dev y prod sin config extra"). Falla ante una situación no demostrada = comportamiento correcto, no defecto. |
| 11 | (gap, pre-verificado) La navegación real de Login → `RecuperarAcceso` (clic en "¿Se te olvidó?" y el "volver") no está cubierta por ningún test de `Login.test.jsx`; `RecuperarAcceso.test.jsx` inyecta su propio `onVolver` mock y nunca pasa por `Login` (verification-gap) | medium — patch | Verificado por la capa (grep confirma que ningún test de `Login.test.jsx` interactúa con el botón "olvide"). Es el punto de entrada literal de toda la feature (FR3). Disposición ya filed: patch. |
| 12 | El branch "link" de `mapearErrorAuth` es inalcanzable desde cualquier call site actual; un link realmente vencido/inválido cae silenciosamente en Login sin ningún mensaje (verification-gap, other findings) | low (parte código-muerto) — patch; low (parte "sin detección de link vencido") — reject | Misma causa raíz que #7 para la parte de código muerto (patch: eliminar branch). La detección real de un link vencido vía el hash de la URL es poco común y su fix no es trivial (parsear `window.location.hash`, nuevo estado) — recuperable reintentando el flujo de "olvide". |
| 13 | `enRecuperacion` en `App.jsx` solo se limpia vía `onCompletado`; sin control de cancelar si la sesión de recuperación es inválida (edge-case-hunter) | medium — patch | Mismo root cause que #2/#8. Agrupado. |
| 14 | Clic en "Volver a iniciar sesión" de `RecuperarAcceso.jsx` mientras `resetPasswordForEmail` está en vuelo desmonta el componente antes de que la promesa resuelva → `setState` tras unmount (edge-case-hunter) | low — patch | Confirmado: el botón "volver" (línea 69-71) no está deshabilitado durante `cargando`. Ventana de tiempo angosta pero real; fix trivial (`disabled={cargando}`, igual que el submit). |
| 15 | `getSession()` podría resolver después de que `PASSWORD_RECOVERY` ya estableció la sesión y el usuario completó el reset, sobrescribiendo el estado y rebotando a Login (edge-case-hunter) | maybe-false — defer | `getSession()` en supabase-js v2 resuelve casi instantáneamente desde local storage, mucho antes de que un usuario termine de escribir y confirmar una nueva contraseña (interacción de varios segundos); no se demuestra que la ventana de carrera sea alcanzable en la práctica. Si fuera real, sería medium (rebote confuso pero no destructivo — el password sí quedó actualizado). Se necesitaría confirmar si `getSession()` puede demorarse más allá de la interacción completa del usuario para asentar esto. |
| 16 | Doble submit en `RecuperarAcceso.jsx` sin guarda explícita más allá de `disabled` (edge-case-hunter) | low — reject | Ventana de tiempo muy angosta (requiere doble clic/Enter antes del re-render); consecuencia benigna (llamada duplicada, sin daño); fix trivial pero el caso es poco frecuente en el uso diario. |
| 17 | Doble submit en `RestablecerContrasena.jsx` sin guarda explícita (edge-case-hunter) | low — reject | Mismo razonamiento que #16. |
| 18 | El orden real de los branches de `mapearErrorAuth.js` no coincide con lo que describen las Implementation Notes de la spec (el branch "floja" queda antes que "link", no después) (edge-case-hunter, claim) | false | Verificado: no ocurre enmascaramiento real hoy porque el mensaje de "link" nunca contiene la palabra "password". El único "fix" posible sería editar el texto de las Implementation Notes de esta spec, lo cual está explícitamente fuera de alcance del triage. |

## Design Notes

Usar el evento `PASSWORD_RECOVERY` de `supabase.auth.onAuthStateChange` (no parsear manualmente el hash/query del link de recuperación) para detectar que el usuario llegó desde el correo — es el mecanismo soportado por el SDK y ya hay un precedente de capturar este callback en `App.test.jsx` (Story 1.2) para simular eventos de auth en tests.

## Verification

**Commands:**
- `cd frontend && npx vitest run` -- expected: todos los tests pasan, incluidos los nuevos de `RecuperarAcceso`/`RestablecerContrasena` -- **Actual (post-revisión):** 6 archivos, 29 tests, todos pasan.
- `cd frontend && npx oxlint` -- expected: sin hallazgos -- **Actual:** sin hallazgos (exit 0).
- `cd frontend && npm run build` -- expected: build exitoso -- **Actual:** build exitoso (`vite build`, 67 módulos).
