'use client';

import { cn } from '@/lib/utils';
import { WEEKDAYS } from '@/validation/exam';

/** Selector de días disponibles. Botones grandes, pensados para el móvil. */
export function WeekdayPicker({
  value,
  onChange,
  error,
}: {
  value: number[];
  onChange: (next: number[]) => void;
  error?: string;
}) {
  const toggle = (day: number) => {
    onChange(
      value.includes(day)
        ? value.filter((current) => current !== day)
        : [...value, day].sort((a, b) => a - b),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5" role="group" aria-label="Días disponibles">
        {WEEKDAYS.map((day) => {
          const selected = value.includes(day.value);
          return (
            <button
              key={day.value}
              type="button"
              onClick={() => toggle(day.value)}
              aria-pressed={selected}
              aria-label={day.full}
              className={cn(
                'flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-semibold transition-all',
                selected
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {day.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
