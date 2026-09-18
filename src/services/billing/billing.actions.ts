'use server';

import { z } from 'zod';
import { routes } from '@/config/routes';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { isStripeConfigured } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import { createCheckoutSession, createPortalSession } from '@/services/billing/stripe.service';

/**
 * Acciones de cobro.
 *
 * Devuelven una URL de Stripe y la interfaz redirige. Ninguna de estas
 * acciones concede acceso: eso sólo lo hace el webhook.
 */

const checkoutSchema = z.object({
  interval: z.enum(['month', 'year']),
});

export async function startCheckoutAction(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return actionError('Elige una periodicidad válida.', 'validation');

  if (!isStripeConfigured()) {
    logger.warn('Intento de checkout sin Stripe configurado');
    return actionError(
      'Los pagos todavía no están activos. Vuelve a intentarlo en un rato.',
      'unknown',
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Inicia sesión para pasar a Pro.', 'unauthenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  try {
    const url = await createCheckoutSession({
      userId: user.id,
      email: user.email ?? null,
      name: profile?.full_name ?? null,
      interval: parsed.data.interval,
    });

    await track('checkout_started', user.id, { interval: parsed.data.interval });

    return actionOk({ url });
  } catch (error) {
    logger.error('No se pudo crear la sesión de checkout', {
      message: error instanceof Error ? error.message : 'desconocido',
    });
    return actionError(toUserMessage(error, 'No hemos podido abrir el pago.'), 'unknown');
  }
}

export async function openBillingPortalAction(): Promise<ActionResult<{ url: string }>> {
  if (!isStripeConfigured()) {
    return actionError('La gestión de suscripciones no está disponible ahora mismo.', 'unknown');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  try {
    const url = await createPortalSession(user.id);
    return actionOk({ url });
  } catch (error) {
    return actionError(
      toUserMessage(error, 'No hemos podido abrir la gestión de tu suscripción.'),
      'unknown',
    );
  }
}

/** Registra que alguien ha pulsado un botón de mejora, para medir el embudo. */
export async function trackUpgradeClickAction(source: string): Promise<ActionResult<undefined>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) await track('upgrade_clicked', user.id, { source: source.slice(0, 40) });
  return actionOk();
}

/** Ruta a la que vuelve el usuario tras el checkout. */
export const SUCCESS_PATH = routes.success;
