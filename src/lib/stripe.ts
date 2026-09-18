import 'server-only';

import Stripe from 'stripe';
import { requireServerEnv, serverEnv } from '@/config/env.server';

/**
 * Cliente de Stripe.
 *
 * `server-only` garantiza en tiempo de compilación que la clave secreta no
 * puede acabar en un bundle de navegador.
 */

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;

  cached = new Stripe(requireServerEnv('STRIPE_SECRET_KEY'), {
    // Reintentos ante fallos de red; los errores de negocio no se reintentan.
    maxNetworkRetries: 2,
    appInfo: { name: 'Planora' },
  });

  return cached;
}

/** ¿Está Stripe configurado? Sin él, Planora funciona en modo gratuito. */
export function isStripeConfigured(): boolean {
  try {
    const env = serverEnv();
    return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_MONTHLY && env.STRIPE_PRICE_YEARLY);
  } catch {
    return false;
  }
}

/** Price id de Stripe para un intervalo. */
export function stripePriceId(interval: 'month' | 'year'): string {
  return requireServerEnv(interval === 'month' ? 'STRIPE_PRICE_MONTHLY' : 'STRIPE_PRICE_YEARLY');
}

/** Sólo para tests: olvida el cliente cacheado. */
export function resetStripeClient(): void {
  cached = null;
}
