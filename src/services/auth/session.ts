import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { routes } from '@/config/routes';
import { createClient } from '@/lib/supabase/server';
import type { ProfileRow } from '@/types/database';

export interface SessionUser {
  user: User;
  profile: ProfileRow | null;
}

/**
 * Usuario autenticado de la petición actual, o `null`.
 * `cache()` evita repetir la llamada dentro del mismo render.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Usuario + perfil. Devuelve `null` si no hay sesión. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { user, profile: profile ?? null };
});

/**
 * Exige sesión. Si no la hay redirige a login conservando el destino.
 * Toda página o acción privada debe pasar por aquí: nunca confiamos en que
 * el middleware sea la única barrera.
 */
export async function requireUser(nextPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    const target = nextPath ? `${routes.login}?next=${encodeURIComponent(nextPath)}` : routes.login;
    redirect(target);
  }
  return user;
}

/** Exige sesión y perfil creado. Si falta el perfil, algo va mal en el alta. */
export async function requireSessionUser(nextPath?: string): Promise<SessionUser> {
  await requireUser(nextPath);
  const session = await getSessionUser();
  if (!session) redirect(routes.login);
  return session;
}

/** ¿El usuario ha terminado el onboarding? */
export function hasCompletedOnboarding(profile: ProfileRow | null): boolean {
  return Boolean(profile?.onboarding_completed_at);
}
