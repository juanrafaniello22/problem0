import {
  BarChart3Icon,
  CalendarDaysIcon,
  FlameIcon,
  RefreshCwIcon,
  SparklesIcon,
  TimerIcon,
} from 'lucide-react';
import { Section, SectionHeading } from '@/components/landing/section';

const features = [
  {
    icon: SparklesIcon,
    title: 'Plan generado con IA',
    description:
      'Reparte tus temas entre los días que te quedan según tu tiempo real y la dificultad del examen.',
  },
  {
    icon: CalendarDaysIcon,
    title: 'Tareas de hoy',
    description:
      'Abres la app y ves exactamente qué estudiar y cuántos minutos necesitas. Nada más.',
  },
  {
    icon: RefreshCwIcon,
    title: 'Reorganización automática',
    description:
      '¿Te has retrasado? Pulsa un botón y la IA reconstruye el plan con los días que te quedan.',
  },
  {
    icon: TimerIcon,
    title: 'Modo Focus',
    description:
      'Pomodoro de 25, 50 o los minutos que quieras. El tiempo real estudiado se guarda en tu progreso.',
  },
  {
    icon: FlameIcon,
    title: 'Hábitos y rachas',
    description:
      'Crea hábitos pequeños y mantén la constancia. Sin puntos, sin ruido: sólo lo que ayuda.',
  },
  {
    icon: BarChart3Icon,
    title: 'Progreso real',
    description:
      'Tiempo estudiado, tareas completadas y avance por asignatura. Datos tuyos, no estimaciones.',
  },
];

export function Features() {
  return (
    <Section id="funcionalidades">
      <SectionHeading
        eyebrow="Funcionalidades"
        title="Pocas cosas, muy bien hechas"
        description="Planora no intenta ser tu calendario, tu gestor de tareas y tu app de notas. Hace una cosa: convertir tu examen en un plan que puedes seguir."
      />

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <feature.icon className="size-[1.15rem]" aria-hidden />
            </span>
            <h3 className="text-base font-semibold">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
          </article>
        ))}
      </div>
    </Section>
  );
}
