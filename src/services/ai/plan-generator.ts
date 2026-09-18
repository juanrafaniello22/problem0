import 'server-only';

import { aiConfig } from '@/config/ai';
import { logger } from '@/lib/logger';
import type { IsoDate } from '@/lib/date';
import { aiPlanResponseSchema, type GeneratedPlan } from '@/services/planning/plan.schema';
import { availableDatesFor, buildStudyPlan } from '@/services/planning/scheduler';
import type { ExamDifficulty, PlanSource } from '@/types/database';
import { getAIEffort, getAIProvider } from './index';
import {
  buildPlanPrompt,
  PLAN_JSON_SCHEMA,
  PLAN_SCHEMA_NAME,
  PLAN_SYSTEM_PROMPT,
} from './plan-prompt';
import { isPlanUsable, sanitizeAiPlan } from './plan-sanitizer';
import { AIProviderError, type AIErrorCode } from './provider';
import { recordGeneration } from './usage.service';

/**
 * Generación del plan de estudio.
 *
 * El orden importa:
 *
 *   1. Se calcula el plan local. Es barato, instantáneo y siempre válido, así
 *      que el usuario nunca se queda sin plan pase lo que pase.
 *   2. Si hay IA configurada, se le pide un plan mejor.
 *   3. La respuesta se valida contra el esquema, se sanea contra las fechas y
 *      los temas reales, y se comprueba que cubra el temario.
 *   4. Si algo de eso falla, se entrega el plan local y se registra el motivo.
 *
 * Nunca se lanza un error hacia arriba por un fallo de la IA: eso es un
 * problema nuestro, no del estudiante que quiere estudiar.
 */

export type FallbackReason =
  | AIErrorCode
  | 'ai_disabled'
  | 'schema_mismatch'
  | 'incomplete_coverage'
  /** Cuota mensual de IA agotada: ni se ha llamado al proveedor. */
  | 'limit_reached';

export interface PlanGenerationInput {
  userId: string;
  examId: string;
  examTitle: string;
  examDate: IsoDate;
  today: IsoDate;
  difficulty: ExamDifficulty;
  dailyMinutes: number;
  availableWeekdays: number[];
  topics: { id: string; name: string; weight: number; completed: boolean }[];
  reason: 'initial' | 'replan' | 'exam_updated';
}

export interface PlanGenerationOutcome {
  plan: GeneratedPlan;
  source: PlanSource;
  /** Presente sólo cuando se ha usado el planificador local. */
  fallbackReason?: FallbackReason;
}

function localPlan(input: PlanGenerationInput): GeneratedPlan {
  return buildStudyPlan({
    today: input.today,
    examDate: input.examDate,
    topics: input.topics,
    difficulty: input.difficulty,
    dailyMinutes: input.dailyMinutes,
    availableWeekdays: input.availableWeekdays,
  });
}

export async function generateStudyPlan(
  input: PlanGenerationInput,
): Promise<PlanGenerationOutcome> {
  const fallback = localPlan(input);
  const generationType = input.reason === 'replan' ? 'replan' : 'plan';

  const provider = getAIProvider();
  if (!provider) {
    return { plan: fallback, source: 'deterministic', fallbackReason: 'ai_disabled' };
  }

  const availableDates = availableDatesFor({
    today: input.today,
    examDate: input.examDate,
    availableWeekdays: input.availableWeekdays,
  });

  // Sin días disponibles no hay nada que pedirle a la IA.
  if (availableDates.length === 0 || fallback.days.length === 0) {
    return { plan: fallback, source: 'deterministic', fallbackReason: 'ai_disabled' };
  }

  const pendingTopics = input.topics.filter((topic) => !topic.completed);
  const constraints = {
    availableDates,
    topics: input.topics.map((topic) => ({ id: topic.id, name: topic.name })),
    dailyMinutes: input.dailyMinutes,
  };

  const prompt = buildPlanPrompt({
    today: input.today,
    examTitle: input.examTitle,
    examDate: input.examDate,
    difficulty: input.difficulty,
    dailyMinutes: input.dailyMinutes,
    availableDates,
    topics: input.topics,
    reason: input.reason,
  });

  let lastReason: FallbackReason = 'unknown';

  for (let attempt = 1; attempt <= aiConfig.maxAttempts; attempt += 1) {
    const startedAt = Date.now();

    try {
      const response = await provider.generateJson({
        system: PLAN_SYSTEM_PROMPT,
        prompt,
        jsonSchema: PLAN_JSON_SCHEMA,
        schemaName: PLAN_SCHEMA_NAME,
        maxTokens: aiConfig.maxOutputTokens,
        effort: getAIEffort(),
        timeoutMs: aiConfig.timeoutMs,
      });

      const durationMs = Date.now() - startedAt;

      // --- El esquema manda -------------------------------------------------
      const parsed = aiPlanResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        lastReason = 'schema_mismatch';
        logger.warn('El plan de la IA no cumple el esquema', {
          provider: provider.id,
          attempt,
          issues: parsed.error.issues.length,
        });
        await recordGeneration(input.userId, {
          examId: input.examId,
          type: generationType,
          status: 'invalid_response',
          provider: provider.id,
          model: response.model,
          inputTokens: response.usage.inputTokens,
          outputTokens: response.usage.outputTokens,
          cachedInputTokens: response.usage.cachedInputTokens,
          durationMs,
          errorCode: 'schema_mismatch',
        });
        continue;
      }

      // --- Y las reglas de Planora también ---------------------------------
      const sanitized = sanitizeAiPlan(parsed.data, constraints);
      if (!sanitized) {
        lastReason = 'schema_mismatch';
        logger.warn('El plan de la IA no ha sobrevivido al saneado', {
          provider: provider.id,
          attempt,
        });
        await recordGeneration(input.userId, {
          examId: input.examId,
          type: generationType,
          status: 'invalid_response',
          provider: provider.id,
          model: response.model,
          durationMs,
          errorCode: 'unsalvageable',
        });
        continue;
      }

      if (sanitized.repairs.length > 0) {
        logger.info('Plan de IA corregido antes de guardarlo', {
          provider: provider.id,
          repairs: sanitized.repairs.length,
          first: sanitized.repairs[0],
        });
      }

      if (pendingTopics.length > 0 && !isPlanUsable(sanitized, constraints)) {
        lastReason = 'incomplete_coverage';
        logger.warn('El plan de la IA deja temas sin cubrir', {
          provider: provider.id,
          attempt,
          covered: sanitized.plan.summary.topicsCovered,
          total: sanitized.plan.summary.topicsTotal,
        });
        await recordGeneration(input.userId, {
          examId: input.examId,
          type: generationType,
          status: 'invalid_response',
          provider: provider.id,
          model: response.model,
          durationMs,
          errorCode: 'incomplete_coverage',
        });
        continue;
      }

      await recordGeneration(input.userId, {
        examId: input.examId,
        type: generationType,
        status: 'success',
        provider: provider.id,
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cachedInputTokens: response.usage.cachedInputTokens,
        durationMs,
      });

      return { plan: sanitized.plan, source: 'ai' };
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const code: AIErrorCode = error instanceof AIProviderError ? error.code : 'unknown';
      const retryable = error instanceof AIProviderError ? error.retryable : false;

      lastReason = code;
      logger.warn('Fallo del proveedor de IA', { provider: provider.id, attempt, code });

      await recordGeneration(input.userId, {
        examId: input.examId,
        type: generationType,
        status: 'provider_error',
        provider: provider.id,
        durationMs,
        errorCode: code,
      });

      // Un error de credenciales o un proveedor sin implementar no mejora
      // reintentando: se pasa al plan local directamente.
      if (!retryable) break;
    }
  }

  return { plan: fallback, source: 'deterministic', fallbackReason: lastReason };
}
