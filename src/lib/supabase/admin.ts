import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireServerEnv, supabasePublicEnv } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Cliente con service role: SALTA RLS.
 *
 * Usar únicamente en código de servidor que ya haya autorizado la operación
 * (webhooks de Stripe, tareas administrativas, borrado de cuenta).
 * Nunca importar desde un componente de cliente: `server-only` lo impide
 * en tiempo de compilación.
 */
export function createAdminClient() {
  const { url } = supabasePublicEnv();
  const serviceRoleKey = requireServerEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
