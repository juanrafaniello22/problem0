'use server';

import { revalidatePath } from 'next/cache';
import { routes } from '@/config/routes';
import { todayIso } from '@/lib/date';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import { canUseFeature } from '@/services/billing/entitlements';
import { getUserUsage } from '@/services/billing/subscription.service';
import { getExamWithTopics } from '@/services/exams/exam.service';
import { savePlan } from '@/services/planning/plan.service';
import { buildStudyPlan } from '@/services/planning/scheduler';
import type { GeneratedPlan } from '@/services/planning/plan.schema';

/**
 * Generación y regeneración del plan de estudio.
 *
 * Hoy el plan lo construye el planificador local. En la fase 3 se antepone
 * el proveedor de IA y este mismo planificador queda como red de seguridad
 * cuando la IA falle o devuelva algo que no cumple el esquema.
 */

export interface PlanGenerationResult {
  examId: string;
  warnings: string[];
  summary: GeneratedPlan['summary'];
  isFirstPlan: boolean;
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

  try {
    const detail = await getExamWithTopics(user.id, examId);
    if (!detail) return actionError('No hemos encontrado ese examen.', 'not_found');

    if (detail.topics.length === 0) {
      return actionError(
        'Añade al menos un tema antes de generar el plan.',
        'validation',
      );
    }

    // La replanificación consume cuota igual que una generación nueva.
    if (reason === 'replan') {
      const usage = await getUserUsage(user.id);
      const decision = canUseFeature(usage, 'replan');
      if (!decision.allowed) {
        return actionError(decision.message ?? 'Has alcanzado tu límite.', 'limit_reached');
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone, first_plan_created_at')
      .eq('id', user.id)
      .maybeSingle();

    const today = todayIso(profile?.timezone ?? undefined);

    const generated = buildStudyPlan({
      today,
      examDate: detail.exam.exam_date,
      topics: detail.topics.map((topic) => ({
        id: topic.id,
        name: topic.name,
        weight: topic.weight,
        completed: Boolean(topic.completed_at),
      })),
      difficulty: detail.exam.difficulty,
      dailyMinutes: detail.exam.daily_minutes,
      availableWeekdays: detail.exam.available_weekdays,
    });

    if (generated.days.length === 0) {
      return actionError(
        generated.warnings[0] ??
          'No hay días disponibles antes del examen. Revisa la fecha y tus días de estudio.',
        'validation',
      );
    }

    await savePlan(user.id, examId, generated, { source: 'deterministic', reason });

    const isFirstPlan = !profile?.first_plan_created_at;
    if (isFirstPlan) {
      await supabase
        .from('profiles')
        .update({ first_plan_created_at: new Date().toISOString() })
        .eq('id', user.id);
      await track('first_plan_created', user.id, { exam_id: examId });
    }

    await track(reason === 'replan' ? 'replan_requested' : 'generate_plan', user.id, {
      exam_id: examId,
      source: 'deterministic',
      sessions: generated.summary.totalSessions,
      days: generated.summary.totalDays,
    });

    revalidatePath(routes.dashboard);
    revalidatePath(routes.plan);
    revalidatePath(`${routes.plan}/${examId}`);
    revalidatePath(routes.progress);

    return actionOk({
      examId,
      warnings: generated.warnings,
      summary: generated.summary,
      isFirstPlan,
    });
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}
