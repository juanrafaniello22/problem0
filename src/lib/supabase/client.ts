'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabasePublicEnv } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Cliente de Supabase para el navegador.
 * Sólo usa la anon key: las políticas RLS hacen el resto del trabajo.
 */
export function createClient() {
  const { url, anonKey } = supabasePublicEnv();
  return createBrowserClient<Database>(url, anonKey);
}
