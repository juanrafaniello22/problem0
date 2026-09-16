import type { IsoDate } from '@/lib/date';
import type { StudyTaskRow, TaskStatus, TaskType } from '@/types/database';

/**
 * Cálculo de progreso.
 *
 * Funciones puras a propósito: el progreso es lo que el usuario mira para
 * saber si va bien, así que tiene que ser fácil de probar y no depender de
 * la base de datos.
 *
 * Los descansos nunca cuentan: no son trabajo hecho.
 */

export interface TaskLike {
  status: TaskStatus;
  type: TaskType;
  duration_minutes: number;
  scheduled_date: IsoDate;
}

export interface ProgressSummary {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  /** Porcentaje completado, 0–100. */
  percent: number;
  plannedMinutes: number;
  completedMinutes: number;
  /** Minutos que ya deberían estar hechos y no lo están. */
  overdueMinutes: number;
}

const EMPTY: ProgressSummary = {
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  overdueTasks: 0,
  percent: 0,
  plannedMinutes: 0,
  completedMinutes: 0,
  overdueMinutes: 0,
};

export function isCountable(task: TaskLike): boolean {
  return task.type !== 'break';
}

export function computeProgress(tasks: TaskLike[], today: IsoDate): ProgressSummary {
  const countable = tasks.filter(isCountable);
  if (countable.length === 0) return { ...EMPTY };

  let completedTasks = 0;
  let pendingTasks = 0;
  let overdueTasks = 0;
  let plannedMinutes = 0;
  let completedMinutes = 0;
  let overdueMinutes = 0;

  for (const task of countable) {
    plannedMinutes += task.duration_minutes;

    if (task.status === 'completed') {
      completedTasks += 1;
      completedMinutes += task.duration_minutes;
      continue;
    }

    if (task.status === 'pending') {
      pendingTasks += 1;
      if (task.scheduled_date < today) {
        overdueTasks += 1;
        overdueMinutes += task.duration_minutes;
      }
    }
    // Las tareas saltadas no suman progreso pero tampoco se consideran
    // atrasadas: el usuario ya decidió sobre ellas.
  }

  return {
    totalTasks: countable.length,
    completedTasks,
    pendingTasks,
    overdueTasks,
    percent: Math.round((completedTasks / countable.length) * 100),
    plannedMinutes,
    completedMinutes,
    overdueMinutes,
  };
}

/** ¿Merece la pena proponer una reorganización del plan? */
export function shouldSuggestReplan(progress: ProgressSummary): boolean {
  // Con una sola tarea atrasada no hace falta alarmar a nadie.
  return progress.overdueTasks >= 2 || progress.overdueMinutes >= 90;
}

export interface TopicProgress {
  topicId: string | null;
  label: string;
  total: number;
  completed: number;
  percent: number;
}

/** Progreso agrupado por tema, en el orden en que aparecen las tareas. */
export function progressByTopic(tasks: StudyTaskRow[]): TopicProgress[] {
  const byTopic = new Map<string, TopicProgress>();

  for (const task of tasks) {
    if (task.type === 'break') continue;
    const key = task.topic_id ?? `label:${task.topic_label}`;
    const current = byTopic.get(key) ?? {
      topicId: task.topic_id,
      label: task.topic_label,
      total: 0,
      completed: 0,
      percent: 0,
    };

    current.total += 1;
    if (task.status === 'completed') current.completed += 1;
    byTopic.set(key, current);
  }

  return [...byTopic.values()].map((entry) => ({
    ...entry,
    percent: entry.total === 0 ? 0 : Math.round((entry.completed / entry.total) * 100),
  }));
}

/** Agrupa tareas por fecha conservando el orden cronológico. */
export function groupTasksByDate<T extends { scheduled_date: IsoDate; position: number }>(
  tasks: T[],
): { date: IsoDate; tasks: T[] }[] {
  const byDate = new Map<IsoDate, T[]>();

  for (const task of tasks) {
    const list = byDate.get(task.scheduled_date) ?? [];
    list.push(task);
    byDate.set(task.scheduled_date, list);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({
      date,
      tasks: [...list].sort((a, b) => a.position - b.position),
    }));
}
