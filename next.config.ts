import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad.
 *
 * Sobre la política de contenido (CSP): sólo se declaran las directivas que
 * se pueden cumplir de verdad. Next inyecta scripts y estilos en línea para
 * hidratar la página, así que un `script-src` sin `nonce` obligaría a poner
 * `'unsafe-inline'`, que es tanto como no poner nada. Mejor una política corta
 * que sí protege que una larga que aparenta.
 *
 * Lo que sí se cierra aquí: que otro sitio meta Planora en un iframe, que se
 * cambie la URL base de la página, que se envíe un formulario a un dominio
 * ajeno y que se carguen plugins.
 */
const contentSecurityPolicy = [
  // Sin `default-src`: haría de respaldo para `script-src` y `style-src`, y
  // bloquearía los scripts de hidratación de Next y los estilos en línea.
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Sólo tiene efecto sobre HTTPS; en local el navegador la ignora.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
