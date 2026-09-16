/**
 * Identidad y metadatos de Planora.
 * Única fuente de verdad para nombre, tagline, URLs y navegación pública.
 */

export const siteConfig = {
  name: 'Planora',
  tagline: 'Tu plan de estudio. Creado por IA.',
  description:
    'Dile a Planora qué tienes que estudiar y cuándo tienes el examen. La IA convierte todo en un plan diario que puedes seguir.',
  locale: 'es_ES',
  lang: 'es',
  keywords: [
    'plan de estudio',
    'plan de estudio con IA',
    'organizar estudios',
    'planificador de estudio',
    'IA para estudiar',
    'hábitos de estudio',
    'preparar exámenes',
  ],
  links: {
    support: 'mailto:hola@planora.app',
  },
} as const;

/**
 * URL base de la aplicación. Nunca asumir un dominio concreto:
 * en Vercel se resuelve por variable de entorno y en local cae a localhost.
 */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}

/** Construye una URL absoluta a partir de una ruta relativa de la app. */
export function absoluteUrl(path: string): string {
  const base = getAppUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
