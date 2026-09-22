import { faqItems } from '@/config/faq';
import { getPlan } from '@/config/pricing';
import { absoluteUrl, siteConfig } from '@/config/site';

/**
 * Datos estructurados (schema.org) para buscadores.
 *
 * Regla que no se salta: todo sale de la configuración real. Nada de
 * valoraciones, número de usuarios ni premios inventados; eso es mentir a
 * Google y al que lee el resultado.
 */

export type JsonLdObject = Record<string, unknown>;

/** Precio en el formato que espera schema.org: punto decimal, dos cifras. */
function schemaPrice(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

export function organizationSchema(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/icon.svg'),
    description: siteConfig.description,
  };
}

export function websiteSchema(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: absoluteUrl('/'),
    inLanguage: siteConfig.lang,
    description: siteConfig.description,
  };
}

export function softwareApplicationSchema(): JsonLdObject {
  const pro = getPlan('pro');

  const offers: JsonLdObject[] = [
    {
      '@type': 'Offer',
      name: 'Free',
      price: '0',
      priceCurrency: 'EUR',
      description: 'Plan gratuito con 1 examen activo y 3 planes generados con IA al mes.',
      url: absoluteUrl('/pricing'),
    },
    ...pro.prices.map((price) => ({
      '@type': 'Offer',
      name: `Pro ${price.interval === 'month' ? 'mensual' : 'anual'}`,
      price: schemaPrice(price.amountCents),
      priceCurrency: price.currency,
      url: absoluteUrl('/pricing'),
    })),
  ];

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    description: siteConfig.description,
    url: absoluteUrl('/'),
    inLanguage: siteConfig.lang,
    featureList: pro.features,
    offers,
  };
}

/**
 * FAQ en formato rico.
 *
 * Usa exactamente los mismos textos que se ven en la página: las directrices
 * de Google exigen que el marcado sea visible para quien entra.
 */
export function faqPageSchema(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

/**
 * Serializa para incrustar en un `<script>`.
 *
 * Se escapa `<` para que ninguna cadena pueda cerrar la etiqueta antes de
 * tiempo. Hoy todo el contenido es nuestro, pero el día que alguien meta aquí
 * un texto de usuario esto es lo que evita un XSS.
 */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
