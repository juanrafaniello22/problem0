import 'server-only';

import { startOfMonth, todayIso } from '@/lib/date';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import type { AiGenerationRow, AiGenerationStatus, AiGenerationType } from '@/types/database';

/**
 * Consumo de IA.
 *
 * Sirve para aplicar los límites por plan y para saber cuánto cuesta la IA.
 * No se guarda ni el prompt ni la respuesta: sólo metadatos.
 */

export interface RecordGenerationInput {
  examId: string | null;
  type: AiGenerationType;
  status: AiGenerationStatus;
  provider: string;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  cachedInputTokens?: number | null;
  durationMs?: number | null;
  errorCode?: string | null;
}

/**
 * Registra un intento de generación.
 *
 * Nunca rompe el flujo: si falla el registro, el usuario ya tiene su plan y
 * no tiene sentido hacérselo pagar con un error.
 */
export async function recordGeneration(
  userId: string,
  input: RecordGenerationInput,
): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('ai_generations').insert({
      user_id: userId,
      exam_id: input.examId,
      type: input.type,
      status: input.status,
      provider: input.provider,
      model: input.model ?? null,
      input_tokens: input.inputTokens ?? null,
      output_tokens: input.outputTokens ?? null,
      cached_input_tokens: input.cachedInputTokens ?? null,
      duration_ms: input.durationMs ?? null,
      error_code: input.errorCode ?? null,
    });

    if (error) {
      logger.warn('No se pudo registrar el consumo de IA', { code: error.code });
    }
  } catch (error) {
    logger.warn('Registro de consumo de IA no disponible', {
      message: error instanceof Error ? error.message : 'desconocido',
    });
  }
}

/**
 * Generaciones con éxito del mes en curso.
 *
 * Sólo cuentan las que salieron bien: un fallo del proveedor no puede gastarle
 * la cuota a nadie. Contra el abuso está el rate limiting, no la cuota.
 */
export async function countGenerationsThisMonth(userId: string): Promise<number> {
  const supabase = await createClient();
  const monthStart = `${startOfMonth(todayIso())}T00:00:00.000Z`;

  const { count, error } = await supabase
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'success')
    .gte('created_at', monthStart);

  if (error) {
    logger.error('No se pudo contar el consumo de IA', { code: error.code });
    // Ante un fallo de lectura no bloqueamos al usuario: el rate limiting
    // sigue protegiendo de un uso desbocado.
    return 0;
  }

  return count ?? 0;
}

/** Últimas generaciones del usuario, para diagnóstico en Ajustes. */
export async function listRecentGenerations(
  userId: string,
  limit = 10,
): Promise<AiGenerationRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('ai_generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('No se pudieron leer las generaciones', { code: error.code });
    return [];
  }

  return data ?? [];
}
