import { ChevronDownIcon } from 'lucide-react';
import { Section, SectionHeading } from '@/components/landing/section';
import { faqItems } from '@/config/faq';

export function Faq() {
  return (
    <Section id="faq">
      <SectionHeading eyebrow="FAQ" title="Preguntas frecuentes" />

      <div className="mx-auto mt-10 flex w-full max-w-3xl flex-col gap-3">
        {faqItems.map((faq) => (
          <details
            key={faq.question}
            className="group rounded-xl border border-border bg-card px-5 py-1 shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-medium [&::-webkit-details-marker]:hidden">
              {faq.question}
              <ChevronDownIcon
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
