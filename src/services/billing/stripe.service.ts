import 'server-only';

import type Stripe from 'stripe';
import { routes } from '@/config/routes';
import { absoluteUrl } from '@/config/site';
import type { BillingInterval } from '@/config/pricing';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getStripe, stripePriceId } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { trackServer } from '@/services/analytics/track';
import type { SubscriptionRow, SubscriptionStatus } from '@/types/database';

/**
 * Operaciones contra Stripe y sincronización del estado de la suscripción.
 *
 * Todo lo que escribe en `subscriptions` pasa por el cliente de servicio: esa
 * tabla no tiene políticas de escritura, así que ni el usuario ni un bug del
 * cliente pueden regalarse Pro.
 */

/** Traduce los estados de Stripe a los nuestros. */
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
      return 'incomplete';
    default:
      // Si Stripe añade un estado nuevo, lo tratamos como sin acceso.
      logger.warn('Estado de suscripción desconocido en Stripe', { status });
      return 'incomplete';
  }
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('No se pudo leer la suscripción', { code: error.code });
    return null;
  }

  return data ?? null;
}

/**
 * Cliente de Stripe del usuario, creándolo si aún no existe.
 *
 * El `user_id` viaja en los metadatos para poder reconciliar cualquier evento
 * futuro aunque se pierda la fila local.
 */
export async function ensureCustomer(params: {
  userId: string;
  email: string | null;
  name: string | null;
}): Promise<string> {
  const existing = await getSubscription(params.userId);
  if (existing?.stripe_customer_id) return existing.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: params.email ?? undefined,
    name: params.name ?? undefined,
    metadata: { user_id: params.userId },
  });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      { user_id: params.userId, stripe_customer_id: customer.id },
      { onConflict: 'user_id' },
    );

  if (error) {
    logger.error('No se pudo guardar el cliente de Stripe', { code: error.code });
    throw new AppError('unknown', 'No hemos podido preparar el pago. Inténtalo de nuevo.');
  }

  return customer.id;
}

export async function createCheckoutSession(params: {
  userId: string;
  email: string | null;
  name: string | null;
  interval: BillingInterval;
}): Promise<string> {
  const stripe = getStripe();
  const customerId = await ensureCustomer(params);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: stripePriceId(params.interval), quantity: 1 }],
    success_url: absoluteUrl(`${routes.success}?session_id={CHECKOUT_SESSION_ID}`),
    cancel_url: absoluteUrl(routes.pricing),
    // Se repiten en la sesión y en la suscripción: así el webhook puede
    // identificar al usuario venga por donde venga el evento.
    metadata: { user_id: params.userId },
    subscription_data: { metadata: { user_id: params.userId } },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    automatic_tax: { enabled: false },
  });

  if (!session.url) {
    throw new AppError('unknown', 'Stripe no ha devuelto un enlace de pago.');
  }

  return session.url;
}

export async function createPortalSession(userId: string): Promise<string> {
  const subscription = await getSubscription(userId);
  if (!subscription?.stripe_customer_id) {
    throw new AppError('not_found', 'Todavía no tienes ninguna suscripción que gestionar.');
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: absoluteUrl(routes.settings),
  });

  return session.url;
}

/**
 * Vuelca en nuestra base de datos el estado de una suscripción de Stripe.
 *
 * Es idempotente a propósito: los webhooks pueden llegar repetidos o
 * desordenados, y aplicar el mismo estado dos veces no debe cambiar nada.
 */
export async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const userId = await resolveUserId(subscription, customerId);
  if (!userId) {
    logger.error('Suscripción de Stripe sin usuario identificable', {
      subscription_id: subscription.id,
    });
    return;
  }

  const item = subscription.items.data[0];
  const periodEnd = item?.current_period_end ?? null;
  const status = mapStripeStatus(subscription.status);

  // El estado anterior se lee antes de escribir: es lo único que permite
  // distinguir un alta nueva de la enésima actualización del mismo evento.
  const previous = await getSubscription(userId);

  const supabase = createAdminClient();
  const { error } = await supabase.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status,
      price_id: item?.price.id ?? null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    logger.error('No se pudo sincronizar la suscripción', { code: error.code });
    throw new AppError('unknown', 'No se pudo sincronizar la suscripción.');
  }

  logger.info('Suscripción sincronizada', {
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
  });

  await trackSubscriptionChange({
    userId,
    previous,
    status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    interval: item?.price.recurring?.interval ?? null,
  });
}

/** Estados que dan acceso Pro sin condiciones. */
const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];

/**
 * Traduce la sincronización a eventos de producto.
 *
 * Los webhooks llegan repetidos y desordenados, así que sólo se registra el
 * cambio real: pasar a tener acceso, o dejar de tenerlo. Nada de datos
 * personales, sólo estado y periodicidad.
 */
async function trackSubscriptionChange(params: {
  userId: string;
  previous: SubscriptionRow | null;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  interval: string | null;
}): Promise<void> {
  const wasActive = params.previous ? ACTIVE_STATUSES.includes(params.previous.status) : false;
  const isActive = ACTIVE_STATUSES.includes(params.status);

  if (!wasActive && isActive) {
    await trackServer('subscription_created', params.userId, {
      status: params.status,
      interval: params.interval,
    });
    return;
  }

  // Cancelar en Stripe no corta el acceso al momento: la suscripción sigue
  // activa hasta el fin del periodo pagado. Ese aviso también es una baja.
  const justScheduledCancel =
    isActive && params.cancelAtPeriodEnd && params.previous?.cancel_at_period_end !== true;

  if ((wasActive && !isActive) || justScheduledCancel) {
    await trackServer('subscription_cancelled', params.userId, {
      status: params.status,
      at_period_end: params.cancelAtPeriodEnd,
    });
  }
}

/** Encuentra al usuario: primero por metadatos, luego por cliente de Stripe. */
async function resolveUserId(
  subscription: Stripe.Subscription,
  customerId: string,
): Promise<string | null> {
  const fromMetadata = subscription.metadata?.user_id;
  if (fromMetadata) return fromMetadata;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  return data?.user_id ?? null;
}

/**
 * Registra un evento de Stripe como procesado.
 * Devuelve `false` si ya lo estaba, para no aplicarlo dos veces.
 */
export async function markEventProcessed(eventId: string, type: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('stripe_events').insert({ id: eventId, type });

  if (!error) return true;

  // 23505 = clave duplicada: el evento ya se había procesado.
  if (error.code === '23505') {
    logger.info('Evento de Stripe repetido, ignorado', { type });
    return false;
  }

  logger.error('No se pudo registrar el evento de Stripe', { code: error.code });
  // Ante la duda se procesa: perder un evento es peor que repetirlo, porque
  // todas las operaciones de sincronización son idempotentes.
  return true;
}

/** Cancela la suscripción al borrar la cuenta, para no seguir cobrando. */
export async function cancelSubscriptionForUser(userId: string): Promise<void> {
  const subscription = await getSubscription(userId);
  if (!subscription?.stripe_subscription_id) return;

  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
  } catch (error) {
    logger.error('No se pudo cancelar la suscripción en Stripe', {
      message: error instanceof Error ? error.message : 'desconocido',
    });
  }
}
