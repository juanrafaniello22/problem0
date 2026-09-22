import 'server-only';

import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { FeedbackInput } from '@/validation/feedback';

/**
 * Guarda el feedback del usuario.
 *
 * Se escribe con el cliente normal (no el de servicio), así que la política
 * RLS `feedback_insert_own` obliga a que la fila sea suya: nadie puede
 * escribir feedback en nombre de otro.
 */
export async function saveFeedback(userId: string, input: FeedbackInput): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('feedback').insert({
    user_id: userId,
    type: input.type,
    // El `rating` sólo viaja cuando el usuario está valorando la app.
    rating: input.type === 'valoracion' ? input.rating : null,
    message: input.message,
  });

  if (error) {
    // El mensaje del usuario puede contener cualquier cosa: al log sólo el código.
    logger.error('No se pudo guardar el feedback', { code: error.code });
    throw new AppError(
      'unknown',
      'No hemos podido enviar tu mensaje. Inténtalo de nuevo en un momento.',
    );
  }
}
