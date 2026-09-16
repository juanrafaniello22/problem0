import { z } from 'zod';

/**
 * Acceso tipado a variables de entorno.
 *
 * Reglas:
 * - Las variables NEXT_PUBLIC_* se leen de forma estática para que Next.js
 *   pueda inlinearlas en el bundle de cliente.
 * - Los secretos se leen SOLO mediante `serverEnv()`, que nunca debe
 *   importarse desde un componente de cliente.
 * - La validación es perezosa: el build no debe romperse por falta de
 *   credenciales, pero cualquier uso en runtime falla con un mensaje claro.
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

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_YEARLY: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'gemini']).optional(),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cachedServerEnv: ServerEnv | null = null;

/** Variables de entorno de servidor. Nunca llamar desde código de cliente. */
export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() no puede usarse en el navegador.');
  }
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Variables de entorno de servidor inválidas: ${parsed.error.message}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/**
 * Lee un secreto obligatorio en servidor y falla con un mensaje accionable
 * si no existe, en lugar de propagar `undefined`.
 */
export function requireServerEnv<K extends keyof ServerEnv>(key: K): NonNullable<ServerEnv[K]> {
  const value = serverEnv()[key];
  if (value === undefined || value === null || value === '') {
    throw new Error(`Falta la variable de entorno ${String(key)} (ver .env.example).`);
  }
  return value as NonNullable<ServerEnv[K]>;
}

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';
