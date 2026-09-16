import 'server-only';

import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { ExamRow, ExamStatus, SubjectRow, TopicRow } from '@/types/database';
import { normalizeTopics, type ExamFormInput, type TopicInput } from '@/validation/exam';

/**
 * Exámenes y temas.
 *
 * Todas las consultas filtran además por `user_id` aunque RLS ya lo haga:
 * si algún día una política se relaja por error, el código sigue siendo
 * correcto.
 */

export interface ExamWithTopics {
  exam: ExamRow;
  topics: TopicRow[];
  subject: SubjectRow | null;
}

export async function listExams(
  userId: string,
  options: { status?: ExamStatus } = {},
): Promise<ExamRow[]> {
  const supabase = await createClient();
  let query = supabase.from('exams').select('*').eq('user_id', userId);

  if (options.status) query = query.eq('status', options.status);

  const { data, error } = await query.order('exam_date', { ascending: true });

  if (error) {
    logger.error('No se pudieron leer los exámenes', { code: error.code });
    throw new AppError('unknown', 'No hemos podido cargar tus exámenes.');
  }

  return data ?? [];
}

/** Examen activo más próximo. Es el que manda en el panel. */
export async function getNextExam(userId: string): Promise<ExamRow | null> {
  const exams = await listExams(userId, { status: 'active' });
  return exams[0] ?? null;
}

export async function getExamWithTopics(
  userId: string,
  examId: string,
): Promise<ExamWithTopics | null> {
  const supabase = await createClient();

  const { data: exam, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('No se pudo leer el examen', { code: error.code });
    throw new AppError('unknown', 'No hemos podido cargar este examen.');
  }

  if (!exam) return null;

  const [{ data: topics }, subject] = await Promise.all([
    supabase
      .from('topics')
      .select('*')
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .order('position', { ascending: true }),
    exam.subject_id
      ? supabase
          .from('subjects')
          .select('*')
          .eq('id', exam.subject_id)
          .eq('user_id', userId)
          .maybeSingle()
          .then((result) => result.data ?? null)
      : Promise.resolve(null),
  ]);

  return { exam, topics: topics ?? [], subject };
}

/** Crea la asignatura si hace falta y devuelve su id. */
export async function resolveSubjectId(
  userId: string,
  subjectName: string | undefined,
): Promise<string | null> {
  const name = subjectName?.trim().replace(/\s+/g, ' ');
  if (!name) return null;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('subjects')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', name)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('subjects')
    .insert({ user_id: userId, name })
    .select('id')
    .single();

  if (error || !created) {
    logger.warn('No se pudo crear la asignatura', { code: error?.code });
    return null;
  }

  return created.id;
}

export async function createExam(userId: string, input: ExamFormInput): Promise<ExamRow> {
  const supabase = await createClient();
  const subjectId = await resolveSubjectId(userId, input.subjectName || undefined);

  const { data: exam, error } = await supabase
    .from('exams')
    .insert({
      user_id: userId,
      subject_id: subjectId,
      title: input.title,
      exam_date: input.examDate,
      difficulty: input.difficulty,
      daily_minutes: input.dailyMinutes,
      available_weekdays: [...input.availableWeekdays].sort((a, b) => a - b),
      notes: input.notes || null,
    })
    .select('*')
    .single();

  if (error || !exam) {
    logger.error('No se pudo crear el examen', { code: error?.code });
    throw new AppError('unknown', 'No hemos podido crear el examen. Inténtalo de nuevo.');
  }

  await replaceTopics(userId, exam.id, input.topics);

  return exam;
}

export async function updateExam(
  userId: string,
  examId: string,
  input: ExamFormInput,
): Promise<ExamRow> {
  const supabase = await createClient();
  const subjectId = await resolveSubjectId(userId, input.subjectName || undefined);

  const { data: exam, error } = await supabase
    .from('exams')
    .update({
      subject_id: subjectId,
      title: input.title,
      exam_date: input.examDate,
      difficulty: input.difficulty,
      daily_minutes: input.dailyMinutes,
      available_weekdays: [...input.availableWeekdays].sort((a, b) => a - b),
      notes: input.notes || null,
    })
    .eq('id', examId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !exam) {
    logger.error('No se pudo actualizar el examen', { code: error?.code });
    throw new AppError('unknown', 'No hemos podido guardar los cambios.');
  }

  await replaceTopics(userId, examId, input.topics);

  return exam;
}

/**
 * Sincroniza la lista de temas con la que envía el usuario.
 *
 * Conserva los temas que siguen estando (para no perder su progreso ni las
 * tareas que los referencian), renombra los editados, crea los nuevos y
 * borra los que se han quitado.
 */
export async function replaceTopics(
  userId: string,
  examId: string,
  topics: TopicInput[],
): Promise<void> {
  const supabase = await createClient();
  const desired = normalizeTopics(topics);

  const { data: existing, error: readError } = await supabase
    .from('topics')
    .select('id, name, position')
    .eq('exam_id', examId)
    .eq('user_id', userId);

  if (readError) {
    logger.error('No se pudieron leer los temas', { code: readError.code });
    throw new AppError('unknown', 'No hemos podido guardar los temas.');
  }

  const existingById = new Map((existing ?? []).map((topic) => [topic.id, topic]));
  const keptIds = new Set<string>();

  const toInsert: { user_id: string; exam_id: string; name: string; position: number }[] = [];
  const toUpdate: { id: string; name: string; position: number }[] = [];

  desired.forEach((topic, index) => {
    const current = topic.id ? existingById.get(topic.id) : undefined;
    if (current) {
      keptIds.add(current.id);
      if (current.name !== topic.name || current.position !== index) {
        toUpdate.push({ id: current.id, name: topic.name, position: index });
      }
      return;
    }
    toInsert.push({ user_id: userId, exam_id: examId, name: topic.name, position: index });
  });

  const toDelete = (existing ?? [])
    .filter((topic) => !keptIds.has(topic.id))
    .map((topic) => topic.id);

  // El borrado va primero: así se liberan nombres que puedan reutilizarse.
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('topics')
      .delete()
      .in('id', toDelete)
      .eq('user_id', userId);
    if (error) {
      logger.error('No se pudieron borrar temas', { code: error.code });
      throw new AppError('unknown', 'No hemos podido guardar los temas.');
    }
  }

  for (const topic of toUpdate) {
    const { error } = await supabase
      .from('topics')
      .update({ name: topic.name, position: topic.position })
      .eq('id', topic.id)
      .eq('user_id', userId);
    if (error) {
      logger.error('No se pudo actualizar un tema', { code: error.code });
      throw new AppError('unknown', 'No hemos podido guardar los temas.');
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('topics').insert(toInsert);
    if (error) {
      logger.error('No se pudieron crear temas', { code: error.code });
      throw new AppError('unknown', 'No hemos podido guardar los temas.');
    }
  }
}

export async function listTopics(userId: string, examId: string): Promise<TopicRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('exam_id', examId)
    .eq('user_id', userId)
    .order('position', { ascending: true });

  if (error) {
    logger.error('No se pudieron leer los temas', { code: error.code });
    return [];
  }

  return data ?? [];
}

export async function setExamStatus(
  userId: string,
  examId: string,
  status: ExamStatus,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('exams')
    .update({ status })
    .eq('id', examId)
    .eq('user_id', userId);

  if (error) {
    logger.error('No se pudo cambiar el estado del examen', { code: error.code });
    throw new AppError('unknown', 'No hemos podido actualizar el examen.');
  }
}

export async function deleteExam(userId: string, examId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from('exams').delete().eq('id', examId).eq('user_id', userId);

  if (error) {
    logger.error('No se pudo borrar el examen', { code: error.code });
    throw new AppError('unknown', 'No hemos podido borrar el examen.');
  }
}
