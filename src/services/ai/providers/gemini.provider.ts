import 'server-only';

import { AIProviderError, type AIProvider } from '../provider';

/**
 * Hueco para Google Gemini.
 *
 * Implementar `generateJson` con `responseMimeType: 'application/json'` y
 * `responseSchema`, traduciendo los errores a `AIProviderError`.
 */
export function createGeminiProvider(options: { apiKey: string; model: string }): AIProvider {
  return {
    id: 'gemini',
    model: options.model,
    async generateJson() {
      throw new AIProviderError(
        'gemini',
        'not_implemented',
        'El proveedor Gemini todavía no está implementado.',
      );
    },
  };
}
