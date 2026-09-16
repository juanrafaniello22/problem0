/**
 * Valida rutas de redirección que vienen del cliente.
 * Evita open redirects: sólo se aceptan rutas internas absolutas.
 */
export function safeNextPath(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (!value.startsWith('/')) return fallback;
  // `//host` y `/\host` saldrían del dominio.
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (value.includes('://')) return fallback;
  return value;
}
