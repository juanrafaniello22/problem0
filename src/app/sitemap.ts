import type { MetadataRoute } from 'next';
import { routes } from '@/config/routes';
import { absoluteUrl } from '@/config/site';

/** Sólo páginas públicas. Se ampliará con las landings SEO. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { url: absoluteUrl(routes.home), lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl(routes.pricing), lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl(routes.login), lastModified, changeFrequency: 'yearly', priority: 0.4 },
    { url: absoluteUrl(routes.signup), lastModified, changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl(routes.privacy), lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl(routes.terms), lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl(routes.cookies), lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
