import 'server-only';

import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { IsoDate } from '@/lib/date';
import type { ExamRow, StudyTaskRow } from '@/types/database';

/** Tareas del plan: lectura del día y marcado de completadas. */

export interface TaskWithExam extends StudyTaskRow {
  exam: Pick<ExamRow, 'id' | 'title' | 'exam_date'> | null;
}

/**
 * El examen de cada tarea, nombrando la clave ajena de forma explícita.
 *
 * Sin el `!clave`, Supabase adivina la relación. Entre tareas y exámenes hay
 * una directa (`exam_id`) y un camino indirecto por `study_sessions`, que
 * apunta a ambas. Hoy PostgREST no cuenta ese camino, pero si algún día lo
 * hiciera, o si se añade otra tabla que una las dos, la consulta fallaría.
 * Y como el fallo se traduce en una lista vacía, el alumno vería "hoy no
 * tienes nada" sin que nada se rompiera a la vista.
 */
const TASK_WITH_EXAM = '*, exam:exams!study_tasks_exam_id_fkey(id, title, exam_date)';

/**
 * Los tipos de `database.ts` se mantienen a mano y no declaran relaciones,
 * así que Supabase no puede inferir la forma de un select con join. El cast
 * es seguro porque la consulta pide exactamente estos campos y la clave
 * ajena existe en la migración 0002.
 */
function asTasksWithExam(rows: unknown): TaskWithExam[] {
  return (rows ?? []) as TaskWithExam[];
}

/**
 * Tareas de un día concreto, sólo de los planes vigentes.
 *
 * Filtrar por la versión vigente evita que aparezcan tareas de planes
 * antiguos después de una replanificación.
 */
export async function listTasksForDate(userId: string, date: IsoDate): Promise<TaskWithExam[]> {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from('study_plans')
    .select('current_version_id')
    .eq('user_id', userId)
    .not('current_version_id', 'is', null);

  const versionIds = (plans ?? [])
    .map((plan) => plan.current_version_id)
    .filter((id): id is string => Boolean(id));

  if (versionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('study_tasks')
    .select(TASK_WITH_EXAM)
    .eq('user_id', userId)
    .eq('scheduled_date', date)
    .in('plan_version_id', versionIds)
    .order('position', { ascending: true });

  if (error) {
    logger.error('No se pudieron leer las tareas del día', { code: error.code });
    return [];
  }

  return asTasksWithExam(data);
}

/** Tareas pendientes de días anteriores, en los planes vigentes. */
export async function listOverdueTasks(
  userId: string,
  today: IsoDate,
  limit = 20,
): Promise<TaskWithExam[]> {
  const supabase = await createClient();

  const { data: plans } = await supabase
    .from('study_plans')
    .select('current_version_id')
    .eq('user_id', userId)
    .not('current_version_id', 'is', null);

  const versionIds = (plans ?? [])
    .map((plan) => plan.current_version_id)
    .filter((id): id is string => Boolean(id));

  if (versionIds.length === 0) return [];

  const { data, error } = await supabase
    .from('study_tasks')
    .select(TASK_WITH_EXAM)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .neq('type', 'break')
    .lt('scheduled_date', today)
    .in('plan_version_id', versionIds)
    .order('scheduled_date', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error('No se pudieron leer las tareas atrasadas', { code: error.code });
    return [];
  }

  return asTasksWithExam(data);
}

export async function getTask(userId: string, taskId: string): Promise<StudyTaskRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('study_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', userId)
    .maybeSingle();

  return data ?? null;
}

/** Marca o desmarca una tarea. Devuelve la tarea ya actualizada. */
export async function setTaskCompleted(
  userId: string,
  taskId: string,
  completed: boolean,
): Promise<StudyTaskRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('study_tasks')
    .update(
      completed
        ? { status: 'completed', completed_at: new Date().toISOString() }
        : { status: 'pending', completed_at: null },
    )
    .eq('id', taskId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) {
    logger.error('No se pudo actualizar la tarea', { code: error?.code });
    throw new AppError('not_found', 'No hemos encontrado esa tarea.');
  }

  return data;
}
