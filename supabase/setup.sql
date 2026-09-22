-- ===========================================================================
-- Planora — instalación completa de la base de datos
--
-- GENERADO AUTOMÁTICAMENTE por scripts/build-setup-sql.sh. No editar a mano.
--
-- Cómo usarlo:
--   1. Entra en tu proyecto de Supabase.
--   2. Menú lateral -> SQL Editor -> New query.
--   3. Pega TODO este archivo y pulsa Run.
--
-- Se puede ejecutar más de una vez sin romper nada.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 0001_foundation.sql
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- 0002_core.sql
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Planora · Migración 0002 — Núcleo
-- Exámenes, temas, planes de estudio, versiones de plan y tareas.
-- Igual que en la fundación: RLS en todas las tablas y aislamiento estricto
-- por usuario. Las políticas de escritura comprueban además que el examen
-- al que se cuelga cada fila pertenece a quien escribe.
-- ---------------------------------------------------------------------------

-- --- Tipos -----------------------------------------------------------------

do $$ begin
  create type public.exam_difficulty as enum ('easy', 'medium', 'hard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exam_status as enum ('active', 'completed', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_type as enum ('study', 'review', 'quiz', 'practice', 'break');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum ('pending', 'completed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_source as enum ('ai', 'deterministic');
exception when duplicate_object then null; end $$;

-- --- exams -----------------------------------------------------------------

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Si se borra la asignatura el examen sobrevive sin ella.
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 80),
  exam_date date not null,
  difficulty public.exam_difficulty not null default 'medium',
  daily_minutes integer not null default 60 check (daily_minutes between 10 and 720),
  -- Días disponibles en formato ISO: 1 = lunes … 7 = domingo.
  available_weekdays smallint[] not null default '{1,2,3,4,5}',
  status public.exam_status not null default 'active',
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- cardinality() y no array_length(): con un array vacío array_length
  -- devuelve NULL, y un CHECK que da NULL se considera cumplido.
  constraint exams_weekdays_not_empty check (
    cardinality(available_weekdays) between 1 and 7
  ),
  constraint exams_weekdays_valid check (
    available_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  )
);

comment on table public.exams is 'Exámenes del usuario: la raíz de todo el plan de estudio.';

create index if not exists exams_user_status_date_idx
  on public.exams (user_id, status, exam_date);

create index if not exists exams_subject_idx on public.exams (subject_id);

drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

alter table public.exams enable row level security;

drop policy if exists "exams_select_own" on public.exams;
create policy "exams_select_own" on public.exams
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "exams_insert_own" on public.exams;
create policy "exams_insert_own" on public.exams
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "exams_update_own" on public.exams;
create policy "exams_update_own" on public.exams
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "exams_delete_own" on public.exams;
create policy "exams_delete_own" on public.exams
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- --- topics ----------------------------------------------------------------

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  -- user_id desnormalizado: permite políticas RLS sin join en cada consulta.
  user_id uuid not null references public.profiles (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  position integer not null default 0 check (position >= 0),
  -- Peso relativo. Por defecto todos iguales: Planora no decide qué tema
  -- es más importante si el usuario no lo dice.
  weight smallint not null default 3 check (weight between 1 and 5),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.topics is 'Temas que entran en un examen, en el orden que fija el usuario.';

create unique index if not exists topics_exam_name_unique
  on public.topics (exam_id, lower(trim(name)));

create index if not exists topics_exam_position_idx on public.topics (exam_id, position);
create index if not exists topics_user_idx on public.topics (user_id);

drop trigger if exists topics_set_updated_at on public.topics;
create trigger topics_set_updated_at
  before update on public.topics
  for each row execute function public.set_updated_at();

alter table public.topics enable row level security;

drop policy if exists "topics_select_own" on public.topics;
create policy "topics_select_own" on public.topics
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "topics_insert_own" on public.topics;
create policy "topics_insert_own" on public.topics
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.exams e
      where e.id = exam_id and e.user_id = (select auth.uid())
    )
  );

drop policy if exists "topics_update_own" on public.topics;
create policy "topics_update_own" on public.topics
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "topics_delete_own" on public.topics;
create policy "topics_delete_own" on public.topics
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- --- study_plans -----------------------------------------------------------
-- Un plan por examen. El histórico vive en study_plan_versions.

create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete cascade,
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.study_plans is 'Plan de estudio de un examen; apunta a la versión vigente.';

create unique index if not exists study_plans_exam_unique on public.study_plans (exam_id);
create index if not exists study_plans_user_idx on public.study_plans (user_id);

drop trigger if exists study_plans_set_updated_at on public.study_plans;
create trigger study_plans_set_updated_at
  before update on public.study_plans
  for each row execute function public.set_updated_at();

alter table public.study_plans enable row level security;

drop policy if exists "study_plans_select_own" on public.study_plans;
create policy "study_plans_select_own" on public.study_plans
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "study_plans_insert_own" on public.study_plans;
create policy "study_plans_insert_own" on public.study_plans
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.exams e
      where e.id = exam_id and e.user_id = (select auth.uid())
    )
  );

drop policy if exists "study_plans_update_own" on public.study_plans;
create policy "study_plans_update_own" on public.study_plans
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "study_plans_delete_own" on public.study_plans;
create policy "study_plans_delete_own" on public.study_plans
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- --- study_plan_versions ---------------------------------------------------
-- Cada replanificación crea una versión nueva. Nunca se borra el histórico.

create table if not exists public.study_plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.study_plans (id) on delete cascade,
  version integer not null check (version >= 1),
  source public.plan_source not null,
  reason text not null default 'initial' check (char_length(reason) <= 60),
  -- Resumen del plan: días, sesiones, minutos y avisos mostrados al usuario.
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.study_plan_versions is 'Histórico auditable de cada versión del plan.';

create unique index if not exists study_plan_versions_unique
  on public.study_plan_versions (plan_id, version);

create index if not exists study_plan_versions_user_idx
  on public.study_plan_versions (user_id, created_at desc);

alter table public.study_plan_versions enable row level security;

drop policy if exists "study_plan_versions_select_own" on public.study_plan_versions;
create policy "study_plan_versions_select_own" on public.study_plan_versions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "study_plan_versions_insert_own" on public.study_plan_versions;
create policy "study_plan_versions_insert_own" on public.study_plan_versions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.study_plans p
      where p.id = plan_id and p.user_id = (select auth.uid())
    )
  );

-- Las versiones son un registro histórico: sin update ni delete.

-- El plan apunta a su versión vigente (FK añadida aquí para evitar el ciclo).
do $$ begin
  alter table public.study_plans
    add constraint study_plans_current_version_fkey
    foreign key (current_version_id)
    references public.study_plan_versions (id)
    on delete set null;
exception when duplicate_object then null; end $$;

-- --- study_tasks -----------------------------------------------------------

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete cascade,
  plan_version_id uuid not null references public.study_plan_versions (id) on delete cascade,
  -- Si se borra el tema conservamos su nombre para no perder el histórico.
  topic_id uuid references public.topics (id) on delete set null,
  topic_label text not null check (char_length(trim(topic_label)) between 1 and 120),
  scheduled_date date not null,
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  type public.task_type not null default 'study',
  status public.task_status not null default 'pending',
  position integer not null default 0 check (position >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Una tarea completada siempre tiene fecha de finalización, y al revés.
  constraint study_tasks_completed_consistency check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

comment on table public.study_tasks is 'Sesiones concretas del plan: qué estudiar, qué día y cuánto.';

create index if not exists study_tasks_user_date_idx
  on public.study_tasks (user_id, scheduled_date, position);

create index if not exists study_tasks_version_date_idx
  on public.study_tasks (plan_version_id, scheduled_date, position);

create index if not exists study_tasks_exam_status_idx
  on public.study_tasks (exam_id, status);

drop trigger if exists study_tasks_set_updated_at on public.study_tasks;
create trigger study_tasks_set_updated_at
  before update on public.study_tasks
  for each row execute function public.set_updated_at();

alter table public.study_tasks enable row level security;

drop policy if exists "study_tasks_select_own" on public.study_tasks;
create policy "study_tasks_select_own" on public.study_tasks
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "study_tasks_insert_own" on public.study_tasks;
create policy "study_tasks_insert_own" on public.study_tasks
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.study_plan_versions v
      where v.id = plan_version_id and v.user_id = (select auth.uid())
    )
  );

drop policy if exists "study_tasks_update_own" on public.study_tasks;
create policy "study_tasks_update_own" on public.study_tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "study_tasks_delete_own" on public.study_tasks;
create policy "study_tasks_delete_own" on public.study_tasks
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 0003_ai.sql
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Planora · Migración 0003 — Generaciones de IA
--
-- Registro de cada llamada al proveedor de IA. Sirve para tres cosas:
--   1. Aplicar los límites mensuales por plan (Free / Pro).
--   2. Controlar el coste: la IA se paga por token.
--   3. Diagnosticar errores sin guardar el contenido de los prompts.
--
-- No se guarda ni el prompt ni la respuesta: sólo metadatos.
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.ai_generation_type as enum ('plan', 'replan');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_generation_status as enum (
    'success',            -- la IA devolvió un plan válido
    'invalid_response',   -- respondió, pero no cumplía el esquema
    'provider_error'      -- error de red, cuota del proveedor, etc.
  );
exception when duplicate_object then null; end $$;

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Si se borra el examen el registro de consumo se conserva.
  exam_id uuid references public.exams (id) on delete set null,
  type public.ai_generation_type not null,
  status public.ai_generation_status not null,
  provider text not null check (char_length(provider) between 1 and 30),
  model text check (model is null or char_length(model) <= 60),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  cached_input_tokens integer check (cached_input_tokens is null or cached_input_tokens >= 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  -- Código corto del error, nunca el mensaje completo del proveedor.
  error_code text check (error_code is null or char_length(error_code) <= 60),
  created_at timestamptz not null default now()
);

comment on table public.ai_generations is
  'Consumo de IA por usuario. Sin prompts ni respuestas: sólo metadatos.';

-- Índice pensado para la consulta que más se repite: cuántas generaciones
-- con éxito lleva este usuario este mes.
create index if not exists ai_generations_user_created_idx
  on public.ai_generations (user_id, created_at desc);

create index if not exists ai_generations_status_created_idx
  on public.ai_generations (status, created_at desc);

alter table public.ai_generations enable row level security;

drop policy if exists "ai_generations_select_own" on public.ai_generations;
create policy "ai_generations_select_own" on public.ai_generations
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "ai_generations_insert_own" on public.ai_generations;
create policy "ai_generations_insert_own" on public.ai_generations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- El consumo es un registro de auditoría: nadie lo edita ni lo borra.
-- Sin políticas de update ni delete, ni siquiera para el propio usuario.

-- ---------------------------------------------------------------------------
-- 0004_habits_sessions.sql
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Planora · Migración 0004 — Hábitos y sesiones de estudio
--
-- Dos cosas distintas que se apoyan en el plan sin competir con él:
--   · hábitos: lo pequeño y constante (leer 20 páginas, repasar vocabulario)
--   · sesiones: el tiempo REAL estudiado, medido por el modo Focus
--
-- Igual que el resto: RLS en todas las tablas y aislamiento por usuario.
-- ---------------------------------------------------------------------------

-- --- Tipos -----------------------------------------------------------------

do $$ begin
  create type public.habit_frequency as enum ('daily', 'weekdays', 'custom');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.session_status as enum ('completed', 'abandoned');
exception when duplicate_object then null; end $$;

-- --- habits ----------------------------------------------------------------

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  -- Un emoji corto para reconocerlo de un vistazo.
  icon text check (icon is null or char_length(icon) <= 8),
  frequency public.habit_frequency not null default 'daily',
  -- Días en los que toca, en formato ISO: 1 = lunes … 7 = domingo.
  target_weekdays smallint[] not null default '{1,2,3,4,5,6,7}',
  -- Objetivo opcional y su unidad: 60 "minutos", 20 "páginas"…
  target_value integer check (target_value is null or target_value between 1 and 10000),
  target_unit text check (target_unit is null or char_length(target_unit) <= 20),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- cardinality() y no array_length(): con un array vacío array_length
  -- devuelve NULL y un CHECK que da NULL se considera cumplido.
  constraint habits_weekdays_not_empty check (
    cardinality(target_weekdays) between 1 and 7
  ),
  constraint habits_weekdays_valid check (
    target_weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  -- Si hay objetivo, hay unidad. Un "20" suelto no dice nada.
  constraint habits_target_consistency check (
    (target_value is null and target_unit is null)
    or (target_value is not null and target_unit is not null)
  )
);

comment on table public.habits is 'Hábitos de estudio del usuario.';

create index if not exists habits_user_active_idx
  on public.habits (user_id, archived_at);

create unique index if not exists habits_user_name_unique
  on public.habits (user_id, lower(trim(name)))
  where archived_at is null;

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.set_updated_at();

alter table public.habits enable row level security;

drop policy if exists "habits_select_own" on public.habits;
create policy "habits_select_own" on public.habits
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "habits_insert_own" on public.habits;
create policy "habits_insert_own" on public.habits
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "habits_update_own" on public.habits;
create policy "habits_update_own" on public.habits
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "habits_delete_own" on public.habits;
create policy "habits_delete_own" on public.habits
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- --- habit_completions -----------------------------------------------------

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  completed_on date not null,
  -- Cuánto se hizo, si el hábito tiene objetivo.
  value integer check (value is null or value between 0 and 100000),
  created_at timestamptz not null default now()
);

comment on table public.habit_completions is
  'Un hábito marcado un día concreto. Como mucho una vez por día.';

-- Un hábito se marca una sola vez al día: la racha no se infla repitiendo.
create unique index if not exists habit_completions_unique
  on public.habit_completions (habit_id, completed_on);

create index if not exists habit_completions_user_date_idx
  on public.habit_completions (user_id, completed_on desc);

alter table public.habit_completions enable row level security;

drop policy if exists "habit_completions_select_own" on public.habit_completions;
create policy "habit_completions_select_own" on public.habit_completions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "habit_completions_insert_own" on public.habit_completions;
create policy "habit_completions_insert_own" on public.habit_completions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.habits h
      where h.id = habit_id and h.user_id = (select auth.uid())
    )
  );

drop policy if exists "habit_completions_update_own" on public.habit_completions;
create policy "habit_completions_update_own" on public.habit_completions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "habit_completions_delete_own" on public.habit_completions;
create policy "habit_completions_delete_own" on public.habit_completions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- --- study_sessions --------------------------------------------------------

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- La sesión sobrevive aunque se replanifique y la tarea desaparezca.
  task_id uuid references public.study_tasks (id) on delete set null,
  exam_id uuid references public.exams (id) on delete set null,
  -- Qué se pretendía: los minutos que eligió el usuario en el temporizador.
  planned_minutes integer not null check (planned_minutes between 1 and 480),
  -- Lo que de verdad estuvo estudiando, SIN contar las pausas.
  actual_seconds integer not null check (actual_seconds between 0 and 86400),
  status public.session_status not null default 'completed',
  -- Etiqueta de lo que se estudió, para que el histórico siga leyéndose
  -- aunque la tarea o el examen se borren.
  label text check (label is null or char_length(label) <= 120),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint study_sessions_time_order check (ended_at >= started_at)
);

comment on table public.study_sessions is
  'Tiempo real estudiado en el modo Focus. Las pausas no cuentan.';

create index if not exists study_sessions_user_started_idx
  on public.study_sessions (user_id, started_at desc);

create index if not exists study_sessions_task_idx on public.study_sessions (task_id);
create index if not exists study_sessions_exam_idx on public.study_sessions (exam_id);

alter table public.study_sessions enable row level security;

drop policy if exists "study_sessions_select_own" on public.study_sessions;
create policy "study_sessions_select_own" on public.study_sessions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "study_sessions_insert_own" on public.study_sessions;
create policy "study_sessions_insert_own" on public.study_sessions
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- Una sesión ya terminada es un hecho: no se edita. Sí se puede borrar, por
-- si alguien deja el cronómetro corriendo sin querer.
drop policy if exists "study_sessions_delete_own" on public.study_sessions;
create policy "study_sessions_delete_own" on public.study_sessions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 0005_subscriptions.sql
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Planora · Migración 0005 — Suscripciones
--
-- La regla que manda aquí: la fuente de verdad del acceso Pro es Stripe, y
-- llega por webhook. Visitar /success NO da acceso. Por eso el usuario puede
-- LEER su suscripción pero no escribirla: sólo el webhook, que usa la clave de
-- servicio, puede tocar esta tabla.
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.subscription_status as enum (
    'free',        -- nunca ha pagado, o ya terminó su periodo
    'trialing',    -- prueba gratuita en curso
    'active',      -- al día
    'past_due',    -- pago fallido, aún en periodo de gracia
    'canceled',    -- cancelada (puede seguir teniendo acceso hasta el final)
    'incomplete'   -- checkout empezado y no terminado
  );
exception when duplicate_object then null; end $$;

create table if not exists public.subscriptions (
  -- Una suscripción por usuario: la clave primaria es el propio usuario.
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status public.subscription_status not null default 'free',
  /** Price id de Stripe, para saber si es mensual o anual. */
  price_id text,
  /** Hasta cuándo está pagado. Es lo que decide el acceso tras cancelar. */
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is
  'Estado de la suscripción. Sólo lo escribe el webhook de Stripe.';

create index if not exists subscriptions_customer_idx
  on public.subscriptions (stripe_customer_id);

create index if not exists subscriptions_status_idx
  on public.subscriptions (status);

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- El usuario ve su suscripción para que la interfaz pueda mostrarla...
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- ...pero NO puede crearla, modificarla ni borrarla. Sin políticas de insert,
-- update ni delete, nadie se puede regalar Pro desde el navegador.

-- --- stripe_events ---------------------------------------------------------
-- Stripe reenvía eventos cuando no recibe respuesta. Guardar los ya procesados
-- evita aplicar dos veces el mismo cambio.

create table if not exists public.stripe_events (
  /** Id del evento en Stripe (evt_...). */
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_events is
  'Eventos de Stripe ya procesados, para no repetirlos si llegan dos veces.';

create index if not exists stripe_events_processed_idx
  on public.stripe_events (processed_at desc);

alter table public.stripe_events enable row level security;

-- Sin ninguna política: esta tabla es exclusivamente del webhook, que usa la
-- clave de servicio. Ningún usuario autenticado puede leerla ni escribirla.

