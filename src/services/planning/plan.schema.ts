import { z } from 'zod';
import { isIsoDate } from '@/lib/date';

/**
 * Contrato del plan de estudio.
 *
 * Es el mismo esquema para el planificador local y para la respuesta de la
 * IA (fase 3): así ambos caminos son intercambiables y toda respuesta —venga
 * de donde venga— se valida antes de tocar la base de datos.
 *
 * La IA devuelve JSON estructurado, nunca HTML ni texto libre interpretable.
 */

export const TASK_TYPES = ['study', 'review', 'quiz', 'practice', 'break'] as const;

export const planTaskSchema = z.object({
  /** Nombre del tema tal y como se mostrará al usuario. */
  topic: z.string().trim().min(1).max(120),
  /** Id del tema si la tarea corresponde a uno concreto. */
  topicId: z.string().uuid().nullable().default(null),
  /** Duración en minutos. */
  duration: z.number().int().min(5).max(480),
  type: z.enum(TASK_TYPES),
});

export const planDaySchema = z.object({
  /** Fecha en formato `YYYY-MM-DD`. */
  date: z.string().refine(isIsoDate, { message: 'La fecha debe tener formato YYYY-MM-DD' }),
  tasks: z.array(planTaskSchema).min(1).max(12),
});

export const planSummarySchema = z.object({
  totalDays: z.number().int().min(0),
  studyDays: z.number().int().min(0),
  reviewDays: z.number().int().min(0),
  totalSessions: z.number().int().min(0),
  totalStudyMinutes: z.number().int().min(0),
  topicsCovered: z.number().int().min(0),
  topicsTotal: z.number().int().min(0),
});

export const generatedPlanSchema = z.object({
  days: z.array(planDaySchema).max(180),
  /** Avisos honestos para el usuario (p. ej. no cabe todo el temario). */
  warnings: z.array(z.string().max(400)).max(5).default([]),
  summary: planSummarySchema,
});

export type PlanTask = z.infer<typeof planTaskSchema>;
export type PlanDay = z.infer<typeof planDaySchema>;
export type PlanSummary = z.infer<typeof planSummarySchema>;
export type GeneratedPlan = z.infer<typeof generatedPlanSchema>;

/**
 * Esquema reducido que se le pide a la IA. No incluye el resumen: ése lo
 * calcula Planora a partir de los días, para no depender de que el modelo
 * sepa sumar.
 */
export const aiPlanResponseSchema = z.object({
  days: z.array(planDaySchema).min(1).max(180),
  warnings: z.array(z.string().max(400)).max(5).default([]),
});

export type AiPlanResponse = z.infer<typeof aiPlanResponseSchema>;
