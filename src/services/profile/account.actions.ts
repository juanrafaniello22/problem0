'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { routes } from '@/config/routes';
import { actionError, type ActionResult } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { isStripeConfigured } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { cancelSubscriptionForUser } from '@/services/billing/stripe.service';

/**
 * Borrado de cuenta.
 *
 * Orden de las operaciones, que importa:
 *
 *   1. Cancelar la suscripción en Stripe. Si se borrase primero la cuenta, se
 *      perdería el identificador y se le seguiría cobrando a alguien que ya no
 *      está. Eso no puede pasar.
 *   2. Borrar el usuario de Supabase Auth. Todo lo suyo cuelga de ahí con
 *      borrado en cascada: perfil, exámenes, planes, hábitos y sesiones.
 *   3. Los eventos de analítica se quedan sin `user_id` (anonimizados) en
 *      lugar de desaparecer, porque no identifican a nadie.
 */

const confirmSchema = z.object({
  /** El usuario escribe su email para confirmar. */
  confirmation: z.string().trim().min(1),
});

export async function deleteAccountAction(input: unknown): Promise<ActionResult<never>> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('Escribe tu email para confirmar.', 'validation');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  // La confirmación se comprueba contra el email real del servidor, no contra
  // nada que haya mandado el cliente.
  if (parsed.data.confirmation.toLowerCase() !== (user.email ?? '').toLowerCase()) {
    return actionError('El email no coincide con el de tu cuenta.', 'validation');
  }

  // 1. Dejar de cobrar, antes que nada.
  if (isStripeConfigured()) {
    await cancelSubscriptionForUser(user.id);
  }

  // 2. Borrar el usuario: el resto cae en cascada.
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      logger.error('No se pudo borrar la cuenta', { message: error.message });
      return actionError(
        'No hemos podido borrar tu cuenta. Escríbenos y lo hacemos nosotros.',
        'unknown',
      );
    }
  } catch (error) {
    logger.error('Fallo borrando la cuenta', {
      message: error instanceof Error ? error.message : 'desconocido',
    });
    return actionError(
      'No hemos podido borrar tu cuenta. Escríbenos y lo hacemos nosotros.',
      'unknown',
    );
  }

  await supabase.auth.signOut();
  redirect(routes.home);
}
