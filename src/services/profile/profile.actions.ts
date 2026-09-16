'use server';

import { revalidatePath } from 'next/cache';
import { routes } from '@/config/routes';
import { actionError, actionOk, toUserMessage, type ActionResult } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { updateProfile } from '@/services/profile/profile.service';
import { profileSettingsSchema } from '@/validation/profile';

export async function updateProfileAction(
  _prevState: ActionResult<undefined> | null,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return actionError('Tu sesión ha caducado. Vuelve a entrar.', 'unauthenticated');

  const rawMinutes = formData.get('dailyMinutes');
  const parsed = profileSettingsSchema.safeParse({
    fullName: formData.get('fullName'),
    educationLevel: formData.get('educationLevel'),
    primaryGoal: formData.get('primaryGoal'),
    dailyMinutes: rawMinutes === null ? Number.NaN : Number(rawMinutes),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
    }
    return actionError('Revisa los datos.', 'validation', fieldErrors);
  }

  try {
    await updateProfile(user.id, {
      fullName: parsed.data.fullName,
      educationLevel: parsed.data.educationLevel,
      primaryGoal: parsed.data.primaryGoal,
      dailyMinutes: parsed.data.dailyMinutes,
    });
  } catch (error) {
    return actionError(toUserMessage(error), 'unknown');
  }

  revalidatePath(routes.settings);
  revalidatePath(routes.dashboard);
  return actionOk();
}
