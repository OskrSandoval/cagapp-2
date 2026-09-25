# CagApp 2.0 💩

> Porque encontrar baño digno no debería sentirse una lotería 🎲

App para descubrir, agregar y calificar baños públicos cerca de ti, enfocada en CDMX. Un usuario autenticado ve un mapa (o lista) de baños cercanos, puede agregar uno nuevo si no existe, hacer check-in verificado por ubicación al llegar, calificarlo de 1 a 5 estrellas, y ver su propia actividad y la de otros en el Perfil y en el Detalle de cada baño.

## Estado del proyecto

Roadmap completo: **4 épicas, 10 historias**, todas implementadas, revisadas (3 capas: blind-hunter, edge-case-hunter, verification-gap) y probadas en el navegador contra Supabase real.

| Épica | Contenido |
|---|---|
| 1 — Cuenta y Acceso | Registro, login, recuperar acceso |
| 2 — Baños: Descubrir y Agregar | Mapa, vista de lista, detalle de un baño, agregar baño con búsqueda de duplicados |
| 3 — Check-in y Calificación | Check-in verificado por ubicación (150m), calificar de 1 a 5 estrellas |
| 4 — Actividad y Comunidad | Perfil (actividad propia), "Lo que dice la gente" (calificaciones públicas) |

El detalle completo de cada historia, sus criterios de aceptación y las decisiones tomadas está en `_bmad-output/implementation-artifacts/spec-*.md`; las retrospectivas por épica están en `_bmad-output/implementation-artifacts/epic-*-retro-*.md`; el trabajo diferido a propósito está en `_bmad-output/implementation-artifacts/deferred-work.md`.

## Stack

- **Frontend:** React + Vite (JavaScript, sin TypeScript), sin router ni librería de estado — todo por `useState`/props. Leaflet + OpenStreetMap para el mapa.
- **Backend:** Node + Express, capas `rutas → controladores → servicios → datos`, sin ORM.
- **Datos y Auth:** Supabase (Postgres + Supabase Auth), con Row Level Security habilitado y sin políticas públicas — el backend accede con la `service role key`, el frontend nunca lee/escribe tablas de negocio directo contra Supabase (solo usa el SDK para su propia sesión).
- **Tests:** Vitest (backend y frontend) + Testing Library. Lint: oxlint.

## Estructura

```
backend/     API de Node/Express (rutas, controladores, servicios, datos)
frontend/    App de React/Vite
supabase/sql/  Migraciones SQL, en orden (001_perfiles → 004_calificaciones)
_bmad-output/  Documentos de planeación e implementación (specs, retros, epics, PRD, arquitectura, UX)
```

## Poner el proyecto a correr

### 1. Crear el proyecto de Supabase

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) y crea un proyecto nuevo.
2. Ve a **Authentication → Providers → Email** y desactiva **"Confirm email"** (para que el registro autentique de inmediato).
3. Ve a **Project Settings → API** y copia `Project URL`, `anon public key` y `service_role key`.
4. En el **SQL Editor**, corre los scripts de `supabase/sql/` **en orden**: `001_perfiles.sql`, `002_banos.sql`, `003_checkins.sql`, `004_calificaciones.sql`.

### 2. Variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Llena `backend/.env` (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) y `frontend/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) con los valores del paso 1. `PORT`, `FRONTEND_ORIGIN` y `VITE_API_URL` ya traen defaults razonables para desarrollo local.

### 3. Instalar y correr

```bash
cd backend && npm install && npm run dev    # http://localhost:3001
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Tests y lint

```bash
cd backend && npm test
cd frontend && npm test
cd frontend && npm run lint
cd frontend && npm run build
```

## Flujo de trabajo

Este proyecto se construyó con [BMAD](https://github.com/bmad-code-org/BMAD-METHOD) (skills `bmad-*` de Claude Code): cada historia pasa por spec → implementación → revisión de 3 capas → verificación, con las decisiones y hallazgos documentados en `_bmad-output/implementation-artifacts/`.

A partir de septiembre de 2026, el trabajo nuevo va en su propia rama y se integra a `main` vía Pull Request.
