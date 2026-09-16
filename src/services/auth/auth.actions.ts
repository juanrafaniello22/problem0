'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { rateLimits } from '@/config/limits';
import { routes } from '@/config/routes';
import { absoluteUrl } from '@/config/site';
import { actionError, actionOk, type ActionResult } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { checkRateLimit } from '@/lib/rate-limit';
import { safeNextPath } from '@/lib/redirects';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@/validation/auth';

/**
 * Acciones de autenticación.
 *
 * Todo ocurre en servidor: el navegador nunca ve credenciales de servicio y
 * los mensajes de error son genéricos a propósito para no revelar qué emails
 * existen en la base de datos.
 */

const GENERIC_CREDENTIALS_ERROR = 'Email o contraseña incorrectos.';

async function clientKey(scope: string): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || headerList.get('x-real-ip') || 'unknown';
  return `${scope}:${ip}`;
}

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

export interface SignUpResult {
  /** `true` cuando Supabase exige confirmar el email antes de entrar. */
  needsEmailConfirmation: boolean;
}

export async function signUpAction(
  _prevState: ActionResult<SignUpResult> | null,
  formData: FormData,
): Promise<ActionResult<SignUpResult>> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    password: formData.get('password'),
    acceptTerms: formData.get('acceptTerms') === 'on',
  });

  if (!parsed.success) {
    return actionError('Revisa los datos del formulario.', 'validation', fieldErrorsFrom(parsed.error));
  }

  const limit = checkRateLimit(await clientKey('signup'), rateLimits.auth);
  if (!limit.allowed) {
    return actionError(
      `Demasiados intentos. Prueba otra vez en ${limit.retryAfterSeconds} segundos.`,
      'rate_limited',
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: absoluteUrl(`${routes.authCallback}?next=${encodeURIComponent(routes.onboarding)}`),
    },
  });

  if (error) {
    logger.warn('Registro fallido', { code: error.code, status: error.status });
    if (error.code === 'user_already_exists' || error.status === 422) {
      return actionError(
        'Ese email ya tiene cuenta. Inicia sesión o recupera tu contraseña.',
        'conflict',
      );
    }
    if (error.code === 'weak_password') {
      return actionError('Esa contraseña es demasiado débil. Prueba con una más larga.', 'validation');
    }
    return actionError('No hemos podido crear tu cuenta. Inténtalo de nuevo.', 'unknown');
  }

  // Sin sesión devuelta: Supabase está pidiendo confirmación por email.
  if (!data.session) {
    return actionOk({ needsEmailConfirmation: true });
  }

  if (data.user) await track('signup', data.user.id);

  redirect(routes.onboarding);
}

export async function signInAction(
  _prevState: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return actionError('Revisa los datos del formulario.', 'validation', fieldErrorsFrom(parsed.error));
  }

  const limit = checkRateLimit(await clientKey('signin'), rateLimits.auth);
  if (!limit.allowed) {
    return actionError(
      `Demasiados intentos. Prueba otra vez en ${limit.retryAfterSeconds} segundos.`,
      'rate_limited',
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    logger.warn('Inicio de sesión fallido', { code: error.code });
    if (error.code === 'email_not_confirmed') {
      return actionError(
        'Confirma tu email antes de entrar. Revisa tu bandeja de entrada.',
        'forbidden',
      );
    }
    return actionError(GENERIC_CREDENTIALS_ERROR, 'unauthenticated');
  }

  const nextParam = safeNextPath(formData.get('next')?.toString(), '');

  if (data.user) {
    await track('login', data.user.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed_at')
      .eq('id', data.user.id)
      .maybeSingle();

    if (!profile?.onboarding_completed_at) redirect(routes.onboarding);
  }

  redirect(nextParam || routes.dashboard);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(routes.home);
}

export async function requestPasswordResetAction(
  _prevState: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });

  if (!parsed.success) {
    return actionError('Escribe un email válido.', 'validation', fieldErrorsFrom(parsed.error));
  }

  const limit = checkRateLimit(await clientKey('reset'), rateLimits.auth);
  if (!limit.allowed) {
    return actionError(
      `Demasiados intentos. Prueba otra vez en ${limit.retryAfterSeconds} segundos.`,
      'rate_limited',
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: absoluteUrl(
      `${routes.authCallback}?next=${encodeURIComponent(routes.resetPassword)}`,
    ),
  });

  if (error) {
    // No revelamos si el email existe: el mensaje siempre es el mismo.
    logger.warn('Solicitud de recuperación fallida', { code: error.code });
  }

  return actionOk();
}

export async function updatePasswordAction(
  _prevState: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return actionError('Revisa la contraseña.', 'validation', fieldErrorsFrom(parsed.error));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return actionError(
      'El enlace ha caducado. Pide uno nuevo desde «He olvidado mi contraseña».',
      'unauthenticated',
    );
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    logger.warn('Cambio de contraseña fallido', { code: error.code });
    if (error.code === 'same_password') {
      return actionError('Esa es tu contraseña actual. Elige una distinta.', 'validation');
    }
    return actionError('No hemos podido cambiar tu contraseña. Inténtalo de nuevo.', 'unknown');
  }

  redirect(routes.dashboard);
}
