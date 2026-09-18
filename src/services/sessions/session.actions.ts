'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { routes } from '@/config/routes';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import { createSession } from '@/services/sessions/session.service';
import { getTask, setTaskCompleted } from '@/services/tasks/task.service';

/**
 * Guardado de sesiones del modo Focus.
 *
 * El cliente manda el tiempo que ha medido el cronómetro, así que el servidor
 * lo acota: una sesión no puede durar más que el hueco entre su inicio y su
 * fin, ni más de la duración máxima permitida. Nada de confiar en el reloj
 * del navegador.
 */

const MAX_SESSION_SECONDS = 6 * 60 * 60;

const finishSessionSchema = z.object({
  taskId: z.string().uuid().nullable().default(null),
  plannedMinutes: z.number().int().min(1).max(480),
  actualSeconds: z.number().int().min(0).max(MAX_SESSION_SECONDS),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  status: z.enum(['completed', 'abandoned']).default('completed'),
  /** Marcar la tarea asociada como hecha al terminar. */
  completeTask: z.boolean().default(false),
  label: z.string().trim().max(120).nullable().default(null),
});

export interface FinishSessionResult {
  sessionId: string;
  /** Segundos que finalmente se han guardado, ya acotados. */
  actualSeconds: number;
  taskCompleted: boolean;
}

export async function finishSessionAction(
  input: unknown,
): Promise<ActionResult<FinishSessionResult>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  const parsed = finishSessionSchema.safeParse(input);
  if (!parsed.success) {
    return actionError('No hemos podido guardar la sesión.', 'validation');
  }

  const started = new Date(parsed.data.startedAt);
  const ended = new Date(parsed.data.endedAt);

  if (ended.getTime() < started.getTime()) {
    return actionError('No hemos podido guardar la sesión.', 'validation');
  }

  // El tiempo estudiado nunca puede superar el tiempo transcurrido: las
  // pausas restan, no suman.
  const elapsedSeconds = Math.floor((ended.getTime() - started.getTime()) / 1000);
  const actualSeconds = Math.min(
    parsed.data.actualSeconds,
    elapsedSeconds,
    MAX_SESSION_SECONDS,
  );

  try {
    // La tarea, si la hay, tiene que ser del usuario: se comprueba en servidor.
    let examId: string | null = null;
    let label = parsed.data.label;

    if (parsed.data.taskId) {
      const task = await getTask(user.id, parsed.data.taskId);
      if (!task) return actionError('No hemos encontrado esa tarea.', 'not_found');
      examId = task.exam_id;
      label = task.topic_label;
    }

    const session = await createSession(user.id, {
      taskId: parsed.data.taskId,
      examId,
      plannedMinutes: parsed.data.plannedMinutes,
      actualSeconds,
      status: parsed.data.status,
      label,
      startedAt: parsed.data.startedAt,
      endedAt: parsed.data.endedAt,
    });

    let taskCompleted = false;
    if (parsed.data.completeTask && parsed.data.taskId) {
      await setTaskCompleted(user.id, parsed.data.taskId, true);
      taskCompleted = true;
      await track('complete_task', user.id, { from: 'focus' });
    }

    await track('finish_focus', user.id, {
      minutes: Math.round(actualSeconds / 60),
      planned_minutes: parsed.data.plannedMinutes,
      with_task: parsed.data.taskId !== null,
      status: parsed.data.status,
    });

    revalidatePath(routes.dashboard);
    revalidatePath(routes.progress);
    revalidatePath(routes.focus);
    if (examId) revalidatePath(`${routes.plan}/${examId}`);

    return actionOk({ sessionId: session.id, actualSeconds, taskCompleted });
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}

/** Registra que el usuario ha arrancado el cronómetro. */
export async function startFocusAction(plannedMinutes: number): Promise<ActionResult<undefined>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  await track('start_focus', user.id, { planned_minutes: plannedMinutes });
  return actionOk();
}
