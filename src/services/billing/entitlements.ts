import { limitsFor, type PlanLimits } from '@/config/limits';
import type { PlanId } from '@/config/pricing';

/**
 * Control de funcionalidades por plan.
 *
 * Toda la lógica de «¿puede hacer esto?» vive aquí. Ningún componente ni
 * acción debe comparar planes o límites por su cuenta: llaman a
 * `canUseFeature` y punto.
 */

export type Feature =
  | 'create_exam'
  | 'ai_generation'
  | 'replan'
  | 'advanced_stats'
  | 'create_habit';

export interface UserUsage {
  plan: PlanId;
  activeExams: number;
  aiGenerationsThisMonth: number;
  activeHabits: number;
}

export type DenyReason = 'limit_reached' | 'pro_only';

export interface FeatureDecision {
  allowed: boolean;
  reason?: DenyReason;
  /** Límite aplicable al plan actual (`null` = sin límite). */
  limit?: number | null;
  used?: number;
  /** Mensaje listo para mostrar en el paywall. */
  message?: string;
}

const allow: FeatureDecision = { allowed: true };

function denyByLimit(used: number, limit: number, message: string): FeatureDecision {
  return { allowed: false, reason: 'limit_reached', limit, used, message };
}

export function canUseFeature(usage: UserUsage, feature: Feature): FeatureDecision {
  const limits: PlanLimits = limitsFor(usage.plan);

  switch (feature) {
    case 'create_exam': {
      if (limits.activeExams === null) return allow;
      if (usage.activeExams < limits.activeExams) return allow;
      return denyByLimit(
        usage.activeExams,
        limits.activeExams,
        limits.activeExams === 1
          ? 'Con el plan gratuito puedes tener un examen activo a la vez. Termina o archiva el actual, o pasa a Pro para tener todos los que quieras.'
          : `Con el plan gratuito puedes tener ${limits.activeExams} exámenes activos a la vez.`,
      );
    }

    case 'ai_generation':
    case 'replan': {
      if (limits.aiGenerationsPerMonth === null) return allow;
      if (usage.aiGenerationsThisMonth < limits.aiGenerationsPerMonth) return allow;
      return denyByLimit(
        usage.aiGenerationsThisMonth,
        limits.aiGenerationsPerMonth,
        `Has usado tus ${limits.aiGenerationsPerMonth} generaciones con IA de este mes. Con Pro tienes muchas más.`,
      );
    }

    case 'create_habit': {
      if (limits.activeHabits === null) return allow;
      if (usage.activeHabits < limits.activeHabits) return allow;
      return denyByLimit(
        usage.activeHabits,
        limits.activeHabits,
        `Con el plan gratuito puedes tener ${limits.activeHabits} hábitos activos.`,
      );
    }

    case 'advanced_stats': {
      if (usage.plan === 'free') {
        return {
          allowed: false,
          reason: 'pro_only',
          message: 'Las estadísticas avanzadas forman parte de Planora Pro.',
        };
      }
      return allow;
    }

    default: {
      // Si alguien añade una feature nueva, TypeScript avisa aquí.
      const exhaustive: never = feature;
      throw new Error(`Feature desconocida: ${String(exhaustive)}`);
    }
  }
}

/** Cuántos usos quedan de una funcionalidad con contador. */
export function remainingFor(usage: UserUsage, feature: Feature): number | null {
  const limits = limitsFor(usage.plan);

  if (feature === 'create_exam') {
    return limits.activeExams === null ? null : Math.max(0, limits.activeExams - usage.activeExams);
  }
  if (feature === 'ai_generation' || feature === 'replan') {
    return limits.aiGenerationsPerMonth === null
      ? null
      : Math.max(0, limits.aiGenerationsPerMonth - usage.aiGenerationsThisMonth);
  }
  if (feature === 'create_habit') {
    return limits.activeHabits === null ? null : Math.max(0, limits.activeHabits - usage.activeHabits);
  }
  return null;
}
