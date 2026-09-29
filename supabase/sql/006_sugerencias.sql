-- Buzón privado de sugerencias y bugs + switch de la fase
-- "friends and family".
-- Correr en el SQL Editor del dashboard de Supabase después de
-- 005_perfiles_autorizacion.sql.
--
-- AD-9: RLS habilitado sin políticas públicas en las dos tablas — solo la
-- service role key del backend puede leer/escribir (ninguna policy para
-- `anon` ni `authenticated`). No hay endpoint de lectura de sugerencias:
-- skr las lee directo en el Table Editor.

create table if not exists sugerencias (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references perfiles (id) on delete cascade,
  tipo text not null check (tipo in ('bug', 'sugerencia')),
  texto text not null check (char_length(texto) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table sugerencias enable row level security;

-- Switch de la fase "friends and family": una sola fila (id = 1). skr lo
-- apaga desde este mismo SQL Editor y surte efecto al instante, sin
-- redeploy:
--   update configuracion set sugerencias_activas = false where id = 1;
-- Si la fila no existe, el backend lo trata como apagado.
create table if not exists configuracion (
  id smallint primary key check (id = 1),
  sugerencias_activas boolean not null default true
);

insert into configuracion (id, sugerencias_activas)
values (1, true)
on conflict (id) do nothing;

alter table configuracion enable row level security;

-- Sin políticas: con RLS habilitado y ninguna policy, ni `anon` ni
-- `authenticated` pueden leer/escribir. Solo la service role key (que
-- salta RLS) del backend accede.
