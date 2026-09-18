'use server';

import { revalidatePath } from 'next/cache';
import { rateLimits } from '@/config/limits';
import { routes } from '@/config/routes';
import { todayIso } from '@/lib/date';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { checkRateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import { generateStudyPlan, type FallbackReason } from '@/services/ai/plan-generator';
import { canUseFeature, remainingFor } from '@/services/billing/entitlements';
import { getUserUsage } from '@/services/billing/subscription.service';
import { getExamWithTopics } from '@/services/exams/exam.service';
import { savePlan } from '@/services/planning/plan.service';
import { buildStudyPlan } from '@/services/planning/scheduler';
import type { GeneratedPlan } from '@/services/planning/plan.schema';
import type { PlanSource } from '@/types/database';

/**
 * Generación y regeneración del plan de estudio.
 *
 * Principio: el estudiante nunca se queda sin plan. Si la IA falla, si está
 * apagada o si se ha agotado la cuota del mes, Planora genera el plan con su
 * propio planificador y lo dice con claridad, en lugar de bloquear al usuario
 * con un muro de pago.
 */

export interface PlanGenerationResult {
  examId: string;
  warnings: string[];
  summary: GeneratedPlan['summary'];
  isFirstPlan: boolean;
  /** Quién ha hecho el plan: la IA o el planificador de Planora. */
  source: PlanSource;
  /** Motivo de haber usado el planificador local, si aplica. */
  fallbackReason?: FallbackReason;
  /** La cuota mensual de IA está agotada: momento honesto para ofrecer Pro. */
  quotaExhausted: boolean;
  /** Generaciones con IA que le quedan este mes (`null` = sin límite). */
  remainingGenerations: number | null;
}

export async function generatePlanAction(
  examId: string,
  reason: 'initial' | 'replan' | 'exam_updated' = 'replan',
): Promise<ActionResult<PlanGenerationResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  // Rate limiting por usuario: protege del abuso y del gasto desbocado, sin
  // gastarle la cuota mensual a nadie.
  const limit = checkRateLimit(`ai:${user.id}`, rateLimits.aiGeneration);
  if (!limit.allowed) {
    return actionError(
      `Vas muy rápido. Espera ${limit.retryAfterSeconds} segundos y vuelve a intentarlo.`,
      'rate_limited',
    );
  }

  try {
    const detail = await getExamWithTopics(user.id, examId);
    if (!detail) return actionError('No hemos encontrado ese examen.', 'not_found');

    if (detail.topics.length === 0) {
      return actionError('Añade al menos un tema antes de generar el plan.', 'validation');
    }

    const usage = await getUserUsage(user.id);
    const aiDecision = canUseFeature(usage, reason === 'replan' ? 'replan' : 'ai_generation');
    const quotaExhausted = !aiDecision.allowed;

    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone, first_plan_created_at')
      .eq('id', user.id)
      .maybeSingle();

    const today = todayIso(profile?.timezone ?? undefined);

    const schedulerTopics = detail.topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      weight: topic.weight,
      completed: Boolean(topic.completed_at),
    }));

    const outcome: {
      plan: GeneratedPlan;
      source: PlanSource;
      fallbackReason?: FallbackReason;
    } = quotaExhausted
      ? {
          // Sin cuota no se llama a la IA, pero el plan se genera igual: el
          // estudiante no se queda sin saber qué estudiar por haber gastado
          // sus generaciones del mes.
          plan: buildStudyPlan({
            today,
            examDate: detail.exam.exam_date,
            topics: schedulerTopics,
            difficulty: detail.exam.difficulty,
            dailyMinutes: detail.exam.daily_minutes,
            availableWeekdays: detail.exam.available_weekdays,
          }),
          source: 'deterministic',
          fallbackReason: 'limit_reached',
        }
      : await generateStudyPlan({
          userId: user.id,
          examId,
          examTitle: detail.exam.title,
          examDate: detail.exam.exam_date,
          today,
          difficulty: detail.exam.difficulty,
          dailyMinutes: detail.exam.daily_minutes,
          availableWeekdays: detail.exam.available_weekdays,
          topics: schedulerTopics,
          reason,
        });

    if (outcome.plan.days.length === 0) {
      return actionError(
        outcome.plan.warnings[0] ??
          'No hay días disponibles antes del examen. Revisa la fecha y tus días de estudio.',
        'validation',
      );
    }

    await savePlan(user.id, examId, outcome.plan, {
      source: outcome.source,
      reason,
      fallbackReason: outcome.fallbackReason,
    });

    const isFirstPlan = !profile?.first_plan_created_at;
    if (isFirstPlan) {
      await supabase
        .from('profiles')
        .update({ first_plan_created_at: new Date().toISOString() })
        .eq('id', user.id);
      await track('first_plan_created', user.id, { exam_id: examId, source: outcome.source });
    }

    await track(reason === 'replan' ? 'replan_requested' : 'generate_plan', user.id, {
      exam_id: examId,
      source: outcome.source,
      fallback_reason: outcome.fallbackReason ?? null,
      sessions: outcome.plan.summary.totalSessions,
      days: outcome.plan.summary.totalDays,
    });

    revalidatePath(routes.dashboard);
    revalidatePath(routes.plan);
    revalidatePath(`${routes.plan}/${examId}`);
    revalidatePath(routes.progress);

    // El consumo se recalcula después de generar para que la interfaz muestre
    // lo que queda de verdad.
    const updatedUsage = await getUserUsage(user.id);

    return actionOk({
      examId,
      warnings: outcome.plan.warnings,
      summary: outcome.plan.summary,
      isFirstPlan,
      source: outcome.source,
      fallbackReason: outcome.fallbackReason,
      quotaExhausted,
      remainingGenerations: remainingFor(updatedUsage, 'ai_generation'),
    });
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}
