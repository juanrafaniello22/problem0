import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { supabasePublicEnv } from '@/config/env';
import type { Database } from '@/types/database';

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * La sesión vive en cookies httpOnly gestionadas por @supabase/ssr.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabasePublicEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Los Server Components no pueden escribir cookies. El middleware
          // ya se encarga de refrescar la sesión, así que ignoramos el error.
        }
      },
    },
  });
}
