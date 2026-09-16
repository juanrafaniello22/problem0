import type { Metadata } from 'next';
import { Benefits } from '@/components/landing/benefits';
import { Differentiation } from '@/components/landing/differentiation';
import { Faq } from '@/components/landing/faq';
import { Features } from '@/components/landing/features';
import { FinalCta } from '@/components/landing/final-cta';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { PricingSection } from '@/components/landing/pricing-section';
import { Testimonials } from '@/components/landing/testimonials';
import { absoluteUrl, siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: absoluteUrl('/') },
};

/** Datos estructurados: ayudan a Google a entender qué es Planora. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteConfig.name,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  description: siteConfig.description,
  url: absoluteUrl('/'),
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
    description: 'Plan gratuito con 1 examen activo y 3 planes generados con IA al mes.',
  },
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // El contenido es estático y construido por nosotros, no entrada de usuario.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <HowItWorks />
      <Features />
      <Benefits />
      <Differentiation />
      <Testimonials />
      <PricingSection />
      <Faq />
      <FinalCta />
    </>
  );
}
