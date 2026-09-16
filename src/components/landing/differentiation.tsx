import { CheckIcon, XIcon } from 'lucide-react';
import { Section, SectionHeading } from '@/components/landing/section';

const others = [
  'Te dan una pizarra en blanco y tú te organizas',
  'Tareas sueltas sin relación con tu examen',
  'Un temporizador que no sabe qué estás estudiando',
  'Si te retrasas, el plan se queda obsoleto',
];

const planora = [
  'Partes de tu examen y tus temas, no de una plantilla',
  'Cada tarea viene de un plan con fecha límite real',
  'El Focus registra tiempo sobre la tarea concreta',
  'Si te retrasas, la IA rehace el plan con lo que queda',
];

export function Differentiation() {
  return (
    <Section>
      <SectionHeading
        eyebrow="Diferencia"
        title="No es otra app de tareas"
        description="Las apps de productividad te dan herramientas. Planora te da un plan."
      />

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface-muted/60 p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Una app de tareas o un calendario
          </h3>
          <ul className="mt-5 flex flex-col gap-3.5">
            {others.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                <XIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-primary/25 bg-card p-6 shadow-sm shadow-primary/5">
          <h3 className="text-sm font-semibold text-primary">Planora</h3>
          <ul className="mt-5 flex flex-col gap-3.5">
            {planora.map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
