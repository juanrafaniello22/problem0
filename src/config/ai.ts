import type { AIEffort, AIProviderId } from '@/services/ai/provider';

/**
 * Configuración de la IA en un único sitio.
 * Cambiar de modelo, de esfuerzo o de tiempo de espera se hace aquí.
 */

export const aiConfig = {
  /** Proveedor por defecto si no se indica `AI_PROVIDER`. */
  defaultProvider: 'anthropic' satisfies AIProviderId as AIProviderId,

  /** Modelo por defecto de cada proveedor. `AI_MODEL` lo sobrescribe. */
  defaultModels: {
    anthropic: 'claude-opus-5',
    openai: 'gpt-5',
    gemini: 'gemini-2.5-pro',
  } satisfies Record<AIProviderId, string>,

  /**
   * Esfuerzo de razonamiento por defecto.
   *
   * `medium` y no `high` a propósito: el usuario está esperando en el móvil,
   * el plan se valida y se corrige después, y hay un planificador local como
   * respaldo. Si se prioriza la calidad sobre la espera, subir a `high` con
   * la variable AI_EFFORT.
   */
  defaultEffort: 'medium' satisfies AIEffort as AIEffort,

  /** Tope de tokens de salida. Un plan largo cabe de sobra. */
  maxOutputTokens: 16_000,

  /** Si tarda más que esto, se cae al planificador local. */
  timeoutMs: 60_000,

  /** Intentos totales con la IA antes de rendirse (el primero cuenta). */
  maxAttempts: 2,
} as const;
