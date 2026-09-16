import { logger } from './logger';

/**
 * Errores de aplicación con un mensaje apto para el usuario final.
 * Nunca exponemos stack traces ni detalles internos al cliente.
 */

export type AppErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'rate_limited'
  | 'limit_reached'
  | 'ai_invalid_response'
  | 'ai_unavailable'
  | 'conflict'
  | 'unknown';

const statusByCode: Record<AppErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  rate_limited: 429,
  limit_reached: 402,
  ai_invalid_response: 502,
  ai_unavailable: 503,
  conflict: 409,
  unknown: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: AppErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = statusByCode[code];
    this.details = details;
  }
}

export const GENERIC_ERROR_MESSAGE =
  'Algo no ha salido como esperábamos. Inténtalo de nuevo en unos segundos.';

/**
 * Convierte cualquier excepción en un mensaje seguro para mostrar.
 * Los errores desconocidos se registran pero no se filtran al usuario.
 */
export function toUserMessage(error: unknown, fallback = GENERIC_ERROR_MESSAGE): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) {
    logger.error('Error no controlado', { message: error.message });
  } else {
    logger.error('Error no controlado', { value: String(error) });
  }
  return fallback;
}

/** Resultado explícito para server actions: evita lanzar hacia el cliente. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: AppErrorCode; fieldErrors?: Record<string, string[]> };

export function actionOk(): ActionResult<undefined>;
export function actionOk<T>(data: T): ActionResult<T>;
export function actionOk<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function actionError(
  error: string,
  code?: AppErrorCode,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return { ok: false, error, code, fieldErrors };
}
