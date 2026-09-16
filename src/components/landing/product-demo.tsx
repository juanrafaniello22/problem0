import {
  ArrowDownIcon,
  CalendarDaysIcon,
  ClockIcon,
  ListIcon,
  SparklesIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Demo visual del producto: entradas desordenadas → plan concreto.
 * Es una representación estática del flujo real, no datos de un usuario.
 */

const topics = ['Derivadas', 'Integrales', 'Límites', 'Probabilidad', 'Estadística'];

const planDays = [
  { day: 'Lunes', topic: 'Derivadas', minutes: 45, tone: 'study' },
  { day: 'Martes', topic: 'Integrales', minutes: 45, tone: 'study' },
  { day: 'Miércoles', topic: 'Límites', minutes: 30, tone: 'study' },
  { day: 'Jueves', topic: 'Probabilidad', minutes: 45, tone: 'study' },
  { day: 'Viernes', topic: 'Repaso general', minutes: 45, tone: 'review' },
] as const;

function InputCard({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-sm', className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function ProductDemo() {
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="grid gap-4 sm:grid-cols-3">
        <InputCard icon={CalendarDaysIcon} label="Examen">
          <p className="text-base font-semibold">Matemáticas</p>
          <p className="mt-0.5 text-sm text-muted-foreground">15 de octubre</p>
        </InputCard>

        <InputCard icon={ListIcon} label="Temas">
          <ul className="flex flex-wrap gap-1.5">
            {topics.map((topic) => (
              <li
                key={topic}
                className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
              >
                {topic}
              </li>
            ))}
          </ul>
        </InputCard>

        <InputCard icon={ClockIcon} label="Disponibilidad">
          <p className="text-base font-semibold">1 hora al día</p>
          <p className="mt-0.5 text-sm text-muted-foreground">De lunes a viernes</p>
        </InputCard>
      </div>

      <div className="relative my-5 flex flex-col items-center gap-2" aria-hidden>
        <ArrowDownIcon className="size-5 text-muted-foreground/60" />
        <div className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25">
          <SparklesIcon className="size-4" />
          Crear mi plan
        </div>
        <ArrowDownIcon className="size-5 text-muted-foreground/60" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-lg shadow-black/[0.04] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-3">
          <p className="text-sm font-semibold">Planora crea tu plan</p>
          <p className="text-xs text-muted-foreground">5 sesiones · 3 h 30 min en total</p>
        </div>

        <ul className="flex flex-col gap-2">
          {planDays.map((entry) => (
            <li
              key={entry.day}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface p-3 sm:p-3.5"
            >
              <span
                className={cn(
                  'size-2.5 shrink-0 rounded-full',
                  entry.tone === 'review' ? 'bg-success' : 'bg-primary',
                )}
                aria-hidden
              />
              <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground sm:w-24 sm:text-sm">
                {entry.day}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.topic}</span>
              <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {entry.minutes} min
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
