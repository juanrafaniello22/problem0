-- ---------------------------------------------------------------------------
-- Planora · Migración 0006 — Endurecimiento de las funciones
--
-- Dos avisos del analizador de seguridad de Supabase, los dos reales:
--
--   1. `set_updated_at` no fijaba su `search_path`. Una función sin
--      `search_path` fijo resuelve los nombres con el del que la llama, así
--      que alguien podría colocar una función suya delante de la que espera.
--      Las otras dos ya lo tenían; a ésta se le pasó.
--
--   2. PostgREST publica automáticamente como endpoint HTTP toda función del
--      esquema `public`. Eso dejaba `/rest/v1/rpc/handle_new_user` abierto a
--      cualquiera, sin sesión, sobre una función SECURITY DEFINER (es decir,
--      que corre con permisos elevados). Hoy PostgreSQL rechaza llamar
--      directamente a una función de trigger, pero dejar la puerta abierta y
--      confiar en que nadie encuentre la llave no es una defensa.
--
-- Quitar el permiso de ejecución NO desactiva los triggers: PostgreSQL
-- comprueba ese permiso al crear el trigger, no cada vez que se dispara.
-- Comprobado contra esta misma base de datos antes de aplicarlo.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
-- Vacío y no `public`: esta función sólo usa `now()`, que vive en pg_catalog
-- y siempre se resuelve. Así no hay ningún nombre que se pueda secuestrar.
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Ninguna de las tres se llama nunca desde la aplicación: las tres son
-- funciones de trigger. Nadie necesita poder invocarlas.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
