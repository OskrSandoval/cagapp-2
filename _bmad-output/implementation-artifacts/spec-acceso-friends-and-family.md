---
title: 'Gate de acceso "friends and family"'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
context: []
baseline_commit: '6351b9a431cfa60ec4d9fab56e46d03bea3e1750'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** CagApp ya está en producción pero el fundador (skr) quiere mantenerla en modo "friends and family": cualquiera puede registrarse, pero solo entra a la app quien él autorice manualmente desde la base de datos.

**Approach:** Agregar una columna `autorizado` a `perfiles` (las cuentas ya existentes quedan autorizadas automáticamente; las nuevas nacen sin autorizar). El registro sigue abierto sin cambios. `App.jsx` revisa ese campo después de resolver el perfil: si no está autorizado, muestra una pantalla nueva y bonita en vez del mapa, con copy de marca que genere intriga en vez de sonar a rechazo. Esa pantalla cierra la sesión sola a los 30 segundos y regresa a Login — sin botón manual, sin panel de administración.

## Boundaries & Constraints

**Always:** el campo `autorizado` sigue el mismo patrón RLS deny-by-default (AD-9) que el resto de `perfiles` — ninguna policy pública, solo la service role key del backend lo toca. El registro (`POST /perfiles`, signup de Supabase) sigue abierto para cualquiera, sin invitación ni código.

**Never:** no se construye ningún panel/endpoint de administración para autorizar usuarios — eso se hace a mano en el SQL Editor de Supabase. No se agrega botón de "cerrar sesión" manual en la pantalla de espera. No se toca `POST /perfiles` ni `GET /perfiles/yo` en el backend — ambos ya devuelven la fila completa (`select('*')` / upsert `.select().single()`), así que `autorizado` llega gratis al frontend sin cambiar controlador ni servicio.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Cuenta autorizada | `perfil.autorizado === true` tras login/registro | Entra al mapa normal, sin cambio de comportamiento | N/A |
| Cuenta nueva sin autorizar | `perfil.autorizado === false` tras login o tras completar perfil | Se muestra `EnEspera` en vez del Mapa | N/A |
| Expira la espera | Han pasado 30s en `EnEspera` | Se llama `supabase.auth.signOut()`; `App` vuelve a Login vía el listener de `onAuthStateChange` ya existente | Si `signOut()` rechaza, el listener no dispara — igual válido: el usuario puede recargar y vuelve a ver `EnEspera` |
| Desmontaje antes de expirar | Usuario cierra la pestaña o el estado cambia antes de los 30s (ej. queda autorizado y hace login de nuevo) | El temporizador se limpia, nunca dispara `signOut()` tarde sobre una sesión distinta | N/A |
| Migración sobre datos existentes | Filas de `perfiles` creadas antes de esta migración | Quedan con `autorizado = true` automáticamente | N/A |

</frozen-after-approval>

## Code Map

- `supabase/sql/005_perfiles_autorizacion.sql` -- YA EXISTE, sin cambios (sobrevivió la revisión intacto). `alter table` agrega `autorizado boolean not null default true` (backfill automático de filas existentes a `true`), luego `alter column ... set default false` para que las filas nuevas nazcan sin autorizar.
- `frontend/src/App.jsx` -- después del `if (perfil === null)` (línea 73) y antes de renderizar `<Mapa>` (línea 77), agregar `if (perfil.autorizado === false) return <EnEspera onTiempoAgotado={manejarTiempoAgotado} />`. **Importante (fix de la revisión):** la condición es `=== false`, nunca `!perfil.autorizado` — un campo `autorizado` ausente/`undefined` (perfil creado antes de correr la migración, o cualquier estado transitorio) debe comportarse como autorizado, igual que hoy. Define `manejarTiempoAgotado` como una función estable (ej. `useCallback(async () => { await supabase.auth.signOut().catch((error) => console.error('No pudimos cerrar la sesión tras el tiempo de espera:', error)); }, [])`, con arreglo de dependencias vacío) para no recrearla en cada render — pásala como prop en vez de una arrow function inline. No tocar el resto de la máquina de estados.
- `frontend/src/paginas/EnEspera.jsx` -- NUEVO. Componente de pantalla completa (mismo patrón visual que `Login.jsx`: `.pantalla-login`/`.tarjeta-login`). `useEffect` con `setTimeout(onTiempoAgotado, 30000)` al montar (arreglo de dependencias `[]`: como `onTiempoAgotado` ya es estable gracias al `useCallback` de `App.jsx`, no hace falta un ref adicional), limpiado con `clearTimeout` al desmontar. El contenedor principal lleva `role="status"` (mismo patrón que los mensajes de estado de `Mapa.jsx`, ej. "Buscando dónde andas 📍…"), para que un lector de pantalla anuncie el cambio de pantalla. Copy chusco (mismo tono que `Login.jsx`/`checkinsController.js`) que dé intriga SIN sugerir reingreso automático — debe dejar claro que se cerrará la sesión y habrá que volver a entrar después, ej.: "🚧 CagApp anda en modo VIP — le estamos dando una limpiadita para que quede perfecta. En unos segundos te regresamos al login — vuelve a entrar más tarde 👀" (redactar el texto final en la implementación, mismo tono, sin sonar a rechazo, pero honesto sobre el cierre de sesión).
- `frontend/src/index.css` -- agregar reglas para las clases nuevas de `EnEspera` (reusar tokens ya definidos; no crear tokens nuevos).
- `frontend/test/App.test.jsx` -- las fixtures `PERFIL_DE_PRUEBA` (línea 36) deben incluir `autorizado: true`. Agregar tests nuevos: (1) perfil con `autorizado: false` muestra `EnEspera` en vez de "Mapa de prueba"; (2) perfil con `autorizado: undefined` (sin el campo) entra al mapa normal, igual que `autorizado: true` — cubre el fix de esta revisión; (3) con `vi.useFakeTimers()`, renderizar `App` con `autorizado: false`, avanzar 30000ms y verificar que `supabase.auth.signOut` fue invocado — cierra el hueco de verificación de la revisión (el camino completo App→EnEspera→`signOut()` real, no solo sus mitades por separado).
- `frontend/test/EnEspera.test.jsx` -- NUEVO. Con `vi.useFakeTimers()`: verifica que a los 30000ms se llama `onTiempoAgotado`, que desmontar antes no lo llama, y que el copy/heading esperado está presente en el render (no solo el comportamiento del temporizador).

## Tasks & Acceptance

**Execution:**
- [x] `supabase/sql/005_perfiles_autorizacion.sql` -- migración ya aplicada al repo -- sin cambios en esta re-derivación
- [x] `frontend/src/paginas/EnEspera.jsx` -- crear componente -- pantalla de espera con temporizador de 30s, `role="status"`, copy honesto sobre el cierre de sesión
- [x] `frontend/src/App.jsx` -- integrar el gate con `perfil.autorizado === false` (nunca `!perfil.autorizado`) y un callback estable (`useCallback`, deps `[]`) que envuelva `signOut()` en `.catch`
- [x] `frontend/src/index.css` -- estilos de `EnEspera` -- consistentes con tokens existentes
- [x] `frontend/test/App.test.jsx` -- fixture + 3 tests nuevos (autorizado:false → EnEspera; autorizado:undefined → Mapa; temporizador real de 30s → `signOut` invocado)
- [x] `frontend/test/EnEspera.test.jsx` -- test del temporizador (dispara/no dispara) + test de contenido renderizado

**Acceptance Criteria:**
- Given un perfil con `autorizado: false`, when `App` termina de resolver sesión+perfil, then se renderiza `EnEspera` y nunca `Mapa`.
- Given `EnEspera` montado dentro de `App` con un perfil `autorizado: false`, when pasan 30 segundos (temporizador real, no simulado a mano), then se invoca `supabase.auth.signOut()`.
- Given un perfil con `autorizado: true` o sin el campo `autorizado` (`undefined` — cuentas creadas antes de correr la migración), when `App` resuelve sesión+perfil, then el comportamiento es idéntico al actual: entra al mapa, nunca ve `EnEspera`.
- Given que `App` re-renderiza mientras `EnEspera` está montado (ej. un evento de `onAuthStateChange` que no cierra la sesión), when eso ocurre, then el temporizador de 30s no se reinicia (el callback pasado a `EnEspera` es estable entre renders).

## Implementation Notes

- `005_perfiles_autorizacion.sql` usa dos `alter table` separados a propósito: el primero agrega la columna con `default true` (así el backfill de filas existentes queda automático, sin un `update` explícito); el segundo cambia el default a `false` para que solo las filas creadas *después* de correr la migración nazcan sin autorizar. No se agregó ninguna policy nueva — RLS ya deniega todo por default (001_perfiles.sql, AD-9). Este archivo sobrevivió la revisión sin cambios.
- Re-derivación (iteración 1): `App.jsx` ahora usa `perfil.autorizado === false` (nunca `!perfil.autorizado`), y `manejarTiempoAgotado` es un `useCallback` con deps `[]` que envuelve `signOut()` en `.catch`. `EnEspera.jsx` tiene `role="status"` en el bloque de mensaje y copy honesto ("en unos segundos vamos a cerrar esta sesión... vuelve a entrar con tu correo y contraseña de siempre"), sin sugerir reingreso automático. `frontend/test/App.test.jsx` gana 3 tests (autorizado:false → EnEspera; autorizado:undefined → Mapa; temporizador real de 30s con `vi.useFakeTimers()`/`advanceTimersByTimeAsync` → `signOut` invocado). `frontend/test/EnEspera.test.jsx` gana una prueba de contenido renderizado además de las de temporizador.
- Verificación: `npm test -- --run` (133/133, 14 archivos), `npm run lint` (oxlint, exit 0), `npm run build` (vite, exitoso) — todos corridos en `frontend/` tras la re-derivación.
- Ronda 2 de revisión (parche): se agregaron 2 tests a `frontend/test/App.test.jsx` (el temporizador real de 30s ahora también confirma que la app vuelve a Login/pierde `role="status"`, y un test nuevo confirma que el temporizador sobrevive a un re-render de `App` — ej. `TOKEN_REFRESHED` — sin reiniciarse) y se reescribió una línea de copy en `EnEspera.jsx` para quitar el apodo interno "skr" del texto visible a usuarios reales. Verificación final: `npm test -- --run` (134/134), `npm run lint` (exit 0), `npm run build` (exitoso).
- Pendiente de acción manual (fuera del alcance de este spec): correr `supabase/sql/005_perfiles_autorizacion.sql` en el SQL Editor del proyecto real de Supabase en producción y confirmar que las filas existentes quedaron con `autorizado = true`. No se ejecutó desde aquí por no tener acceso a ese proyecto.

## Spec Change Log

- **Disparador:** revisión de 3 capas (iteración 1) encontró que `App.jsx` usaba `if (!perfil.autorizado)`, contradiciendo la propia AC del spec ("perfil... o sin el campo... comportamiento idéntico al actual") — un perfil sin el campo `autorizado` (migración aún no corrida en producción, o cualquier estado donde falte) bloqueaba a **todos** los usuarios, no solo a los nuevos. Además, `EnEspera` dependía de una función inline recreada en cada render de `App`, reiniciando su temporizador de 30s en cualquier re-render; y ningún test cubría el camino completo App→EnEspera→`signOut()` real.
  **Qué se corrigió:** Code Map y Tasks & Acceptance ahora especifican explícitamente `perfil.autorizado === false` (nunca `!perfil.autorizado`); el callback que cierra la sesión debe ser estable (`useCallback`, deps `[]`) y envolver `signOut()` en `.catch`; se agregaron tareas de test para el caso `autorizado: undefined` y para el temporizador real end-to-end dentro de `App`. De paso se incorporaron 3 hallazgos `low` triviales de la misma revisión: copy que no sugiera reingreso automático, `role="status"` en `EnEspera` (consistente con `Mapa.jsx`), y una prueba de contenido renderizado en `EnEspera.test.jsx`.
  **Estado malo que se evita:** que el propio fundador (o cualquier usuario ya autorizado) quede bloqueado fuera de su propia app en cuanto se despliegue el frontend, si por cualquier motivo la migración SQL aún no corrió contra producción.
  **KEEP:** el enfoque general (columna `autorizado` con backfill-luego-flip-default, sin política RLS nueva), la migración SQL tal cual (sin cambios, no tuvo hallazgos válidos en su contra), la ubicación del gate en `App.jsx` entre `perfil === null` y `<Mapa>`, el patrón visual de `EnEspera` reusando `.pantalla-login`/`.tarjeta-login`/`.marca`/`.logo-emoji` de `Login.jsx`, y el tono chusco del copy (solo ajustar la honestidad sobre el cierre de sesión, no el tono).

## Review Triage Log

- **verdict: high** — `App.jsx:81` usa `if (!perfil.autorizado)`, que trata un campo `autorizado` ausente/`undefined` como no autorizado. Esto contradice la propia AC del spec ("perfil con `autorizado: true` (o sin el campo...) comportamiento idéntico al actual") y crea un riesgo real de bloqueo total: si la migración SQL no ha corrido todavía en producción (o cualquier otro escenario donde el campo falte), **todos** los usuarios — incluidos los ya autorizados y el propio fundador — verían `EnEspera` y serían deslogueados. Verificado en el código real; blind-hunter #1, edge-case-hunter (claim de alta confianza), verification-gap (nota "Other findings"). Causa raíz: contradicción entre AC y Code Map del propio spec → **bad_spec**.
- **verdict: medium** — `EnEspera.jsx`'s `useEffect` depende de `[onTiempoAgotado]`, pero `App.jsx` le pasa una función flecha inline que se recrea en cada render de `App` (ej. un evento `TOKEN_REFRESHED` de Supabase). Cualquier re-render de `App` mientras `EnEspera` está montado reinicia el temporizador de 30s, violando la garantía "se cierra sola a los 30s". Verificado en el código; blind-hunter #2, edge-case-hunter (mismo root cause). → **bad_spec** (se resuelve en la misma re-derivación).
- **verdict: medium** — Ningún test cubre el camino completo App→EnEspera→`signOut()` real con temporizador avanzado; los tests existentes usan un mock directo (`EnEspera.test.jsx`) o disparan `SIGNED_OUT` a mano (`App.test.jsx`), nunca ambos juntos. Hallazgo de verification-gap, ya pre-verificado, disposición archivada: `patch`. → se dobla en la misma re-derivación (bad_spec) en vez de parchear código que se va a revertir.
- **verdict: low** — El copy de `EnEspera` ("Ya casi es tu turno de entrar 👀", "en un momento te regresamos al inicio") puede sonar a que la entrada será automática, cuando en realidad es un cierre de sesión forzado sin reingreso automático. blind-hunter #4. Fix trivial (ajustar texto) → se incorpora en la re-derivación.
- **verdict: low** — `EnEspera.jsx` no tiene `role="status"`/`aria-live`, inconsistente con el patrón ya usado en el resto de la app para mensajes de estado (ej. "Buscando dónde andas 📍…" en Mapa.jsx). blind-hunter #5. Fix trivial → se incorpora en la re-derivación.
- **verdict: low** — `EnEspera.test.jsx` nunca verifica el contenido renderizado (solo el temporizador); la cobertura del copy es incidental vía `App.test.jsx`. blind-hunter #7. Fix trivial → se incorpora en la re-derivación.
- **verdict: low** — `onTiempoAgotado` en `App.jsx` no captura un rechazo de `supabase.auth.signOut()` (sin `.catch`), dejando una promesa rechazada sin manejar. edge-case-hunter. Fix trivial → se incorpora en la re-derivación.
- **verdict: false** — El número mágico `TIEMPO_ESPERA_MS = 30000` sin config externa no es un defecto: es el mismo patrón ya establecido en el proyecto (`RADIO_CHECKIN_METROS` en FlujoCheckin.jsx, `UMBRAL_COORDENADAS` en Mapa.jsx) — constantes locales nombradas, nunca configurables por entorno. blind-hunter #8. Rechazado.
- **verdict: false** — Que el usuario tenga que volver a iniciar sesión cada 30s hasta ser autorizado (sin reingreso automático ni polling) no es un defecto: es exactamente el comportamiento que skr pidió explícitamente en el Intent congelado ("lo saca en automático... mándalo al login de nuevo"). blind-hunter #3. Rechazado.
- **verdict: low** — Falta un test para el camino "CompletarPerfil crea un perfil nuevo con `autorizado: false` → EnEspera" (solo se prueba el camino de perfil ya existente). blind-hunter #6 (segunda mitad). Rechazado: `App.test.jsx` nunca ha probado ese camino ni siquiera antes de esta feature (requeriría mockear `CompletarPerfil`, que hoy no se mockea) — no es una regresión de este cambio, y el costo del fix es desproporcionado al riesgo.
- **verdict: low** — Ventana de carrera teórica en `005_perfiles_autorizacion.sql` entre las dos sentencias `alter table` (un registro creado en esos milisegundos nacería `autorizado: true`), y riesgo de que la segunda sentencia no se corra tras la primera. edge-case-hunter (2 hallazgos). Rechazado: solo aplica durante la corrida manual única de la migración, con probabilidad prácticamente nula de que un signup real aterrice en esa ventana, es corregible a mano después (skr ya autoriza uno por uno), y envolver en una transacción explícita rompería la convención ya establecida en 001-004 (ninguna usa transacciones).
- **verdict: medium, defer** — El gate de `autorizado` solo se aplica en el frontend (`App.jsx`); ningún endpoint del backend (`checkins`, `calificaciones`, `banos`, `perfiles`) revisa `autorizado` — confirmado por grep sin resultados fuera de los archivos nuevos de este cambio. Un usuario autenticado pero no autorizado podría seguir usando la API directamente (saltándose la pantalla) aunque nunca vea el mapa. Real, verificado por verification-gap. Se difiere: el Intent original de skr describe explícitamente una pantalla ("le saldrá la pantalla graciosa"), no un requisito de seguridad a nivel API, y este es un proyecto friends-and-family de bajo riesgo real; endurecer cada endpoint es una expansión de alcance que amerita su propia historia, no un parche dentro de esta.

**Ronda 2 (tras la re-derivación):**

- **verdict: medium, defer** — carried: mismo hallazgo y ubicación que la fila anterior (gate solo en frontend); el código no cambió en esta dimensión. blind-hunter #1 de la ronda 2. No se vuelve a diferir (ya está en `deferred-work.md`).
- **verdict: low** — carried: misma ventana de carrera teórica en `005_perfiles_autorizacion.sql` ya evaluada y rechazada arriba; el archivo no cambió. edge-case-hunter de la ronda 2. Rechazado de nuevo, mismo razonamiento.
- **verdict: medium** — Ningún test cubre la AC "si `App` re-renderiza mientras `EnEspera` está montado (ej. `TOKEN_REFRESHED`), el temporizador de 30s no se reinicia" — la única prueba con temporizador real (`App.test.jsx:152-177`) nunca dispara un re-render de `App` durante la espera. Si alguien quitara el `useCallback` (la regresión que esta misma ronda de revisión existe para prevenir), ningún test lo detectaría. Hallazgo de verification-gap, pre-verificado, disposición archivada: `patch`.
- **verdict: medium** — El test nuevo `'a los 30s reales... se invoca signOut()'` solo verifica que se llamó `supabase.auth.signOut()`, nunca que la app efectivamente vuelve a mostrar Login (el propio archivo ya tiene el patrón para esto: `capturarCambioDeAuth('SIGNED_OUT', null)`, usado en el test `'cerrar sesión regresa a Login'`). Lo único que esta feature promete — sacar al usuario no autorizado — queda sin verificar de punta a punta. blind-hunter #2 de la ronda 2. → **patch**.
- **verdict: low** — El copy de `EnEspera.jsx` menciona a "skr" por su apodo interno ("skr la está revisando a mano, uno por uno") en texto que ven usuarios reales (amigos/familia) que no necesariamente saben quién es "skr" — ningún otro texto de la app se refiere al fundador por nombre. blind-hunter #7 de la ronda 2. Fix trivial (reescribir sin el apodo, conservando el tono). → **patch**.
- **verdict: false** — Que `signOut()` pueda rechazar y dejar al usuario varado en `EnEspera` sin reintento ni botón manual no es un defecto nuevo: el `.catch` ya evita la promesa sin manejar (mismo patrón que el propio `catch` de `obtenerMiPerfil` en este archivo), un reintento automático o botón de escape excede el alcance ("Never: sin botón manual" del Intent congelado), y el mismo riesgo sin mitigar ya existe, sin tocar, en el `onCerrarSesion` de `Mapa` desde antes de esta feature. blind-hunter #3 y edge-case-hunter (ronda 2), mismo root cause. Rechazado.
- **verdict: false** — Que el copy diga "en unos segundos" en vez de mostrar una cuenta regresiva exacta de 30000ms no es un defecto: coincide con el mismo estilo impreciso que ya usa el resto del copy de la app (ej. "Buscando dónde andas 📍…"), y agregar un contador visible es una funcionalidad nueva, no una corrección. blind-hunter #4 de la ronda 2. Rechazado.
- **verdict: false** — Que la migración sea un paso manual sin sentencia de rollback ni mecanismo de tracking no es un defecto introducido por este archivo: ninguna de las migraciones 001-004 tiene rollback ni tracking tampoco — es la convención ya establecida del proyecto. blind-hunter #5 de la ronda 2. Rechazado.
- **verdict: false** — Que las dos sentencias `alter table` (default `true` luego `false`) "se lean contradictorias" no es un defecto: es la forma deliberada de lograr el backfill automático sin un `update` explícito, ya explicada en los comentarios del propio archivo SQL. blind-hunter #6 de la ronda 2. Rechazado.
- **verdict: false** — Que el emoji del encabezado (🚧) y el del cuerpo (🕶️) sugieran metáforas distintas no es un defecto verificable: es una preferencia estética subjetiva, no una falla funcional. blind-hunter #8 de la ronda 2. Rechazado.
- **verdict: false** — Que `EnEspera` no valide que `onTiempoAgotado` sea una función antes de invocarla no es un defecto alcanzable: tiene un único punto de llamada en todo el repo (`App.jsx`), que siempre pasa una función real (`manejarTiempoAgotado`) — agregar una guarda defensiva para un caller hipotético que no existe es complejidad especulativa, no una corrección. edge-case-hunter de la ronda 2. Rechazado.

## Design Notes

`EnEspera` no recibe ningún dato del perfil ni hace fetch — es una pantalla puramente informativa. El temporizador vive en el propio componente (no en `App.jsx`) para que el ciclo de montaje/desmontaje lo limpie solo, igual que ya hacen `FlujoCheckin`/`SelectorCalificacion` con su propio estado local (retro Épica 3). El callback `onTiempoAgotado` debe ser estable entre renders de `App` (`useCallback` con deps `[]`) — de lo contrario el `useEffect` de `EnEspera` lo trata como una dependencia nueva en cada render y reinicia el `setTimeout`, rompiendo la garantía de "se cierra sola a los 30s".

## Verification

**Commands:**
- `cd frontend && npm test -- --run` -- expected: toda la suite pasa, incluidos los tests nuevos de `App.test.jsx` y `EnEspera.test.jsx`
- `cd frontend && npm run lint` -- expected: exit 0
- `cd frontend && npm run build` -- expected: build exitoso

**Manual checks (if no CLI):**
- Correr `supabase/sql/005_perfiles_autorizacion.sql` en el SQL Editor del proyecto real de Supabase (el mismo que ya usa producción) y confirmar en el dashboard que las filas existentes de `perfiles` quedaron con `autorizado = true`.
