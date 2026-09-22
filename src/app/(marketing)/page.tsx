import type { Metadata } from 'next';
import { Benefits } from '@/components/landing/benefits';
import { Differentiation } from '@/components/landing/differentiation';
import { Faq } from '@/components/landing/faq';
import { Features } from '@/components/landing/features';
import { FinalCta } from '@/components/landing/final-cta';
import { Hero } from '@/components/landing/hero';
import { HowItWorks } from '@/components/landing/how-it-works';
import { PricingSection } from '@/components/landing/pricing-section';
import { Trust } from '@/components/landing/trust';
import { JsonLd } from '@/components/shared/json-ld';
import { absoluteUrl, siteConfig } from '@/config/site';
import {
  faqPageSchema,
  organizationSchema,
  softwareApplicationSchema,
  websiteSchema,
} from '@/lib/structured-data';

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: absoluteUrl('/') },
};

export default function LandingPage() {
  return (
    <>
      <JsonLd
        data={[
          softwareApplicationSchema(),
          organizationSchema(),
          websiteSchema(),
          faqPageSchema(),
        ]}
      />
      <Hero />
      <HowItWorks />
      <Features />
      <Benefits />
      <Differentiation />
      <Trust />
      <PricingSection />
      <Faq />
      <FinalCta />
    </>
  );
}
