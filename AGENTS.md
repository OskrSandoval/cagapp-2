<!-- bmad:context -->
<!-- Verified 2026-09-30 against c8c5e57. Managed by bmad-project-context; edits inside this block are replaced on refresh. Keep anything you want preserved outside the markers. -->

## CagApp 2.0

App web mobile-first para encontrar y calificar baños en CDMX (fase friends and family en producción). React + Vite en `frontend/`, Node + Express en `backend/`, Supabase (auth y Postgres). Planeación BMAD en `_bmad-output/planning-artifacts/` (PRD, arquitectura, UX); el estado del trabajo vive en `_bmad-output/implementation-artifacts/sprint-status.yaml`.

## Policy

- Código siempre en rama propia + PR con merge a `main`; nunca push de código directo a `main`. Solo cambios de tracking y docs dentro de `_bmad-output/` pueden ir directo a `main`, y solo con aprobación de skr.
- Nunca ejecutes SQL ni migraciones contra Supabase, ni uses las llaves de los `.env` para escribir datos: la única base es producción. Escribe la migración numerada en `supabase/sql/` y pide a skr que la corra en el SQL Editor.
- Nunca commitees `frontend/.env` ni `backend/.env`; el único env commiteado es `frontend/.env.demo`, sin secretos.
- Todo en español: vocabulario de dominio en código (AD-6), mensajes, docs y conversación.
- Todo texto que ve el usuario va en el tono de marca "chusco" (divertido, emojis en momentos clave), nunca neutro-corporativo.

## Where things are

- Trabajo diferido y deuda conocida: `_bmad-output/implementation-artifacts/deferred-work.md`.
- Verificar UI sin login: `frontend/DEMO.md` (`npm run dev:demo`).

## Running and verifying

- No hay CI: antes de abrir un PR corre `npm test` en `backend/` y en `frontend/`, y `npm run lint` y `npm run build` en `frontend/`.
- Los tests de frontend corren en jsdom y no ven layout: verifica cambios visuales con `npm run dev:demo` a 360×640. Chrome no encoge la ventana a menos de ~570px; usa un `iframe` del mismo origen de 360×640.

## Conventions that differ from defaults

- Capas del backend: `rutas → controladores → servicios → datos`, sin saltar niveles (AD-2).
- Todo router nuevo del backend encadena `verificarSesion` y `verificarAutorizado` (el gate es opt-in por ruta) y agrega sus rutas a `rutasConGate` en `backend/test/autorizacion.routes.test.js`.
- El frontend usa Supabase solo para auth; todo dato de negocio pasa por la API del backend (AD-1).
- `calificaciones` es append-only: nunca `UPDATE` ni `DELETE` (AD-3).
- La distancia se calcula solo en el backend (`calcularDistanciaMetros`); el frontend usa el `distancia_metros` que devuelve la API (AD-4).
- Si cambias un mensaje o código de estado de un controlador, actualiza también `frontend/src/demo/apiDemo.js`, que los copia a mano.
- Sin referencias a épicas o historias en comentarios del código; los comentarios explican el porqué.

## Known pitfalls

- Si un parche de revisión cambia estado, dependencias de efectos o memoización, agrega un test donde cambien las props (objeto nuevo con los mismos valores, `null`) y vuelve a correr al menos un revisor sobre el parche antes de cerrar la historia — así nacieron R1–R3 de la retro de la épica 5.
- Cuando agregues un patrón de resiliencia para cubrir un hueco, aplícalo también en los archivos hermanos que tienen el mismo hueco, en vez de solo documentar la diferencia (retro épica 1).
- `Mapa.jsx` crea un objeto `ubicacion` nuevo en cada lectura de `watchPosition`: nunca pongas `ubicacion` como dependencia de un efecto; deriva un valor estable.
- `100vh` esconde la UI de abajo detrás de la barra del navegador móvil; usa `100dvh`.
- Crea PRs con `gh pr create --body-file <archivo>`, no con `--body` y heredoc: las comillas escapadas quedan literales.

<!-- /bmad:context -->
