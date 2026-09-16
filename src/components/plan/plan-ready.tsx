'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, CheckCircle2Icon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { routes } from '@/config/routes';
import { formatMinutes } from '@/lib/date';

/**
 * Confirmación tras generar el primer plan.
 *
 * Es el momento en que el usuario ve por primera vez el valor de Planora,
 * así que resume lo que acaba de recibir y le empuja a empezar.
 */
export function PlanReady({
  totalDays,
  totalSessions,
  totalStudyMinutes,
  topicsCovered,
  firstTask,
}: {
  totalDays: number;
  totalSessions: number;
  totalStudyMinutes: number;
  topicsCovered: number;
  firstTask?: { label: string; minutes: number; date: string } | null;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const stats = [
    { label: 'Días de estudio', value: String(totalDays) },
    { label: 'Sesiones', value: String(totalSessions) },
    { label: 'Tiempo total', value: formatMinutes(totalStudyMinutes) },
    { label: 'Temas', value: String(topicsCovered) },
  ];

  return (
    <div className="relative animate-fade-up overflow-hidden rounded-2xl border border-success/30 bg-success-soft/40 p-6 sm:p-7">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Cerrar"
        className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <XIcon className="size-4" />
      </button>

      <div className="flex items-center gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-success text-success-foreground">
          <CheckCircle2Icon className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display text-xl font-bold">Tu plan está listo</h2>
          <p className="text-sm text-muted-foreground">
            Ya sabes exactamente qué estudiar cada día hasta el examen.
          </p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-surface/80 px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="font-display text-lg font-bold tracking-tight">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {firstTask && (
        <div className="mt-5 rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tu primera sesión
          </p>
          <p className="mt-1 text-sm font-semibold">
            {firstTask.label} · {formatMinutes(firstTask.minutes)}
          </p>
        </div>
      )}

      <Button asChild size="lg" className="mt-5 w-full sm:w-auto">
        <Link href={routes.dashboard}>
          Empezar a estudiar
          <ArrowRightIcon className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
