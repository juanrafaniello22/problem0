'use server';

import { revalidatePath } from 'next/cache';
import { routes } from '@/config/routes';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { track } from '@/services/analytics/track';
import { setTaskCompleted } from '@/services/tasks/task.service';

/** Marcar y desmarcar tareas del plan. */
export async function toggleTaskAction(
  taskId: string,
  completed: boolean,
): Promise<ActionResult<{ completed: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  try {
    const task = await setTaskCompleted(user.id, taskId, completed);

    if (completed) {
      await track('complete_task', user.id, {
        exam_id: task.exam_id,
        type: task.type,
        minutes: task.duration_minutes,
      });
    }

    revalidatePath(routes.dashboard);
    revalidatePath(routes.plan);
    revalidatePath(`${routes.plan}/${task.exam_id}`);
    revalidatePath(routes.progress);

    return actionOk({ completed: task.status === 'completed' });
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }
}
