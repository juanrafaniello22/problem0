import 'server-only';

import { logger } from '@/lib/logger';
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
