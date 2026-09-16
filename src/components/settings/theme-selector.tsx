'use client';

import { useTheme } from 'next-themes';
import { LaptopIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useIsClient } from '@/hooks/use-is-client';
import { cn } from '@/lib/utils';

const options = [
  { value: 'light', label: 'Claro', icon: SunIcon },
  { value: 'dark', label: 'Oscuro', icon: MoonIcon },
  { value: 'system', label: 'Sistema', icon: LaptopIcon },
] as const;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const isClient = useIsClient();

  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2.5">
      {options.map((option) => {
        const selected = isClient && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all',
              selected
                ? 'border-primary bg-primary-soft/60 text-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            <option.icon className="size-[1.15rem]" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
