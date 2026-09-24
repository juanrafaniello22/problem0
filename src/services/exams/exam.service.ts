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

  await replaceTopics(exam.id, input.topics);

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

  await replaceTopics(examId, input.topics);

  return exam;
}

/**
 * Sincroniza la lista de temas con la que envía el usuario.
 *
 * Conserva los temas que siguen estando (para no perder su progreso ni las
 * tareas que los referencian), renombra los editados, crea los nuevos y
 * borra los que se han quitado.
 *
 * Lo hace la función `replace_topics` dentro de la base de datos, en una sola
 * transacción. Antes eran varias peticiones sueltas, y reescribir la lista
 * "subiendo" los nombres chocaba con el índice único a mitad de camino: el
 * alumno veía un error y, además, se quedaba sin el tema que ya se había
 * borrado. Ahora o se aplica entero, o no cambia nada.
 */
export async function replaceTopics(examId: string, topics: TopicInput[]): Promise<void> {
  const supabase = await createClient();
  const desired = normalizeTopics(topics);

  // El usuario lo pone la propia base de datos (auth.uid()), no quien llama:
  // no hay forma de pasarle el de otra persona.
  const { error } = await supabase.rpc('replace_topics', {
    p_exam_id: examId,
    p_topics: desired.map((topic) => ({ id: topic.id ?? null, name: topic.name })),
  });

  if (error) {
    logger.error('No se pudieron guardar los temas', { code: error.code });
    throw new AppError('unknown', 'No hemos podido guardar los temas.');
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
