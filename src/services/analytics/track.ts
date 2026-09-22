import 'server-only';

import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import type { AnalyticsEventName, AnalyticsProperties } from './events';

/**
 * Registra un evento de producto.
 *
 * Nunca debe romper el flujo del usuario: si falla, se registra y se sigue.
 * Guardamos sólo el `user_id` y propiedades no personales.
 */
export async function track(
  name: AnalyticsEventName,
  userId: string,
  properties: AnalyticsProperties = {},
): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('analytics_events')
      .insert({ name, user_id: userId, properties });

    if (error) {
      logger.warn('No se pudo registrar el evento de analítica', { name, code: error.code });
    }
  } catch (error) {
    logger.warn('Analítica no disponible', {
      name,
      message: error instanceof Error ? error.message : 'desconocido',
    });
  }
}

/**
 * Registra un evento cuando no hay sesión de usuario.
 *
 * Lo usan los webhooks: ahí quien llama es Stripe, no el usuario, así que no
 * hay cookie con la que pasar RLS. Se escribe con el cliente de servicio y
 * siempre con un `userId` que ya hemos resuelto nosotros.
 */
export async function trackServer(
  name: AnalyticsEventName,
  userId: string,
  properties: AnalyticsProperties = {},
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('analytics_events')
      .insert({ name, user_id: userId, properties });

    if (error) {
      logger.warn('No se pudo registrar el evento de analítica', { name, code: error.code });
    }
  } catch (error) {
    logger.warn('Analítica no disponible', {
      name,
      message: error instanceof Error ? error.message : 'desconocido',
    });
  }
}

/**
 * Registra un evento sólo la primera vez.
 *
 * Para hitos que ocurren una vez por usuario (entrar al onboarding) pero cuya
 * página se puede recargar. Sin esto, un F5 inflaría la métrica.
 */
export async function trackOnce(
  name: AnalyticsEventName,
  userId: string,
  properties: AnalyticsProperties = {},
): Promise<void> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('analytics_events')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .limit(1)
      .maybeSingle();

    // Si la comprobación falla no se inventa nada: mejor no registrar que
    // duplicar sin saberlo.
    if (error || data) return;
  } catch {
    return;
  }

  await track(name, userId, properties);
}
