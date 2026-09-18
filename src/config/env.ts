import { z } from 'zod';

/**
 * Variables de entorno PÚBLICAS.
 *
 * Este módulo sí puede importarse desde componentes de cliente, así que aquí
 * no hay ni un secreto ni el esquema que los describe: eso vive en
 * `env.server.ts`, que lleva `server-only`. Tenerlo separado evita que el
 * esquema del servidor acabe empaquetado en el JavaScript del navegador.
 *
 * Las variables NEXT_PUBLIC_* se leen de forma estática para que Next.js
 * pueda inlinearlas en el bundle de cliente.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const rawPublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

const parsedPublicEnv = publicSchema.safeParse(rawPublicEnv);

export const publicEnv = parsedPublicEnv.success ? parsedPublicEnv.data : rawPublicEnv;

/** ¿Hay credenciales públicas de Supabase disponibles? */
export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Credenciales públicas de Supabase. Lanza si faltan: preferimos un error
 * explícito en el servidor a una pantalla en blanco sin explicación.
 */
export function supabasePublicEnv(): { url: string; anonKey: string } {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (ver .env.example).',
    );
  }

  return { url, anonKey };
}

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
