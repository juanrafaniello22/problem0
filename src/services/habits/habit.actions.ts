'use server';

import { revalidatePath } from 'next/cache';
import { routes } from '@/config/routes';
import { todayIso } from '@/lib/date';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import { canUseFeature } from '@/services/billing/entitlements';
import { getUserUsage } from '@/services/billing/subscription.service';
import {
  archiveHabit,
  createHabit,
  deleteHabit,
  setHabitCompletion,
  updateHabit,
} from '@/services/habits/habit.service';
import { habitCompletionSchema, habitFormSchema } from '@/validation/habit';

/** Acciones de hábitos. La validación del cliente nunca basta: se repite aquí. */

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function createHabitAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const userId = await currentUserId();
  if (!userId) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  const parsed = habitFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('Revisa los datos del hábito.', 'validation', fieldErrorsFrom(parsed.error));
  }

  const usage = await getUserUsage(userId);
  const decision = canUseFeature(usage, 'create_habit');
  if (!decision.allowed) {
    return actionError(decision.message ?? 'Has alcanzado tu límite.', 'limit_reached');
  }

  try {
    const habit = await createHabit(userId, parsed.data);
    await track('habit_created', userId, {
      frequency: habit.frequency,
      has_target: habit.target_value !== null,
    });

    revalidatePath(routes.habits);
    revalidatePath(routes.dashboard);
    return actionOk({ id: habit.id });
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}

export async function updateHabitAction(
  habitId: string,
  input: unknown,
): Promise<ActionResult<undefined>> {
  const userId = await currentUserId();
  if (!userId) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  const parsed = habitFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('Revisa los datos del hábito.', 'validation', fieldErrorsFrom(parsed.error));
  }

  try {
    await updateHabit(userId, habitId, parsed.data);
    revalidatePath(routes.habits);
    revalidatePath(routes.dashboard);
    return actionOk();
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}

export async function toggleHabitAction(input: unknown): Promise<ActionResult<undefined>> {
  const userId = await currentUserId();
  if (!userId) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  const parsed = habitCompletionSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('No hemos podido actualizar el hábito.', 'validation');
  }

  // Marcar el futuro no tiene sentido: la racha se gana día a día.
  const { data: profile } = await (await createClient())
    .from('profiles')
    .select('timezone')
    .eq('id', userId)
    .maybeSingle();

  const today = todayIso(profile?.timezone ?? undefined);
  if (parsed.data.date > today) {
    return actionError('Todavía no puedes marcar un día que no ha llegado.', 'validation');
  }

  try {
    await setHabitCompletion(
      userId,
      parsed.data.habitId,
      parsed.data.date,
      parsed.data.completed,
      parsed.data.value,
    );

    if (parsed.data.completed) {
      await track('habit_completed', userId, { habit_id: parsed.data.habitId });
    }

    revalidatePath(routes.habits);
    revalidatePath(routes.dashboard);
    revalidatePath(routes.progress);
    return actionOk();
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}

export async function archiveHabitAction(habitId: string): Promise<ActionResult<undefined>> {
  const userId = await currentUserId();
  if (!userId) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  try {
    await archiveHabit(userId, habitId);
    revalidatePath(routes.habits);
    revalidatePath(routes.dashboard);
    return actionOk();
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}

export async function deleteHabitAction(habitId: string): Promise<ActionResult<undefined>> {
  const userId = await currentUserId();
  if (!userId) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  try {
    await deleteHabit(userId, habitId);
    revalidatePath(routes.habits);
    revalidatePath(routes.dashboard);
    revalidatePath(routes.progress);
    return actionOk();
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}
