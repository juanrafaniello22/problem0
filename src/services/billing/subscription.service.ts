import 'server-only';

import type { PlanId } from '@/config/pricing';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { UserUsage } from './entitlements';

/**
 * Plan del usuario y su consumo actual.
 *
 * Hasta la fase 5 (Stripe) todo el mundo está en `free`. Cuando exista la
 * tabla `subscriptions`, sólo hay que cambiar `getUserPlan`: el resto de la
 * aplicación ya pregunta por aquí.
 */

export async function getUserPlan(_userId: string): Promise<PlanId> {
  // La fuente de verdad del acceso Pro será el webhook de Stripe, nunca el
  // cliente ni una visita a /success.
  return 'free';
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
  const [plan, activeExams] = await Promise.all([getUserPlan(userId), countActiveExams(userId)]);

  return {
    plan,
    activeExams,
    // Se rellenarán en las fases 3 y 4, cuando existan sus tablas.
    aiGenerationsThisMonth: 0,
    activeHabits: 0,
  };
}
