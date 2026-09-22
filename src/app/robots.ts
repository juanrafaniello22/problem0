import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Las zonas privadas no aportan nada en buscadores.
      disallow: [
        '/dashboard',
        '/plan',
        '/habits',
        '/focus',
        '/progress',
        '/settings',
        '/onboarding',
        '/upgrade',
        '/success',
        '/admin',
        '/api/',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
