import 'server-only';

import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { ProfileRow, SubjectRow, UserSettingsRow } from '@/types/database';
import { normalizeSubjects, type OnboardingInput } from '@/validation/onboarding';

/**
 * Acceso a perfil, ajustes y asignaturas.
 * Los componentes nunca hablan con Supabase directamente: pasan por aquí.
 */

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    logger.error('No se pudo leer el perfil', { code: error.code });
    throw new AppError('unknown', 'No hemos podido cargar tu perfil.');
  }

  return data ?? null;
}

export async function getUserSettings(userId: string): Promise<UserSettingsRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('No se pudieron leer los ajustes', { code: error.code });
    return null;
  }

  return data ?? null;
}

export async function listSubjects(userId: string): Promise<SubjectRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('No se pudieron leer las asignaturas', { code: error.code });
    return [];
  }

  return data ?? [];
}

/**
 * Crea las asignaturas que falten. Idempotente: si ya existe una con el
 * mismo nombre (sin distinguir mayúsculas), la ignora.
 */
export async function ensureSubjects(userId: string, names: string[]): Promise<void> {
  const clean = normalizeSubjects(names);
  if (clean.length === 0) return;

  const existing = await listSubjects(userId);
  const existingKeys = new Set(existing.map((subject) => subject.name.trim().toLowerCase()));

  const toCreate = clean
    .filter((name) => !existingKeys.has(name.toLowerCase()))
    .map((name) => ({ user_id: userId, name }));

  if (toCreate.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase.from('subjects').insert(toCreate);

  if (error) {
    logger.error('No se pudieron crear las asignaturas', { code: error.code });
    throw new AppError('unknown', 'No hemos podido guardar tus asignaturas.');
  }
}

/** Guarda el onboarding completo y marca el perfil como completado. */
export async function completeOnboarding(
  userId: string,
  input: OnboardingInput,
): Promise<ProfileRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName,
      education_level: input.educationLevel,
      primary_goal: input.primaryGoal,
      daily_minutes_available: input.dailyMinutes,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    logger.error('No se pudo completar el onboarding', { code: error?.code });
    throw new AppError('unknown', 'No hemos podido guardar tus respuestas.');
  }

  await ensureSubjects(userId, input.subjects);

  return data;
}

/** Marca el onboarding como saltado sin pedir más datos. */
export async function skipOnboarding(userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    logger.error('No se pudo saltar el onboarding', { code: error.code });
    throw new AppError('unknown', 'No hemos podido continuar. Inténtalo de nuevo.');
  }
}

export interface ProfileUpdateInput {
  fullName?: string;
  educationLevel?: ProfileRow['education_level'];
  primaryGoal?: ProfileRow['primary_goal'];
  dailyMinutes?: number;
  timezone?: string;
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<ProfileRow> {
  const supabase = await createClient();

  const payload: Partial<ProfileRow> = {};
  if (input.fullName !== undefined) payload.full_name = input.fullName;
  if (input.educationLevel !== undefined) payload.education_level = input.educationLevel;
  if (input.primaryGoal !== undefined) payload.primary_goal = input.primaryGoal;
  if (input.dailyMinutes !== undefined) payload.daily_minutes_available = input.dailyMinutes;
  if (input.timezone !== undefined) payload.timezone = input.timezone;

  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    logger.error('No se pudo actualizar el perfil', { code: error?.code });
    throw new AppError('unknown', 'No hemos podido guardar los cambios.');
  }

  return data;
}
