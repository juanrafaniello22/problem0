import 'server-only';

import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type {
  PlanSource,
  StudyPlanRow,
  StudyPlanVersionRow,
  StudyTaskRow,
} from '@/types/database';
import { generatedPlanSchema, type GeneratedPlan } from './plan.schema';

/**
 * Persistencia del plan de estudio.
 *
 * Un plan por examen; cada generación o replanificación crea una versión
 * nueva. Las versiones antiguas no se borran nunca: son el histórico
 * auditable que pide el producto.
 */

export interface CurrentPlan {
  plan: StudyPlanRow;
  version: StudyPlanVersionRow;
  tasks: StudyTaskRow[];
}

export async function getCurrentPlan(
  userId: string,
  examId: string,
): Promise<CurrentPlan | null> {
  const supabase = await createClient();

  const { data: plan, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('No se pudo leer el plan', { code: error.code });
    throw new AppError('unknown', 'No hemos podido cargar tu plan.');
  }

  if (!plan?.current_version_id) return null;

  const { data: version } = await supabase
    .from('study_plan_versions')
    .select('*')
    .eq('id', plan.current_version_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!version) return null;

  const { data: tasks } = await supabase
    .from('study_tasks')
    .select('*')
    .eq('plan_version_id', version.id)
    .eq('user_id', userId)
    .order('scheduled_date', { ascending: true })
    .order('position', { ascending: true });

  return { plan, version, tasks: tasks ?? [] };
}

export async function listPlanVersions(
  userId: string,
  examId: string,
): Promise<StudyPlanVersionRow[]> {
  const supabase = await createClient();

  const { data: plan } = await supabase
    .from('study_plans')
    .select('id')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!plan) return [];

  const { data } = await supabase
    .from('study_plan_versions')
    .select('*')
    .eq('plan_id', plan.id)
    .eq('user_id', userId)
    .order('version', { ascending: false });

  return data ?? [];
}

async function ensurePlan(userId: string, examId: string): Promise<StudyPlanRow> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('study_plans')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('study_plans')
    .insert({ user_id: userId, exam_id: examId })
    .select('*')
    .single();

  if (error || !created) {
    logger.error('No se pudo crear el plan', { code: error?.code });
    throw new AppError('unknown', 'No hemos podido crear tu plan.');
  }

  return created;
}

export interface SavePlanOptions {
  source: PlanSource;
  /** Motivo de la versión: `initial`, `replan`, `exam_updated`… */
  reason: string;
}

/**
 * Guarda un plan generado como una versión nueva.
 *
 * El plan se valida contra el esquema antes de tocar nada: si no cumple, no
 * se escribe una sola fila. Las tareas ya completadas de versiones
 * anteriores se conservan, porque las versiones no se borran.
 */
export async function savePlan(
  userId: string,
  examId: string,
  generated: GeneratedPlan,
  options: SavePlanOptions,
): Promise<CurrentPlan> {
  const parsed = generatedPlanSchema.safeParse(generated);
  if (!parsed.success) {
    logger.error('El plan generado no cumple el esquema', {
      issues: parsed.error.issues.length,
      reason: options.reason,
    });
    throw new AppError(
      'ai_invalid_response',
      'El plan que hemos recibido no tenía un formato válido. Vuelve a intentarlo.',
    );
  }

  const plan = parsed.data;
  if (plan.days.length === 0) {
    throw new AppError(
      'validation',
      'No hay días disponibles para planificar. Revisa la fecha del examen y tus días de estudio.',
    );
  }

  const supabase = await createClient();
  const studyPlan = await ensurePlan(userId, examId);

  const { data: lastVersion } = await supabase
    .from('study_plan_versions')
    .select('version')
    .eq('plan_id', studyPlan.id)
    .eq('user_id', userId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  const { data: version, error: versionError } = await supabase
    .from('study_plan_versions')
    .insert({
      user_id: userId,
      plan_id: studyPlan.id,
      version: nextVersion,
      source: options.source,
      reason: options.reason.slice(0, 60),
      summary: { ...plan.summary, warnings: plan.warnings },
    })
    .select('*')
    .single();

  if (versionError || !version) {
    logger.error('No se pudo crear la versión del plan', { code: versionError?.code });
    throw new AppError('unknown', 'No hemos podido guardar tu plan.');
  }

  const rows = plan.days.flatMap((day) =>
    day.tasks.map((task, index) => ({
      user_id: userId,
      exam_id: examId,
      plan_version_id: version.id,
      topic_id: task.topicId,
      topic_label: task.topic,
      scheduled_date: day.date,
      duration_minutes: task.duration,
      type: task.type,
      position: index,
    })),
  );

  const { error: tasksError } = await supabase.from('study_tasks').insert(rows);

  if (tasksError) {
    logger.error('No se pudieron crear las tareas del plan', { code: tasksError.code });
    // La versión queda huérfana pero no pasa a ser la vigente: el plan
    // anterior sigue intacto y el usuario puede reintentar.
    throw new AppError('unknown', 'No hemos podido guardar las sesiones de tu plan.');
  }

  const { error: pointerError } = await supabase
    .from('study_plans')
    .update({ current_version_id: version.id })
    .eq('id', studyPlan.id)
    .eq('user_id', userId);

  if (pointerError) {
    logger.error('No se pudo activar la versión del plan', { code: pointerError.code });
    throw new AppError('unknown', 'No hemos podido activar tu plan.');
  }

  const { data: tasks } = await supabase
    .from('study_tasks')
    .select('*')
    .eq('plan_version_id', version.id)
    .eq('user_id', userId)
    .order('scheduled_date', { ascending: true })
    .order('position', { ascending: true });

  return { plan: studyPlan, version, tasks: tasks ?? [] };
}
