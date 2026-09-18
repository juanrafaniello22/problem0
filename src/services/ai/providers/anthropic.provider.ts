import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import {
  AIProviderError,
  type AIJsonRequest,
  type AIJsonResponse,
  type AIProvider,
} from '../provider';

/**
 * Proveedor Anthropic (Claude).
 *
 * Usa structured outputs (`output_config.format`) para que la respuesta llegue
 * ya como JSON que cumple el esquema, en lugar de pedir JSON por texto y
 * cruzar los dedos.
 *
 * Opcionalmente activa el fallback de rechazo del servidor: si los
 * clasificadores de seguridad declinan la petición, Anthropic la reintenta con
 * otro modelo dentro de la misma llamada. Planora tiene además su propio
 * respaldo local, así que esto es una red de seguridad extra, no la única.
 */

const REFUSAL_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

interface AnthropicProviderOptions {
  apiKey: string;
  model: string;
  /** Fallback de rechazo del servidor. Usa API en beta. */
  refusalFallback: boolean;
}

/** Traduce los errores del SDK a códigos estables nuestros. */
function translateError(error: unknown): AIProviderError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new AIProviderError('anthropic', 'auth', 'Credenciales de IA inválidas.');
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new AIProviderError('anthropic', 'rate_limited', 'Proveedor saturado.', {
      retryable: true,
    });
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AIProviderError('anthropic', 'timeout', 'La IA ha tardado demasiado.', {
      retryable: true,
    });
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new AIProviderError('anthropic', 'timeout', 'No se pudo contactar con la IA.', {
      retryable: true,
    });
  }
  if (error instanceof Anthropic.APIError) {
    const retryable = typeof error.status === 'number' && error.status >= 500;
    return new AIProviderError(
      'anthropic',
      retryable ? 'overloaded' : 'unknown',
      'El proveedor de IA ha devuelto un error.',
      { retryable },
    );
  }
  return new AIProviderError('anthropic', 'unknown', 'Error inesperado del proveedor de IA.');
}

export function createAnthropicProvider(options: AnthropicProviderOptions): AIProvider {
  const client = new Anthropic({
    apiKey: options.apiKey,
    // Un reintento automático del SDK; el resto lo decide el generador.
    maxRetries: 1,
  });

  return {
    id: 'anthropic',
    model: options.model,

    async generateJson(request: AIJsonRequest): Promise<AIJsonResponse> {
      let message: Anthropic.Beta.BetaMessage;

      try {
        message = await client.beta.messages.create(
          {
            model: options.model,
            max_tokens: request.maxTokens,
            system: request.system,
            messages: [{ role: 'user', content: request.prompt }],
            thinking: { type: 'adaptive' },
            output_config: {
              effort: request.effort,
              format: { type: 'json_schema', schema: request.jsonSchema },
            },
            ...(options.refusalFallback
              ? { betas: [REFUSAL_FALLBACK_BETA], fallbacks: 'default' as const }
              : {}),
          },
          { timeout: request.timeoutMs },
        );
      } catch (error) {
        throw translateError(error);
      }

      // Los clasificadores de seguridad pueden declinar una petición: llega con
      // HTTP 200, así que hay que comprobarlo antes de leer el contenido.
      if (message.stop_reason === 'refusal') {
        throw new AIProviderError(
          'anthropic',
          'refused',
          'El proveedor ha rechazado generar este plan.',
        );
      }

      if (message.stop_reason === 'max_tokens') {
        throw new AIProviderError(
          'anthropic',
          'truncated',
          'La respuesta se ha cortado por longitud.',
          { retryable: true },
        );
      }

      const text = message.content
        .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      if (!text.trim()) {
        throw new AIProviderError('anthropic', 'empty_response', 'La IA no ha devuelto nada.', {
          retryable: true,
        });
      }

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new AIProviderError(
          'anthropic',
          'invalid_json',
          'La IA ha devuelto algo que no es JSON.',
          { retryable: true },
        );
      }

      return {
        data,
        // El modelo que responde puede no ser el pedido si actuó el fallback.
        model: message.model,
        usage: {
          inputTokens: message.usage.input_tokens ?? null,
          outputTokens: message.usage.output_tokens ?? null,
          cachedInputTokens: message.usage.cache_read_input_tokens ?? null,
        },
      };
    },
  };
}
