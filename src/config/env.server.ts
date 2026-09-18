import 'server-only';

import { z } from 'zod';

/**
 * Variables de entorno de SERVIDOR.
 *
 * `server-only` hace que importar este módulo desde un componente de cliente
 * sea un error de compilación, así que ni los secretos ni el esquema que los
 * describe pueden llegar al navegador.
 *
 * La validación es perezosa: el build no debe romperse por falta de
 * credenciales, pero cualquier uso en runtime falla con un mensaje claro.
 */

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  STRIPE_PRICE_MONTHLY: z.string().min(1).optional(),
  STRIPE_PRICE_YEARLY: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(['openai', 'anthropic', 'gemini']).optional(),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),
  AI_EFFORT: z.enum(['low', 'medium', 'high']).optional(),
  // Fallback de rechazo del servidor de Anthropic. Usa API en beta: se puede
  // desactivar con "false" sin que Planora deje de funcionar.
  AI_REFUSAL_FALLBACK: z.enum(['true', 'false']).optional(),
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
