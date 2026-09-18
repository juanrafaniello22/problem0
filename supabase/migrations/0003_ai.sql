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
