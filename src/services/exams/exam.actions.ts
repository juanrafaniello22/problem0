'use server';

import { revalidatePath } from 'next/cache';
import { routes } from '@/config/routes';
import { todayIso } from '@/lib/date';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { limitsFor } from '@/config/limits';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import { canUseFeature } from '@/services/billing/entitlements';
import { getUserUsage } from '@/services/billing/subscription.service';
import {
  createExam,
  deleteExam,
  setExamStatus,
  updateExam,
} from '@/services/exams/exam.service';
import { generatePlanAction, type PlanGenerationResult } from '@/services/planning/plan.actions';
import type { ExamStatus } from '@/types/database';
import { checkExamDate, examDateMessages, examFormSchema, normalizeTopics } from '@/validation/exam';

/** Creación, edición y archivado de exámenes. */

function fieldErrorsFrom(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

export interface ExamCreatedResult {
  examId: string;
  plan: PlanGenerationResult | null;
  /** Aviso si el examen se creó pero el plan no pudo generarse. */
  planError?: string;
}

export async function createExamAction(input: unknown): Promise<ActionResult<ExamCreatedResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  const parsed = examFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('Revisa los datos del examen.', 'validation', fieldErrorsFrom(parsed.error));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();

  const today = todayIso(profile?.timezone ?? undefined);
  const dateProblem = checkExamDate(parsed.data.examDate, today);
  if (dateProblem) {
    return actionError(examDateMessages[dateProblem], 'validation', {
      examDate: [examDateMessages[dateProblem]],
    });
  }

  const usage = await getUserUsage(user.id);

  const decision = canUseFeature(usage, 'create_exam');
  if (!decision.allowed) {
    return actionError(decision.message ?? 'Has alcanzado tu límite.', 'limit_reached');
  }

  const topics = normalizeTopics(parsed.data.topics);
  const maxTopics = limitsFor(usage.plan).topicsPerExam;
  if (topics.length === 0) {
    return actionError('Añade al menos un tema.', 'validation', {
      topics: ['Añade al menos un tema'],
    });
  }
  if (topics.length > maxTopics) {
    return actionError(`Con tu plan puedes añadir hasta ${maxTopics} temas por examen.`, 'limit_reached');
  }

  try {
    const exam = await createExam(user.id, { ...parsed.data, topics });

    await track('exam_created', user.id, {
      exam_id: exam.id,
      difficulty: exam.difficulty,
      topics: topics.length,
      daily_minutes: exam.daily_minutes,
    });

    // El valor de Planora está en el plan, así que se genera al momento.
    const planResult = await generatePlanAction(exam.id, 'initial');

    revalidatePath(routes.dashboard);
    revalidatePath(routes.plan);

    if (!planResult.ok) {
      return actionOk({ examId: exam.id, plan: null, planError: planResult.error });
    }

    return actionOk({ examId: exam.id, plan: planResult.data });
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}

export async function updateExamAction(
  examId: string,
  input: unknown,
  options: { regeneratePlan?: boolean } = {},
): Promise<ActionResult<{ examId: string; plan: PlanGenerationResult | null }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  const parsed = examFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('Revisa los datos del examen.', 'validation', fieldErrorsFrom(parsed.error));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();

  const dateProblem = checkExamDate(parsed.data.examDate, todayIso(profile?.timezone ?? undefined));
  if (dateProblem) {
    return actionError(examDateMessages[dateProblem], 'validation', {
      examDate: [examDateMessages[dateProblem]],
    });
  }

  const topics = normalizeTopics(parsed.data.topics);
  if (topics.length === 0) {
    return actionError('Añade al menos un tema.', 'validation', {
      topics: ['Añade al menos un tema'],
    });
  }

  try {
    await updateExam(user.id, examId, { ...parsed.data, topics });

    revalidatePath(routes.plan);
    revalidatePath(`${routes.plan}/${examId}`);
    revalidatePath(routes.dashboard);

    if (!options.regeneratePlan) return actionOk({ examId, plan: null });

    const planResult = await generatePlanAction(examId, 'exam_updated');
    return actionOk({ examId, plan: planResult.ok ? planResult.data : null });
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}

export async function setExamStatusAction(
  examId: string,
  status: ExamStatus,
): Promise<ActionResult<undefined>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  try {
    await setExamStatus(user.id, examId, status);
    revalidatePath(routes.plan);
    revalidatePath(routes.dashboard);
    return actionOk();
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}

export async function deleteExamAction(examId: string): Promise<ActionResult<undefined>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  try {
    await deleteExam(user.id, examId);
    revalidatePath(routes.plan);
    revalidatePath(routes.dashboard);
    revalidatePath(routes.progress);
    return actionOk();
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}
