import type { PlanDay, PlanSummary } from './plan.schema';

/**
 * Resumen de un plan: días, sesiones, minutos y temas cubiertos.
 *
 * Lo calcula Planora a partir de los días, tanto si el plan viene del
 * planificador local como de la IA. Así el resumen siempre cuadra con lo que
 * hay de verdad en el plan, sin depender de que el modelo sepa sumar.
 *
 * Los descansos no cuentan como sesiones ni como tiempo de estudio.
 */
export function summarizePlan(days: PlanDay[], topicsTotal: number): PlanSummary {
  const studyDays = days.filter((day) => day.tasks.some((task) => task.type === 'study')).length;

  const reviewDays = days.filter(
    (day) => day.tasks.length > 0 && day.tasks.every((task) => task.type !== 'study'),
  ).length;

  const realTasks = days.flatMap((day) => day.tasks).filter((task) => task.type !== 'break');

  const coveredTopics = new Set(
    realTasks.filter((task) => task.topicId !== null).map((task) => task.topicId),
  );

  return {
    totalDays: days.length,
    studyDays,
    reviewDays,
    totalSessions: realTasks.length,
    totalStudyMinutes: realTasks.reduce((sum, task) => sum + task.duration, 0),
    topicsCovered: coveredTopics.size,
    topicsTotal,
  };
}
