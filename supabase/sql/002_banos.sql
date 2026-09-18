-- Story 2.1: tabla `baños`.
-- Correr en el SQL Editor del dashboard de Supabase después de 001_perfiles.sql.
--
-- AD-9: RLS habilitado sin políticas públicas — solo la service role key
-- del backend puede leer/escribir esta tabla (ninguna policy para `anon`
-- ni `authenticated`).

create table if not exists "baños" (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  lat double precision not null,
  lng double precision not null,
  tipo_lugar text not null,
  zona text not null,
  creado_por uuid references perfiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table "baños" enable row level security;

-- Sin políticas: con RLS habilitado y ninguna policy, ni `anon` ni
-- `authenticated` pueden leer/escribir. Solo la service role key (que
-- salta RLS) del backend accede.
