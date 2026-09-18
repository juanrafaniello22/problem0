import 'server-only';

import type { PlanId } from '@/config/pricing';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { countGenerationsThisMonth } from '@/services/ai/usage.service';
import { countActiveHabits } from '@/services/habits/habit.service';
import type { SubscriptionRow } from '@/types/database';
import { summarizeSubscription, type SubscriptionSummary } from './access';
import type { UserUsage } from './entitlements';

/**
 * Plan del usuario y su consumo actual.
 *
 * Hasta la fase 5 (Stripe) todo el mundo está en `free`. Cuando exista la
 * tabla `subscriptions`, sólo hay que cambiar `getUserPlan`: el resto de la
 * aplicación ya pregunta por aquí.
 */

/**
 * Suscripción del usuario, leída con su propia sesión.
 *
 * La tabla no tiene políticas de escritura, así que leerla es seguro: lo que
 * haya ahí lo ha puesto el webhook de Stripe y nadie más.
 */
export async function getSubscriptionRow(userId: string): Promise<SubscriptionRow | null> {
  const supabase = await createClient();
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

/** Estado completo de la suscripción, ya interpretado. */
export async function getSubscriptionSummary(userId: string): Promise<SubscriptionSummary> {
  return summarizeSubscription(await getSubscriptionRow(userId));
}

/**
 * Plan del usuario.
 *
 * La fuente de verdad es la tabla `subscriptions`, que sólo escribe el webhook
 * de Stripe. Ni el cliente ni una visita a /success pueden alterarla.
 */
export async function getUserPlan(userId: string): Promise<PlanId> {
  return (await getSubscriptionSummary(userId)).plan;
}

export async function countActiveExams(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('exams')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    logger.error('No se pudieron contar los exámenes activos', { code: error.code });
    // Ante la duda, no bloqueamos al usuario por un fallo de lectura.
    return 0;
  }

  return count ?? 0;
}

export async function getUserUsage(userId: string): Promise<UserUsage> {
  const [plan, activeExams, aiGenerationsThisMonth, activeHabits] = await Promise.all([
    getUserPlan(userId),
    countActiveExams(userId),
    countGenerationsThisMonth(userId),
    countActiveHabits(userId),
  ]);

  return { plan, activeExams, aiGenerationsThisMonth, activeHabits };
}
