import { serializeJsonLd, type JsonLdObject } from '@/lib/structured-data';

/**
 * Inserta datos estructurados en la página.
 *
 * Es el único sitio de la app que usa `dangerouslySetInnerHTML`, y lo hace
 * sobre JSON serializado y escapado por `serializeJsonLd`.
 */
export function JsonLd({ data }: { data: JsonLdObject | JsonLdObject[] }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
  );
}
