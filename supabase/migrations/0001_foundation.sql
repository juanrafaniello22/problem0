-- ---------------------------------------------------------------------------
-- Planora · Migración 0001 — Fundación
-- Perfiles, ajustes, asignaturas y eventos de analítica.
-- Todas las tablas con datos de usuario llevan RLS: un usuario sólo puede
-- leer, modificar o borrar sus propias filas.
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- --- Tipos -----------------------------------------------------------------

do $$ begin
  create type public.education_level as enum (
    'eso', 'bachillerato', 'fp', 'universidad', 'oposiciones', 'otro'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.primary_goal as enum (
    'aprobar', 'buena_nota', 'organizarme', 'crear_habito'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.theme_preference as enum ('system', 'light', 'dark');
exception when duplicate_object then null; end $$;

-- --- Utilidades ------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
-- Vacío y no `public`: sólo usa now(), que vive en pg_catalog y siempre se
-- resuelve. Sin search_path fijo, quien llama podría colar una función suya.
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --- profiles --------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  username text unique,
  education_level public.education_level,
  primary_goal public.primary_goal,
  daily_minutes_available integer check (
    daily_minutes_available is null
    or (daily_minutes_available between 10 and 720)
  ),
  timezone text not null default 'Europe/Madrid',
  onboarding_completed_at timestamptz,
  first_plan_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[a-zA-Z0-9_.-]{3,30}$'
  ),
  constraint profiles_full_name_length check (
    full_name is null or char_length(full_name) between 1 and 80
  )
);

comment on table public.profiles is 'Perfil público de cada usuario, 1:1 con auth.users.';

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);

-- --- user_settings ---------------------------------------------------------

create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  theme public.theme_preference not null default 'system',
  study_reminders boolean not null default true,
  exam_reminders boolean not null default true,
  habit_reminders boolean not null default false,
  -- El marketing requiere consentimiento explícito (RGPD): por defecto, no.
  marketing_opt_in boolean not null default false,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_settings is 'Preferencias de la cuenta: tema, avisos y consentimientos.';

drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own" on public.user_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own" on public.user_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "user_settings_delete_own" on public.user_settings;
create policy "user_settings_delete_own" on public.user_settings
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- --- subjects --------------------------------------------------------------

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subjects is 'Asignaturas del usuario; los exámenes se cuelgan de ellas.';

create unique index if not exists subjects_user_name_unique
  on public.subjects (user_id, lower(trim(name)));

create index if not exists subjects_user_id_idx on public.subjects (user_id);

drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

alter table public.subjects enable row level security;

drop policy if exists "subjects_select_own" on public.subjects;
create policy "subjects_select_own" on public.subjects
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "subjects_insert_own" on public.subjects;
create policy "subjects_insert_own" on public.subjects
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "subjects_update_own" on public.subjects;
create policy "subjects_update_own" on public.subjects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "subjects_delete_own" on public.subjects;
create policy "subjects_delete_own" on public.subjects
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- --- analytics_events ------------------------------------------------------

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  -- Al borrar la cuenta el evento se anonimiza en lugar de desaparecer.
  user_id uuid references public.profiles (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.analytics_events is 'Eventos de producto. Sin datos personales en properties.';

create index if not exists analytics_events_user_created_idx
  on public.analytics_events (user_id, created_at desc);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (name, created_at desc);

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events_select_own" on public.analytics_events;
create policy "analytics_events_select_own" on public.analytics_events
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "analytics_events_insert_own" on public.analytics_events;
create policy "analytics_events_insert_own" on public.analytics_events
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Los eventos son inmutables: sin políticas de update ni delete.

-- --- feedback --------------------------------------------------------------

do $$ begin
  create type public.feedback_type as enum ('sugerencia', 'problema', 'valoracion');
exception when duplicate_object then null; end $$;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  type public.feedback_type not null,
  message text not null check (char_length(trim(message)) between 5 and 2000),
  rating smallint check (rating is null or rating between 1 and 5),
  created_at timestamptz not null default now()
);

comment on table public.feedback is 'Feedback enviado desde Ajustes.';

create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own" on public.feedback
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- --- Alta automática de perfil --------------------------------------------
-- Cuando Supabase Auth crea un usuario, creamos su perfil y sus ajustes.
-- SECURITY DEFINER porque el trigger corre fuera del contexto del usuario.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantiene el email del perfil sincronizado si el usuario lo cambia.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();
