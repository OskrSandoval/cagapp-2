-- Feature "friends and family": gate manual de acceso vía columna
-- `autorizado` en `perfiles`.
-- Correr en el SQL Editor del dashboard de Supabase (Project → SQL Editor),
-- incluido el proyecto real que ya está en producción.
--
-- Paso 1: agrega la columna con default `true` — así el backfill de las
-- filas ya existentes (cuentas que ya venían usando la app) las deja
-- autorizadas automáticamente, sin tocarlas una por una.
alter table perfiles
  add column if not exists autorizado boolean not null default true;

-- Paso 2: a partir de aquí, las cuentas nuevas nacen sin autorizar — solo
-- el registro ya existente (signup abierto) las crea; skr las autoriza a
-- mano, una por una, cambiando este valor a `true` desde este mismo SQL
-- Editor. No hay panel ni endpoint de administración para esto.
alter table perfiles
  alter column autorizado set default false;

-- AD-9: mismo patrón deny-by-default que el resto de `perfiles` — RLS ya
-- está habilitado y sin policies públicas (001_perfiles.sql), así que
-- `autorizado` queda protegido igual: solo la service role key del
-- backend puede leerlo o escribirlo. No se agrega ninguna policy nueva.
