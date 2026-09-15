-- Story 1.1: tabla `perfiles`.
-- Correr en el SQL Editor del dashboard de Supabase (Project → SQL Editor)
-- después de crear el proyecto y desactivar "Confirm email" en
-- Authentication → Providers → Email.
--
-- AD-9: RLS habilitado sin políticas públicas — solo la service role key
-- del backend puede leer/escribir esta tabla (ninguna policy para `anon`
-- ni `authenticated`, así que PostgREST/el cliente del navegador nunca
-- puede tocarla directo).
-- AD-10: no hay trigger que cree la fila automáticamente; la crea una
-- llamada explícita del backend (POST /perfiles).

create table if not exists perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre_para_mostrar text not null,
  created_at timestamptz not null default now()
);

alter table perfiles enable row level security;

-- Sin políticas: con RLS habilitado y ninguna policy, ni `anon` ni
-- `authenticated` pueden leer/escribir. Solo la service role key (que
-- salta RLS) del backend accede.
