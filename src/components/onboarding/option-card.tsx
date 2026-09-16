'use client';

import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Tarjeta seleccionable usada en los pasos del onboarding. */
export function OptionCard({
  label,
  hint,
  selected,
  onSelect,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-primary bg-primary-soft/60 shadow-sm shadow-primary/10'
          : 'border-border bg-card hover:border-primary/35 hover:bg-secondary/40',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={cn(
          'inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
        )}
        aria-hidden
      >
        {selected && <CheckIcon className="size-3" strokeWidth={3} />}
      </span>
    </button>
  );
}
