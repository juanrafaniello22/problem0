'use server';

import { redirect } from 'next/navigation';
import { routes } from '@/config/routes';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import { completeOnboarding, skipOnboarding } from '@/services/profile/profile.service';
import { onboardingSchema, normalizeSubjects } from '@/validation/onboarding';

/**
 * Acciones del onboarding.
 * La validación del cliente es sólo comodidad: aquí se vuelve a validar.
 */

export interface OnboardingSuccess {
  nextPath: string;
}

export async function completeOnboardingAction(
  input: unknown,
): Promise<ActionResult<OnboardingSuccess>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('Falta algún dato. Revisa los pasos anteriores.', 'validation');
  }

  try {
    await completeOnboarding(user.id, {
      ...parsed.data,
      subjects: normalizeSubjects(parsed.data.subjects),
    });

    await track('onboarding_completed', user.id, {
      education_level: parsed.data.educationLevel,
      primary_goal: parsed.data.primaryGoal,
      daily_minutes: parsed.data.dailyMinutes,
      subjects_count: parsed.data.subjects.length,
      has_upcoming_exam: parsed.data.hasUpcomingExam,
    });

    return actionOk({
      nextPath: parsed.data.hasUpcomingExam ? routes.examNew : routes.dashboard,
    });
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}

export async function skipOnboardingAction(): Promise<ActionResult<undefined>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  try {
    await skipOnboarding(user.id);
    await track('onboarding_skipped', user.id);
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }

  redirect(routes.dashboard);
}
