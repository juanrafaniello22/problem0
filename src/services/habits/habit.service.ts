import 'server-only';

import { addDays, type IsoDate } from '@/lib/date';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { HabitCompletionRow, HabitRow } from '@/types/database';
import type { HabitFormInput } from '@/validation/habit';
import { computeStreak, computeWeekProgress, weekdaysForFrequency } from './streak';
import type { StreakResult, WeekProgress } from './streak';

/** Hábitos, sus marcas y las rachas que salen de ellas. */

export interface HabitWithProgress {
  habit: HabitRow;
  streak: StreakResult;
  week: WeekProgress;
}

/** Cuánto histórico se lee para calcular rachas. */
const HISTORY_DAYS = 400;

export async function listHabits(
  userId: string,
  options: { includeArchived?: boolean } = {},
): Promise<HabitRow[]> {
  const supabase = await createClient();
  let query = supabase.from('habits').select('*').eq('user_id', userId);

  if (!options.includeArchived) query = query.is('archived_at', null);

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    logger.error('No se pudieron leer los hábitos', { code: error.code });
    throw new AppError('unknown', 'No hemos podido cargar tus hábitos.');
  }

  return data ?? [];
}

export async function countActiveHabits(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from('habits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('archived_at', null);

  if (error) {
    logger.error('No se pudieron contar los hábitos', { code: error.code });
    return 0;
  }

  return count ?? 0;
}

/** Marcas de los últimos meses, que es lo que necesitan las rachas. */
export async function listCompletions(
  userId: string,
  today: IsoDate,
): Promise<HabitCompletionRow[]> {
  const supabase = await createClient();
  const since = addDays(today, -HISTORY_DAYS);

  const { data, error } = await supabase
    .from('habit_completions')
    .select('*')
    .eq('user_id', userId)
    .gte('completed_on', since)
    .order('completed_on', { ascending: false });

  if (error) {
    logger.error('No se pudieron leer las marcas de hábitos', { code: error.code });
    return [];
  }

  return data ?? [];
}

/** Hábitos con su racha y su semana ya calculadas. */
export async function listHabitsWithProgress(
  userId: string,
  today: IsoDate,
): Promise<HabitWithProgress[]> {
  const [habits, completions] = await Promise.all([
    listHabits(userId),
    listCompletions(userId, today),
  ]);

  const byHabit = new Map<string, IsoDate[]>();
  for (const completion of completions) {
    const list = byHabit.get(completion.habit_id) ?? [];
    list.push(completion.completed_on);
    byHabit.set(completion.habit_id, list);
  }

  return habits.map((habit) => {
    const dates = byHabit.get(habit.id) ?? [];
    return {
      habit,
      streak: computeStreak(dates, habit.target_weekdays, today),
      week: computeWeekProgress(dates, habit.target_weekdays, today),
    };
  });
}

/** Sólo los hábitos que tocan hoy, para el panel. */
export async function listTodayHabits(
  userId: string,
  today: IsoDate,
): Promise<HabitWithProgress[]> {
  const all = await listHabitsWithProgress(userId, today);
  return all.filter((entry) => entry.streak.dueToday);
}

export async function createHabit(userId: string, input: HabitFormInput): Promise<HabitRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      name: input.name,
      icon: input.icon || null,
      frequency: input.frequency,
      target_weekdays: weekdaysForFrequency(input.frequency, input.customWeekdays),
      target_value: input.targetValue,
      target_unit: input.targetUnit,
    })
    .select('*')
    .single();

  if (error || !data) {
    logger.error('No se pudo crear el hábito', { code: error?.code });
    if (error?.code === '23505') {
      throw new AppError('conflict', 'Ya tienes un hábito con ese nombre.');
    }
    throw new AppError('unknown', 'No hemos podido crear el hábito.');
  }

  return data;
}

export async function updateHabit(
  userId: string,
  habitId: string,
  input: HabitFormInput,
): Promise<HabitRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('habits')
    .update({
      name: input.name,
      icon: input.icon || null,
      frequency: input.frequency,
      target_weekdays: weekdaysForFrequency(input.frequency, input.customWeekdays),
      target_value: input.targetValue,
      target_unit: input.targetUnit,
    })
    .eq('id', habitId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    logger.error('No se pudo actualizar el hábito', { code: error?.code });
    if (error?.code === '23505') {
      throw new AppError('conflict', 'Ya tienes un hábito con ese nombre.');
    }
    throw new AppError('unknown', 'No hemos podido guardar los cambios.');
  }

  return data;
}

/**
 * Archiva en lugar de borrar: el histórico de rachas no se pierde y el
 * hábito puede recuperarse.
 */
export async function archiveHabit(userId: string, habitId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('habits')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', habitId)
    .eq('user_id', userId);

  if (error) {
    logger.error('No se pudo archivar el hábito', { code: error.code });
    throw new AppError('unknown', 'No hemos podido archivar el hábito.');
  }
}

export async function deleteHabit(userId: string, habitId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('habits').delete().eq('id', habitId).eq('user_id', userId);

  if (error) {
    logger.error('No se pudo borrar el hábito', { code: error.code });
    throw new AppError('unknown', 'No hemos podido borrar el hábito.');
  }
}

/**
 * Marca o desmarca un hábito un día concreto.
 *
 * El índice único de la tabla garantiza que no haya dos marcas el mismo día,
 * así que la racha no se puede inflar repitiendo la acción.
 */
export async function setHabitCompletion(
  userId: string,
  habitId: string,
  date: IsoDate,
  completed: boolean,
  value: number | null,
): Promise<void> {
  const supabase = await createClient();

  if (!completed) {
    const { error } = await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('completed_on', date)
      .eq('user_id', userId);

    if (error) {
      logger.error('No se pudo desmarcar el hábito', { code: error.code });
      throw new AppError('unknown', 'No hemos podido actualizar el hábito.');
    }
    return;
  }

  const { error } = await supabase
    .from('habit_completions')
    .upsert(
      { user_id: userId, habit_id: habitId, completed_on: date, value },
      { onConflict: 'habit_id,completed_on' },
    );

  if (error) {
    logger.error('No se pudo marcar el hábito', { code: error.code });
    throw new AppError('unknown', 'No hemos podido actualizar el hábito.');
  }
}
