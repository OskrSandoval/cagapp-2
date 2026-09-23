-- Story 3.1: tabla `checkins`.
-- Correr en el SQL Editor del dashboard de Supabase después de 002_banos.sql.
--
-- AD-9: RLS habilitado sin políticas públicas — solo la service role key
-- del backend puede leer/escribir esta tabla (ninguna policy para `anon`
-- ni `authenticated`).
--
-- AD-13: esta tabla solo persiste el resultado de un check-in válido (la
-- asociación usuario-baño-momento) — nunca las coordenadas del intento
-- (`lat`/`lng`/`accuracy`), que se usan solo en memoria durante esa
-- petición para calcular la distancia.

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles (id) on delete cascade,
  "baño_id" uuid not null references "baños" (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table checkins enable row level security;

-- Sin políticas: con RLS habilitado y ninguna policy, ni `anon` ni
-- `authenticated` pueden leer/escribir. Solo la service role key (que
-- salta RLS) del backend accede.
