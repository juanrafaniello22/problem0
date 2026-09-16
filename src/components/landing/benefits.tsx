import { CheckIcon } from 'lucide-react';
import { Section } from '@/components/landing/section';

const benefits = [
  {
    title: 'Dejas de perder tiempo decidiendo',
    description:
      'La decisión de «qué estudio hoy» ya está tomada cuando abres la app. Ese rato de duda es el que normalmente acaba en el móvil.',
  },
  {
    title: 'Llegas al examen con todo repartido',
    description:
      'Nada de meter cinco temas en la última tarde. Planora reparte el temario entre los días que tienes de verdad.',
  },
  {
    title: 'Retrasarte deja de ser un drama',
    description:
      'Un mal día no rompe el plan. Se reorganiza con lo que queda y sigues desde donde estás.',
  },
  {
    title: 'Ves que avanzas',
    description:
      'Tiempo estudiado, temas cerrados y racha. Sesión a sesión, el progreso deja de ser una sensación.',
  },
];

export function Benefits() {
  return (
    <Section className="bg-surface-muted/40">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">
            Beneficios
          </span>
          <h2 className="text-3xl font-bold sm:text-4xl">
            El objetivo no es estudiar más. Es dejar de estudiar a ciegas.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            La mayoría de estudiantes no falla por falta de horas: falla porque no sabe cómo
            repartirlas. Planora resuelve exactamente eso.
          </p>
        </div>

        <ul className="flex flex-col gap-5">
          {benefits.map((benefit) => (
            <li key={benefit.title} className="flex gap-4">
              <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-semibold">{benefit.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
