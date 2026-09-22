'use server';

import { rateLimits } from '@/config/limits';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import { saveFeedback } from '@/services/profile/feedback.service';
import { feedbackSchema } from '@/validation/feedback';

/**
 * Envío de feedback desde Ajustes.
 *
 * Es un formulario abierto a cualquiera que tenga cuenta, así que lleva
 * límite de frecuencia: cinco mensajes cada cinco minutos bastan para
 * cualquier persona y frenan el envío automatizado.
 */
export async function sendFeedbackAction(
  _prevState: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  const rawRating = formData.get('rating');
  const parsed = feedbackSchema.safeParse({
    type: formData.get('type'),
    message: formData.get('message'),
    rating: rawRating === null || rawRating === '' ? null : Number(rawRating),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return actionError('Revisa el mensaje antes de enviarlo.', 'validation', fieldErrors);
  }

  const limit = checkRateLimit(`feedback:${user.id}`, rateLimits.feedback);
  if (!limit.allowed) {
    return actionError(
      `Ya nos has escrito varias veces seguidas. Espera ${limit.retryAfterSeconds} segundos.`,
      'rate_limited',
    );
  }

  try {
    await saveFeedback(user.id, parsed.data);
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }

  // El contenido del mensaje no se manda a analítica: sólo el tipo.
  await track('feedback_sent', user.id, {
    type: parsed.data.type,
    rating: parsed.data.type === 'valoracion' ? parsed.data.rating : null,
  });

  return actionOk();
}
