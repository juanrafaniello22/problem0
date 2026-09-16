'use client';

import { useEffect, useState } from 'react';
import { SparklesIcon } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

/**
 * Estados de la generación del plan.
 *
 * Los mensajes van rotando mientras la petición está realmente en curso.
 * No hay esperas artificiales: si termina rápido, se cierra rápido.
 */

const STEPS = [
  'Analizando tu examen…',
  'Organizando tus temas…',
  'Distribuyendo tus sesiones…',
  'Creando tu plan…',
] as const;

const STEP_INTERVAL_MS = 900;

export function GeneratingOverlay({ open }: { open: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;

    const timer = setInterval(() => {
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-background/92 px-6 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <span className="relative inline-flex">
          <LogoMark className="size-14 animate-pop" />
          <span
            className="absolute -inset-3 -z-10 animate-pulse rounded-3xl bg-primary/15 blur-xl"
            aria-hidden
          />
        </span>

        <div className="flex flex-col gap-1.5">
          <p className="font-display text-lg font-bold">{STEPS[step]}</p>
          <p className="text-sm text-muted-foreground">
            Estamos repartiendo tus temas entre los días que te quedan.
          </p>
        </div>

        <ol className="flex w-full flex-col gap-2" aria-hidden>
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors',
                index <= step ? 'bg-primary-soft/60 text-primary' : 'text-muted-foreground/60',
              )}
            >
              <SparklesIcon
                className={cn('size-3 shrink-0', index === step && 'animate-pulse')}
              />
              {label}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
