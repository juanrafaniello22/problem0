import { CalendarPlusIcon, ListChecksIcon, SparklesIcon } from 'lucide-react';
import { Section, SectionHeading } from '@/components/landing/section';

const steps = [
  {
    icon: CalendarPlusIcon,
    title: 'Crea tu examen',
    description:
      'Asignatura, fecha y dificultad. Treinta segundos y Planora ya sabe contra qué reloj juegas.',
  },
  {
    icon: ListChecksIcon,
    title: 'Añade tus temas y tu tiempo',
    description:
      'Escribe lo que entra y cuántos minutos puedes dedicarle al día. Sin rellenar formularios eternos.',
  },
  {
    icon: SparklesIcon,
    title: 'Recibe tu plan diario',
    description:
      'La IA reparte los temas entre los días que te quedan y reserva tiempo de repaso. Abres Planora y sabes qué toca hoy.',
  },
];

export function HowItWorks() {
  return (
    <Section id="como-funciona" className="bg-surface-muted/40">
      <SectionHeading
        eyebrow="Cómo funciona"
        title="De «no sé por dónde empezar» a saber qué toca hoy"
        description="Tres pasos. Ni tableros que configurar, ni plantillas que rellenar."
      />

      <ol className="mt-12 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <step.icon className="size-5" aria-hidden />
              </span>
              <span className="font-display text-3xl font-bold text-border" aria-hidden>
                {index + 1}
              </span>
            </div>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
