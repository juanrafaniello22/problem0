import 'server-only';

import { addDays, startOfWeek, toIsoDate, type IsoDate } from '@/lib/date';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { SessionStatus, StudySessionRow } from '@/types/database';

/**
 * Sesiones del modo Focus.
 *
 * Lo que se guarda es el tiempo REAL estudiado, sin las pausas. Es la
 * diferencia entre "he tenido el Pomodoro abierto 50 minutos" y "he estudiado
 * 50 minutos", y sólo lo segundo sirve para saber si vas bien.
 */

export interface CreateSessionInput {
  taskId: string | null;
  examId: string | null;
  plannedMinutes: number;
  actualSeconds: number;
  status: SessionStatus;
  label: string | null;
  startedAt: string;
  endedAt: string;
}

export async function createSession(
  userId: string,
  input: CreateSessionInput,
): Promise<StudySessionRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: userId,
      task_id: input.taskId,
      exam_id: input.examId,
      planned_minutes: input.plannedMinutes,
      actual_seconds: input.actualSeconds,
      status: input.status,
      label: input.label,
      started_at: input.startedAt,
      ended_at: input.endedAt,
    })
    .select('*')
    .single();

  if (error || !data) {
    logger.error('No se pudo guardar la sesión', { code: error?.code });
    throw new AppError('unknown', 'No hemos podido guardar tu sesión de estudio.');
  }

  return data;
}

export async function listRecentSessions(
  userId: string,
  limit = 10,
): Promise<StudySessionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('No se pudieron leer las sesiones', { code: error.code });
    return [];
  }

  return data ?? [];
}

export interface FocusStats {
  /** Minutos reales estudiados hoy. */
  todayMinutes: number;
  /** Minutos reales estudiados esta semana. */
  weekMinutes: number;
  /** Minutos reales estudiados en total. */
  totalMinutes: number;
  /** Número de sesiones terminadas. */
  sessionCount: number;
  /** Minutos reales por día de la semana en curso, de lunes a domingo. */
  weekByDay: { date: IsoDate; minutes: number }[];
}

/**
 * Estadísticas de tiempo real estudiado.
 *
 * Se agrupa por el día en que empezó la sesión, en la zona horaria del
 * usuario: una sesión de las 23:50 cuenta para ese día, no para el siguiente.
 */
export async function getFocusStats(
  userId: string,
  today: IsoDate,
  timeZone: string,
): Promise<FocusStats> {
  const supabase = await createClient();
  const monday = startOfWeek(today);

  // Se lee desde el lunes con un día de margen por la zona horaria.
  const since = `${addDays(monday, -1)}T00:00:00.000Z`;

  const [{ data: weekRows, error: weekError }, { data: totals, error: totalsError }] =
    await Promise.all([
      supabase
        .from('study_sessions')
        .select('started_at, actual_seconds')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('started_at', since),
      supabase
        .from('study_sessions')
        .select('actual_seconds')
        .eq('user_id', userId)
        .eq('status', 'completed'),
    ]);

  if (weekError) logger.error('No se pudieron leer las sesiones de la semana', { code: weekError.code });
  if (totalsError) logger.error('No se pudieron leer los totales', { code: totalsError.code });

  const secondsByDate = new Map<IsoDate, number>();
  for (const row of weekRows ?? []) {
    const date = localDate(row.started_at, timeZone);
    secondsByDate.set(date, (secondsByDate.get(date) ?? 0) + row.actual_seconds);
  }

  const weekByDay = Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(monday, offset);
    return { date, minutes: Math.round((secondsByDate.get(date) ?? 0) / 60) };
  });

  const totalSeconds = (totals ?? []).reduce((sum, row) => sum + row.actual_seconds, 0);

  return {
    todayMinutes: Math.round((secondsByDate.get(today) ?? 0) / 60),
    weekMinutes: weekByDay.reduce((sum, day) => sum + day.minutes, 0),
    totalMinutes: Math.round(totalSeconds / 60),
    sessionCount: (totals ?? []).length,
    weekByDay,
  };
}

/** Fecha local del usuario para un instante dado. */
function localDate(timestamp: string, timeZone: string): IsoDate {
  const date = new Date(timestamp);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    // Zona horaria inválida: mejor una fecha UTC que reventar la página.
    return toIsoDate(date);
  }
}

/** Minutos reales estudiados en cada examen, para la página de progreso. */
export async function getMinutesByExam(userId: string): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('study_sessions')
    .select('exam_id, actual_seconds')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .not('exam_id', 'is', null);

  if (error) {
    logger.error('No se pudo agrupar el tiempo por examen', { code: error.code });
    return new Map();
  }

  const byExam = new Map<string, number>();
  for (const row of data ?? []) {
    if (!row.exam_id) continue;
    byExam.set(row.exam_id, (byExam.get(row.exam_id) ?? 0) + row.actual_seconds);
  }

  for (const [examId, seconds] of byExam) {
    byExam.set(examId, Math.round(seconds / 60));
  }

  return byExam;
}
