-- Story 3.2: tabla `calificaciones`.
-- Correr en el SQL Editor del dashboard de Supabase después de 003_checkins.sql.
--
-- AD-3: append-only — solo INSERT, nunca UPDATE/DELETE. `secuencia`
-- (bigserial) existe únicamente para desempatar timestamps idénticos al
-- calcular cuál fila es la "vigente" por (usuario_id, baño_id). Nunca se
-- cachea un promedio en columna alguna: siempre se calcula en el backend
-- (calificacionesService.js) a partir de las filas vigentes.
--
-- AD-9: RLS habilitado sin políticas públicas — solo la service role key
-- del backend puede leer/escribir esta tabla (ninguna policy para `anon`
-- ni `authenticated`).

create table if not exists calificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles (id) on delete cascade,
  "baño_id" uuid not null references "baños" (id) on delete cascade,
  estrellas integer not null check (estrellas between 1 and 5),
  secuencia bigserial not null,
  created_at timestamptz not null default now()
);

alter table calificaciones enable row level security;

-- Sin políticas: con RLS habilitado y ninguna policy, ni `anon` ni
-- `authenticated` pueden leer/escribir. Solo la service role key (que
-- salta RLS) del backend accede.

-- Soporta tanto "¿hay un check-in vigente (< 15 min) de este usuario para
-- este baño?" (calificacionesService#obtenerCheckinVigente) como el índice
-- que Story 3.1 dejó pendiente por no tener todavía una consulta real que
-- lo necesitara.
create index if not exists checkins_usuario_bano_created_at_idx
  on checkins (usuario_id, "baño_id", created_at);

-- Misma consulta ("fila más reciente por usuario_id + baño_id") pero contra
-- `calificaciones`, usada para calcular el promedio vigente de cada baño
-- (calificacionesService#obtenerPromediosPorBano).
create index if not exists calificaciones_usuario_bano_created_at_idx
  on calificaciones (usuario_id, "baño_id", created_at);
