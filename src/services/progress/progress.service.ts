import 'server-only';

import { addDays, startOfWeek, type IsoDate } from '@/lib/date';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { StudyTaskRow } from '@/types/database';
import { computeProgress, type ProgressSummary } from './progress';

/**
 * Lectura de progreso.
 *
 * Siempre sobre los planes vigentes: tras una replanificación las tareas de
 * versiones antiguas dejan de contar, aunque se conserven como histórico.
 */

async function currentVersionIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('study_plans')
    .select('current_version_id')
    .eq('user_id', userId)
    .not('current_version_id', 'is', null);

  return (data ?? [])
    .map((plan) => plan.current_version_id)
    .filter((id): id is string => Boolean(id));
}

/** Todas las tareas de los planes vigentes del usuario. */
export async function listCurrentTasks(userId: string): Promise<StudyTaskRow[]> {
  const versionIds = await currentVersionIds(userId);
  if (versionIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_tasks')
    .select('*')
    .eq('user_id', userId)
    .in('plan_version_id', versionIds)
    .order('scheduled_date', { ascending: true })
    .order('position', { ascending: true });

  if (error) {
    logger.error('No se pudieron leer las tareas', { code: error.code });
    return [];
  }

  return data ?? [];
}

export interface WeekStats {
  /** Minutos de sesiones completadas esta semana. */
  completedMinutes: number;
  completedTasks: number;
  /** Minutos completados por día, de lunes a domingo. */
  byDay: { date: IsoDate; minutes: number }[];
}

export async function getWeekStats(userId: string, today: IsoDate): Promise<WeekStats> {
  const monday = startOfWeek(today);
  const sunday = addDays(monday, 6);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_tasks')
    .select('scheduled_date, duration_minutes, type')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .neq('type', 'break')
    .gte('scheduled_date', monday)
    .lte('scheduled_date', sunday);

  if (error) {
    logger.error('No se pudieron leer las estadísticas de la semana', { code: error.code });
  }

  const rows = data ?? [];
  const minutesByDate = new Map<string, number>();

  for (const row of rows) {
    minutesByDate.set(
      row.scheduled_date,
      (minutesByDate.get(row.scheduled_date) ?? 0) + row.duration_minutes,
    );
  }

  const byDay = Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(monday, offset);
    return { date, minutes: minutesByDate.get(date) ?? 0 };
  });

  return {
    completedMinutes: rows.reduce((sum, row) => sum + row.duration_minutes, 0),
    completedTasks: rows.length,
    byDay,
  };
}

export interface OverallProgress extends ProgressSummary {
  weekMinutes: number;
}

export async function getOverallProgress(
  userId: string,
  today: IsoDate,
): Promise<OverallProgress> {
  const [tasks, week] = await Promise.all([listCurrentTasks(userId), getWeekStats(userId, today)]);
  return { ...computeProgress(tasks, today), weekMinutes: week.completedMinutes };
}
