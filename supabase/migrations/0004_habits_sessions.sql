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
