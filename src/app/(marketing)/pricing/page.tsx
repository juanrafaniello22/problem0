import type { Metadata } from 'next';
import { Faq } from '@/components/landing/faq';
import { PricingPlans } from '@/components/landing/pricing-plans';
import { Section, SectionHeading } from '@/components/landing/section';
import { absoluteUrl } from '@/config/site';

export const metadata: Metadata = {
  title: 'Precios',
  description:
    'Planora es gratis para empezar: 1 examen activo y 3 planes con IA al mes. Pasa a Pro cuando necesites más.',
  alternates: { canonical: absoluteUrl('/pricing') },
};

export default function PricingPage() {
  return (
    <>
      <Section className="pt-14 sm:pt-20">
        <SectionHeading
          eyebrow="Precios"
          title="Empieza gratis. Pasa a Pro cuando lo necesites."
          description="Puedes preparar tu próximo examen entero sin pagar nada. Sin tarjeta para registrarte."
        />
        <div className="mt-12">
          <PricingPlans />
        </div>
      </Section>
      <Faq />
    </>
  );
}
