/**
 * Abstracción del proveedor de IA.
 *
 * La aplicación no habla nunca con un SDK concreto: pide JSON estructurado a
 * esta interfaz. Cambiar de Anthropic a OpenAI o Gemini debe ser cambiar una
 * variable de entorno, no reescribir la aplicación.
 *
 * Reglas que cumple cualquier implementación:
 * - Recibe un JSON Schema y devuelve JSON ya parseado, nunca texto libre.
 * - No valida el contenido: de eso se encarga quien llama, con Zod.
 * - Traduce los errores del proveedor a `AIProviderError`, para que arriba
 *   nadie tenga que conocer los códigos de error de cada SDK.
 */

export type AIProviderId = 'anthropic' | 'openai' | 'gemini';

/** Esfuerzo de razonamiento. Más esfuerzo: mejor plan, más lento y más caro. */
export type AIEffort = 'low' | 'medium' | 'high';

export interface AIJsonRequest {
  /** Instrucciones del sistema. Nunca contiene datos escritos por el usuario. */
  system: string;
  /** Mensaje con los datos del examen, claramente delimitados. */
  prompt: string;
  /** Esquema al que debe ajustarse la respuesta. */
  jsonSchema: Record<string, unknown>;
  /** Nombre del esquema, que algunos proveedores exigen. */
  schemaName: string;
  maxTokens: number;
  effort: AIEffort;
  /** Corta la petición si tarda demasiado; el usuario está esperando. */
  timeoutMs: number;
}

export interface AIUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
}

export interface AIJsonResponse {
  /** JSON ya parseado. Sin validar: eso lo hace quien llama. */
  data: unknown;
  usage: AIUsage;
  model: string;
}

export interface AIProvider {
  readonly id: AIProviderId;
  readonly model: string;
  generateJson(request: AIJsonRequest): Promise<AIJsonResponse>;
}

export type AIErrorCode =
  | 'not_configured'
  | 'not_implemented'
  | 'auth'
  | 'rate_limited'
  | 'timeout'
  | 'overloaded'
  | 'refused'
  | 'empty_response'
  | 'invalid_json'
  | 'truncated'
  | 'unknown';

/**
 * Error de proveedor ya traducido.
 * `code` es corto y estable: se guarda en `ai_generations.error_code` y nunca
 * lleva datos del usuario ni el mensaje crudo del proveedor.
 */
export class AIProviderError extends Error {
  readonly code: AIErrorCode;
  readonly provider: AIProviderId;
  /** ¿Merece la pena reintentar con el mismo proveedor? */
  readonly retryable: boolean;

  constructor(
    provider: AIProviderId,
    code: AIErrorCode,
    message: string,
    options: { retryable?: boolean } = {},
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.provider = provider;
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}
