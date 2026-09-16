import { PricingPlans } from '@/components/landing/pricing-plans';
import { Section, SectionHeading } from '@/components/landing/section';

export function PricingSection() {
  return (
    <Section id="precios">
      <SectionHeading
        eyebrow="Precios"
        title="Empieza gratis. Pasa a Pro cuando lo necesites."
        description="Puedes preparar tu próximo examen entero sin pagar nada."
      />
      <div className="mt-12">
        <PricingPlans />
      </div>
    </Section>
  );
}
