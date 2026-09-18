import 'server-only';

import { aiConfig } from '@/config/ai';
import { serverEnv } from '@/config/env.server';
import { logger } from '@/lib/logger';
import type { AIEffort, AIProvider, AIProviderId } from './provider';
import { createAnthropicProvider } from './providers/anthropic.provider';
import { createGeminiProvider } from './providers/gemini.provider';
import { createOpenAIProvider } from './providers/openai.provider';

/**
 * Selección del proveedor de IA.
 *
 * Es el único sitio que sabe qué proveedores existen. El resto de la
 * aplicación pide `getAIProvider()` y habla con la interfaz.
 *
 * Devuelve `null` si no hay clave configurada: Planora sigue funcionando con
 * el planificador local, así que no tiene sentido lanzar un error.
 */

let cached: { provider: AIProvider; key: string } | null = null;

export function isAIConfigured(): boolean {
  try {
    return Boolean(serverEnv().AI_API_KEY);
  } catch {
    return false;
  }
}

export function getAIProvider(): AIProvider | null {
  const env = serverEnv();
  const apiKey = env.AI_API_KEY;
  if (!apiKey) return null;

  const id: AIProviderId = env.AI_PROVIDER ?? aiConfig.defaultProvider;
  const model = env.AI_MODEL ?? aiConfig.defaultModels[id];
  const refusalFallback = env.AI_REFUSAL_FALLBACK !== 'false';

  // La clave nunca entra en la caché: sólo una huella de la configuración.
  const cacheKey = `${id}:${model}:${refusalFallback}`;
  if (cached?.key === cacheKey) return cached.provider;

  let provider: AIProvider;
  switch (id) {
    case 'anthropic':
      provider = createAnthropicProvider({ apiKey, model, refusalFallback });
      break;
    case 'openai':
      provider = createOpenAIProvider({ apiKey, model });
      break;
    case 'gemini':
      provider = createGeminiProvider({ apiKey, model });
      break;
    default: {
      const exhaustive: never = id;
      logger.error('Proveedor de IA desconocido', { provider: String(exhaustive) });
      return null;
    }
  }

  cached = { provider, key: cacheKey };
  return provider;
}

export function getAIEffort(): AIEffort {
  try {
    return serverEnv().AI_EFFORT ?? aiConfig.defaultEffort;
  } catch {
    return aiConfig.defaultEffort;
  }
}

/** Sólo para tests: olvida el proveedor cacheado. */
export function resetAIProviderCache(): void {
  cached = null;
}
