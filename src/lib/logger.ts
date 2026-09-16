import { isProduction } from '@/config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const SENSITIVE_KEYS = [
  'password',
  'token',
  'apikey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'access_token',
  'refresh_token',
  'service_role',
];

/** Elimina del contexto cualquier valor que parezca un secreto. */
function redact(context: LogContext): LogContext {
  const safe: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.some((needle) => key.toLowerCase().includes(needle))) {
      safe[key] = '[redacted]';
      continue;
    }
    safe[key] = value instanceof Error ? value.message : value;
  }
  return safe;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const payload = {
    level,
    message,
    ...(context ? redact(context) : {}),
    at: new Date().toISOString(),
  };

  if (level === 'error') {
    console.error(JSON.stringify(payload));
    return;
  }
  if (level === 'warn') {
    console.warn(JSON.stringify(payload));
    return;
  }
  if (isProduction && level === 'debug') return;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};
