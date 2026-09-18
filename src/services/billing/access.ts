import type { PlanId } from '@/config/pricing';
import type { SubscriptionRow, SubscriptionStatus } from '@/types/database';

/**
 * Quién tiene acceso Pro.
 *
 * Es la decisión más delicada del cobro, así que va aparte y como función
 * pura: se puede probar sin Stripe y sin base de datos.
 *
 * Las reglas, en lenguaje llano:
 *
 * - Si estás al día o en prueba, tienes Pro.
 * - Si cancelas, conservas Pro hasta el final del periodo que ya pagaste.
 *   Cancelar no es que te quiten el mes que has pagado.
 * - Si te falla el pago, hay un periodo de gracia hasta el fin del ciclo:
 *   una tarjeta caducada no debería dejarte sin plan de estudio a mitad de
 *   semana. Pasado eso, vuelves a Free.
 * - Ante la duda, Free. Nunca se regala Pro por un dato ambiguo.
 */

/** Estados en los que la suscripción está viva sin condiciones. */
const ACTIVE_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];

/** Estados que conservan el acceso sólo hasta el fin del periodo pagado. */
const GRACE_STATUSES: SubscriptionStatus[] = ['canceled', 'past_due'];

export interface AccessInput {
  status: SubscriptionStatus;
  /** Fin del periodo pagado, en ISO. */
  currentPeriodEnd: string | null;
}

export function resolvePlan(
  subscription: AccessInput | null,
  now: Date = new Date(),
): PlanId {
  if (!subscription) return 'free';

  if (ACTIVE_STATUSES.includes(subscription.status)) return 'pro';

  if (GRACE_STATUSES.includes(subscription.status)) {
    // Sin fecha de fin no podemos afirmar que siga pagado: Free.
    if (!subscription.currentPeriodEnd) return 'free';

    const endsAt = new Date(subscription.currentPeriodEnd);
    if (Number.isNaN(endsAt.getTime())) return 'free';

    return endsAt.getTime() > now.getTime() ? 'pro' : 'free';
  }

  return 'free';
}

export interface SubscriptionSummary {
  plan: PlanId;
  status: SubscriptionStatus;
  /** ¿Se ha pedido la cancelación al final del periodo? */
  cancelAtPeriodEnd: boolean;
  /** Fin del periodo pagado, si se conoce. */
  currentPeriodEnd: string | null;
  /** Conserva Pro pero la suscripción ya no está sana. */
  inGracePeriod: boolean;
  /** Hay un problema de cobro que el usuario debería resolver. */
  needsAttention: boolean;
}

export function summarizeSubscription(
  subscription: SubscriptionRow | null,
  now: Date = new Date(),
): SubscriptionSummary {
  const status = subscription?.status ?? 'free';
  const currentPeriodEnd = subscription?.current_period_end ?? null;

  const plan = resolvePlan(
    subscription ? { status, currentPeriodEnd } : null,
    now,
  );

  return {
    plan,
    status,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    currentPeriodEnd,
    inGracePeriod: plan === 'pro' && GRACE_STATUSES.includes(status),
    needsAttention: status === 'past_due',
  };
}

/** Texto que explica el estado de la suscripción al usuario. */
export function subscriptionMessage(summary: SubscriptionSummary): string | null {
  if (summary.status === 'past_due') {
    return 'Tu último pago no ha salido bien. Actualiza tu método de pago para no perder Pro.';
  }

  if (summary.status === 'canceled' && summary.plan === 'pro') {
    return 'Has cancelado tu suscripción. Mantienes Pro hasta el final del periodo que ya has pagado.';
  }

  if (summary.cancelAtPeriodEnd && summary.plan === 'pro') {
    return 'Tu suscripción no se renovará. Mantienes Pro hasta el final del periodo actual.';
  }

  return null;
}
