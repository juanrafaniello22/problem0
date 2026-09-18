import { describe, expect, it } from 'vitest';
import {
  resolvePlan,
  subscriptionMessage,
  summarizeSubscription,
  type AccessInput,
} from '@/services/billing/access';
import type { SubscriptionRow, SubscriptionStatus } from '@/types/database';

/**
 * Quién tiene Pro y quién no. Si esto falla, o se regala el producto o se le
 * quita a alguien que ha pagado, así que se prueba caso por caso.
 */

const AHORA = new Date('2026-09-18T12:00:00.000Z');
const FUTURO = '2026-10-18T12:00:00.000Z';
const PASADO = '2026-08-18T12:00:00.000Z';

const sub = (status: SubscriptionStatus, currentPeriodEnd: string | null = FUTURO): AccessInput => ({
  status,
  currentPeriodEnd,
});

describe('resolvePlan · sin suscripción', () => {
  it('sin suscripción es Free', () => {
    expect(resolvePlan(null, AHORA)).toBe('free');
  });

  it('el estado free es Free', () => {
    expect(resolvePlan(sub('free'), AHORA)).toBe('free');
  });
});

describe('resolvePlan · suscripción sana', () => {
  it('activa da Pro', () => {
    expect(resolvePlan(sub('active'), AHORA)).toBe('pro');
  });

  it('en prueba da Pro', () => {
    expect(resolvePlan(sub('trialing'), AHORA)).toBe('pro');
  });

  it('activa da Pro aunque no se conozca el fin del periodo', () => {
    expect(resolvePlan(sub('active', null), AHORA)).toBe('pro');
  });
});

describe('resolvePlan · cancelada', () => {
  it('mantiene Pro hasta el final del periodo pagado', () => {
    expect(resolvePlan(sub('canceled', FUTURO), AHORA)).toBe('pro');
  });

  it('pasa a Free cuando el periodo ha terminado', () => {
    expect(resolvePlan(sub('canceled', PASADO), AHORA)).toBe('free');
  });

  it('justo en el instante del vencimiento ya es Free', () => {
    expect(resolvePlan(sub('canceled', AHORA.toISOString()), AHORA)).toBe('free');
  });

  it('sin fecha de fin no se regala Pro', () => {
    expect(resolvePlan(sub('canceled', null), AHORA)).toBe('free');
  });
});

describe('resolvePlan · pago fallido', () => {
  it('da margen hasta el final del periodo', () => {
    // Una tarjeta caducada no debe dejarte sin plan a mitad de semana.
    expect(resolvePlan(sub('past_due', FUTURO), AHORA)).toBe('pro');
  });

  it('pasado el periodo, vuelve a Free', () => {
    expect(resolvePlan(sub('past_due', PASADO), AHORA)).toBe('free');
  });
});

describe('resolvePlan · casos ambiguos', () => {
  it('un checkout sin terminar no da acceso', () => {
    expect(resolvePlan(sub('incomplete', FUTURO), AHORA)).toBe('free');
  });

  it('una fecha corrupta no da acceso', () => {
    expect(resolvePlan(sub('canceled', 'no-es-una-fecha'), AHORA)).toBe('free');
  });

  it('ante cualquier duda, Free', () => {
    const estadosSinAcceso: SubscriptionStatus[] = ['free', 'incomplete'];
    for (const estado of estadosSinAcceso) {
      expect(resolvePlan(sub(estado, FUTURO), AHORA), estado).toBe('free');
    }
  });
});

const row = (overrides: Partial<SubscriptionRow>): SubscriptionRow => ({
  user_id: 'u1',
  stripe_customer_id: 'cus_1',
  stripe_subscription_id: 'sub_1',
  status: 'active',
  price_id: 'price_1',
  current_period_end: FUTURO,
  cancel_at_period_end: false,
  created_at: '',
  updated_at: '',
  ...overrides,
});

describe('summarizeSubscription', () => {
  it('sin fila, es Free y no hay nada que atender', () => {
    const summary = summarizeSubscription(null, AHORA);
    expect(summary.plan).toBe('free');
    expect(summary.status).toBe('free');
    expect(summary.needsAttention).toBe(false);
    expect(summary.inGracePeriod).toBe(false);
  });

  it('una suscripción activa no está en periodo de gracia', () => {
    const summary = summarizeSubscription(row({}), AHORA);
    expect(summary.plan).toBe('pro');
    expect(summary.inGracePeriod).toBe(false);
  });

  it('cancelada con periodo vivo cuenta como periodo de gracia', () => {
    const summary = summarizeSubscription(row({ status: 'canceled' }), AHORA);
    expect(summary.plan).toBe('pro');
    expect(summary.inGracePeriod).toBe(true);
  });

  it('un pago fallido se marca para que el usuario lo resuelva', () => {
    const summary = summarizeSubscription(row({ status: 'past_due' }), AHORA);
    expect(summary.needsAttention).toBe(true);
    expect(summary.plan).toBe('pro');
  });

  it('propaga si la renovación está desactivada', () => {
    const summary = summarizeSubscription(row({ cancel_at_period_end: true }), AHORA);
    expect(summary.cancelAtPeriodEnd).toBe(true);
    expect(summary.plan).toBe('pro');
  });
});

describe('subscriptionMessage', () => {
  it('avisa del pago fallido', () => {
    const message = subscriptionMessage(summarizeSubscription(row({ status: 'past_due' }), AHORA));
    expect(message).toContain('pago');
  });

  it('explica que tras cancelar se mantiene el acceso', () => {
    const message = subscriptionMessage(summarizeSubscription(row({ status: 'canceled' }), AHORA));
    expect(message).toContain('hasta el final del periodo');
  });

  it('avisa de que no se renovará', () => {
    const message = subscriptionMessage(
      summarizeSubscription(row({ cancel_at_period_end: true }), AHORA),
    );
    expect(message).toContain('no se renovará');
  });

  it('no dice nada cuando todo está en orden', () => {
    expect(subscriptionMessage(summarizeSubscription(row({}), AHORA))).toBeNull();
    expect(subscriptionMessage(summarizeSubscription(null, AHORA))).toBeNull();
  });
});
