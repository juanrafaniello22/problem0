import 'server-only';

import { AIProviderError, type AIProvider } from '../provider';

/**
 * Hueco para OpenAI.
 *
 * La arquitectura ya lo contempla: implementar `generateJson` con
 * `response_format: { type: 'json_schema' }` y traducir los errores del SDK a
 * `AIProviderError`, igual que hace el proveedor de Anthropic. No hace falta
 * tocar nada más de la aplicación.
 */
export function createOpenAIProvider(options: { apiKey: string; model: string }): AIProvider {
  return {
    id: 'openai',
    model: options.model,
    async generateJson() {
      throw new AIProviderError(
        'openai',
        'not_implemented',
        'El proveedor OpenAI todavía no está implementado.',
      );
    },
  };
}
