import { describe, expect, it } from 'vitest';
import { faqItems } from '@/config/faq';
import { getPlanPrice } from '@/config/pricing';
import {
  faqPageSchema,
  organizationSchema,
  serializeJsonLd,
  softwareApplicationSchema,
  websiteSchema,
} from '@/lib/structured-data';

describe('datos estructurados', () => {
  it('describe la aplicación con los precios reales', () => {
    const schema = softwareApplicationSchema();
    const offers = schema.offers as { name: string; price: string; priceCurrency: string }[];

    const monthly = getPlanPrice('pro', 'month');
    const yearly = getPlanPrice('pro', 'year');

    expect(offers.map((offer) => offer.price)).toEqual([
      '0',
      (monthly!.amountCents / 100).toFixed(2),
      (yearly!.amountCents / 100).toFixed(2),
    ]);
    expect(offers.every((offer) => offer.priceCurrency === 'EUR')).toBe(true);
  });

  it('no declara valoraciones ni número de usuarios', () => {
    // La ley prohíbe inventarlas y la especificación lo prohíbe explícitamente.
    const serialized = serializeJsonLd([
      softwareApplicationSchema(),
      organizationSchema(),
      websiteSchema(),
      faqPageSchema(),
    ]);

    for (const forbidden of [
      'aggregateRating',
      'ratingValue',
      'reviewCount',
      'userInteractionCount',
      'award',
      'review',
    ]) {
      expect(serialized, forbidden).not.toContain(forbidden);
    }
  });

  it('el FAQ marcado coincide con el FAQ visible', () => {
    const schema = faqPageSchema();
    const questions = schema.mainEntity as {
      name: string;
      acceptedAnswer: { text: string };
    }[];

    expect(questions).toHaveLength(faqItems.length);
    expect(questions.map((item) => item.name)).toEqual(faqItems.map((item) => item.question));
    expect(questions.map((item) => item.acceptedAnswer.text)).toEqual(
      faqItems.map((item) => item.answer),
    );
  });

  it('escapa el signo de menor para no poder cerrar el script', () => {
    const serialized = serializeJsonLd({ name: '</script><img onerror=alert(1)>' });
    expect(serialized).not.toContain('</script>');
    expect(serialized).toContain('\\u003c');
    expect(JSON.parse(serialized)).toEqual({ name: '</script><img onerror=alert(1)>' });
  });

  it('todos los esquemas declaran su contexto', () => {
    for (const schema of [
      softwareApplicationSchema(),
      organizationSchema(),
      websiteSchema(),
      faqPageSchema(),
    ]) {
      expect(schema['@context']).toBe('https://schema.org');
      expect(typeof schema['@type']).toBe('string');
    }
  });
});
