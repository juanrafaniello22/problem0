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
