import type { PlanId } from './pricing';

/**
 * Límites por plan. Centralizados para poder ajustarlos sin tocar la app.
 * `null` significa "sin límite".
 */

export interface PlanLimits {
  /** Generaciones de IA (plan + replanificación) por mes natural. */
  aiGenerationsPerMonth: number | null;
  /** Exámenes activos simultáneos. */
  activeExams: number | null;
  /** Temas por examen. */
  topicsPerExam: number;
  /** Hábitos activos. */
  activeHabits: number | null;
  /** Días de histórico visibles en Progreso. */
  progressHistoryDays: number;
}

export const planLimits: Record<PlanId, PlanLimits> = {
  free: {
    aiGenerationsPerMonth: 3,
    activeExams: 1,
    topicsPerExam: 20,
    activeHabits: 3,
    progressHistoryDays: 30,
  },
  pro: {
    aiGenerationsPerMonth: 60,
    activeExams: null,
    topicsPerExam: 60,
    activeHabits: null,
    progressHistoryDays: 365,
  },
};

/** Ventanas de rate limiting para endpoints sensibles (por usuario). */
export const rateLimits = {
  aiGeneration: { windowSeconds: 60, max: 3 },
  feedback: { windowSeconds: 300, max: 5 },
  auth: { windowSeconds: 300, max: 10 },
} as const;

export function limitsFor(plan: PlanId): PlanLimits {
  return planLimits[plan];
}
