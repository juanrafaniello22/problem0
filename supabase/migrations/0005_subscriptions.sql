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
